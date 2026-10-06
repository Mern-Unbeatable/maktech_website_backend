import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { httpStatus } from '../../utils/httpStatus.js';
import { ApiError } from '../../utils/ApiError.js';
import fs from 'fs';
import path from 'path';
export class UploadController {
  uploadFile = catchAsync(async (req, res) => {
    if (!req.file) {
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: 'No file provided'
      });
    }

    // Construct the public URL of the uploaded file
    // Example: http://localhost:3000/uploads/filename.jpg
    const protocol = req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: fileUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });
  });


  deleteFile = catchAsync(async (req, res) => {
    const { filename } = req.params;
    
    // Security check to prevent path traversal (e.g., ../../etc/passwd)
    if (!filename || filename.includes('..') || filename.includes('/')) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid filename');
    }

    const filePath = path.join(process.cwd(), 'uploads', filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      
      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'File deleted successfully',
        data: null
      });
    } else {
      throw new ApiError(httpStatus.NOT_FOUND, 'File not found');
    }
  });
}
