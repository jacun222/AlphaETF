import React, { useState, useEffect, useMemo } from 'react';
import { getEtfs, getEtfPerformance } from './services/etfDataService';
import { getBrokersForEtfs } from './services/brokerService';
import { analyzeEtfComparison } from './services/geminiService';
import { ETF, EtfCategory, EtfPerformance, AIAnalysisResult, InvestmentHorizon } from './types';
import ETFCard from './components/ETFCard';
import PerformanceTable from './components/PerformanceTable';
import FundamentalComparison from './components/FundamentalComparison'; 
import AIAnalysisDashboard from './components/AIAnalysisDashboard'; 
import ChatAssistant from './components/ChatAssistant'; 

// --- Components for App Structure ---

const CategoryTab: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`
            px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap
            ${isActive 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}
        `}
    >
        {label}
    </button>
);

const EmptySlot: React.FC<{ label: string; colorClass: string }> = ({ label, colorClass }) => (
    <div className={`h-24 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50/50 ${colorClass}`}>
        <span className="text-slate-400 text-sm font-medium flex items-center gap-2">
            <svg className="w-5 h-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Select {label}
        </span>
    </div>
);

const SelectedSlot: React.FC<{ etf: ETF; label: string; color: string; onRemove: () => void }> = ({ etf, label, color, onRemove }) => (
    <div className="h-24 rounded-xl border border-slate-200 bg-white p-4 shadow-sm relative overflow-hidden group">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${color}`}></div>
        <div className="flex justify-between items-start">
             <div>
                 <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60`}>{label}</div>
                 <h3 className="font-bold text-slate-800 leading-tight">{etf.ticker}</h3>
                 <p className="text-xs text-slate-500 truncate max-w-[150px]">{etf.name}</p>
             </div>
             <button 
                onClick={onRemove}
                className="text-slate-300 hover:text-red-500 transition-colors p-1"
             >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
        </div>
        <div className="mt-2 flex gap-3 text-xs text-slate-600">
            <span>TER: <span className="font-semibold">{etf.ter}%</span></span>
            <span>{etf.distribution === 'Accumulating' ? 'Acc' : 'Dist'}</span>
        </div>
    </div>
);

// Helper component for Market Status
const MarketIndicator: React.FC<{ name: string; timezone: string; openHour: number; closeHour: number }> = ({ name, timezone, openHour, closeHour }) => {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    const checkStatus = () => {
      const now = new Date();
      const marketTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
      const currentFloat = marketTime.getHours() + marketTime.getMinutes() / 60;
      const day = marketTime.getDay();
      setIsOpen(day !== 0 && day !== 6 && currentFloat >= openHour && currentFloat < closeHour);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, [timezone, openHour, closeHour]);
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-slate-400">{name}</span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded ${isOpen ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
        {isOpen ? 'Open' : 'Closed'}
      </span>
    </div>
  );
};

const App: React.FC = () => {
  // Global State
  const [currency, setCurrency] = useState<string>('PLN'); // Default to PLN based on feedback
  const [taxDomicile, setTaxDomicile] = useState<string>('Poland');
  const [investmentHorizon, setInvestmentHorizon] = useState<InvestmentHorizon>('20 Years');
  
  // Selection State
  const [etfLeft, setEtfLeft] = useState<ETF | null>(null);
  const [etfRight, setEtfRight] = useState<ETF | null>(null);
  const [activeCategory, setActiveCategory] = useState<EtfCategory>('Global');

  // Data State
  const [allEtfs, setAllEtfs] = useState<ETF[]>([]);
  const [loading, setLoading] = useState(true);

  // Performance Data State (Replaces Chart Data)
  const [perfLeft, setPerfLeft] = useState<EtfPerformance | null>(null);
  const [perfRight, setPerfRight] = useState<EtfPerformance | null>(null);
  const [isPerfLoading, setIsPerfLoading] = useState(false);

  // Analysis State - CHANGED TYPE
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load Data
  useEffect(() => {
    getEtfs().then(data => {
      setAllEtfs(data);
      setLoading(false);
    });
  }, []);

  // Filtered List based on Tab
  const displayedEtfs = useMemo(() => {
      return allEtfs.filter(e => e.category === activeCategory);
  }, [allEtfs, activeCategory]);

  const categories: EtfCategory[] = ['Global', 'USA S&P500', 'Tech/Nasdaq', 'Europe', 'High Dividend', 'Emerging', 'Bonds/Special', 'LifeStrategy/Multi'];

  // Handlers
  const handleSelectLeft = (etf: ETF) => {
      setEtfLeft(etf);
      if (etfRight?.isin === etf.isin) setEtfRight(null); // Prevent same on both sides
      setAiAnalysis(null); // Reset
      setPerfLeft(null); // Reset Data
  };
  const handleSelectRight = (etf: ETF) => {
      setEtfRight(etf);
      if (etfLeft?.isin === etf.isin) setEtfLeft(null);
      setAiAnalysis(null); // Reset
      setPerfRight(null); // Reset Data
  };

  const runAnalysis = async () => {
    if (!etfLeft || !etfRight) return;
    setIsAnalyzing(true);
    const result = await analyzeEtfComparison(etfLeft, etfRight, investmentHorizon);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const commonBrokers = useMemo(() => {
      const selected = [etfLeft, etfRight].filter(Boolean) as ETF[];
      if (selected.length === 0) return [];
      return getBrokersForEtfs(selected);
  }, [etfLeft, etfRight]);

  // Fetch Performance Table Data
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
        // Only fetch if BOTH are selected
        if (!etfLeft || !etfRight) {
            setPerfLeft(null);
            setPerfRight(null);
            return;
        }

        setIsPerfLoading(true);

        try {
            // SEQUENTIAL FETCHING to avoid Rate Limits
            const p1 = await getEtfPerformance(etfLeft.ticker, currency, etfLeft.category);
            if (isMounted) setPerfLeft(p1);
            
            await new Promise(r => setTimeout(r, 500)); // Small pause

            const p2 = await getEtfPerformance(etfRight.ticker, currency, etfRight.category);
            if (isMounted) setPerfRight(p2);

        } catch (err) {
            console.error("Critical Data Error:", err);
        } finally {
            if (isMounted) setIsPerfLoading(false);
        }
    };

    fetchData();

    return () => { isMounted = false; };
  }, [etfLeft, etfRight, currency]);

  return (
    <div className="min-h-screen flex flex-col xl:flex-row bg-slate-50 text-slate-800 font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-full xl:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col justify-between">
        <div>
          <div className="p-6">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Alpha ETF
            </h1>
            <p className="text-slate-400 text-sm mt-1">AI Investment Guide</p>
          </div>
          
          <div className="px-6 py-4 space-y-4">
              {/* Domicile Selector */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-2">My Domicile</label>
                <select value={taxDomicile} onChange={(e) => setTaxDomicile(e.target.value)} className="w-full bg-slate-800 text-sm rounded px-3 py-2 border border-slate-700 outline-none">
                    <option value="Poland">Poland</option>
                    <option value="Germany">Germany</option>
                    <option value="UK">UK</option>
                </select>
              </div>

              {/* Horizon Selector (NEW) */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-2">Investment Horizon</label>
                <select 
                    value={investmentHorizon} 
                    onChange={(e) => {
                        setInvestmentHorizon(e.target.value as InvestmentHorizon);
                        setAiAnalysis(null); // Reset analysis on change
                    }} 
                    className="w-full bg-slate-800 text-sm rounded px-3 py-2 border border-slate-700 outline-none hover:border-indigo-500 transition-colors"
                >
                    <option value="5 Years">5 Years (Short)</option>
                    <option value="10 Years">10 Years (Medium)</option>
                    <option value="20 Years">20 Years (Long)</option>
                    <option value="30+ Years">30+ Years (Retire)</option>
                </select>
              </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800">
            <MarketIndicator name="GPW (Warsaw)" timezone="Europe/Warsaw" openHour={9} closeHour={17.08} />
            <MarketIndicator name="Xetra (DE)" timezone="Europe/Berlin" openHour={9} closeHour={17.5} />
            <MarketIndicator name="NYSE (US)" timezone="America/New_York" openHour={9.5} closeHour={16} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        
        {/* Comparator Header - The "Split View" */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Slot A */}
            {etfLeft ? (
                <SelectedSlot 
                    etf={etfLeft} 
                    label="Asset A" 
                    color="bg-blue-500" 
                    onRemove={() => setEtfLeft(null)} 
                />
            ) : (
                <EmptySlot label="Asset A" colorClass="hover:border-blue-400 hover:bg-blue-50" />
            )}

            {/* Slot B */}
            {etfRight ? (
                <SelectedSlot 
                    etf={etfRight} 
                    label="Asset B" 
                    color="bg-amber-500" 
                    onRemove={() => setEtfRight(null)} 
                />
            ) : (
                <EmptySlot label="Asset B" colorClass="hover:border-amber-400 hover:bg-amber-50" />
            )}
        </div>

        {/* --- PERFORMANCE TABLE --- */}
        {(etfLeft && etfRight) ? (
            <>
                <PerformanceTable 
                    etfLeft={etfLeft}
                    etfRight={etfRight}
                    perfLeft={perfLeft}
                    perfRight={perfRight}
                    isLoading={isPerfLoading}
                    currency={currency}
                    setCurrency={setCurrency}
                />
                {/* --- FUNDAMENTAL & DIVIDEND COMPARISON --- */}
                <FundamentalComparison 
                    etfLeft={etfLeft}
                    etfRight={etfRight}
                />
            </>
        ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 mb-8 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                <svg className="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                <p className="text-sm font-medium">Select both Asset A and Asset B to compare Returns (1M - 5Y)</p>
            </div>
        )}

        {/* --- ANALYSIS & BROKERS SECTION --- */}
        {etfLeft && etfRight && (
             <div>
                 {/* BROKER TABLE - Full Width Row */}
                 <div className="mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800">Best Brokers for Selected Pair</h3>
                        </div>
                        {commonBrokers.length > 0 ? (
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3">Broker</th>
                                        <th className="px-6 py-3">{etfLeft.ticker}</th>
                                        <th className="px-6 py-3">{etfRight.ticker}</th>
                                        <th className="px-6 py-3">FX Fee</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {commonBrokers.map(b => (
                                        <tr key={b.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                            <td className="px-6 py-3 font-medium text-slate-700">{b.name}</td>
                                            <td className="px-6 py-3">
                                                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">
                                                    {b.etfStatus.find(s => s.isin === etfLeft.isin)?.costNote || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">
                                                    {b.etfStatus.find(s => s.isin === etfRight.isin)?.costNote || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-slate-500">{b.currencyConversionFee}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-slate-400 italic">
                                No broker data available for this pair.
                            </div>
                        )}
                    </div>
                 </div>

                 {/* AI INSIGHTS GRID: Analysis + Chat */}
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                     {/* Analysis Dashboard */}
                     <div className="h-full">
                         <AIAnalysisDashboard 
                            analysis={aiAnalysis} 
                            isAnalyzing={isAnalyzing} 
                            onRunAnalysis={runAnalysis}
                            etfLeft={etfLeft}
                            etfRight={etfRight}
                         />
                     </div>
                     
                     {/* Embedded AI Chat Module */}
                     <div className="h-full">
                        <ChatAssistant etfLeft={etfLeft} etfRight={etfRight} />
                     </div>
                 </div>
             </div>
        )}

        {/* ETF Universe Selector */}
        <div className="mt-4">
             <div className="flex overflow-x-auto pb-4 gap-2 mb-2 no-scrollbar">
                {categories.map(cat => (
                    <CategoryTab 
                        key={cat} 
                        label={cat} 
                        isActive={activeCategory === cat} 
                        onClick={() => setActiveCategory(cat)} 
                    />
                ))}
             </div>
             
             {loading ? (
                 <div className="h-40 flex items-center justify-center text-slate-400">Loading Universe...</div>
             ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                     {displayedEtfs.map(etf => (
                         <ETFCard 
                            key={etf.isin} 
                            etf={etf} 
                            isLeftSelected={etfLeft?.isin === etf.isin}
                            isRightSelected={etfRight?.isin === etf.isin}
                            onSelectLeft={handleSelectLeft}
                            onSelectRight={handleSelectRight}
                         />
                     ))}
                 </div>
             )}
        </div>

      </main>
    </div>
  );
};

export default App;