import React, { useState } from 'react';
import { fetchHoldingLocations, PlaceResult } from '../services/geminiService';

interface GeoMapProps {
  geoAllocation: Record<string, number>;
  topHoldings: string[];
  ticker: string;
}

const GeoMap: React.FC<GeoMapProps> = ({ geoAllocation, topHoldings, ticker }) => {
  const [locations, setLocations] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);

  // --- MAPPING LOGIC ---
  
  // Normalized Opacity Calculation (0.2 to 1.0)
  const getRegionOpacity = (regionCode: 'NA' | 'SA' | 'EU' | 'AF' | 'AS' | 'OC') => {
    let total = 0;
    const keys = Object.keys(geoAllocation);

    const sumAllocations = (keywords: string[]) => {
      keys.forEach(k => {
        if (keywords.some(word => k.toLowerCase().includes(word.toLowerCase()))) {
            total += geoAllocation[k];
        }
      });
    };

    switch (regionCode) {
      case 'NA': 
        sumAllocations(['USA', 'United States', 'Canada', 'North America']); 
        break;
      case 'EU': 
        sumAllocations(['Europe', 'UK', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Switzerland', 'Netherlands', 'Sweden', 'Euro']); 
        break;
      case 'AS': 
        sumAllocations(['China', 'Japan', 'Taiwan', 'India', 'Korea', 'Hong Kong', 'Asia', 'Pacific']); 
        break;
      case 'SA': 
        sumAllocations(['Brazil', 'Latin America', 'South America']); 
        break;
      case 'OC': 
        sumAllocations(['Australia', 'New Zealand', 'Oceania']); 
        break;
      case 'AF': 
        sumAllocations(['Africa', 'South Africa']); 
        break;
    }

    // Handle "Global" or "Emerging" broad categories
    if (geoAllocation['Global']) return 0.4; // Base glow for everyone
    
    // Distribute 'Emerging' roughly to AS, SA, AF if explicit countries aren't set
    if (geoAllocation['Emerging']) {
        if (regionCode === 'AS') total += geoAllocation['Emerging'] * 0.6;
        if (regionCode === 'SA') total += geoAllocation['Emerging'] * 0.3;
        if (regionCode === 'AF') total += geoAllocation['Emerging'] * 0.1;
    }

    // Cap at 1.0, floor at 0.15 (so map is always visible)
    // Scale: 50% allocation = Full Opacity
    return Math.min(1, Math.max(0.15, total / 50)); 
  };

  const getFillColor = (regionCode: any) => {
      const opacity = getRegionOpacity(regionCode);
      // Interpolate between Slate-300 (base) and Indigo-600 (active)
      // Using RGBA for simple opacity handling on the active color
      if (opacity <= 0.15) return '#cbd5e1'; // Slate-300 default land
      return `rgba(79, 70, 229, ${opacity})`; // Indigo-600 with varying opacity
  };

  const handleLocateHQ = async () => {
    setLoading(true);
    const results = await fetchHoldingLocations(topHoldings);
    setLocations(results);
    setLoading(false);
  };

  return (
    <div className="mt-4">
        {/* --- DETAILED WORLD MAP --- */}
        <div className="w-full bg-blue-50 rounded-xl border border-blue-100 relative overflow-hidden group">
            
            {/* Map Container */}
            <div className="relative w-full pb-[50%]"> {/* Aspect Ratio 2:1 */}
                <svg 
                    className="absolute inset-0 w-full h-full drop-shadow-sm" 
                    viewBox="0 0 1000 500" 
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Ocean Background is the div bg-blue-50 */}
                    
                    {/* North America */}
                    <path 
                        d="M48,126 C15,92 78,13 189,21 C230,24 290,26 312,25 C336,24 353,19 320,62 C289,103 277,143 256,177 C233,212 216,233 194,228 C158,220 128,198 108,178 C93,163 72,150 48,126 Z"
                        fill={getFillColor('NA')} 
                        stroke="white" 
                        strokeWidth="1"
                        className="transition-all duration-700 ease-in-out"
                    />

                    {/* South America */}
                    <path 
                        d="M210,235 C235,235 292,263 318,295 C339,321 326,380 307,436 C299,460 286,478 276,462 C260,436 245,390 232,360 C223,340 205,300 210,235 Z"
                        fill={getFillColor('SA')} 
                        stroke="white" 
                        strokeWidth="1"
                        className="transition-all duration-700 ease-in-out"
                    />

                    {/* Europe */}
                    <path 
                        d="M455,75 C435,95 425,115 440,130 C450,140 470,145 490,140 C510,135 520,125 530,115 C545,100 535,80 515,65 C495,50 475,55 455,75 Z M425,125 L410,140 L430,150 L445,135 Z"
                        fill={getFillColor('EU')} 
                        stroke="white" 
                        strokeWidth="1"
                        className="transition-all duration-700 ease-in-out"
                    />

                    {/* Africa */}
                    <path 
                        d="M415,160 C445,160 495,160 525,170 C555,180 575,230 565,280 C555,330 525,380 495,390 C465,400 435,360 425,320 C415,280 405,220 415,160 Z"
                        fill={getFillColor('AF')} 
                        stroke="white" 
                        strokeWidth="1"
                        className="transition-all duration-700 ease-in-out"
                    />

                    {/* Asia */}
                    <path 
                        d="M540,60 C580,50 680,50 750,70 C820,90 850,150 820,200 C790,250 720,280 650,270 C620,265 600,240 580,220 C560,200 540,150 535,110 C530,80 520,70 540,60 Z M830,90 L850,110 L860,90 Z"
                        fill={getFillColor('AS')} 
                        stroke="white" 
                        strokeWidth="1"
                        className="transition-all duration-700 ease-in-out"
                    />

                    {/* Oceania / Australia */}
                    <path 
                        d="M750,320 C780,310 850,310 870,340 C890,370 870,410 840,420 C810,430 760,410 750,380 C740,350 730,330 750,320 Z M890,430 L910,450 L920,440 Z"
                        fill={getFillColor('OC')} 
                        stroke="white" 
                        strokeWidth="1"
                        className="transition-all duration-700 ease-in-out"
                    />

                </svg>
                
                {/* Overlay Text */}
                <div className="absolute top-2 left-3 text-[10px] font-bold text-blue-900/40 tracking-widest uppercase">
                    Portfolio Allocation Map
                </div>
            </div>

            {/* Hover Tooltip / Status */}
            <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-blue-100 p-2 text-xs flex justify-between items-center px-4">
                 <span className="text-slate-500">
                    Visualization of <strong>{ticker}</strong> geographic exposure
                 </span>
                 <div className="flex gap-2">
                     <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span> High
                     </span>
                     <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-300"></span> Med
                     </span>
                     <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span> None
                     </span>
                 </div>
            </div>
        </div>

        {/* --- AI GROUNDING SECTION --- */}
        <div className="mt-3">
            {!loading && locations.length === 0 && (
                <button 
                    onClick={handleLocateHQ}
                    className="w-full py-2.5 bg-white border border-slate-200 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Verify Top Holdings HQ with Google Maps
                </button>
            )}

            {loading && (
                <div className="flex justify-center py-2">
                    <div className="animate-spin h-5 w-5 border-2 border-indigo-600 rounded-full border-t-transparent"></div>
                </div>
            )}

            {locations.length > 0 && (
                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                    <h5 className="text-[10px] font-bold text-indigo-800 uppercase mb-2 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                        HQ Locations Verified
                    </h5>
                    <div className="grid grid-cols-1 gap-1.5">
                        {locations.map((loc, idx) => (
                            <a 
                                key={idx}
                                href={loc.uri} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center justify-between text-xs text-slate-700 hover:text-indigo-700 bg-white px-3 py-2 rounded border border-slate-100 shadow-sm hover:shadow transition-all group"
                            >
                                <span className="truncate font-medium">{loc.name}</span>
                                <svg className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                        ))}
                    </div>
                    <div className="mt-2 text-[9px] text-center text-indigo-400 font-medium">Data sourced via Gemini & Google Maps</div>
                </div>
            )}
        </div>
    </div>
  );
};

export default GeoMap;