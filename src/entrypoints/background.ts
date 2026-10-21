import { extensionApi } from '../shared/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { openCapture } from '../shared/capture';
import { repository } from '../shared/storage';
import { noticeTarget, runReminders, type ReminderPort } from '../shared/background-engine';
import { snooze } from '../shared/reminders';
import { translate } from '../shared/i18n';

const port: ReminderPort = {
  existing: () => extensionApi().notifications.getAll(),
  notify: async (id, title, message, buttons) => {
    const language = (await repository.get()).settings.language;
    await extensionApi().notifications.create(id, {
      type: 'basic',
      iconUrl: extensionApi().runtime.getURL('icons/icon-128.png'),
      title,
      message,
      ...(buttons && import.meta.env.BROWSER !== 'firefox'
        ? {
            buttons: [
              { title: translate('Open', language) },
              { title: translate('Snooze 1 day', language) },
            ],
          }
        : {}),
    });
  },
  badge: async (count, overdue) => {
    await extensionApi().action.setBadgeText({ text: count ? String(count) : '' });
    await extensionApi().action.setBadgeBackgroundColor({ color: overdue ? '#E5484D' : '#F5A524' });
    await extensionApi().action.setTitle({
      title: count ? `Bell Work · ${count} items need your attention` : 'Bell Work · All caught up',
    });
  },
  schedule: async (when) => {
    const current = await extensionApi().alarms.get('daily-check');
    if (!current || Math.abs(current.scheduledTime - when) > 1000)
      await extensionApi().alarms.create('daily-check', { when });
  },
};
async function check(daily = false) {
  try {
    await navigator.locks.request('bellwork:reminder-check', () =>
      runReminders(repository, port, new Date(), daily),
    );
  } catch {
    await extensionApi().action.setBadgeText({ text: '!' });
    await extensionApi().action.setTitle({
      title: 'Bell Work · Reopen the dashboard to check your data',
    });
  }
}
function openItem(notificationId: string) {
  const target = noticeTarget(notificationId);
  void extensionApi().tabs.create({
    url: `${extensionApi().runtime.getURL('options.html')}${target ? `#item=${encodeURIComponent(target.itemId)}` : '#view=today'}`,
  });
  void extensionApi().notifications.clear(notificationId);
}
export default defineBackground(() => {
  extensionApi().runtime.onInstalled.addListener(() => {
    void extensionApi()
      .contextMenus.removeAll()
      .then(() => {
        extensionApi().contextMenus.create({
          id: 'add-page',
          title: 'Add page to Bell Work',
          contexts: ['page'],
        });
      })
      .catch(() => check());
    void check();
  });
  extensionApi().contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'add-page') void openCapture(tab?.id);
  });
  extensionApi().commands.onCommand.addListener((command) => {
    if (command === 'quick-add') void openCapture();
  });
  extensionApi().runtime.onStartup.addListener(() => {
    void check();
  });
  extensionApi().alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'daily-check') void check(true);
  });
  repository.subscribe(() => {
    void check();
  });
  extensionApi().notifications.onClicked.addListener(openItem);
  if (import.meta.env.BROWSER !== 'firefox')
    extensionApi().notifications.onButtonClicked.addListener((id, index) => {
      if (index === 0) openItem(id);
      else {
        const target = noticeTarget(id);
        if (target)
          void repository
            .set(
              (s) => ({
                ...s,
                items: s.items.map((i) =>
                  i.id === target.itemId ? snooze(i, new Date(), target.type, target.date) : i,
                ),
              }),
              true,
            )
            .then(() => extensionApi().notifications.clear(id))
            .catch(() => check());
      }
    });
  void check();
});
