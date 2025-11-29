import React from 'react';
import { CanvasElement } from '../types';
import { PALETTE_COLORS, STICKY_COLORS, FONT_FAMILIES } from '../constants';

interface PropertiesPanelProps {
  elements: CanvasElement[];
  onChange: (updates: Partial<CanvasElement>) => void;
  onLayerAction: (action: 'forward' | 'backward' | 'front' | 'back') => void;
}

const STICKY_PALETTE = Object.values(STICKY_COLORS);

interface ColorButtonProps {
  color: string;
  selected: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

const ColorButton: React.FC<ColorButtonProps> = ({ color, selected, onClick, children }) => (
  <button
    onPointerDown={(e) => e.stopPropagation()}
    onClick={onClick}
    className={`w-6 h-6 rounded-full border border-slate-200 transition-transform hover:scale-110 flex items-center justify-center ${selected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
    style={{ backgroundColor: color === 'transparent' ? 'white' : color }}
    title={color}
  >
    {children}
    {color === 'transparent' && !children && (
      <div className="w-full h-px bg-red-500 transform -rotate-45" />
    )}
  </button>
);

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ elements, onChange, onLayerAction }) => {
  if (elements.length === 0) return null;

  const first = elements[0];
  const isMultiple = elements.length > 1;

  const allSticky = elements.every(e => e.type === 'sticky');
  const allText = elements.every(e => e.type === 'text');
  
  const hasStroke = true; 
  const hasFill = elements.every(e => ['rectangle', 'circle', 'sticky'].includes(e.type));
  const hasWidth = true;
  const hasTextProps = allText || allSticky;
  
  const fillPalette = allSticky ? STICKY_PALETTE : [...PALETTE_COLORS, 'transparent'];

  return (
    <div 
      className="absolute top-16 right-4 bg-white/95 backdrop-blur p-4 rounded-xl shadow-xl border border-slate-200 w-72 flex flex-col gap-4 animate-in fade-in zoom-in duration-200 select-none z-50 max-h-[80vh] overflow-y-auto custom-scrollbar"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 sticky top-0 bg-white/95 z-10">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
           {isMultiple ? `${elements.length} Selected` : 'Properties'}
        </span>
        <div className="flex items-center gap-2">
           <button
            onClick={() => onChange({ locked: !first.locked })}
            className={`p-1 rounded hover:bg-slate-100 transition-colors ${first.locked ? 'text-red-500' : 'text-slate-400'}`}
            title={first.locked ? "Unlock" : "Lock"}
          >
            {first.locked ? (
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
            )}
          </button>
        </div>
      </div>

      {first.locked && !isMultiple ? (
        <div className="py-8 text-center text-slate-400 text-sm italic">
          Element is locked
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Arrange / Layering */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-2 block">Arrange</label>
            <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
              <button onClick={() => onLayerAction('back')} title="Send to Back" className="flex-1 p-1 hover:bg-white rounded shadow-sm transition-all text-slate-600 flex justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline><polyline points="6 3 12 9 18 3"></polyline></svg>
              </button>
              <button onClick={() => onLayerAction('backward')} title="Send Backward" className="flex-1 p-1 hover:bg-white rounded shadow-sm transition-all text-slate-600 flex justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <button onClick={() => onLayerAction('forward')} title="Bring Forward" className="flex-1 p-1 hover:bg-white rounded shadow-sm transition-all text-slate-600 flex justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
              </button>
              <button onClick={() => onLayerAction('front')} title="Bring to Front" className="flex-1 p-1 hover:bg-white rounded shadow-sm transition-all text-slate-600 flex justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline><polyline points="18 21 12 15 6 21"></polyline></svg>
              </button>
            </div>
          </div>

          {/* Opacity */}
          <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-slate-700">Opacity</label>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 rounded">
                   {isMultiple ? '-' : Math.round((first.opacity ?? 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={first.opacity ?? 1}
                onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
          </div>

          {/* Stroke Style */}
          {hasStroke && (
            <div>
               <label className="text-xs font-medium text-slate-700 mb-2 block">Stroke Style</label>
               <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                  <button 
                     onClick={() => onChange({ strokeStyle: 'solid' })}
                     className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all ${first.strokeStyle !== 'dashed' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-white/50'}`}
                  >
                     Solid
                  </button>
                  <button 
                     onClick={() => onChange({ strokeStyle: 'dashed' })}
                     className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all ${first.strokeStyle === 'dashed' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-white/50'}`}
                  >
                     Dashed
                  </button>
               </div>
            </div>
          )}

          {/* Stroke Color */}
          {hasStroke && (
            <div>
              <label className="text-xs font-medium text-slate-700 mb-2 block">
                {(allText || allSticky) ? 'Text Color' : 'Stroke Color'}
              </label>
              <div className="flex flex-wrap gap-2">
                {PALETTE_COLORS.map(color => (
                  <ColorButton 
                    key={color} 
                    color={color} 
                    selected={!isMultiple && first.strokeColor === color} 
                    onClick={() => onChange({ strokeColor: color })} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Fill Color */}
          {hasFill && (
            <div>
              <label className="text-xs font-medium text-slate-700 mb-2 block">
                {allSticky ? 'Note Color' : 'Fill Color'}
              </label>
              <div className="flex flex-wrap gap-2">
                {fillPalette.map(color => (
                  <ColorButton
                    key={color}
                    color={color}
                    selected={!isMultiple && first.backgroundColor === color}
                    onClick={() => onChange({ backgroundColor: color })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stroke Width / Font Size */}
          {hasWidth && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-slate-700">
                  {(allText || allSticky) ? 'Font Size' : 'Stroke Width'}
                </label>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 rounded">
                   {isMultiple ? '-' : first.strokeWidth}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={first.strokeWidth}
                onChange={(e) => onChange({ strokeWidth: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          )}

          {/* Typography */}
          {hasTextProps && (
            <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
               <div>
                <label className="text-xs font-medium text-slate-700 mb-2 block">Font Family</label>
                <select 
                  value={first.fontFamily || 'sans-serif'}
                  onChange={(e) => onChange({ fontFamily: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="sans-serif">Sans Serif</option>
                  <option value="serif">Serif</option>
                  <option value="monospace">Monospace</option>
                  <option value="cursive">Handwritten</option>
                </select>
               </div>
               
               <div>
                <label className="text-xs font-medium text-slate-700 mb-2 block">Alignment</label>
                <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                  <button 
                    onClick={() => onChange({ textAlign: 'left' })}
                    className={`flex-1 p-1 rounded transition-all flex justify-center ${first.textAlign === 'left' || (!first.textAlign && !isMultiple) ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-white/50'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>
                  </button>
                  <button 
                    onClick={() => onChange({ textAlign: 'center' })}
                    className={`flex-1 p-1 rounded transition-all flex justify-center ${first.textAlign === 'center' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-white/50'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6"></line><line x1="17" y1="10" x2="7" y2="10"></line><line x1="19" y1="14" x2="5" y2="14"></line><line x1="17" y1="18" x2="7" y2="18"></line></svg>
                  </button>
                  <button 
                    onClick={() => onChange({ textAlign: 'right' })}
                    className={`flex-1 p-1 rounded transition-all flex justify-center ${first.textAlign === 'right' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-white/50'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>
                  </button>
                </div>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;