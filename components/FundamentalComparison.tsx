import React from 'react';
import { ETF } from '../types';
import GeoMap from './GeoMap';

interface FundamentalComparisonProps {
  etfLeft: ETF;
  etfRight: ETF;
}

const ProgressBar: React.FC<{ value: number; max: number; color: string; label?: string }> = ({ value, max, color, label }) => {
    const percentage = Math.min(100, (value / max) * 100);
    return (
        <div className="w-full">
            {label && <div className="text-[10px] text-slate-500 mb-1 flex justify-between"><span>{label}</span><span className="font-bold">{value}</span></div>}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

const AllocationBar: React.FC<{ data: Record<string, number> }> = ({ data }) => {
    const sortedKeys = Object.keys(data).sort((a, b) => data[b] - data[a]).slice(0, 4); // Top 4
    
    // Check if empty
    if(sortedKeys.length === 0) return <div className="text-xs text-slate-400 italic">No data</div>

    return (
        <div className="space-y-2">
            {sortedKeys.map(key => (
                <div key={key} className="flex items-center gap-2 text-xs">
                    <div className="w-20 truncate text-slate-500 font-medium">{key}</div>
                    <div className="flex-1">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${data[key]}%` }}></div>
                        </div>
                    </div>
                    <div className="w-8 text-right font-bold text-slate-700">{data[key]}%</div>
                </div>
            ))}
        </div>
    );
}

const FundamentalComparison: React.FC<FundamentalComparisonProps> = ({ etfLeft, etfRight }) => {
  
  const maxAum = Math.max(etfLeft.aum, etfRight.aum, 1000); // Scale relative to largest, min 1000

  // Dividend History Logic
  const hasDividends = etfLeft.distribution === 'Distributing' || etfRight.distribution === 'Distributing';
  
  // Helper to safely render dividend history row
  const renderDivRow = (year: number) => {
      const leftData = etfLeft.dividendHistory?.find(d => d.year === year);
      const rightData = etfRight.dividendHistory?.find(d => d.year === year);
      
      if (!leftData && !rightData) return null;

      return (
          <tr key={year} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
              <td className="px-4 py-3 font-bold text-slate-700">{year}</td>
              {/* Left ETF */}
              <td className="px-4 py-3 text-right bg-blue-50/10">
                  {leftData ? <span className="text-slate-800 font-medium">{leftData.yield.toFixed(2)}%</span> : <span className="text-slate-300">-</span>}
              </td>
              <td className="px-4 py-3 text-right border-r border-slate-100 bg-blue-50/10">
                   {leftData ? <span className="text-blue-700 font-bold">{leftData.amount.toFixed(2)} {etfLeft.currency}</span> : <span className="text-slate-300">-</span>}
              </td>

               {/* Right ETF */}
              <td className="px-4 py-3 text-right bg-amber-50/10">
                  {rightData ? <span className="text-slate-800 font-medium">{rightData.yield.toFixed(2)}%</span> : <span className="text-slate-300">-</span>}
              </td>
              <td className="px-4 py-3 text-right bg-amber-50/10">
                   {rightData ? <span className="text-amber-700 font-bold">{rightData.amount.toFixed(2)} {etfRight.currency}</span> : <span className="text-slate-300">-</span>}
              </td>
          </tr>
      )
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
        
        {/* Main Fundamental Comparison */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800">Fundamental & Composition Analysis</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                
                {/* ETF LEFT COLUMN */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-xs">{etfLeft.ticker}</span>
                        <span className="text-sm font-semibold text-slate-700 truncate">{etfLeft.name}</span>
                    </div>

                    {/* Fund Stats */}
                    <div className="mb-6 space-y-4">
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fund Size (AUM)</div>
                            <ProgressBar value={etfLeft.aum} max={maxAum} color="bg-blue-500" label={`€${etfLeft.aum} M`} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Holdings</div>
                                <div className="text-sm font-bold text-slate-800">{etfLeft.holdingsCount}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Replication</div>
                                <div className="text-sm font-bold text-slate-800">{etfLeft.replication}</div>
                            </div>
                        </div>
                    </div>

                    {/* Top Holdings */}
                    <div className="mb-6">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 border-b border-slate-100 pb-1">Top 10 Holdings</div>
                        <ul className="space-y-1">
                            {etfLeft.topHoldings.slice(0, 10).map((h, i) => (
                                <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                    <span className="text-slate-300 font-mono w-4 text-right">{i+1}.</span>
                                    <span className="truncate">{h}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Geography & Map */}
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 border-b border-slate-100 pb-1">Regional Exposure</div>
                        <AllocationBar data={etfLeft.geoAllocation || {}} />
                        <GeoMap 
                            geoAllocation={etfLeft.geoAllocation} 
                            topHoldings={etfLeft.topHoldings} 
                            ticker={etfLeft.ticker} 
                        />
                    </div>
                </div>


                {/* ETF RIGHT COLUMN */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-xs">{etfRight.ticker}</span>
                        <span className="text-sm font-semibold text-slate-700 truncate">{etfRight.name}</span>
                    </div>

                    {/* Fund Stats */}
                    <div className="mb-6 space-y-4">
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fund Size (AUM)</div>
                            <ProgressBar value={etfRight.aum} max={maxAum} color="bg-amber-500" label={`€${etfRight.aum} M`} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Holdings</div>
                                <div className="text-sm font-bold text-slate-800">{etfRight.holdingsCount}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Replication</div>
                                <div className="text-sm font-bold text-slate-800">{etfRight.replication}</div>
                            </div>
                        </div>
                    </div>

                    {/* Top Holdings */}
                    <div className="mb-6">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 border-b border-slate-100 pb-1">Top 10 Holdings</div>
                        <ul className="space-y-1">
                            {etfRight.topHoldings.slice(0, 10).map((h, i) => (
                                <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                    <span className="text-slate-300 font-mono w-4 text-right">{i+1}.</span>
                                    <span className="truncate">{h}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Geography & Map */}
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 border-b border-slate-100 pb-1">Regional Exposure</div>
                        <AllocationBar data={etfRight.geoAllocation || {}} />
                         <GeoMap 
                            geoAllocation={etfRight.geoAllocation} 
                            topHoldings={etfRight.topHoldings} 
                            ticker={etfRight.ticker} 
                        />
                    </div>
                </div>

            </div>
        </div>

        {/* Historical Dividends Section (Conditional) */}
        {hasDividends && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Historical Dividend Payouts</h3>
                    <span className="text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded font-bold uppercase tracking-wider">Distributing Class</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-3 text-left w-20">Year</th>
                                <th className="px-4 py-3 text-right text-blue-500 w-1/4">{etfLeft.ticker} Yield</th>
                                <th className="px-4 py-3 text-right text-blue-500 w-1/4 border-r border-slate-100">Payout (Share)</th>
                                <th className="px-4 py-3 text-right text-amber-500 w-1/4">{etfRight.ticker} Yield</th>
                                <th className="px-4 py-3 text-right text-amber-500 w-1/4">Payout (Share)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Render last 4 years */}
                            {[2023, 2022, 2021, 2020].map(year => renderDivRow(year))}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 bg-slate-50 text-[10px] text-slate-400 text-center italic">
                    Historical yields are approximate based on NAV at year end. Payout amounts are total cash distributions per share for that calendar year.
                </div>
            </div>
        )}
    </div>
  );
};

export default FundamentalComparison;
