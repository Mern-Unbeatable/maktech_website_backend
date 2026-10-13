import nodemailer from 'nodemailer';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import crypto from 'crypto';
import { ApiError } from '../../utils/ApiError.js';
import config from '../../config/env.js';
import { prisma } from '../../config/db.js';
import {
  injectTracking,
  getClientIp,
  getGeoLocation,
  parseUserAgent,
} from './emailTracking.helper.js';

// Global In-Memory Cache for Inbox
const inboxCache = {
  lastFetch: 0,
  pages: {},
};

const CACHE_TTL_MS = 60000; // 60 seconds

export class EmailsService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.imapConfig = {
      imap: {
        user: config.email.user,
        password: config.email.pass,
        host: process.env.EMAIL_IMAP_HOST || config.email.host,
        port: config.email.imapPort,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 3000,
      },
    };
  }

  /**
   * Send Email with Tracking Pixel & Link Tracking injection + DB persistence
   */
  async sendEmail(to, subject, html, baseUrlFromReq) {
    if (!config.email.user || !config.email.pass) {
      throw new ApiError(500, 'Email credentials are not configured in .env');
    }

    // Generate unique tracking identifier
    const trackingId = 'em_tr_' + crypto.randomUUID().replace(/-/g, '');

    // Determine backend base URL for public tracking image & link redirects
    const backendBaseUrl =
      process.env.API_BASE_URL ||
      process.env.BACKEND_URL ||
      baseUrlFromReq ||
      (config.app.env === 'production'
        ? 'https://www.api.maktechgroup.com'
        : 'http://localhost:5000');

    // Inject 1x1 tracking pixel and rewrite links for click tracking
    const trackedHtml = injectTracking(html, trackingId, backendBaseUrl);

    // Save record to database before sending
    const savedMessage = await prisma.emailMessage.create({
      data: {
        fromEmail: config.email.user,
        toEmail: to,
        subject,
        html: html,
        text: html.replace(/<[^>]+>/g, ' ').trim(),
        direction: 'OUTBOUND',
        trackingId,
        isOpened: false,
        openCount: 0,
        isClicked: false,
        clickCount: 0,
      },
    });

    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.user}>`,
      to,
      subject,
      html: trackedHtml,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return {
        messageId: info.messageId,
        trackingId,
        id: savedMessage.id,
      };
    } catch (error) {
      // Clean up or keep record with error
      console.error('Nodemailer send error:', error);
      throw new ApiError(500, `Failed to send email: ${error.message}`);
    }
  }

  /**
   * Track Email Open from 1x1 image request
   */
  async trackOpen(trackingId, req) {
    if (!trackingId) return;

    // Ignore only if specifically from admin preview URL
    const referer = req.headers['referer'] || req.headers['referrer'] || '';
    if (referer.includes('localhost:5173/admin') || referer.includes('localhost:3000/admin')) {
      return;
    }

    try {
      const message = await prisma.emailMessage.findFirst({
        where: { trackingId },
      });

      if (!message) return;

      const ip = getClientIp(req);
      const geo = getGeoLocation(ip);
      const { device, browser } = parseUserAgent(req.headers['user-agent']);
      const now = new Date();

      await Promise.all([
        prisma.emailMessage.update({
          where: { id: message.id },
          data: {
            isOpened: true,
            firstOpenedAt: message.firstOpenedAt || now,
            lastOpenedAt: now,
            openCount: { increment: 1 },
            ipAddress: ip || message.ipAddress,
            country: geo.country || message.country,
            city: geo.city || message.city,
            region: geo.region || message.region,
            device: device || message.device,
            browser: browser || message.browser,
            userAgent: req.headers['user-agent'] || message.userAgent,
          },
        }),
        prisma.emailTrackingActivity.create({
          data: {
            messageId: message.id,
            type: 'OPEN',
            ipAddress: ip,
            country: geo.country,
            city: geo.city,
            region: geo.region,
            device,
            browser,
            userAgent: req.headers['user-agent'] || null,
          },
        }),
      ]);
    } catch (err) {
      console.warn('Error recording email open tracking:', err.message);
    }
  }

  /**
   * Track Link Click and Return Target URL
   */
  async trackClick(trackingId, targetUrl, req) {
    if (!trackingId) return targetUrl || '/';

    try {
      const message = await prisma.emailMessage.findFirst({
        where: { trackingId },
      });

      if (message) {
        const ip = getClientIp(req);
        const geo = getGeoLocation(ip);
        const { device, browser } = parseUserAgent(req.headers['user-agent']);
        const now = new Date();

        await Promise.all([
          prisma.emailMessage.update({
            where: { id: message.id },
            data: {
              isClicked: true,
              firstClickedAt: message.firstClickedAt || now,
              lastClickedAt: now,
              clickCount: { increment: 1 },
              isOpened: true,
              firstOpenedAt: message.firstOpenedAt || now,
              lastOpenedAt: now,
              openCount: message.openCount > 0 ? message.openCount : 1,
              // Link click gives genuine client IP (bypasses Gmail proxy)
              ipAddress: ip || message.ipAddress,
              country: geo.country || message.country,
              city: geo.city || message.city,
              region: geo.region || message.region,
              device: device || message.device,
              browser: browser || message.browser,
              userAgent: req.headers['user-agent'] || message.userAgent,
            },
          }),
          prisma.emailTrackingActivity.create({
            data: {
              messageId: message.id,
              type: 'CLICK',
              targetUrl,
              ipAddress: ip,
              country: geo.country,
              city: geo.city,
              region: geo.region,
              device,
              browser,
              userAgent: req.headers['user-agent'] || null,
            },
          }),
        ]);
      }
    } catch (err) {
      console.warn('Error recording email click tracking:', err.message);
    }

    return targetUrl || '/';
  }

  /**
   * Get Sent Emails with Tracking Status & Metrics
   */
  async getSentEmails(options = {}) {
    const { page = 1, limit = 10, searchTerm, status } = options;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      direction: 'OUTBOUND',
    };

    if (status === 'OPENED') {
      where.isOpened = true;
    } else if (status === 'UNOPENED') {
      where.isOpened = false;
    } else if (status === 'CLICKED') {
      where.isClicked = true;
    }

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim();
      where.OR = [
        { toEmail: { contains: term, mode: 'insensitive' } },
        { subject: { contains: term, mode: 'insensitive' } },
        { country: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [messages, total, allSent] = await Promise.all([
      prisma.emailMessage.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { sentAt: 'desc' },
        include: {
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      }),
      prisma.emailMessage.count({ where }),
      prisma.emailMessage.findMany({
        where: { direction: 'OUTBOUND' },
        select: { isOpened: true, isClicked: true, clickCount: true, openCount: true },
      }),
    ]);

    const totalSent = allSent.length;
    const totalOpened = allSent.filter((m) => m.isOpened || m.isClicked).length;
    const totalClicked = allSent.filter((m) => m.isClicked).length;
    const totalClickCount = allSent.reduce((sum, m) => sum + (m.clickCount || 0), 0);
    const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

    return {
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
        hasNext: pageNum * limitNum < total,
        hasPrevious: pageNum > 1,
      },
      stats: {
        totalSent,
        totalOpened,
        totalClicked: totalClickCount || totalClicked,
        totalClickCount,
        openRate: `${openRate}%`,
      },
      data: messages,
    };
  }

  /**
   * Get Single Email Details with Full Activity History
   */
  async getEmailDetails(id) {
    const message = await prisma.emailMessage.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!message) {
      throw new ApiError(404, 'Email message not found');
    }

    return message;
  }

  async getInbox(options) {
    const { page, limit } = options;
    const cacheKey = `${page}_${limit}`;
    const now = Date.now();

    if (!config.email.user || !config.email.pass) {
      throw new ApiError(500, 'IMAP credentials are not configured in .env');
    }

    if (now - inboxCache.lastFetch < CACHE_TTL_MS && inboxCache.pages[cacheKey]) {
      return inboxCache.pages[cacheKey];
    }

    try {
      const connection = await imaps.connect(this.imapConfig);
      const box = await connection.openBox('INBOX');

      const total = box.messages.total;
      const totalPages = Math.ceil(total / limit);

      const meta = {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      };

      if (total === 0) {
        connection.end();
        return { meta, data: [] };
      }

      const end = total - (page - 1) * limit;
      if (end < 1) {
        connection.end();
        return { meta, data: [] };
      }

      const start = Math.max(1, end - limit + 1);
      const sequence = `${start}:${end}`;

      const fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        struct: true,
        markSeen: false,
      };

      const messages = await connection.search([sequence], fetchOptions);
      const sortedMessages = messages.reverse();

      const parsedEmails = await Promise.all(
        sortedMessages.map(async (msg) => {
          const all = msg.parts.find((part) => part.which === '');
          const id = msg.attributes.uid;
          const idHeader = 'Imap-Id: ' + id + '\r\n';
          const parsed = await simpleParser(idHeader + all.body);

          return {
            id,
            status:
              msg.attributes.flags && msg.attributes.flags.includes('\\Seen')
                ? 'Read'
                : 'Unread',
            from: parsed.from?.text || '',
            to: parsed.to?.text || '',
            subject: parsed.subject || '(No Subject)',
            date: parsed.date,
            text: parsed.text || '',
            html: parsed.html || parsed.textAsHtml || '',
          };
        })
      );

      connection.end();

      const responsePayload = { meta, data: parsedEmails };

      inboxCache.lastFetch = now;
      inboxCache.pages[cacheKey] = responsePayload;

      return responsePayload;
    } catch (error) {
      throw new ApiError(500, `Failed to fetch inbox: ${error.message}`);
    }
  }

  async markAsRead(uid) {
    const numericUid = parseInt(uid, 10);
    try {
      const connection = await imaps.connect(this.imapConfig);
      await connection.openBox('INBOX');
      await connection.addFlags(numericUid, ['\\Seen']);
      connection.end();
      return true;
    } catch (error) {
      throw new ApiError(500, `Failed to mark as read: ${error.message}`);
    }
  }

  async getStats() {
    if (!config.email.user || !config.email.pass) {
      throw new ApiError(500, 'IMAP credentials are not configured in .env');
    }
    try {
      const connection = await imaps.connect(this.imapConfig);

      const unreadCount = await new Promise((resolve, reject) => {
        connection.imap.status('INBOX', (err, box) => {
          if (err) reject(err);
          else resolve(box.messages.unseen || 0);
        });
      });

      await connection.openBox('INBOX');

      let todayCount = 0;
      try {
        const today = new Date();
        const months = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        const dateString = `${today.getDate()}-${months[today.getMonth()]}-${today.getFullYear()}`;
        const todayMessages = await connection.search([['SINCE', dateString]], {
          bodies: [],
        });
        todayCount = todayMessages.length;
      } catch (err) {
        console.warn('Failed to fetch today count, skipping', err);
      }

      connection.end();

      // Also get sent emails count and open rate from DB
      const sentStats = await prisma.emailMessage.findMany({
        where: { direction: 'OUTBOUND' },
        select: { isOpened: true },
      });
      const totalSent = sentStats.length;
      const openedCount = sentStats.filter((m) => m.isOpened).length;

      return {
        unread: unreadCount,
        today: todayCount,
        sent: totalSent,
        opened: openedCount,
        waiting: 0,
      };
    } catch (error) {
      throw new ApiError(500, `Failed to fetch stats: ${error.message}`);
    }
  }
}
