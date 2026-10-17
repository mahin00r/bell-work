import { defineBackground } from 'wxt/utils/define-background';
import { openCapture } from '../shared/capture';
import { repository } from '../shared/storage';
import { noticeTarget, runReminders, type ReminderPort } from '../shared/background-engine';
import { snooze, type Notice } from '../shared/reminders';

const port: ReminderPort = {
  existing: () => chrome.notifications.getAll(),
  notify: async (id, title, message, buttons) => {
    await chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title,
      message,
      ...(buttons ? { buttons: [{ title: 'Open' }, { title: 'Snooze 1 day' }] } : {}),
    });
  },
  badge: async (count, overdue) => {
    await chrome.action.setBadgeText({ text: count ? String(count) : '' });
    await chrome.action.setBadgeBackgroundColor({ color: overdue ? '#E5484D' : '#F5A524' });
    await chrome.action.setTitle({
      title: count ? `Bell Work · ${count} items need your attention` : 'Bell Work · All caught up',
    });
  },
  schedule: async (when) => {
    const current = await chrome.alarms.get('daily-check');
    if (!current || Math.abs(current.scheduledTime - when) > 1000)
      await chrome.alarms.create('daily-check', { when });
  },
};
async function check(daily = false) {
  try {
    await navigator.locks.request('bellwork:reminder-check', () =>
      runReminders(repository, port, new Date(), daily),
    );
  } catch {
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setTitle({ title: 'Bell Work · Reopen the dashboard to check your data' });
  }
}
function openItem(notificationId: string) {
  const target = noticeTarget(notificationId);
  void chrome.tabs.create({
    url: `${chrome.runtime.getURL('options.html')}${target ? `#item=${encodeURIComponent(target.itemId)}` : '#view=today'}`,
  });
  void chrome.notifications.clear(notificationId);
}
export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'add-page',
        title: 'Add page to Bell Work',
        contexts: ['page'],
      });
    });
    void check();
  });
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'add-page') void openCapture(tab?.id);
  });
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'quick-add') void openCapture();
  });
  chrome.runtime.onStartup.addListener(() => {
    void check();
  });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'daily-check') void check(true);
  });
  repository.subscribe(() => {
    void check();
  });
  chrome.notifications.onClicked.addListener(openItem);
  chrome.notifications.onButtonClicked.addListener((id, index) => {
    if (index === 0) openItem(id);
    else {
      const target = noticeTarget(id);
      if (target)
        void repository
          .set(
            (s) => ({
              ...s,
              items: s.items.map((i) =>
                i.id === target.itemId ? snooze(i, new Date(), target.type as Notice['type']) : i,
              ),
            }),
            true,
          )
          .then(() => chrome.notifications.clear(id))
          .catch(() => check());
    }
  });
  void check();
});
