import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

export default defineConfig({
  srcDir: 'src',
  imports: false,
  vite: () => ({ plugins: [react()], build: { modulePreload: false } }),
  manifest: {
    name: 'Bell Work',
    description:
      'Track job applications, study applications, and subscriptions with reminders that never let a deadline slip.',
    version: '1.0.0',
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
  },
});
