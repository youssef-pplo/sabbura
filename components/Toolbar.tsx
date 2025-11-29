import React from 'react';
import { Tool } from '../types';

interface ToolbarProps {
  currentTool: Tool;
  setTool: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onAiClick: () => void;
  onExport: () => void;
  onMagicSolve: () => void;
  canUndo: boolean;
  canRedo: boolean;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  enableSnapping: boolean;
  setEnableSnapping: (enable: boolean) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  isSolving: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  currentTool, 
  setTool, 
  onUndo, 
  onRedo, 
  onClear,
  onAiClick,
  onExport,
  onMagicSolve,
  canUndo,
  canRedo,
  showGrid,
  setShowGrid,
  enableSnapping,
  setEnableSnapping,
  zoom,
  setZoom,
  isSolving
}) => {
  
  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'selection', label: 'Select (V)', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg> },
    { id: 'pan', label: 'Pan (Space)', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg> },
    { id: 'rectangle', label: 'Rectangle (R)', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg> },
    { id: 'circle', label: 'Circle (O)', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg> },
    { id: 'arrow', label: 'Arrow (A)', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> },
    { id: 'pencil', label: 'Pencil (P)', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> },
    { id: 'text', label: 'Text (T)', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg> },
    { id: 'sticky', label: 'Note (S)', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
    { id: 'eraser', label: 'Eraser (E)', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z"/><line x1="11" y1="4" x2="17" y2="10"/></svg> },
  ];

  return (
    <>
      <div className="fixed left-4 top-1/2 transform -translate-y-1/2 bg-white rounded-xl shadow-xl border border-slate-200 p-2 flex flex-col gap-2 z-50">
        <div className="flex flex-col gap-1 pb-2 border-b border-slate-100">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setTool(tool.id)}
              title={tool.label}
              className={`p-3 rounded-lg transition-all duration-200 flex items-center justify-center ${
                currentTool === tool.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1 pt-2">
           {/* Settings Toggles */}
           <button
              onClick={() => setShowGrid(!showGrid)}
              title={showGrid ? "Hide Grid" : "Show Grid"}
              className={`p-3 rounded-lg transition-all duration-200 flex items-center justify-center ${
                showGrid ? 'bg-slate-100 text-blue-600' : 'hover:bg-slate-100 text-slate-400'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
            </button>
            
            <button
              onClick={() => setEnableSnapping(!enableSnapping)}
              title={enableSnapping ? "Disable Snapping" : "Enable Snapping"}
              className={`p-3 rounded-lg transition-all duration-200 flex items-center justify-center ${
                enableSnapping ? 'bg-slate-100 text-blue-600' : 'hover:bg-slate-100 text-slate-400'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 19a2 2 0 1 0 2-2"></path><path d="M7 14a2 2 0 1 0 2-2"></path><path d="M7 9a2 2 0 1 0 2-2"></path><path d="M12 9a2 2 0 1 0 2-2"></path><path d="M12 14a2 2 0 1 0 2-2"></path><path d="M12 19a2 2 0 1 0 2-2"></path><path d="M17 19a2 2 0 1 0 2-2"></path><path d="M17 14a2 2 0 1 0 2-2"></path><path d="M17 9a2 2 0 1 0 2-2"></path></svg>
            </button>

           <div className="w-full h-px bg-slate-100 my-1"></div>

           <button
            onClick={onAiClick}
            title="AI Brainstorm"
            className="p-3 rounded-lg transition-all duration-200 flex items-center justify-center text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 12"/><path d="M12 12 5.5 2.5"/><path d="M12 12 18.5 2.5"/></svg>
          </button>

           <button
            onClick={onMagicSolve}
            disabled={isSolving}
            title="Magic Solve (Select & Solve)"
            className="p-3 rounded-lg transition-all duration-200 flex items-center justify-center text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
          >
            {isSolving ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 17v4"/><path d="M3 5h4"/><path d="M17 9h4"/></svg>
            )}
          </button>

          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={`p-3 rounded-lg transition-all duration-200 flex items-center justify-center ${
              !canUndo ? 'opacity-30 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className={`p-3 rounded-lg transition-all duration-200 flex items-center justify-center ${
              !canRedo ? 'opacity-30 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
          </button>
           <button
            onClick={onClear}
            title="Clear Board"
            className="p-3 rounded-lg transition-all duration-200 flex items-center justify-center hover:bg-red-50 text-red-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>

      {/* Top Right Controls: Export & Zoom */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
         <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-1 flex items-center">
            <button
               onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
               className="p-2 text-slate-500 hover:bg-slate-100 rounded-md"
               title="Zoom Out"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </button>
            <span className="w-12 text-center text-xs font-mono text-slate-600">{Math.round(zoom * 100)}%</span>
             <button
               onClick={() => setZoom(Math.min(5, zoom + 0.1))}
               className="p-2 text-slate-500 hover:bg-slate-100 rounded-md"
               title="Zoom In"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </button>
         </div>

         <button
            onClick={onExport}
            className="bg-white text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg shadow-sm border border-slate-200 text-sm font-medium flex items-center gap-2"
         >
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
             Export
         </button>
      </div>
    </>
  );
};

export default Toolbar;