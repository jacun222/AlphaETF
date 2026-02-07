import React from 'react';
import { ETF } from '../types';

interface ETFCardProps {
  etf: ETF;
  isLeftSelected: boolean;
  isRightSelected: boolean;
  onSelectLeft: (etf: ETF) => void;
  onSelectRight: (etf: ETF) => void;
}

const ETFCard: React.FC<ETFCardProps> = ({ etf, isLeftSelected, isRightSelected, onSelectLeft, onSelectRight }) => {
  const isSelected = isLeftSelected || isRightSelected;
  
  return (
    <div 
      className={`
        relative border rounded-xl p-5 transition-all duration-200 group
        ${isLeftSelected ? 'border-blue-500 bg-blue-50/50 shadow-md ring-1 ring-blue-500' : ''}
        ${isRightSelected ? 'border-amber-500 bg-amber-50/50 shadow-md ring-1 ring-amber-500' : ''}
        ${!isSelected ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm' : ''}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 mb-1">
            {etf.ticker}
          </span>
          <h3 className="font-bold text-slate-800 leading-tight">{etf.name}</h3>
        </div>
        <div className="text-right">
          <span className="block text-lg font-bold text-slate-900">{etf.ter}%</span>
          <span className="text-xs text-slate-500 uppercase tracking-wide">TER</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mt-4 text-slate-600">
        <div className="flex flex-col">
           <span className="text-xs text-slate-400">Policy</span>
           <span>{etf.distribution === 'Accumulating' ? 'Acc' : 'Dist'}</span>
        </div>
        <div className="flex flex-col">
           <span className="text-xs text-slate-400">Replication</span>
           <span>{etf.replication}</span>
        </div>
      </div>
      
      {/* Selection Overlay / Buttons */}
      <div className="mt-4 flex gap-2">
          <button 
            onClick={() => onSelectLeft(etf)}
            className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${isLeftSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700'}`}
          >
            {isLeftSelected ? 'Selected A' : 'Set as A'}
          </button>
          <button 
            onClick={() => onSelectRight(etf)}
            className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${isRightSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700'}`}
          >
             {isRightSelected ? 'Selected B' : 'Set as B'}
          </button>
      </div>
    </div>
  );
};

export default ETFCard;