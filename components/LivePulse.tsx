import React, { useState, useEffect } from 'react';
import { MarketPulseData } from '../types';
import { fetchMarketPulse } from '../services/geminiService';

const LivePulse: React.FC = () => {
    const [pulse, setPulse] = useState<MarketPulseData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const loadPulse = async () => {
        setIsLoading(true);
        const data = await fetchMarketPulse();
        if (data) {
            setPulse(data);
            setLastUpdated(new Date());
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadPulse();
        // optionally refresh every 15 minutes: setInterval(loadPulse, 900000)
    }, []);

    const getRiskColor = (risk: string) => {
        switch(risk) {
            case 'Low': return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            case 'High': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'Extreme': return 'text-red-500 bg-red-500/10 border-red-500/20';
            default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Live Market Pulse</h2>
                    <p className="text-slate-500 text-sm mt-1">Real-time news sentiment and geopolitical analysis powered by Google Search.</p>
                </div>
                <div className="flex items-center gap-4">
                    {lastUpdated && (
                        <span className="text-xs font-mono text-slate-400">
                            Live as of: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <button 
                        onClick={loadPulse} 
                        disabled={isLoading}
                        className="bg-white border border-slate-200 shadow-sm text-slate-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {isLoading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        Refresh Pulse
                    </button>
                </div>
            </div>

            {isLoading && !pulse ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-200">
                    <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4"></div>
                    <p className="text-slate-400 font-medium animate-pulse">Running live market sentiment analysis...</p>
                </div>
            ) : pulse ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Executive Summary & Macros */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                            <h3 className="uppercase tracking-widest text-xs font-bold text-indigo-400 mb-4">Macroscopic View</h3>
                            <p className="text-lg leading-relaxed">{pulse.summary}</p>
                            
                            <div className="mt-8">
                                <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">Geopolitical Risk Engine</div>
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${getRiskColor(pulse.geopoliticalRisk)}`}>
                                    <span className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"></span>
                                    {pulse.geopoliticalRisk} Risk
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4">Trending ETF Sectors</h3>
                            <div className="flex flex-wrap gap-2">
                                {pulse.trendingSectors.map(sector => (
                                    <span key={sector} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-lg text-sm font-medium">
                                        #{sector}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Live Events Stream */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-full">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Actionable News Desk
                            </h3>
                            
                            <div className="space-y-4">
                                {pulse.events.map((event, idx) => (
                                    <div key={idx} className="group relative border border-slate-100 rounded-xl p-5 hover:border-indigo-200 hover:shadow-md transition-all bg-slate-50/50">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors cursor-pointer text-lg leading-snug">
                                                    {event.uri ? <a href={event.uri} target="_blank" rel="noopener noreferrer">{event.headline}</a> : event.headline}
                                                </h4>
                                                <p className="mt-2 text-slate-600 text-sm bg-white p-3 rounded-lg border border-slate-100 shadow-sm leading-relaxed">
                                                    <span className="font-bold uppercase text-[10px] tracking-wider text-slate-400 block mb-1">Impact Analysis</span>
                                                    {event.impact}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
                                                    ${event.sentiment === 'Positive' ? 'bg-green-100 text-green-700' : 
                                                      event.sentiment === 'Negative' ? 'bg-red-100 text-red-700' : 
                                                      'bg-slate-200 text-slate-700'}
                                                `}>
                                                    {event.sentiment}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default LivePulse;
