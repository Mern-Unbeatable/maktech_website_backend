import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { calculatePagination } from '../../utils/paginationHelper.js';

class BlogService {
  async createBlog(data) {
    if (!data.slug) {
      data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    const existingBlog = await prisma.post.findUnique({
      where: { slug: data.slug }
    });

    if (existingBlog) {
      throw new ApiError('A blog with this title/slug already exists', 400);
    }

    const blog = await prisma.post.create({
      data
    });

    return blog;
  }

  async getAllBlogs(options) {
    const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
    const { searchTerm, category, isPublished } = options;

    const where = {};

    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { category: { contains: searchTerm, mode: 'insensitive' } },
        { keyTakeaways: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished === 'true';
    }

    const blogs = await prisma.post.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder }
    });

    const total = await prisma.post.count({ where });

    return {
      meta: {
        page,
        limit,
        total
      },
      data: blogs
    };
  }

  async getBlogById(id) {
    const blog = await prisma.post.findUnique({
      where: { id }
    });

    if (!blog) {
      throw new ApiError('Blog not found', 404);
    }

    return blog;
  }

  async updateBlog(id, data) {
    const blog = await prisma.post.findUnique({
      where: { id }
    });

    if (!blog) {
      throw new ApiError('Blog not found', 404);
    }

    if (data.title && !data.slug) {
      data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      
      const existingSlug = await prisma.post.findFirst({
        where: { 
          slug: data.slug,
          NOT: { id }
        }
      });
      
      if (existingSlug) {
        throw new ApiError('A blog with this title/slug already exists', 400);
      }
    }

    const updatedBlog = await prisma.post.update({
      where: { id },
      data
    });

    return updatedBlog;
  }

  async deleteBlog(id) {
    const blog = await prisma.post.findUnique({
      where: { id }
    });

    if (!blog) {
      throw new ApiError('Blog not found', 404);
    }

    await prisma.post.delete({
      where: { id }
    });

    return null;
  }
}

export default BlogService;
