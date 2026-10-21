import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

export default defineConfig({
  srcDir: 'src',
  imports: false,
  vite: () => ({ plugins: [react()], build: { modulePreload: false } }),
  manifest: ({ browser }) => ({
    name: 'Bell Work',
    description:
      'Track applications, deadlines, interviews, and subscriptions with private, offline reminders.',
    version: '2.0.0',
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'bell-work@mahin00r.github.io',
              strict_min_version: '140.0',
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : { version_name: '2.0.0-beta.1' }),
    permissions: [
      'storage',
      'unlimitedStorage',
      'alarms',
      'notifications',
      'activeTab',
      'scripting',
      'contextMenus',
    ],
    options_ui: { page: 'options.html', open_in_tab: true },
    commands: {
      'quick-add': {
        suggested_key: { default: 'Alt+Shift+B' },
        description: 'Add page to Bell Work',
      },
    },
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  }),
});
