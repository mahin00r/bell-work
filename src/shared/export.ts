import { repository } from './storage';
import { today } from './dates';
import { useStore } from './store';
import { calendarExport } from './calendar';
import type { Item } from './types';
export function downloadFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportCalendar(items: Item[], horizon = 90) {
  try {
    downloadFile(
      calendarExport(items, new Date(), horizon),
      `bell-work-calendar-${today()}.ics`,
      'text/calendar;charset=utf-8',
    );
  } catch {
    useStore.setState({
      error: 'Calendar export failed. Check event dates, times, and time zones.',
    });
  }
}
export async function exportRawData() {
  try {
    downloadFile(
      JSON.stringify(await repository.raw(), null, 2) ?? 'null',
      `bell-work-backup-raw-${today()}.json`,
      'application/json',
    );
  } catch {
    useStore.setState({ error: 'The stored data could not be exported. Please try again.' });
  }
}
export async function exportData() {
  try {
    const state = await repository.get();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `bell-work-backup-${today()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    useStore.setState({ error: 'The backup could not be exported. Please try again.' });
  }
}
