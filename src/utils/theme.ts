const STORAGE_KEY = 'ceziladraw_theme';

export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
  return (document.documentElement.dataset.theme as Theme) ?? 'light';
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
}

export function toggleTheme(): Theme {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function initTheme(): void {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(saved ?? preferred);
}

export function getCanvasColors(): { background: string; dot: string } {
  const dark = getTheme() === 'dark';
  return {
    background: dark ? '#141414' : '#fafaf9',
    dot:        dark ? '#2e2e3a' : '#d4d4d4',
  };
}

export function getDefaultStrokeColor(): string {
  return getTheme() === 'dark' ? '#cdd6f4' : '#1e1e2e';
}
