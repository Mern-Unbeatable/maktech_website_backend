import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { calculatePagination } from '../../utils/paginationHelper.js';

class BlogService {

  generateFakeEngagement(blog) {
    let hash = 0;
    const idStr = blog.id || blog.slug || "default";
    for (let i = 0; i < idStr.length; i++) {
        hash = ((hash << 5) - hash) + idStr.charCodeAt(i);
        hash |= 0; 
    }
    hash = Math.abs(hash);

    const baseViews = 1500 + (hash % 3000);
    const baseShares = 500 + (hash % 1000);
    const baseLikes = 100 + (hash % 300);
    const baseTwitter = 50 + (hash % 150);
    const baseInstagram = 100 + (hash % 400);

    const publishedDate = new Date(blog.date || blog.createdAt);
    const today = new Date();
    let diffDays = Math.floor((today - publishedDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 0 || isNaN(diffDays)) diffDays = 0;

    const currentHour = new Date().getHours();
    const timeFactor = diffDays * 24 + currentHour;

    const views = Math.floor(baseViews + (timeFactor * 3.5));
    const shares = Math.floor(baseShares + (timeFactor * 1.2));
    const likes = Math.floor(baseLikes + (timeFactor * 0.5));
    const twitter = Math.floor(baseTwitter + (timeFactor * 0.2));
    const instagram = Math.floor(baseInstagram + (timeFactor * 0.3));

    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    return {
        views: formatNumber(views),
        shares: formatNumber(shares),
        likes: formatNumber(likes),
        twitter: formatNumber(twitter),
        instagram: formatNumber(instagram)
    };
  }

  async createBlog(data) {
    if (!data.slug) {
      data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    const existingBlog = await prisma.post.findUnique({
      where: { slug: data.slug }
    });

    if (existingBlog) {
      throw new ApiError(400, 'A blog with this title/slug already exists');
    }

    const blog = await prisma.post.create({
      data
    });

    return { ...blog, engagement: this.generateFakeEngagement(blog) };
  }

  async getAllBlogs(options) {
    const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
    const { searchTerm, category, isPublished } = options;

    const where = {};
    const AND = [];

    if (searchTerm) {
      AND.push({
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { category: { contains: searchTerm, mode: 'insensitive' } },
          { keyTakeaways: { contains: searchTerm, mode: 'insensitive' } }
        ]
      });
    }

    if (category) {
      AND.push({ category });
    }

    if (isPublished !== undefined) {
      const isPub = isPublished === 'true';
      AND.push({ isPublished: isPub });
      
      if (isPub) {
        const today = new Date().toISOString().split('T')[0];
        AND.push({
          OR: [
            { date: { lte: today } },
            { date: null },
            { date: '' }
          ]
        });
      }
    }

    if (AND.length > 0) {
      where.AND = AND;
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
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1
      },
      data: blogs.map(blog => ({ ...blog, engagement: this.generateFakeEngagement(blog) }))
    };
  }

  async getBlogById(id) {
    const blog = await prisma.post.findUnique({
      where: { id }
    });

    if (!blog) {
      throw new ApiError(404, 'Blog not found');
    }

    return { ...blog, engagement: this.generateFakeEngagement(blog) };
  }

  async updateBlog(id, data) {
    const blog = await prisma.post.findUnique({
      where: { id }
    });

    if (!blog) {
      throw new ApiError(404, 'Blog not found');
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
        throw new ApiError(400, 'A blog with this title/slug already exists');
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
      throw new ApiError(404, 'Blog not found');
    }

    await prisma.post.delete({
      where: { id }
    });

    return null;
  }
}

export default BlogService;
