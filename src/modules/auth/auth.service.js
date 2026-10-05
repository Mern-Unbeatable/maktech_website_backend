import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { httpStatus } from '../../utils/httpStatus.js';
import { jwtHelpers } from '../../utils/jwtHelpers.js';

export class AuthService {
  constructor() {
    this.prisma = prisma;
  }

  async login(email, password) {
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
    }

    if (user.role !== 'ADMIN') {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Access denied. Admin only.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_maktech';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwtHelpers.createToken(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      expiresIn
    );

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token
    };
  }
}
