import { jwtHelpers } from '../utils/jwtHelpers.js';

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'fallback_secret_maktech';
      req.user = jwtHelpers.verifyToken(token, secret);
    }
  } catch (error) {
    // Ignore invalid tokens, treat as public request
  }
  next();
};
