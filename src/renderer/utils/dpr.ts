export function getDpr(): number {
  return window.devicePixelRatio || 1;
}

export function setupCanvasDpr(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')!;
  const dpr = getDpr();
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  return ctx;
}

export function resizeCanvasToCssSize(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): boolean {
  const dpr = getDpr();
  const rect = canvas.getBoundingClientRect();
  const newW = Math.round(rect.width * dpr);
  const newH = Math.round(rect.height * dpr);
  if (canvas.width === newW && canvas.height === newH) return false;
  canvas.width = newW;
  canvas.height = newH;
  ctx.scale(dpr, dpr);
  return true;
}
