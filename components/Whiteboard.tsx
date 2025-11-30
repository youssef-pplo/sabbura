import React, { useRef, useEffect, useState, useLayoutEffect, useImperativeHandle, forwardRef } from 'react';
import { CanvasElement, Tool, Point, ViewPort, ElementType, WhiteboardHandle } from '../types';
import { COLORS, DEFAULT_ELEMENT_STYLES, STICKY_COLORS, GRID_SIZE } from '../constants';
import { adjustCoordinates, getElementAtPosition, rotatePoint, distance } from '../utils/geometry';
import { v4 as uuidv4 } from 'uuid';
import PropertiesPanel from './PropertiesPanel';
import { recognizeImageContent, solveMathProblem } from '../services/aiService';

interface WhiteboardProps {
  tool: Tool;
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  history: CanvasElement[][];
  setHistory: React.Dispatch<React.SetStateAction<CanvasElement[][]>>;
  historyIndex: number;
  setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
  aiIdeas: { title: string; description: string }[];
  setAiIdeas: React.Dispatch<React.SetStateAction<{ title: string; description: string }[]>>;
  showGrid: boolean;
  enableSnapping: boolean;
  viewport: ViewPort;
  setViewport: React.Dispatch<React.SetStateAction<ViewPort>>;
}

interface GuideLine {
  type: 'horizontal' | 'vertical';
  pos: number;
}

const Whiteboard = forwardRef<WhiteboardHandle, WhiteboardProps>(({ 
  tool, 
  elements, 
  setElements, 
  history, 
  setHistory, 
  historyIndex, 
  setHistoryIndex,
  aiIdeas,
  setAiIdeas,
  showGrid,
  enableSnapping,
  viewport,
  setViewport
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [action, setAction] = useState<'drawing' | 'moving' | 'panning' | 'resizing' | 'rotating' | 'selecting' | 'idle'>('idle');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 }); 
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 }); 
  const [initialElementState, setInitialElementState] = useState<CanvasElement | null>(null); 
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ start: Point; current: Point } | null>(null);
  const [activeHandle, setActiveHandle] = useState<string | null>(null); 
  const [editingId, setEditingId] = useState<string | null>(null);

  // Helper to extract bounds of current selection
  const getSelectionBounds = () => {
    if (selectedIds.length === 0) return null;
    
    // For single element selection, use its own local bounds logic
    if (selectedIds.length === 1) {
        const el = elements.find(e => e.id === selectedIds[0]);
        if (!el) return null;
        return { x: el.x, y: el.y, width: el.width || 0, height: el.height || 0, rotation: el.rotation || 0 };
    }

    // For multiple selection, calculate the AABB of all elements in World Space
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    elements.filter(el => selectedIds.includes(el.id)).forEach(el => {
      const w = el.width || 0;
      const h = el.height || 0;
      const r = el.rotation || 0;
      const cx = el.x + w / 2;
      const cy = el.y + h / 2;

      // Calculate corners of the unrotated box relative to world 0,0 then rotate them around center
      const corners = [
        { x: el.x, y: el.y },
        { x: el.x + w, y: el.y },
        { x: el.x + w, y: el.y + h },
        { x: el.x, y: el.y + h }
      ];

      corners.forEach(c => {
         const rp = r ? rotatePoint(c, { x: cx, y: cy }, r) : c;
         minX = Math.min(minX, rp.x);
         minY = Math.min(minY, rp.y);
         maxX = Math.max(maxX, rp.x);
         maxY = Math.max(maxY, rp.y);
      });
      
      if (el.type === 'pencil' && el.points) {
          el.points.forEach(p => {
              const rp = r ? rotatePoint(p, { x: cx, y: cy }, r) : p;
              minX = Math.min(minX, rp.x);
              minY = Math.min(minY, rp.y);
              maxX = Math.max(maxX, rp.x);
              maxY = Math.max(maxY, rp.y);
          });
      }
    });
    
    if (minX === Infinity) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, rotation: 0 };
  };

  useImperativeHandle(ref, () => ({
    exportImage: () => {
       if (elements.length === 0) return;
       const link = document.createElement('a');
       link.download = `sabbura-export-${Date.now()}.png`;
       if(canvasRef.current) link.href = canvasRef.current.toDataURL(); 
       link.click();
    },
    solveMath: async () => {
      const bounds = getSelectionBounds();
      if (!bounds) {
        alert("Please select the math problem first.");
        return;
      }
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Add padding to capture area
      const padding = 20;
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = bounds.width + (padding * 2);
      captureCanvas.height = bounds.height + (padding * 2);
      const ctx = captureCanvas.getContext('2d');
      if (!ctx) return;
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, captureCanvas.width, captureCanvas.height);
      
      const selectedElements = elements.filter(el => selectedIds.includes(el.id));
      
      // Translate so the selection is centered in the capture canvas
      ctx.translate(-bounds.x + padding, -bounds.y + padding);
      
      selectedElements.forEach(element => {
          ctx.save();
          const cx = element.x + (element.width || 0) / 2;
          const cy = element.y + (element.height || 0) / 2;
          ctx.translate(cx, cy);
          ctx.rotate(element.rotation || 0);
          ctx.translate(-cx, -cy);

          ctx.globalAlpha = element.opacity ?? 1;
          ctx.lineWidth = element.strokeWidth;
          ctx.strokeStyle = element.strokeColor;
          ctx.fillStyle = element.backgroundColor;
          if (element.strokeStyle === 'dashed') ctx.setLineDash([10, 10]);

          if (element.type === 'rectangle') {
            ctx.beginPath();
            ctx.rect(element.x, element.y, element.width || 0, element.height || 0);
            ctx.stroke();
          } 
          else if (element.type === 'pencil' && element.points) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            if (element.points.length > 0) {
              ctx.moveTo(element.points[0].x, element.points[0].y);
              element.points.forEach(point => ctx.lineTo(point.x, point.y));
            }
            ctx.stroke();
          }
          else if (element.type === 'text' && element.text) {
             const fontSize = 12 + (element.strokeWidth * 2);
             ctx.font = `${fontSize}px ${element.fontFamily || 'sans-serif'}`;
             ctx.fillStyle = element.strokeColor;
             ctx.fillText(element.text, element.x, element.y);
          }
          ctx.restore();
      });

      const imageBase64 = captureCanvas.toDataURL('image/png');
      const problemText = await recognizeImageContent(imageBase64);
      if (!problemText) {
        alert("Could not recognize text in the selection.");
        return;
      }
      const solution = await solveMathProblem(problemText);
      if (!solution) return;

      const solutionElement: CanvasElement = {
         id: uuidv4(),
         type: 'sticky',
         x: bounds.x + bounds.width + 40,
         y: bounds.y,
         width: 250,
         height: 200,
         text: solution,
         backgroundColor: '#e0e7ff',
         strokeColor: '#3730a3',
         strokeWidth: 2,
         fontFamily: 'cursive',
         textAlign: 'left',
         opacity: 1,
         strokeStyle: 'solid',
         rotation: 0
      };

      const newElements = [...elements, solutionElement];
      setElements(newElements);
      const newHistory = history.slice(0, historyIndex + 1);
      setHistory([...newHistory, newElements]);
      setHistoryIndex(newHistory.length);
    }
  }));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
       if (editingId) return; 
       if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
          const newElements = elements.filter(el => !selectedIds.includes(el.id));
          const newHistory = history.slice(0, historyIndex + 1);
          setHistory([...newHistory, newElements]);
          setHistoryIndex(newHistory.length);
          setElements(newElements);
          setSelectedIds([]);
       }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, elements, history, historyIndex, editingId]);

  useEffect(() => {
    if (aiIdeas.length > 0) {
      const newElements: CanvasElement[] = [];
      const startX = -viewport.x / viewport.zoom + 100;
      const startY = -viewport.y / viewport.zoom + 100;
      aiIdeas.forEach((idea, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        const colorKeys = Object.keys(STICKY_COLORS);
        const randomColor = STICKY_COLORS[colorKeys[index % colorKeys.length] as keyof typeof STICKY_COLORS];
        newElements.push({
          id: uuidv4(),
          type: 'sticky',
          x: startX + col * 220,
          y: startY + row * 220,
          width: 200,
          height: 200,
          text: `${idea.title}\n\n${idea.description}`,
          backgroundColor: randomColor,
          strokeColor: COLORS.black,
          strokeWidth: 2,
          textAlign: 'left',
          fontFamily: 'sans-serif',
          rotation: 0
        });
      });
      const newHistory = history.slice(0, historyIndex + 1);
      const nextElements = [...elements, ...newElements];
      setHistory([...newHistory, nextElements]);
      setHistoryIndex(newHistory.length);
      setElements(nextElements);
      setAiIdeas([]);
    }
  }, [aiIdeas]);

  const getMouseCoordinates = (event: React.MouseEvent | MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = event.clientX - rect.left;
    const clientY = event.clientY - rect.top;
    return {
      x: (clientX - viewport.x) / viewport.zoom,
      y: (clientY - viewport.y) / viewport.zoom,
    };
  };

  const snapToGrid = (value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  const getWrappedTextLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
      const paragraphs = text.split('\n');
      const lines: string[] = [];
      
      for (let p = 0; p < paragraphs.length; p++) {
          const words = paragraphs[p].split(' ');
          let line = '';
          
          for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              const metrics = ctx.measureText(testLine);
              if (metrics.width > maxWidth && n > 0) {
                  lines.push(line);
                  line = words[n] + ' ';
              } else {
                  line = testLine;
              }
          }
          lines.push(line);
      }
      return lines;
  };

  const drawWrappedText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number) => {
      const lines = getWrappedTextLines(ctx, text, width);
      lines.forEach((line, index) => {
          ctx.fillText(line, x, y + (index * lineHeight));
      });
  };

  const updateElementText = (id: string, newText: string) => {
      if (!newText.trim()) return;

      const el = elements.find(e => e.id === id);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      let newHeight = el?.height;

      if (el && ctx && (el.type === 'text' || el.type === 'sticky')) {
           const fontSize = 12 + (el.strokeWidth * 2);
           ctx.font = `${fontSize}px ${el.fontFamily || 'sans-serif'}`;
           const lineHeight = fontSize * 1.5;
           const padding = 10;
           const w = (el.width || 0) - padding * 2;
           const lines = getWrappedTextLines(ctx, newText, w);
           const measuredHeight = (lines.length * lineHeight) + (padding * 2);
           
           if (el.type === 'text' || measuredHeight > (el.height || 0)) {
               newHeight = Math.max(measuredHeight, 50); 
           }
      }

      const newElements = elements.map(e => e.id === id ? { ...e, text: newText, height: newHeight } : e);
      setElements(newElements);
      const newHistory = history.slice(0, historyIndex + 1);
      setHistory([...newHistory, newElements]);
      setHistoryIndex(newHistory.length);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    if (showGrid) {
        ctx.save();
        ctx.strokeStyle = '#e2e8f0'; 
        ctx.fillStyle = '#cbd5e1'; 
        const startX = Math.floor((-viewport.x / viewport.zoom) / GRID_SIZE) * GRID_SIZE;
        const startY = Math.floor((-viewport.y / viewport.zoom) / GRID_SIZE) * GRID_SIZE;
        const endX = startX + (canvas.width / viewport.zoom) + GRID_SIZE;
        const endY = startY + (canvas.height / viewport.zoom) + GRID_SIZE;
        for (let x = startX; x < endX; x += GRID_SIZE) {
            for (let y = startY; y < endY; y += GRID_SIZE) {
                ctx.beginPath();
                ctx.arc(x, y, 1 / viewport.zoom, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    elements.forEach(element => {
      ctx.save();
      const cx = element.x + (element.width || 0) / 2;
      const cy = element.y + (element.height || 0) / 2;
      if (element.rotation) {
        ctx.translate(cx, cy);
        ctx.rotate(element.rotation);
        ctx.translate(-cx, -cy);
      }

      ctx.globalAlpha = element.opacity ?? 1;
      
      if (element.strokeStyle === 'dashed') {
          ctx.setLineDash([10 / viewport.zoom, 10 / viewport.zoom]);
      } else {
          ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.lineWidth = element.strokeWidth;
      ctx.strokeStyle = element.strokeColor;
      ctx.fillStyle = element.backgroundColor;

      if (element.type === 'rectangle') {
        ctx.roundRect(element.x, element.y, element.width || 0, element.height || 0, 8);
        ctx.stroke();
        if (element.backgroundColor !== 'transparent') ctx.fill();
      } 
      else if (element.type === 'circle') {
        ctx.ellipse(
          element.x + (element.width || 0) / 2,
          element.y + (element.height || 0) / 2,
          Math.abs((element.width || 0) / 2),
          Math.abs((element.height || 0) / 2),
          0, 0, 2 * Math.PI
        );
        ctx.stroke();
        if (element.backgroundColor !== 'transparent') ctx.fill();
      }
      else if (element.type === 'pencil' && element.points) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        if (element.points.length > 0) {
          ctx.moveTo(element.points[0].x, element.points[0].y);
          element.points.forEach(point => ctx.lineTo(point.x, point.y));
        }
        ctx.stroke();
      }
      else if (element.type === 'arrow') {
        const headlen = 10 + element.strokeWidth;
        const tox = element.x + (element.width || 0);
        const toy = element.y + (element.height || 0);
        const angle = Math.atan2(toy - element.y, tox - element.x);
        
        ctx.beginPath();
        ctx.moveTo(element.x, element.y);
        ctx.lineTo(tox, toy);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
      else if ((element.type === 'text' || element.type === 'sticky')) {
        if (element.type === 'sticky') {
             ctx.fillStyle = 'rgba(0,0,0,0.1)';
             ctx.fillRect(element.x + 4, element.y + 4, element.width || 0, element.height || 0);
             ctx.fillStyle = element.backgroundColor;
             ctx.fillRect(element.x, element.y, element.width || 0, element.height || 0);
        }

        if (element.text) {
             ctx.textBaseline = 'top';
             const fontSize = 12 + (element.strokeWidth * 2);
             ctx.font = `${fontSize}px ${element.fontFamily || 'sans-serif'}`;
             ctx.textAlign = (element.textAlign as CanvasTextAlign) || 'left';
             ctx.fillStyle = element.type === 'sticky' && element.strokeColor === 'transparent' ? '#000' : element.strokeColor;
    
             const padding = 10;
             let x = element.x + padding;
             let y = element.y + padding;
             const w = (element.width || 0) - padding * 2;
    
             if (element.textAlign === 'center') x = element.x + (element.width || 0) / 2;
             if (element.textAlign === 'right') x = element.x + (element.width || 0) - padding;
    
             const lineHeight = fontSize * 1.5;
             drawWrappedText(ctx, element.text, x, y, w, lineHeight);
        }
      }
      ctx.restore();
    });

    // Draw Selection Box
    if (selectedIds.length > 0 && !editingId) {
        // Only show selection box if we are NOT currently drawing a shape (unless it's just finishing up)
        // action === 'drawing' means the mouse is down creating a shape. We don't want the box then.
        if (action !== 'drawing') {
            const bounds = getSelectionBounds();
            if (bounds) {
                ctx.save();
                
                if (selectedIds.length === 1 && bounds.rotation) {
                   const cx = bounds.x + bounds.width / 2;
                   const cy = bounds.y + bounds.height / 2;
                   ctx.translate(cx, cy);
                   ctx.rotate(bounds.rotation);
                   ctx.translate(-cx, -cy);
                }

                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 1 / viewport.zoom;
                ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
                ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
                
                ctx.fillStyle = '#3b82f6';
                ctx.font = `${12 / viewport.zoom}px sans-serif`;
                const dimText = `${Math.round(bounds.width)} x ${Math.round(bounds.height)}`;
                const textWidth = ctx.measureText(dimText).width;
                ctx.fillRect(bounds.x + bounds.width - textWidth - 4, bounds.y + bounds.height + 4, textWidth + 4, 16 / viewport.zoom);
                ctx.fillStyle = 'white';
                ctx.fillText(dimText, bounds.x + bounds.width - textWidth - 2, bounds.y + bounds.height + 14 / viewport.zoom);

                ctx.fillStyle = 'white';
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 1.5 / viewport.zoom;
                const handleSize = 6 / viewport.zoom;
                
                const handles = [
                   { x: bounds.x, y: bounds.y },
                   { x: bounds.x + bounds.width/2, y: bounds.y },
                   { x: bounds.x + bounds.width, y: bounds.y },
                   { x: bounds.x + bounds.width, y: bounds.y + bounds.height/2 },
                   { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
                   { x: bounds.x + bounds.width/2, y: bounds.y + bounds.height },
                   { x: bounds.x, y: bounds.y + bounds.height },
                   { x: bounds.x, y: bounds.y + bounds.height/2 },
                ];

                handles.forEach(h => {
                    ctx.beginPath();
                    ctx.arc(h.x, h.y, handleSize, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                });

                const rotateHandleY = bounds.y - 20 / viewport.zoom;
                ctx.beginPath();
                ctx.moveTo(bounds.x + bounds.width / 2, bounds.y);
                ctx.lineTo(bounds.x + bounds.width / 2, rotateHandleY);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(bounds.x + bounds.width / 2, rotateHandleY, handleSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.restore();
            }
        }
    }

    if (selectionBox) {
        ctx.strokeStyle = '#3b82f6';
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'; 
        ctx.lineWidth = 1.5 / viewport.zoom;
        const w = selectionBox.current.x - selectionBox.start.x;
        const h = selectionBox.current.y - selectionBox.start.y;
        ctx.fillRect(selectionBox.start.x, selectionBox.start.y, w, h);
        ctx.strokeRect(selectionBox.start.x, selectionBox.start.y, w, h);
    }

    ctx.restore();
  };

  useLayoutEffect(() => {
    draw();
  });

  const handleLayerAction = (layerAction: 'forward' | 'backward' | 'front' | 'back') => {
    if (selectedIds.length !== 1) return; 
    const id = selectedIds[0];
    const index = elements.findIndex(e => e.id === id);
    if (index === -1) return;
    const newElements = [...elements];
    const el = newElements.splice(index, 1)[0];
    if (layerAction === 'front') newElements.push(el);
    else if (layerAction === 'back') newElements.unshift(el);
    else if (layerAction === 'forward') newElements.splice(Math.min(index + 1, newElements.length), 0, el);
    else if (layerAction === 'backward') newElements.splice(Math.max(index - 1, 0), 0, el);
    setElements(newElements);
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newElements]);
    setHistoryIndex(newHistory.length);
  };

  const handlePropertyChange = (updates: Partial<CanvasElement>) => {
    const newElements = elements.map(el => {
        if (selectedIds.includes(el.id)) {
            if (el.locked && !('locked' in updates)) return el;
            return { ...el, ...updates };
        }
        return el;
    });
    setElements(newElements);
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newElements]);
    setHistoryIndex(newHistory.length);
  };

  const handleDoubleClick = (event: React.MouseEvent) => {
      const { x, y } = getMouseCoordinates(event);
      const element = getElementAtPosition(x, y, elements);
      if (element && (element.type === 'text' || element.type === 'sticky') && !element.locked) {
          const newText = window.prompt("Edit text:", element.text || "");
          if (newText !== null) {
              updateElementText(element.id, newText);
          }
      }
  };

  const getHandleAtPosition = (x: number, y: number, bounds: any, zoom: number) => {
     if (!bounds) return null;
     const handleSize = 10 / zoom;
     const cx = bounds.x + bounds.width / 2;
     const cy = bounds.y + bounds.height / 2;
     const p = rotatePoint({ x, y }, { x: cx, y: cy }, -bounds.rotation);

     const handles = {
         'nw': { x: bounds.x, y: bounds.y },
         'n':  { x: bounds.x + bounds.width/2, y: bounds.y },
         'ne': { x: bounds.x + bounds.width, y: bounds.y },
         'e':  { x: bounds.x + bounds.width, y: bounds.y + bounds.height/2 },
         'se': { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
         's':  { x: bounds.x + bounds.width/2, y: bounds.y + bounds.height },
         'sw': { x: bounds.x, y: bounds.y + bounds.height },
         'w':  { x: bounds.x, y: bounds.y + bounds.height/2 },
         'rotate': { x: bounds.x + bounds.width/2, y: bounds.y - 20 / zoom } 
     };

     for (const [key, val] of Object.entries(handles)) {
         if (Math.abs(p.x - val.x) < handleSize && Math.abs(p.y - val.y) < handleSize) {
             return key;
         }
     }
     return null;
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    const { x, y } = getMouseCoordinates(event);

    if (tool === 'pan') {
       setAction('panning');
       setPanStart({ x: event.clientX, y: event.clientY });
       return;
    }

    if (tool === 'selection') {
      const bounds = getSelectionBounds();
      const handle = getHandleAtPosition(x, y, bounds, viewport.zoom);

      if (handle) {
          if (handle === 'rotate') {
              setAction('rotating');
          } else {
              setAction('resizing');
              setActiveHandle(handle);
          }
          setDragStart({ x, y });
          if (selectedIds.length === 1) {
             setInitialElementState(elements.find(e => e.id === selectedIds[0]) || null);
          }
          return;
      }

      const element = getElementAtPosition(x, y, elements);
      
      if (element) {
        const isAlreadySelected = selectedIds.includes(element.id);
        
        if (event.shiftKey) {
            if (isAlreadySelected) {
                setSelectedIds(ids => ids.filter(id => id !== element.id));
            } else {
                setSelectedIds(ids => [...ids, element.id]);
            }
        } else {
            if (!isAlreadySelected) {
                setSelectedIds([element.id]);
            }
        }

        if (!element.locked) {
           setAction('moving');
           setDragOffset({ x, y }); 
        }
      } else {
        if (!event.shiftKey) setSelectedIds([]);
        setAction('selecting');
        setSelectionBox({ start: { x, y }, current: { x, y } });
      }
    } 
    else if (tool === 'eraser') {
      const element = getElementAtPosition(x, y, elements);
      if (element && !element.locked) {
         const newElements = elements.filter(e => e.id !== element.id);
         const newHistory = history.slice(0, historyIndex + 1);
         setHistory([...newHistory, newElements]);
         setHistoryIndex(newHistory.length);
         setElements(newElements);
      }
    } 
    else {
      // Creation Tools
      const id = uuidv4();
      const snappedX = enableSnapping ? snapToGrid(x) : x;
      const snappedY = enableSnapping ? snapToGrid(y) : y;
      let newElement: CanvasElement | null = null;

      if (tool === 'text') {
        const textContent = window.prompt("Enter text:");
        if (!textContent) return; 

        newElement = {
            id, type: 'text', x: snappedX, y: snappedY, 
            width: 200, height: 50, 
            text: textContent,
            strokeColor: COLORS.black, backgroundColor: 'transparent',
            strokeWidth: DEFAULT_ELEMENT_STYLES.strokeWidth, 
            fontFamily: 'sans-serif', textAlign: 'left',
            opacity: 1, strokeStyle: 'solid', rotation: 0
        };
        
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
             const fontSize = 12 + (newElement.strokeWidth * 2);
             ctx.font = `${fontSize}px ${newElement.fontFamily || 'sans-serif'}`;
             const lineHeight = fontSize * 1.5;
             const padding = 10;
             const w = (newElement.width || 0) - padding * 2;
             const lines = getWrappedTextLines(ctx, textContent, w);
             const measuredHeight = (lines.length * lineHeight) + (padding * 2);
             newElement.height = Math.max(measuredHeight, 50);
        }
      } 
      else {
          const isSticky = tool === 'sticky';
          newElement = {
              id, type: tool as ElementType, x: snappedX, y: snappedY,
              width: isSticky ? 200 : 0, height: isSticky ? 200 : 0,
              strokeColor: COLORS.black,
              backgroundColor: isSticky ? STICKY_COLORS.yellow : 'transparent',
              strokeWidth: isSticky ? 2 : DEFAULT_ELEMENT_STYLES.strokeWidth,
              points: tool === 'pencil' ? [{ x, y }] : undefined,
              text: isSticky ? 'New Note' : undefined,
              fontFamily: 'sans-serif', textAlign: 'left',
              opacity: 1, strokeStyle: 'solid', rotation: 0
          };
      }

      if (newElement) {
        setSelectedIds([newElement.id]); 
        setElements([...elements, newElement]);
        if (tool !== 'text') {
            setAction('drawing');
        } else {
             const newHistory = history.slice(0, historyIndex + 1);
             setHistory([...newHistory, [...elements, newElement]]);
             setHistoryIndex(newHistory.length);
        }
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    const { x, y } = getMouseCoordinates(event);

    if (action === 'panning') {
       const dx = event.clientX - panStart.x;
       const dy = event.clientY - panStart.y;
       setViewport(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
       setPanStart({ x: event.clientX, y: event.clientY });
       return;
    }

    if (action === 'selecting' && selectionBox) {
        setSelectionBox({ ...selectionBox, current: { x, y } });
        return;
    }

    if (action === 'rotating' && initialElementState && selectedIds.length === 1) {
        const cx = initialElementState.x + (initialElementState.width || 0) / 2;
        const cy = initialElementState.y + (initialElementState.height || 0) / 2;
        const angle = Math.atan2(y - cy, x - cx) + Math.PI / 2;
        
        const newElements = elements.map(el => {
            if (el.id === selectedIds[0]) {
                return { ...el, rotation: angle };
            }
            return el;
        });
        setElements(newElements);
        return;
    }

    if (action === 'resizing' && initialElementState && activeHandle && selectedIds.length === 1) {
        const el = initialElementState;
        const cx = el.x + (el.width || 0) / 2;
        const cy = el.y + (el.height || 0) / 2;
        
        const p = rotatePoint({ x, y }, { x: cx, y: cy }, -(el.rotation || 0));
        
        let newX = el.x;
        let newY = el.y;
        let newW = el.width || 0;
        let newH = el.height || 0;

        if (activeHandle.includes('n')) {
             const delta = p.y - el.y;
             newY += delta;
             newH -= delta;
        }
        if (activeHandle.includes('s')) {
             newH = p.y - el.y;
        }
        if (activeHandle.includes('w')) {
             const delta = p.x - el.x;
             newX += delta;
             newW -= delta;
        }
        if (activeHandle.includes('e')) {
             newW = p.x - el.x;
        }

        const unrotatedNewCenter = { x: newX + newW/2, y: newY + newH/2 };
        const rotatedNewCenter = rotatePoint(unrotatedNewCenter, { x: cx, y: cy }, (el.rotation || 0));
        
        const finalX = rotatedNewCenter.x - newW / 2;
        const finalY = rotatedNewCenter.y - newH / 2;

        const newElements = elements.map(e => {
            if (e.id === selectedIds[0]) {
                return { ...e, x: finalX, y: finalY, width: newW, height: newH };
            }
            return e;
        });
        setElements(newElements);
        return;
    }

    if (action === 'drawing') {
       const id = selectedIds[0]; 
       const index = elements.findIndex(e => e.id === id);
       if (index === -1) return;
       const element = elements[index];
       
       if (tool === 'pencil') {
          const newPoints = [...(element.points || []), { x, y }];
          updateElement(index, { points: newPoints });
       } else if (['rectangle', 'circle', 'arrow', 'sticky'].includes(tool)) {
          let width = x - element.x;
          let height = y - element.y;
          if (enableSnapping) {
             width = snapToGrid(width);
             height = snapToGrid(height);
          }
          updateElement(index, { width, height });
       }
    } 
    else if (action === 'moving') {
        const dx = x - dragOffset.x;
        const dy = y - dragOffset.y;
        
        const leaderId = selectedIds[0];
        const leader = elements.find(e => e.id === leaderId);
        if (!leader) return;

        let finalDx = dx;
        let finalDy = dy;
        let newX = leader.x + dx;
        let newY = leader.y + dy;

        if (enableSnapping) {
           const gridX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
           if (Math.abs(newX - gridX) < 10) {
              finalDx = gridX - leader.x;
           }
           const gridY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
           if (Math.abs(newY - gridY) < 10) {
              finalDy = gridY - leader.y;
           }
        }

        const newElements = elements.map(el => {
            if (selectedIds.includes(el.id) && !el.locked) {
                return { ...el, x: el.x + finalDx, y: el.y + finalDy };
            }
            return el;
        });
        
        setElements(newElements);
        setDragOffset({ x, y }); 
    }
  };

  const handleMouseUp = () => {
    if (action === 'selecting' && selectionBox) {
        const x1 = Math.min(selectionBox.start.x, selectionBox.current.x);
        const y1 = Math.min(selectionBox.start.y, selectionBox.current.y);
        const x2 = Math.max(selectionBox.start.x, selectionBox.current.x);
        const y2 = Math.max(selectionBox.start.y, selectionBox.current.y);
        
        const newSelected = elements.filter(el => {
            const w = el.width || 0;
            const h = el.height || 0;
            const ex = el.x; const ey = el.y;
            return ex < x2 && ex + w > x1 && ey < y2 && ey + h > y1;
        }).map(e => e.id);
        
        setSelectedIds(newSelected);
        setSelectionBox(null);
    }
    else if (['drawing', 'moving', 'resizing', 'rotating'].includes(action)) {
      const newElements = elements.map((el) => {
          if (selectedIds.includes(el.id)) {
              if (action === 'drawing') {
                 if (tool === 'pencil' && el.points && el.points.length > 0) {
                     let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                     el.points.forEach(p => {
                        minX = Math.min(minX, p.x);
                        minY = Math.min(minY, p.y);
                        maxX = Math.max(maxX, p.x);
                        maxY = Math.max(maxY, p.y);
                     });
                     return { ...el, x: minX, y: minY, width: maxX - minX, height: maxY - minY };
                 }
                 return adjustCoordinates(el);
              }
              return el;
          }
          return el;
      });
      
      setElements(newElements);
      const newHistory = history.slice(0, historyIndex + 1);
      setHistory([...newHistory, newElements]);
      setHistoryIndex(newHistory.length);
    }

    setAction('idle');
    setActiveHandle(null);
    setInitialElementState(null);
    setGuides([]);
  };

  const updateElement = (index: number, updates: Partial<CanvasElement>) => {
    const newElements = [...elements];
    newElements[index] = { ...newElements[index], ...updates };
    setElements(newElements);
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        draw(); 
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [elements, viewport, selectedIds, showGrid, guides, selectionBox]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        setViewport(v => ({ 
          ...v, 
          zoom: Math.min(Math.max(0.1, v.zoom + delta), 5) 
        }));
      } else {
        setViewport(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    const canvas = canvasRef.current;
    if (canvas) canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      if (canvas) canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const activeElements = elements.filter(el => selectedIds.includes(el.id));

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className={`block w-full h-full touch-none ${
            tool === 'pan' || action === 'panning' ? 'cursor-grab active:cursor-grabbing' : 
            tool === 'selection' ? 'cursor-default' : 'cursor-crosshair'
        }`}
      />
      
      {activeElements.length > 0 && (
        <PropertiesPanel 
          elements={activeElements} 
          onChange={handlePropertyChange}
          onLayerAction={handleLayerAction}
        />
      )}
    </div>
  );
});

export default Whiteboard;