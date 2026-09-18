import type { CampusEvent } from '../types';

/**
 * Formats a Date or Timestamp into the iCalendar UTC timestamp format: YYYYMMDDTHHMMSSZ
 */
export const formatToIcsDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

/**
 * Generates and triggers download of an iCalendar (.ics) file for a campus event.
 * Compatible with Apple Calendar, Google Calendar, Microsoft Outlook, and mobile calendar apps.
 *
 * @param event - The target campus event record.
 */
export const downloadIcsFile = (event: CampusEvent): void => {
  const rawDate = event.date as unknown;
  const startDate: Date =
    rawDate instanceof Date
      ? rawDate
      : typeof (rawDate as { toDate?: () => Date })?.toDate === 'function'
      ? (rawDate as { toDate: () => Date }).toDate()
      : new Date(rawDate as string | number | Date);

  // Default event duration: 2 hours
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  const now = new Date();

  const cleanText = (text: string) =>
    text.replace(/[\n\r]+/g, ' ').replace(/[,;]/g, '\\$&').trim();

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CampusHub//University Events Portal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@campushub.edu`,
    `DTSTAMP:${formatToIcsDate(now)}`,
    `DTSTART:${formatToIcsDate(startDate)}`,
    `DTEND:${formatToIcsDate(endDate)}`,
    `SUMMARY:${cleanText(event.title)}`,
    `DESCRIPTION:${cleanText(event.description)}`,
    `LOCATION:${cleanText(event.location)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filename = `${event.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}_event.ics`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
