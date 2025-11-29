export type ElementType = 'rectangle' | 'circle' | 'arrow' | 'pencil' | 'text' | 'sticky';

export interface Point {
  x: number;
  y: number;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: Point[]; // For pencil
  text?: string;
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  locked?: boolean;
  opacity?: number; // 0 to 1
  strokeStyle?: 'solid' | 'dashed';
  rotation?: number; // In radians
}

export type Tool = 'selection' | 'rectangle' | 'circle' | 'arrow' | 'pencil' | 'text' | 'sticky' | 'eraser' | 'pan';

export interface ViewPort {
  x: number;
  y: number;
  zoom: number;
}

export interface Idea {
  title: string;
  description: string;
}

export interface WhiteboardHandle {
  exportImage: () => void;
  solveMath: () => Promise<void>;
}