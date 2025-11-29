import { Point, CanvasElement } from '../types';

export const distance = (a: Point, b: Point) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

export const rotatePoint = (point: Point, center: Point, angle: number): Point => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + (dx * cos - dy * sin),
    y: center.y + (dx * sin + dy * cos),
  };
};

export const nearPoint = (x: number, y: number, x1: number, y1: number, name: string) => {
  return Math.abs(x - x1) < 10 && Math.abs(y - y1) < 10 ? name : null;
};

export const isPointInElement = (x: number, y: number, element: CanvasElement) => {
  const { type, x: x1, y: y1, width, height, points, rotation = 0 } = element;
  
  // Rotate point back to align with axis-aligned element
  const cx = x1 + (width || 0) / 2;
  const cy = y1 + (height || 0) / 2;
  const p = rotatePoint({ x, y }, { x: cx, y: cy }, -rotation);

  if (type === 'rectangle' || type === 'text' || type === 'sticky') {
    const w = width || 0;
    const h = height || 0;
    // Check against axis-aligned bounds
    return p.x >= x1 && p.x <= x1 + w && p.y >= y1 && p.y <= y1 + h;
  }
  
  if (type === 'circle') {
    const w = width || 0;
    const h = height || 0;
    // Ellipse check
    const centerX = x1 + w / 2;
    const centerY = y1 + h / 2;
    const radiusX = w / 2;
    const radiusY = h / 2;
    // Use rotated point p
    return (Math.pow(p.x - centerX, 2) / Math.pow(radiusX, 2)) + (Math.pow(p.y - centerY, 2) / Math.pow(radiusY, 2)) <= 1;
  }

  if (type === 'pencil' && points) {
    // For pencil, we ideally check all points rotated. 
    // Simplified: Check standard bounds or points if rotation is 0. 
    // If rotated, use bounding box check on rotated point for now.
    // Full polyline hit test with rotation is expensive without a dedicated path object.
    // Fallback: Check if point is near any segment (unrotated approximation for simplicity or proper loop)
    
    // Proper way: Rotate the mouse point, but pencil points are stored in world space *at creation*.
    // Usually pencil strokes aren't rotated post-creation in simple apps, but if we do:
    // We treat the pencil group as having a bounding box and center.
    // Current implementation stores absolute points. 
    // If we rotate a pencil, we should ideally rotate all points or wrap it in a container.
    // Here we assume 'rotation' applies to the bounding box center.
    // Let's stick to proximity for pencil points (ignoring rotation for hit test specifically for pencil to keep it simple, OR apply inverse transform).
    
    // Better approximation:
    return points.some(point => {
        // We have to assume the points transform with the element's x,y offset if we implemented moving properly.
        // But for pencil, points are absolute. Moving updates all points?
        // In this codebase, moving updates points. Rotation is complex for points array.
        // We will assume pencil strokes don't rotate for this version, or we just check proximity.
        return distance({ x, y }, point) < 10;
    });
  }

  if (type === 'arrow') {
     // Check arrow with rotated point
     const w = width || 0;
     const h = height || 0;
     const minX = Math.min(x1, x1 + w);
     const maxX = Math.max(x1, x1 + w);
     const minY = Math.min(y1, y1 + h);
     const maxY = Math.max(y1, y1 + h);
     return p.x >= minX - 10 && p.x <= maxX + 10 && p.y >= minY - 10 && p.y <= maxY + 10;
  }

  return false;
};

export const getElementAtPosition = (x: number, y: number, elements: CanvasElement[]) => {
  return [...elements].reverse().find(element => isPointInElement(x, y, element));
};

export const adjustCoordinates = (element: CanvasElement): CanvasElement => {
  const { type, x, y, width, height } = element;
  if (type === 'rectangle' || type === 'circle' || type === 'sticky') {
    const minX = Math.min(x, x + (width || 0));
    const maxX = Math.max(x, x + (width || 0));
    const minY = Math.min(y, y + (height || 0));
    const maxY = Math.max(y, y + (height || 0));
    return { ...element, x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  return element;
};
