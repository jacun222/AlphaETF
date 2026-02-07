import React from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ReferenceLine 
} from 'recharts';
import { ChartPoint, TimeRange } from '../types';

interface PerformanceChartProps {
  data: ChartPoint[];
  etf1Name: string;
  etf2Name?: string;
  timeRange: TimeRange;
  includeDividends: boolean;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ 
  data, 
  etf1Name, 
  etf2Name, 
  timeRange, 
  includeDividends 
}) => {
  // Calculate final return for header
  const finalPt = data[data.length - 1];
  const change1 = finalPt?.etf1Value || 0;
  const change2 = finalPt?.etf2Value || 0;

  // Determine X-Axis Interval based on data density (~250 points vs ~1200 points)
  let axisInterval: number | "preserveStartEnd" = 'preserveStartEnd';
  if (timeRange === '1M') axisInterval = 2; // Show every 3rd day
  if (timeRange === '1Y') axisInterval = 30; // Show approx every month
  if (timeRange === '3Y') axisInterval = 90; // Quarterly
  if (timeRange === '5Y') axisInterval = 150; // Semi-annually

  return (
    <div className="h-80 w-full bg-white rounded-lg p-2 transition-all">
      <div className="flex flex-wrap justify-between items-center px-4 mb-2 gap-2">
         <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Real Historical Performance ({timeRange}) • {includeDividends ? 'Total Return' : 'Price Return'}
         </span>
         <div className="flex space-x-4">
             <span className={`text-sm font-bold ${change1 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {etf1Name}: {change1 > 0 ? '+' : ''}{change1.toFixed(2)}%
             </span>
             {etf2Name && (
                <span className={`text-sm font-bold ${change2 >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                    {etf2Name}: {change2 > 0 ? '+' : ''}{change2.toFixed(2)}%
                </span>
             )}
         </div>
      </div>
      
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorEtf1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorEtf2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            tick={{fontSize: 10, fill: '#94a3b8'}} 
            tickLine={false}
            axisLine={false}
            interval={axisInterval} 
            minTickGap={20}
          />
          <YAxis 
            domain={['auto', 'auto']}
            tick={{fontSize: 10, fill: '#94a3b8'}} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
            width={45}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
            itemStyle={{ paddingBottom: 2 }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Return']}
            labelStyle={{color: '#64748b', marginBottom: '0.25rem', fontWeight: 600}}
          />
          <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
          <Area 
            type="monotone" 
            dataKey="etf1Value" 
            name={etf1Name} 
            stroke="#2563eb" 
            fillOpacity={1} 
            fill="url(#colorEtf1)" 
            strokeWidth={1.5}
            isAnimationActive={false} // Disable animation for performance with many points
            dot={false} // Disable dots on line for clean look with 1000+ points
          />
          {etf2Name && (
            <Area 
              type="monotone" 
              dataKey="etf2Value" 
              name={etf2Name} 
              stroke="#f59e0b" 
              fillOpacity={1} 
              fill="url(#colorEtf2)" 
              strokeWidth={1.5}
              isAnimationActive={false}
              dot={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};