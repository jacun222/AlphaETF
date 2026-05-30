import React, { useState } from 'react';
import { ETF, PortfolioProposal } from '../types';
import { buildPortfolioFromPrompt } from '../services/geminiService';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  allEtfs: ETF[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const Roboadvisor: React.FC<Props> = ({ allEtfs }) => {
  const [prompt, setPrompt] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [proposal, setProposal] = useState<PortfolioProposal | null>(null);
  const [error, setError] = useState('');

  const handleBuild = async () => {
    if (!prompt.trim() || allEtfs.length === 0) return;
    setIsBuilding(true);
    setProposal(null);
    setError('');
    const result = await buildPortfolioFromPrompt(prompt, allEtfs);
    if (result) {
        setProposal(result);
    } else {
        setError('Wystąpił błąd podczas analizy. Spróbuj ponownie lub zmień treść zapytania.');
    }
    setIsBuilding(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-2">Natural Language Portfolio Builder</h2>
        <p className="text-slate-500 mb-6">
          Describe your investment goals, risk tolerance, and time horizon. Our AI Roboadvisor will instantly construct the optimal ETF portfolio for you.
        </p>
        
        <div className="mt-2 flex shadow-sm rounded-xl overflow-hidden border border-slate-200">
           <input 
              type="text" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., I'm 30 years old, highly aggressive, and want to bet on global tech and USA."
              className="flex-1 px-4 py-4 focus:outline-none text-slate-700 bg-slate-50"
              onKeyDown={(e) => e.key === 'Enter' && handleBuild()}
           />
           <button 
              onClick={handleBuild}
              disabled={isBuilding || !prompt.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold px-8 py-4 transition-colors font-sans whitespace-nowrap"
           >
              {isBuilding ? 'Analizowanie...' : 'Zbuduj Portfel'}
           </button>
        </div>
        {error && <p className="mt-4 text-red-500 font-medium text-sm">{error}</p>}
      </div>

      {proposal && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-xl font-bold tracking-tight text-slate-800 mb-2">{proposal.title}</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">{proposal.description}</p>
                
                <div className="flex gap-4 mb-8">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex-1">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Risk Profile</div>
                        <div className="text-lg font-bold text-slate-800">{proposal.riskLevel}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex-1">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Expected Return</div>
                        <div className="text-lg font-bold text-indigo-600">{proposal.expectedAnnualReturn}</div>
                    </div>
                </div>

                <div className="space-y-4">
                    {proposal.allocations.map((alloc, idx) => (
                        <div key={alloc.ticker} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                                {alloc.percentage}%
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">{alloc.ticker} <span className="text-slate-400 font-normal text-sm ml-1">{alloc.name}</span></h4>
                                <p className="text-sm text-slate-600 mt-1">{alloc.reason}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="bg-slate-900 p-8 rounded-2xl shadow-lg border border-slate-800 flex flex-col items-center justify-center min-h-[400px]">
                <h3 className="text-white font-bold opacity-80 mb-4 tracking-widest uppercase text-sm">Target Allocation</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={proposal.allocations}
                            innerRadius={80}
                            outerRadius={110}
                            paddingAngle={5}
                            dataKey="percentage"
                        >
                            {proposal.allocations.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: any, name: any, props: any) => [`${value}%`, props.payload.ticker]}
                        />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', opacity: 0.8 }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}
    </div>
  );
};

export default Roboadvisor;
