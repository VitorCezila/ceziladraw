export function hexToRgba(hex: string, alpha = 1): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function isTransparent(color: string): boolean {
  return color === 'transparent' || color === 'none' || color === '';
}

export const PALETTE = {
  stroke: ['#1e1e2e', '#313244', '#45475a', '#585b70', '#7f849c'],
  fill: [
    'transparent',
    '#cba6f7',
    '#f38ba8',
    '#fab387',
    '#a6e3a1',
    '#89dceb',
    '#89b4fa',
    '#f5c2e7',
    '#eba0ac',
  ],
} as const;
