import React from 'react';
import { AIAnalysisResult, ETF } from '../types';

interface AIAnalysisDashboardProps {
  analysis: AIAnalysisResult | null;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  etfLeft: ETF;
  etfRight: ETF;
}

// Helper for the Gauge Chart
const ConfidenceGauge: React.FC<{ score: number; colorClass: string }> = ({ score, colorClass }) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    
    return (
        <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
                <circle cx="50%" cy="50%" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-200" />
                <circle 
                    cx="50%" cy="50%" r={radius} 
                    stroke="currentColor" strokeWidth="6" fill="transparent" 
                    className={`${colorClass} transition-all duration-1000 ease-out`}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className={`text-sm font-black ${colorClass}`}>{score}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Score</span>
            </div>
        </div>
    );
};

const AIAnalysisDashboard: React.FC<AIAnalysisDashboardProps> = ({ 
    analysis, isAnalyzing, onRunAnalysis, etfLeft, etfRight 
}) => {

  // --- 1. Empty State ---
  if (!analysis && !isAnalyzing) {
      return (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden h-full flex flex-col">
              <div className="bg-slate-900 p-8 flex justify-between items-center relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-30"></div>
                  <div className="absolute -left-6 bottom-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
                  <div className="relative z-10">
                      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                          <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          AI Verdict 2.0
                      </h3>
                      <p className="text-indigo-200 text-sm mt-1 max-w-[200px]">Advanced algorithms analyzing Cost, Tax, and Risk factors.</p>
                  </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                  <button 
                    onClick={onRunAnalysis}
                    className="group relative inline-flex items-center justify-center px-8 py-3 text-base font-bold text-white transition-all duration-200 bg-indigo-600 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-lg"
                  >
                      Run Comparative Analysis
                      <svg className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                  <p className="mt-4 text-xs text-slate-400 uppercase tracking-widest font-semibold">Powered by Gemini 1.5 Flash</p>
              </div>
          </div>
      );
  }

  // --- 2. Loading State ---
  if (isAnalyzing) {
      return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 h-full flex flex-col items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 bg-slate-50 opacity-50"></div>
              <div className="relative z-10 flex flex-col items-center">
                  <div className="relative">
                       <div className="w-16 h-16 border-4 border-indigo-100 rounded-full animate-spin border-t-indigo-600"></div>
                       <div className="absolute inset-0 flex items-center justify-center">
                           <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                       </div>
                  </div>
                  <h4 className="text-slate-800 font-bold text-lg mt-6 animate-pulse">Running Simulation...</h4>
                  <div className="mt-2 text-xs text-slate-500 font-mono">Analyzing {etfLeft.ticker} vs {etfRight.ticker}</div>
              </div>
          </div>
      );
  }

  if (!analysis) return null;

  // --- 3. Result Dashboard ---
  
  const isLeftWinner = analysis.winnerTicker === etfLeft.ticker;
  const isRightWinner = analysis.winnerTicker === etfRight.ticker;
  const isTie = !isLeftWinner && !isRightWinner;
  const winnerColor = isLeftWinner ? 'text-blue-600' : isRightWinner ? 'text-amber-600' : 'text-slate-600';
  const bgHeader = isLeftWinner ? 'bg-gradient-to-br from-blue-50 to-white' : isRightWinner ? 'bg-gradient-to-br from-amber-50 to-white' : 'bg-gradient-to-br from-slate-50 to-white';

  const riskColor = analysis.composition?.riskLevel === 'Low' ? 'text-green-600 bg-green-50' 
                  : analysis.composition?.riskLevel === 'Medium' ? 'text-amber-600 bg-amber-50'
                  : 'text-red-600 bg-red-50';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-full animate-in zoom-in-95 duration-500">
        
        {/* A. Header Section */}
        <div className={`p-6 border-b border-slate-100 ${bgHeader} relative`}>
             <div className="flex justify-between items-start">
                 <div className="flex-1">
                     <div className="flex gap-2 mb-2">
                         <span className="inline-block py-1 px-2 rounded bg-white border border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider shadow-sm">
                             Analysis Result
                         </span>
                         <span className="inline-block py-1 px-2 rounded bg-slate-800 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                             {analysis.investmentHorizon}
                         </span>
                     </div>
                     <h2 className={`text-3xl font-black ${winnerColor} leading-none mb-2`}>
                        {isTie ? "DRAW" : analysis.winnerTicker}
                     </h2>
                     <p className="text-sm font-medium text-slate-700 italic">"{analysis.headline}"</p>
                 </div>
                 
                 <ConfidenceGauge 
                    score={analysis.confidenceScore} 
                    colorClass={isLeftWinner ? 'text-blue-500' : isRightWinner ? 'text-amber-500' : 'text-slate-400'} 
                 />
             </div>
        </div>

        {/* B. Risk & Composition (NEW) */}
        {analysis.composition && (
            <div className="p-4 bg-white border-b border-slate-100">
                <div className="flex justify-between items-center mb-3">
                     <h4 className="text-[10px] font-bold text-slate-400 uppercase">Risk & Exposure</h4>
                     <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${riskColor}`}>
                         {analysis.composition.riskLevel} Risk
                     </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Top Regions</div>
                        <div className="flex flex-wrap gap-1">
                            {analysis.composition.topRegions.map((r, i) => (
                                <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{r}</span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Top Sectors</div>
                        <div className="flex flex-wrap gap-1">
                            {analysis.composition.topSectors.map((s, i) => (
                                <span key={i} className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">{s}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                     <span className="text-[10px] font-medium text-slate-500">Diversification Rating</span>
                     <div className="flex gap-0.5">
                         {[...Array(10)].map((_, i) => (
                             <div key={i} className={`w-3 h-1.5 rounded-sm ${i < analysis.composition.diversificationScore ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                         ))}
                     </div>
                </div>
            </div>
        )}

        {/* C. Head-to-Head Key Advantages */}
        <div className="grid grid-cols-2 border-b border-slate-100">
             <div className="p-4 border-r border-slate-100 bg-slate-50/30">
                 <div className="text-xs font-bold text-slate-400 uppercase mb-2">Why {etfLeft.ticker}?</div>
                 <ul className="space-y-1.5">
                     {analysis.etf1Advantages?.map((adv, i) => (
                         <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600 leading-snug">
                             <span className="mt-1 w-1 h-1 rounded-full bg-blue-500 shrink-0"></span>
                             {adv}
                         </li>
                     ))}
                 </ul>
             </div>
             <div className="p-4 bg-slate-50/30">
                 <div className="text-xs font-bold text-slate-400 uppercase mb-2">Why {etfRight.ticker}?</div>
                 <ul className="space-y-1.5">
                     {analysis.etf2Advantages?.map((adv, i) => (
                         <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600 leading-snug">
                             <span className="mt-1 w-1 h-1 rounded-full bg-amber-500 shrink-0"></span>
                             {adv}
                         </li>
                     ))}
                 </ul>
             </div>
        </div>

        {/* D. Detailed Factors (Compact List) */}
        <div className="flex-1 bg-white overflow-y-auto custom-scrollbar">
            {analysis.factors.map((factor, idx) => {
                 const fLeftWin = factor.winnerTicker === etfLeft.ticker;
                 const fRightWin = factor.winnerTicker === etfRight.ticker;
                 return (
                    <div key={idx} className="p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold uppercase text-slate-500">{factor.category}</span>
                            {factor.winnerTicker !== 'Tie' && (
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${fLeftWin ? 'bg-blue-100 text-blue-700' : fRightWin ? 'bg-amber-100 text-amber-700' : ''}`}>
                                    {factor.winnerTicker}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{factor.summary}</p>
                    </div>
                 );
            })}
        </div>

        {/* E. Final Verdict Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Strategic Recommendation
            </h4>
            <div className="text-xs text-slate-700 leading-relaxed text-justify font-medium">
                {analysis.finalVerdict}
            </div>
        </div>

    </div>
  );
};

export default AIAnalysisDashboard;
