import { shiftDay } from './dates';
import { eventInstant, projectedEvents } from './events';
import type { Item } from './types';

const escapeText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
const stamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
function fold(line: string) {
  let current = '';
  let bytes = 0;
  const lines: string[] = [];
  for (const character of line) {
    const code = character.codePointAt(0)!;
    const size = code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    if (bytes + size > 75) {
      lines.push(current);
      current = ' ';
      bytes = 1;
    }
    current += character;
    bytes += size;
  }
  return [...lines, current].join('\r\n');
}
export function calendarExport(items: Item[], now = new Date(), horizon = 90) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bell Work//Calendar//EN',
    'CALSCALE:GREGORIAN',
  ];
  for (const event of projectedEvents(items, now, horizon)) {
    const instant = eventInstant(event);
    if (event.time && instant === undefined)
      throw new Error('An event has an invalid local time. Edit it before exporting.');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.item.id}.${event.id}.${event.date}@bell-work.local`,
      `DTSTAMP:${stamp(now)}`,
      `LAST-MODIFIED:${stamp(new Date(event.item.updatedAt))}`,
      ...(instant !== undefined
        ? [`DTSTART:${stamp(new Date(instant))}`]
        : [
            `DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`,
            `DTEND;VALUE=DATE:${shiftDay(event.date, 1).replace(/-/g, '')}`,
          ]),
      `SUMMARY:${escapeText(`${event.item.title} — ${event.title}`)}`,
    );
    const description = [
      event.item.notes,
      event.time ? `${event.time} ${event.timeZone}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    const url = event.url ?? event.item.url;
    if (url) lines.push(`URL:${url.replace(/[\r\n]/g, '')}`);
    lines.push('END:VEVENT');
  }
  return [...lines, 'END:VCALENDAR', ''].map(fold).join('\r\n');
}
