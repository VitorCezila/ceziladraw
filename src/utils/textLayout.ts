/**
 * Text layout utilities for measuring and wrapping text.
 * Uses a shared off-screen canvas so these functions work outside of any
 * active rendering context (e.g. in SelectTool during resize).
 */

let _measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureCtx(): CanvasRenderingContext2D {
  if (!_measureCtx) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    _measureCtx = canvas.getContext('2d')!;
  }
  return _measureCtx;
}

/**
 * Split `text` into display lines that fit within `maxWidth` pixels at the
 * given font size / family, honouring explicit newlines.
 */
export function wrapTextLines(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
): string[] {
  if (!text) return [''];
  const ctx = getMeasureCtx();
  ctx.font = `${fontSize}px ${fontFamily}`;

  const result: string[] = [];

  for (const rawLine of text.split('\n')) {
    if (rawLine === '') {
      result.push('');
      continue;
    }
    const words = rawLine.split(' ');
    let line = '';

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else {
        if (line) result.push(line);
        line = '';
        // Break the word character by character if it exceeds maxWidth
        if (ctx.measureText(word).width > maxWidth) {
          for (const ch of word) {
            const test = line + ch;
            if (ctx.measureText(test).width <= maxWidth) {
              line = test;
            } else {
              if (line) result.push(line);
              line = ch;
            }
          }
        } else {
          line = word;
        }
      }
    }

    if (line !== '' || rawLine !== '') result.push(line);
  }

  return result.length > 0 ? result : [''];
}

/**
 * Compute the rendered height (in world px) of `text` wrapped to `maxWidth`.
 */
export function computeTextHeight(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
): number {
  const lines = wrapTextLines(text, maxWidth, fontSize, fontFamily);
  return lines.length * fontSize * 1.4;
}
