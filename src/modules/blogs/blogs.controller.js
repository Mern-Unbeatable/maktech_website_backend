import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';

export class BlogController {
  constructor(blogService) {
    this.blogService = blogService;
  }

  createBlog = catchAsync(async (req, res) => {
    const result = await this.blogService.createBlog(req.body);
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Blog created successfully',
      data: result
    });
  });

  getAllBlogs = catchAsync(async (req, res) => {
    const result = await this.blogService.getAllBlogs(req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Blogs fetched successfully',
      meta: result.meta,
      data: result.data
    });
  });

  getBlogById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await this.blogService.getBlogById(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Blog fetched successfully',
      data: result
    });
  });

  updateBlog = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await this.blogService.updateBlog(id, req.body);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Blog updated successfully',
      data: result
    });
  });

  deleteBlog = catchAsync(async (req, res) => {
    const { id } = req.params;
    await this.blogService.deleteBlog(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Blog deleted successfully',
      data: null
    });
  });
}
