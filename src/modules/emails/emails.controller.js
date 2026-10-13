import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { httpStatus } from '../../utils/httpStatus.js';
import { ApiError } from '../../utils/ApiError.js';
import { calculatePagination } from '../../utils/paginationHelper.js';
import { TRANSPARENT_PIXEL_PNG } from './emailTracking.helper.js';

export class EmailsController {
  constructor(emailsService) {
    this.emailsService = emailsService;
  }

  sendEmail = catchAsync(async (req, res) => {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      throw new ApiError(400, 'Missing required fields: to, subject, html');
    }

    // Determine request host origin
    const baseUrlFromReq = `${req.protocol}://${req.get('host')}`;
    const result = await this.emailsService.sendEmail(to, subject, html, baseUrlFromReq);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Email sent successfully with tracking enabled',
      data: result,
    });
  });

  /**
   * Public Tracking Pixel Endpoint (Serves 1x1 transparent PNG)
   */
  trackOpen = catchAsync(async (req, res) => {
    const { trackingId } = req.params;

    // Process tracking asynchronously without blocking image response
    if (trackingId) {
      this.emailsService.trackOpen(trackingId, req).catch((err) => {
        console.warn('Track open async error:', err.message);
      });
    }

    // Send no-cache headers so every email view sends a new request
    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.end(TRANSPARENT_PIXEL_PNG);
  });

  /**
   * Public Link Click Tracking Endpoint (Redirects to target URL)
   */
  trackClick = catchAsync(async (req, res) => {
    const { tid, url } = req.query;

    if (!url) {
      return res.redirect('/');
    }

    const decodedUrl = decodeURIComponent(url);

    if (tid) {
      try {
        await this.emailsService.trackClick(tid, decodedUrl, req);
      } catch (err) {
        console.warn('Track click error:', err.message);
      }
    }

    res.redirect(decodedUrl);
  });

  /**
   * Get Sent Emails with Tracking Analytics
   */
  getSentEmails = catchAsync(async (req, res) => {
    const result = await this.emailsService.getSentEmails(req.query);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Sent emails fetched successfully',
      meta: result.meta,
      stats: result.stats,
      data: result.data,
    });
  });

  /**
   * Get Single Email Details & Tracking Timeline
   */
  getEmailDetails = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await this.emailsService.getEmailDetails(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Email details fetched successfully',
      data: result,
    });
  });

  getInbox = catchAsync(async (req, res) => {
    const options = calculatePagination(req.query);
    const result = await this.emailsService.getInbox(options);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Inbox fetched successfully',
      meta: result.meta,
      data: result.data,
    });
  });

  markAsRead = catchAsync(async (req, res) => {
    const { id } = req.params;
    await this.emailsService.markAsRead(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Email marked as read',
    });
  });

  getStats = catchAsync(async (req, res) => {
    const stats = await this.emailsService.getStats();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stats fetched successfully',
      data: stats,
    });
  });
}
