import config from '../config/env.js';
import { httpStatus } from '../utils/httpStatus.js';

export const globalErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal Server Error';
  let errorMessages = [];

  if (err.name === 'ZodError') {
    statusCode = httpStatus.BAD_REQUEST;
    message = 'Validation Error';
    errorMessages = err.errors.map((issue) => {
      return {
        path: issue.path.join('.'),
        message: issue.message,
      };
    });
  } else if (err.isOperational) {
    errorMessages = [{ path: '', message: err.message }];
  } else if (err instanceof Error) {
    errorMessages = [{ path: '', message: err.message }];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    stack: config.app.env !== 'production' ? err.stack : undefined,
  });
};
