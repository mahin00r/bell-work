import { useEffect } from 'react';
import type { Settings } from '../shared/types';
function luminance(rgb: number[]) {
  return rgb
    .map((c) => {
      const v = c / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    })
    .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
}
export function themePalette(accent: string, dark: boolean) {
  let rgb = (dark && accent.toLowerCase() === '#5b5bf0' ? '#7c7cff' : accent)
    .slice(1)
    .match(/.{2}/g)!
    .map((s) => parseInt(s, 16));
  const surface = luminance(dark ? [35, 35, 61] : [238, 238, 255]);
  for (let n = 0; n < 50; n++) {
    const value = luminance(rgb);
    if ((Math.max(value, surface) + 0.05) / (Math.min(value, surface) + 0.05) >= 4.5) break;
    rgb = rgb.map((c) => Math.round(dark ? c + (255 - c) * 0.08 : c * 0.92));
  }
  const color = `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  return { color, onAccent: 1.05 / (luminance(rgb) + 0.05) >= 4.5 ? '#ffffff' : '#111126' };
}
export function useTheme(settings: Settings) {
  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      const palette = themePalette(settings.accent, dark);
      document.documentElement.style.setProperty('--accent', palette.color);
      document.documentElement.style.setProperty('--accent-on', palette.onAccent);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [settings.theme, settings.accent]);
}
