import { ApiError } from '../utils/ApiError.js';
import { httpStatus } from '../utils/httpStatus.js';
import { jwtHelpers } from '../utils/jwtHelpers.js';
import { catchAsync } from '../utils/catchAsync.js';

export const auth = (...requiredRoles) => {
  return catchAsync(async (req, res, next) => {
    // 1. Get the token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized! Token is missing.');
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify token
    let verifiedUser = null;
    try {
      const secret = process.env.JWT_SECRET || 'fallback_secret_maktech';
      verifiedUser = jwtHelpers.verifyToken(token, secret);
    } catch (error) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token!');
    }

    req.user = verifiedUser; // Injecting user into request

    // 3. Role authorization
    if (requiredRoles.length && !requiredRoles.includes(verifiedUser.role)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden! You do not have permission to access this route.');
    }

    next();
  });
};
