import express from 'express';
import { BlogController } from './blogs.controller.js';
import BlogService from './blogs.service.js';
import { BlogValidation } from './blogs.validation.js';
import { auth } from '../../middlewares/auth.js';

const router = express.Router();

const blogService = new BlogService();
const blogController = new BlogController(blogService);

// Public routes
router.get('/', blogController.getAllBlogs);
router.get('/:id', blogController.getBlogById);

// Protected routes
router.post(
  '/',
  auth('ADMIN'),
  BlogValidation.validate(BlogValidation.createBlogSchema),
  blogController.createBlog
);

router.patch(
  '/:id',
  auth('ADMIN'),
  BlogValidation.validate(BlogValidation.updateBlogSchema),
  blogController.updateBlog
);

router.delete(
  '/:id',
  auth('ADMIN'),
  blogController.deleteBlog
);

export const blogModule = { router };
