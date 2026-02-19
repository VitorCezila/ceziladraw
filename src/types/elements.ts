import type { Point } from './geometry';

export type ElementType =
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'text'
  | 'pencil';

export type FillStyle = 'solid' | 'hachure' | 'cross-hatch' | 'none';
export type CurveType = 'linear' | 'bezier';
export type TextAlign = 'left' | 'center' | 'right';
export type ArrowheadStyle = 'arrow' | 'dot' | 'bar' | 'none';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type CornerStyle = 'sharp' | 'round';

export interface StyleObject {
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  fillStyle: FillStyle;
  roughness: number;
  opacity: number;
  strokeStyle: StrokeStyle;
  cornerStyle: CornerStyle;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  zIndex: number;
  groupId: string | null;
  style: StyleObject;
  version: number;
  seed: number;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
}

export interface DiamondElement extends BaseElement {
  type: 'diamond';
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  textAlign: TextAlign;
}

export interface ArrowElement extends BaseElement {
  type: 'arrow';
  startId: string | null;
  endId: string | null;
  points: Point[];
  curve: CurveType;
  startArrowhead: ArrowheadStyle;
  endArrowhead: ArrowheadStyle;
}

export interface LineElement extends BaseElement {
  type: 'line';
  points: Point[];
}

export interface PencilElement extends BaseElement {
  type: 'pencil';
  points: Point[];
  smoothing: number;
}

export type DrawableElement =
  | RectangleElement
  | DiamondElement
  | EllipseElement
  | TextElement
  | ArrowElement
  | LineElement
  | PencilElement;

export const DEFAULT_STYLE: StyleObject = {
  strokeColor: '#1e1e2e',
  strokeWidth: 2,
  fillColor: 'transparent',
  fillStyle: 'solid',
  roughness: 1.2,
  opacity: 1.0,
  strokeStyle: 'solid',
  cornerStyle: 'sharp',
};
