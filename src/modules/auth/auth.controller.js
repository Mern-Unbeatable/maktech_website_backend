import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { httpStatus } from '../../utils/httpStatus.js';

export class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const result = await this.authService.login(email, password);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Admin logged in successfully!',
      data: result
    });
  });
}
