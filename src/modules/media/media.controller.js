import crypto from 'crypto';
import path from 'path';
import {
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { r2, R2_BUCKET, R2_PUBLIC_URL } from '../../config/r2.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { httpStatus } from '../../utils/httpStatus.js';
import { ApiError } from '../../utils/ApiError.js';

const PREFIX = 'media/';
const MB = 1024 * 1024;
const MIN_PART_SIZE = 16 * MB;
export const MAX_PART_SIZE = 100 * MB;
// S3/R2 multipart limit
const MAX_PARTS = 10000;

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.webm', '.mov', '.m4v', '.mkv', '.avi', '.ogv', '.3gp', '.wmv', '.mpeg', '.mpg',
]);

const kindOf = (key) =>
  VIDEO_EXTENSIONS.has(path.extname(key).toLowerCase()) ? 'video' : 'image';

const toItem = (key, size, lastModified) => ({
  key,
  url: `${R2_PUBLIC_URL}/${key}`,
  size,
  lastModified,
  kind: kindOf(key),
});

const assertConfigured = () => {
  if (!R2_BUCKET || !R2_PUBLIC_URL) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'File storage is not configured. Set the R2_* environment variables.'
    );
  }
};

const assertValidKey = (key) => {
  if (typeof key !== 'string' || !key.startsWith(PREFIX) || key.includes('..')) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid file key');
  }
};

const assertUploadRef = ({ key, uploadId }) => {
  assertValidKey(key);
  if (typeof uploadId !== 'string' || !uploadId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid upload id');
  }
};

// SVG is excluded on purpose: it can carry inline scripts when opened from the public bucket URL
const isAllowedType = (type) =>
  typeof type === 'string' &&
  (type.startsWith('image/') || type.startsWith('video/')) &&
  type !== 'image/svg+xml';

const safeExtension = (fileName) => {
  const ext = path.extname(String(fileName || '')).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : '';
};

const partSizeFor = (size) =>
  Math.max(MIN_PART_SIZE, Math.ceil(size / MAX_PARTS / MB) * MB);

export class MediaController {
  startUpload = catchAsync(async (req, res) => {
    assertConfigured();
    const { fileName, contentType } = req.body || {};
    const size = Number(req.body?.size);

    if (!isAllowedType(contentType)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Only image or video files are allowed');
    }
    if (!Number.isFinite(size) || size <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid file size');
    }
    if (partSizeFor(size) > MAX_PART_SIZE) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'File is too large to upload');
    }

    const key = `${PREFIX}${Date.now()}-${crypto.randomUUID()}${safeExtension(fileName)}`;
    const { UploadId } = await r2.send(
      new CreateMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const partSize = partSizeFor(size);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Upload started',
      data: {
        key,
        uploadId: UploadId,
        partSize,
        partCount: Math.ceil(size / partSize),
      },
    });
  });

  uploadPart = catchAsync(async (req, res) => {
    assertConfigured();
    assertUploadRef(req.query);
    const { key, uploadId } = req.query;
    const partNumber = Number(req.query.partNumber);

    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > MAX_PARTS) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid part number');
    }
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Empty file chunk');
    }

    const { ETag } = await r2.send(
      new UploadPartCommand({
        Bucket: R2_BUCKET,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: req.body,
      })
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Chunk uploaded',
      data: { partNumber, etag: ETag },
    });
  });

  completeUpload = catchAsync(async (req, res) => {
    assertConfigured();
    assertUploadRef(req.body || {});
    const { key, uploadId, parts } = req.body;

    if (
      !Array.isArray(parts) ||
      !parts.length ||
      !parts.every(
        (p) => Number.isInteger(p?.partNumber) && typeof p?.etag === 'string' && p.etag
      )
    ) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid parts');
    }

    await r2.send(
      new CompleteMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: [...parts]
            .sort((a, b) => a.partNumber - b.partNumber)
            .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
        },
      })
    );

    const head = await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'File uploaded successfully',
      data: toItem(key, head.ContentLength, head.LastModified),
    });
  });

  abortUpload = catchAsync(async (req, res) => {
    assertConfigured();
    assertUploadRef(req.body || {});
    const { key, uploadId } = req.body;

    await r2.send(
      new AbortMultipartUploadCommand({ Bucket: R2_BUCKET, Key: key, UploadId: uploadId })
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Upload cancelled',
    });
  });

  list = catchAsync(async (req, res) => {
    assertConfigured();
    const result = await r2.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: PREFIX,
        MaxKeys: 1000,
        ContinuationToken: req.query.cursor || undefined,
      })
    );

    const items = (result.Contents || [])
      .map((o) => toItem(o.Key, o.Size, o.LastModified))
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Files retrieved successfully',
      data: items,
      meta: { nextCursor: result.NextContinuationToken || null },
    });
  });

  remove = catchAsync(async (req, res) => {
    assertConfigured();
    const { key } = req.query;
    assertValidKey(key);

    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'File deleted successfully',
    });
  });
}
