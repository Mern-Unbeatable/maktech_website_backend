import nodemailer from 'nodemailer';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { ApiError } from '../../utils/ApiError.js';
import config from '../../config/env.js';

// Global In-Memory Cache for Inbox
const inboxCache = {
  lastFetch: 0,
  pages: {} // Stores cached pages like { '1_20': { meta, data } }
};

const CACHE_TTL_MS = 60000; // 60 seconds

export class EmailsService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure, // true for 465, false for other ports
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
      tls: {
        rejectUnauthorized: false
      }
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
      }
    };
  }

  async sendEmail(to, subject, html) {
    if (!config.email.user || !config.email.pass) {
      throw new ApiError(500, 'Email credentials are not configured in .env');
    }

    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.user}>`,
      to,
      subject,
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return { messageId: info.messageId };
    } catch (error) {
      throw new ApiError(500, `Failed to send email: ${error.message}`);
    }
  }

  async getInbox(options) {
    const { page, limit } = options;
    const cacheKey = `${page}_${limit}`;
    const now = Date.now();
    
    if (!config.email.user || !config.email.pass) {
      throw new ApiError(500, 'IMAP credentials are not configured in .env');
    }

    // --- CACHE LOGIC START ---
    // If we fetched recently (within 60s) and have this page cached, return immediately!
    if (now - inboxCache.lastFetch < CACHE_TTL_MS && inboxCache.pages[cacheKey]) {
      return inboxCache.pages[cacheKey];
    }
    // --- CACHE LOGIC END ---

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
        hasPrevious: page > 1
      };

      if (total === 0) {
        connection.end();
        return { meta, data: [] };
      }

      // Calculate sequence range based on pagination (Newest first)
      const end = total - ((page - 1) * limit);
      if (end < 1) {
        connection.end();
        return { meta, data: [] }; // Page out of bounds
      }
      
      const start = Math.max(1, end - limit + 1);
      const sequence = `${start}:${end}`;

      // Now ONLY fetch the full bodies for those specific 20 emails
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        struct: true,
        markSeen: false
      };
      
      const messages = await connection.search([sequence], fetchOptions);
      const sortedMessages = messages.reverse(); // Newest first

      const parsedEmails = await Promise.all(
        sortedMessages.map(async (msg) => {
          const all = msg.parts.find(part => part.which === '');
          const id = msg.attributes.uid;
          const idHeader = "Imap-Id: "+id+"\r\n";
          const parsed = await simpleParser(idHeader + all.body);

          return {
            id,
              status: (msg.attributes.flags && msg.attributes.flags.includes('\\Seen')) ? 'Read' : 'Unread',
            from: parsed.from?.text || '',
            to: parsed.to?.text || '',
            subject: parsed.subject || '(No Subject)',
            date: parsed.date,
            text: parsed.text || '',
            html: parsed.html || parsed.textAsHtml || ''
          };
        })
      );

      connection.end();
      
      const responsePayload = { meta, data: parsedEmails };
      
      // Update cache
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
      
      // Get Unread Emails using fast STATUS command
      const unreadCount = await new Promise((resolve, reject) => {
        connection.imap.status('INBOX', (err, box) => {
          if (err) reject(err);
          else resolve(box.messages.unseen || 0);
        });
      });

      await connection.openBox('INBOX');

      // Emails Today (Instant approximation or search)
      let todayCount = 0;
      try {
        const today = new Date();
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const dateString = `${today.getDate()}-${months[today.getMonth()]}-${today.getFullYear()}`;
        const todayMessages = await connection.search([['SINCE', dateString]], { bodies: [] });
        todayCount = todayMessages.length;
      } catch (err) {
        console.warn("Failed to fetch today count, skipping", err);
      }

      connection.end();

      return {
        unread: unreadCount,
        today: todayCount,
        waiting: 0 // Mocked for now
      };
    } catch (error) {
      throw new ApiError(500, `Failed to fetch stats: ${error.message}`);
    }
  }
}
