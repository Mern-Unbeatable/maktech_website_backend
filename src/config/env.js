import dotenv from 'dotenv';
dotenv.config();

export default {
  app: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'maktech_secret_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    calendarId: process.env.GOOGLE_CALENDAR_ID,
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 465,
    secure: process.env.EMAIL_SECURE === 'true' || true,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    imapHost: process.env.EMAIL_IMAP_HOST || process.env.EMAIL_HOST,
    imapPort: process.env.EMAIL_IMAP_PORT || 993,
    fromName: process.env.EMAIL_FROM_NAME || 'Maktech'
  },
  r2: {
    endpoint: process.env.R2_ENDPOINT,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    publicUrl: (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, ''),
  }
};