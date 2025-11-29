import React, { useState, useEffect, useRef } from 'react';
import Toolbar from './components/Toolbar';
import Whiteboard from './components/Whiteboard';
import AIAssistant from './components/AIAssistant';
import { CanvasElement, Tool, ViewPort, WhiteboardHandle } from './types';

const App: React.FC = () => {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [history, setHistory] = useState<CanvasElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [tool, setTool] = useState<Tool>('pencil');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiIdeas, setAiIdeas] = useState<{ title: string; description: string }[]>([]);
  const [isSolving, setIsSolving] = useState(false);
  
  // App State
  const [showGrid, setShowGrid] = useState(true);
  const [enableSnapping, setEnableSnapping] = useState(true);
  const [viewport, setViewport] = useState<ViewPort>({ x: 0, y: 0, zoom: 1 });

  const whiteboardRef = useRef<WhiteboardHandle>(null);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  };

  const handleClear = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, []]);
    setHistoryIndex(newHistory.length);
    setElements([]);
  };

  const handleMagicSolve = async () => {
    if (whiteboardRef.current) {
       setIsSolving(true);
       await whiteboardRef.current.solveMath();
       setIsSolving(false);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
         e.preventDefault();
         if (e.shiftKey) handleRedo();
         else handleUndo();
      }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
         e.preventDefault();
         handleRedo();
      }
      
      // Tools Shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;

        switch(e.key.toLowerCase()) {
            case 'v': setTool('selection'); break;
            case 'p': setTool('pencil'); break;
            case 'r': setTool('rectangle'); break;
            case 'o': setTool('circle'); break;
            case 'a': setTool('arrow'); break;
            case 't': setTool('text'); break;
            case 's': setTool('sticky'); break;
            case 'e': setTool('eraser'); break;
            case ' ': setTool('pan'); break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-50 relative selection:bg-blue-200">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-slate-200 text-slate-500 text-sm z-10 pointer-events-none select-none flex items-center gap-2">
        <span className="font-bold text-slate-700">Sabbura</span>
        <span className="text-slate-300">•</span>
        <span>{tool.charAt(0).toUpperCase() + tool.slice(1)} Mode</span>
      </div>

      <Toolbar
        currentTool={tool}
        setTool={setTool}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onAiClick={() => setIsAIModalOpen(true)}
        onExport={() => whiteboardRef.current?.exportImage()}
        onMagicSolve={handleMagicSolve}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        enableSnapping={enableSnapping}
        setEnableSnapping={setEnableSnapping}
        zoom={viewport.zoom}
        setZoom={(z) => setViewport(v => ({ ...v, zoom: z }))}
        isSolving={isSolving}
      />

      <Whiteboard
        ref={whiteboardRef}
        tool={tool}
        elements={elements}
        setElements={setElements}
        history={history}
        setHistory={setHistory}
        historyIndex={historyIndex}
        setHistoryIndex={setHistoryIndex}
        aiIdeas={aiIdeas}
        setAiIdeas={setAiIdeas}
        showGrid={showGrid}
        enableSnapping={enableSnapping}
        viewport={viewport}
        setViewport={setViewport}
      />

      <AIAssistant
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onIdeasGenerated={(ideas) => {
          setAiIdeas(ideas);
          setTool('selection');
        }}
      />
      
      {/* Footer Info */}
      <div className="absolute bottom-4 right-4 text-xs text-slate-400 pointer-events-none select-none">
        Ctrl+Scroll to Zoom • Space to Pan • Drag to Select
      </div>

      {/* Credit Footer */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-slate-400 z-10">
        by youssef pplo [<a href="https://pplo.dev" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">https://pplo.dev</a>]
      </div>
    </div>
  );
};

export default App;