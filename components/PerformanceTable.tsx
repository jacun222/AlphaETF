import React, { useState } from 'react';
import { ETF, EtfPerformance } from '../types';

interface PerformanceTableProps {
  etfLeft: ETF;
  etfRight: ETF;
  perfLeft: EtfPerformance | null;
  perfRight: EtfPerformance | null;
  isLoading: boolean;
  currency: string;
  setCurrency: (currency: string) => void;
}

const PerformanceTable: React.FC<PerformanceTableProps> = ({ 
  etfLeft, etfRight, perfLeft, perfRight, isLoading, currency, setCurrency 
}) => {
  
  const [includeDividends, setIncludeDividends] = useState(true);
  const periods = ['1M', '3M', '1Y', '3Y', '5Y'] as const;

  /**
   * Helper to adjust return based on Dividend Policy.
   * API returns Total Return (TR). 
   * If includeDividends is FALSE and ETF is Distributing, we approximate Price Return
   * by subtracting the Yield accumulated over the period.
   */
  const getAdjustedReturn = (baseReturn: number, period: string, etf: ETF) => {
      // Case 1: User wants Total Return (default) -> Return API data directly
      if (includeDividends) return baseReturn;

      // Case 2: Accumulating ETF -> Price Return is effectively Total Return
      if (etf.distribution === 'Accumulating') return baseReturn;

      // Case 3: Distributing ETF + User wants Price Return -> Subtract Yield
      const annualYield = etf.dividendYield * 100; // e.g., 0.02 -> 2.0%
      let drag = 0;

      switch(period) {
          case '1M': drag = annualYield / 12; break;
          case '3M': drag = annualYield / 4; break;
          case '1Y': drag = annualYield; break;
          case '3Y': drag = annualYield * 3; break; // Simple approximation
          case '5Y': drag = annualYield * 5; break;
      }

      return baseReturn - drag;
  };

  if (isLoading) {
      return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-slate-500 font-medium">Fetching performance in {currency}...</p>
          </div>
      );
  }

  if (!perfLeft || !perfRight) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 animate-in fade-in duration-500">
      
      {/* Header Controls */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800">Performance Comparison</h3>
            {(perfLeft.isEstimated || perfRight.isEstimated) && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold uppercase tracking-wider">
                    Est. Data
                </span>
            )}
         </div>

         <div className="flex flex-wrap justify-center gap-4">
            
            {/* Currency Selector (New Location) */}
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currency</span>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
                    <button
                        onClick={() => setCurrency('EUR')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${currency === 'EUR' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        EUR
                    </button>
                    <button
                        onClick={() => setCurrency('PLN')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${currency === 'PLN' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        PLN
                    </button>
                </div>
            </div>

            <div className="w-px h-8 bg-slate-200 hidden md:block"></div>

            {/* Dividend Toggle */}
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metric</span>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
                    <button
                        onClick={() => setIncludeDividends(false)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${!includeDividends ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Price Only
                    </button>
                    <button
                        onClick={() => setIncludeDividends(true)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${includeDividends ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Total Return
                    </button>
                </div>
            </div>
         </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-1/4">Period</th>
              <th className="px-6 py-4 text-center text-blue-600 font-bold w-1/4 border-l border-slate-50 bg-blue-50/10">
                  <div className="flex flex-col">
                    <span>{etfLeft.ticker}</span>
                    <span className="text-[10px] font-normal text-slate-500">{etfLeft.distribution === 'Accumulating' ? 'Acc' : `Dist (${(etfLeft.dividendYield * 100).toFixed(1)}%)`}</span>
                  </div>
              </th>
              <th className="px-6 py-4 text-center text-amber-600 font-bold w-1/4 border-l border-slate-50 bg-amber-50/10">
                  <div className="flex flex-col">
                    <span>{etfRight.ticker}</span>
                    <span className="text-[10px] font-normal text-slate-500">{etfRight.distribution === 'Accumulating' ? 'Acc' : `Dist (${(etfRight.dividendYield * 100).toFixed(1)}%)`}</span>
                  </div>
              </th>
              <th className="px-6 py-4 text-center text-slate-400 w-1/4 border-l border-slate-50">
                  Difference ({currency})
              </th>
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => {
              const rawLeft = perfLeft[period];
              const rawRight = perfRight[period];

              const valLeft = getAdjustedReturn(rawLeft, period, etfLeft);
              const valRight = getAdjustedReturn(rawRight, period, etfRight);
              
              const diff = valLeft - valRight;
              const winner = diff > 0 ? 'left' : diff < 0 ? 'right' : 'draw';

              return (
                <tr key={period} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">{period}</td>
                  
                  {/* Left ETF */}
                  <td className={`px-6 py-4 text-center font-mono border-l border-slate-50 ${winner === 'left' ? 'bg-blue-50/30' : ''}`}>
                    <span className={`font-bold ${valLeft >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {valLeft > 0 ? '+' : ''}{valLeft.toFixed(2)}%
                    </span>
                  </td>

                  {/* Right ETF */}
                  <td className={`px-6 py-4 text-center font-mono border-l border-slate-50 ${winner === 'right' ? 'bg-amber-50/30' : ''}`}>
                    <span className={`font-bold ${valRight >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {valRight > 0 ? '+' : ''}{valRight.toFixed(2)}%
                    </span>
                  </td>

                  {/* Difference */}
                  <td className="px-6 py-4 text-center border-l border-slate-50">
                     <span className={`text-xs font-bold px-2 py-1 rounded ${winner === 'left' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {winner === 'left' ? etfLeft.ticker : etfRight.ticker} +{Math.abs(diff).toFixed(2)}%
                     </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex flex-wrap gap-4 text-[10px] text-slate-400">
         <span className="font-semibold text-slate-500">
            {includeDividends ? 'Note: Showing Total Return (Dividends Reinvested).' : 'Note: Showing Price Return (Dividends Excluded).'}
         </span>
         {perfLeft.source && <span className="truncate max-w-xs">Source A: {new URL(perfLeft.source).hostname}</span>}
         {perfRight.source && <span className="truncate max-w-xs">Source B: {new URL(perfRight.source).hostname}</span>}
      </div>
    </div>
  );
};

export default PerformanceTable;