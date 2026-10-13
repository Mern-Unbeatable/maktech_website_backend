import geoip from 'geoip-lite';

// 1x1 transparent PNG buffer
export const TRANSPARENT_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

/**
 * Extract genuine client IP address taking proxies/Cloudflare into account
 */
export const getClientIp = (req) => {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return cfIp.trim();

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const list = forwarded.split(',');
    if (list.length > 0 && list[0].trim()) {
      return list[0].trim();
    }
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) return realIp.trim();

  return req.ip || req.socket?.remoteAddress || '';
};

/**
 * Lookup Country, City, Region using geoip-lite
 */
export const getGeoLocation = (ip) => {
  if (!ip) return { country: null, city: null, region: null };

  // Clean ipv6 loopback or ipv4-mapped ipv6
  const cleanIp = ip.replace(/^.*:/, '');

  if (cleanIp === '127.0.0.1' || cleanIp === 'localhost' || ip === '::1') {
    return { country: 'Localhost', city: 'Internal Network', region: 'DEV' };
  }

  try {
    const geo = geoip.lookup(cleanIp);
    if (geo) {
      return {
        country: geo.country || 'Unknown',
        city: geo.city || 'Unknown',
        region: geo.region || null,
        timezone: geo.timezone || null,
      };
    }
  } catch (err) {
    console.warn('GeoIP lookup failed:', err.message);
  }

  return { country: 'Unknown', city: 'Unknown', region: null };
};

/**
 * Parse User Agent for Device, Browser & Operating System
 */
export const parseUserAgent = (userAgent = '') => {
  if (!userAgent) {
    return { device: 'Unknown', browser: 'Unknown' };
  }

  const ua = userAgent.toLowerCase();

  // Special detection for Gmail Proxy & Apple Mail Privacy Protection
  if (ua.includes('googleimageproxy') || ua.includes('googleusercontent')) {
    return { device: 'Proxy Server', browser: 'Google Image Proxy (Gmail)' };
  }

  // Device detection
  let device = 'Desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipod')) {
    device = 'Mobile';
  } else if (ua.includes('ipad') || ua.includes('tablet')) {
    device = 'Tablet';
  }

  // Browser / Email client detection
  let browser = 'Web Browser';
  if (ua.includes('thunderbird')) browser = 'Mozilla Thunderbird';
  else if (ua.includes('outlook') || ua.includes('ms-office')) browser = 'Microsoft Outlook';
  else if (ua.includes('applemail') || (ua.includes('macintosh') && ua.includes('mail/'))) browser = 'Apple Mail';
  else if (ua.includes('edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('chrome/')) browser = 'Google Chrome';
  else if (ua.includes('safari/') && !ua.includes('chrome')) browser = 'Apple Safari';
  else if (ua.includes('firefox/')) browser = 'Mozilla Firefox';

  return { device, browser };
};

/**
 * Injects Tracking Pixel and Wraps Links for Click Tracking
 */
export const injectTracking = (htmlContent = '', trackingId, backendBaseUrl) => {
  if (!htmlContent || !trackingId) return htmlContent;

  const baseUrl = backendBaseUrl.replace(/\/+$/, '');
  const pixelUrl = `${baseUrl}/api/v1/emails/track/open/${trackingId}.png`;

  // 1. Wrap clickable <a> links for click tracking
  let processedHtml = htmlContent.replace(
    /<a\s+([^>]*?)href=(["'])(.*?)\2([^>]*?)>/gi,
    (match, before, quote, originalUrl, after) => {
      // Don't track mailto, tel, anchors or existing tracking links
      const lower = originalUrl.toLowerCase().trim();
      if (
        lower.startsWith('mailto:') ||
        lower.startsWith('tel:') ||
        lower.startsWith('#') ||
        lower.includes('/api/v1/emails/track/')
      ) {
        return match;
      }

      const encodedTarget = encodeURIComponent(originalUrl);
      const trackingClickUrl = `${baseUrl}/api/v1/emails/track/click?tid=${trackingId}&url=${encodedTarget}`;
      return `<a ${before}href="${trackingClickUrl}"${after}>`;
    }
  );

  // 2. Append 1x1 transparent tracking pixel
  const trackingPixelTag = `<img src="${pixelUrl}" width="1" height="1" style="display:none !important; width:1px !important; height:1px !important; max-height:1px !important; opacity:0 !important; pointer-events:none !important; border:0 !important; margin:0 !important; padding:0 !important;" alt="" />`;

  if (processedHtml.includes('</body>')) {
    processedHtml = processedHtml.replace('</body>', `${trackingPixelTag}</body>`);
  } else {
    processedHtml += trackingPixelTag;
  }

  return processedHtml;
};


/**
 * Detect automated security scanners and prefetch bots
 * (e.g. Google Security Scanner, Gmail Image Proxy delivery crawler)
 */
export const isSecurityScannerOrBot = (req, sentAt) => {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const ip = getClientIp(req);

  // 1. Check if it's the admin dashboard previewing
  const referer = (req.headers['referer'] || req.headers['referrer'] || '').toLowerCase();
  if (
    referer.includes('/admin') ||
    referer.includes('localhost:5173') ||
    referer.includes('localhost:3000')
  ) {
    return true;
  }

  // 2. Known crawler & security scanner signatures
  const isGoogleCrawler =
    userAgent.includes('googleimageproxy') ||
    userAgent.includes('ggpht.com') ||
    userAgent.includes('googlebot') ||
    userAgent.includes('edge/12.246') ||
    (ip && (ip.startsWith('66.249.') || ip.startsWith('74.125.')));

  // If request is from an automated scanner arriving within 30 seconds of sending, it is an automated delivery prefetch
  if (sentAt) {
    const elapsedMs = Date.now() - new Date(sentAt).getTime();
    if (elapsedMs < 30000 && isGoogleCrawler) {
      console.log(`[Tracking] Filtered automated scanner prefetch (${Math.round(elapsedMs / 1000)}s after send from ${ip})`);
      return true;
    }
  }

  return false;
};
