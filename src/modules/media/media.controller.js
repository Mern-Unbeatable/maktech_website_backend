import crypto from 'crypto';
import path from 'path';
import {
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { r2, R2_BUCKET, R2_PUBLIC_URL } from '../../config/r2.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { httpStatus } from '../../utils/httpStatus.js';
import { ApiError } from '../../utils/ApiError.js';

const PREFIX = 'media/';

const toItem = (key, size, lastModified) => ({
  key,
  url: `${R2_PUBLIC_URL}/${key}`,
  size,
  lastModified,
});

const assertConfigured = () => {
  if (!R2_BUCKET || !R2_PUBLIC_URL) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Image storage is not configured. Set the R2_* environment variables.'
    );
  }
};

export class MediaController {
  upload = catchAsync(async (req, res) => {
    assertConfigured();
    if (!req.files?.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No image provided');
    }

    const items = await Promise.all(
      req.files.map(async (file) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const key = `${PREFIX}${Date.now()}-${crypto.randomUUID()}${ext}`;
        await r2.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            CacheControl: 'public, max-age=31536000, immutable',
          })
        );
        return toItem(key, file.size, new Date().toISOString());
      })
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Images uploaded successfully',
      data: items,
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
      message: 'Images retrieved successfully',
      data: items,
      meta: { nextCursor: result.NextContinuationToken || null },
    });
  });

  remove = catchAsync(async (req, res) => {
    assertConfigured();
    const { key } = req.query;
    if (!key || !key.startsWith(PREFIX) || key.includes('..')) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid image key');
    }

    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Image deleted successfully',
    });
  });
}
