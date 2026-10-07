import { google } from 'googleapis';
import config from '../config/env.js';

export const bookGoogleMeet = async ({ meetingDate, timezone, leadName, leadEmail }) => {
  try {
    const { clientId, clientSecret, refreshToken, calendarId } = config.google;
    
    if (!clientId || !clientSecret || !refreshToken || !calendarId) {
      console.log('Google Calendar OAuth credentials missing. Skipping meeting creation.');
      return null;
    }

    const oAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret
    );

    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const startDate = new Date(meetingDate);
    const endDate = new Date(startDate.getTime() + 30 * 60000); 

    const event = {
      summary: `Meeting with ${leadName}`,
      description: `Automated meeting booked via Maktech Website for ${leadName} (${leadEmail}).`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: timezone || 'UTC',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: timezone || 'UTC',
      },
      attendees: [
        { email: leadEmail },
      ],
      conferenceData: {
        createRequest: {
          requestId: `maktech-meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
      conferenceDataVersion: 1, 
      sendUpdates: 'all',       
    });

    return response.data.hangoutLink || null;
  } catch (error) {
    console.error('Error booking Google Meet:', error);
    return null;
  }
};