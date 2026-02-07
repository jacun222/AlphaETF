import { ChartPoint, DistributionPolicy, ETF } from '../types';

/**
 * Chart Data Processor
 * Takes RAW WEEKLY data points from Gemini and interpolates them 
 * into a daily chart series for smooth visualization.
 */

// Helper to interpolate between two values
const lerp = (start: number, end: number, t: number) => {
    return start + (end - start) * t;
};

export const processChartData = (
    etf1: ETF, 
    data1: { date: string; close: number }[], 
    etf2: ETF | null, 
    data2: { date: string; close: number }[] | null,
    includeDividends: boolean
): ChartPoint[] => {

    if (!data1 || data1.length < 2) return [];

    const result: ChartPoint[] = [];

    // Sort by date just in case
    data1.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (data2) data2.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const startVal1 = data1[0].close;
    const startVal2 = data2 ? data2[0].close : 1;

    // Loop through segments and fill in "days"
    // Since we are now using WEEKLY data, we have ~52 segments per year.
    // We only need to interpolate about 5-6 points between each segment to mimic daily data.
    for (let i = 0; i < data1.length - 1; i++) {
        const p1 = data1[i];
        const p2 = data1[i+1];
        
        // Match p1/p2 in data2 (closest date)
        const p1_2 = data2 ? (data2[i] || data2[data2.length-1]) : null;
        const p2_2 = data2 ? (data2[i+1] || data2[data2.length-1]) : null;

        // Create ~5 points between weeks (Business days)
        const steps = 5; 
        for (let j = 0; j < steps; j++) {
            const t = j / steps;

            // Interpolate Price
            let currentPrice1 = lerp(p1.close, p2.close, t);
            let currentPrice2 = (p1_2 && p2_2) ? lerp(p1_2.close, p2_2.close, t) : 0;

            // Apply simplistic Dividend Drag if "Price Only" is selected for Distributing ETFs
            // Since we are now asking Gemini for ADJUSTED CLOSE by default, 
            // "Price Only" means we need to artificially remove the yield from the Adjusted Close.
            if (!includeDividends && etf1.distribution === 'Distributing') {
                 // Yield drag simulation
                 const totalProgress = (i * steps + j) / (data1.length * steps);
                 currentPrice1 = currentPrice1 * (1 - (etf1.dividendYield * totalProgress));
            }
            if (data2 && !includeDividends && etf2?.distribution === 'Distributing') {
                 const totalProgress = (i * steps + j) / (data1.length * steps);
                 currentPrice2 = currentPrice2 * (1 - (etf2.dividendYield * totalProgress));
            }

            // Calculate % Change
            const pct1 = ((currentPrice1 - startVal1) / startVal1) * 100;
            const pct2 = data2 ? ((currentPrice2 - startVal2) / startVal2) * 100 : undefined;
            
            // Approximate Date
            const startDate = new Date(p1.date);
            const endDate = new Date(p2.date);
            const timeDiff = endDate.getTime() - startDate.getTime();
            const currDate = new Date(startDate.getTime() + timeDiff * t);

            result.push({
                date: currDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
                etf1Value: parseFloat(pct1.toFixed(2)),
                etf2Value: pct2 !== undefined ? parseFloat(pct2.toFixed(2)) : undefined
            });
        }
    }
    
    // Ensure the very last point matches the last data point exactly (Realtime/Yesterday Close)
    if (data1.length > 0) {
        const last1 = data1[data1.length - 1];
        const last2 = data2 ? data2[data2.length - 1] : null;

        const finalPct1 = ((last1.close - startVal1) / startVal1) * 100;
        const finalPct2 = last2 ? ((last2.close - startVal2) / startVal2) * 100 : undefined;

        result.push({
            date: new Date(last1.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
            etf1Value: parseFloat(finalPct1.toFixed(2)),
            etf2Value: finalPct2 !== undefined ? parseFloat(finalPct2.toFixed(2)) : undefined
        });
    }
    
    return result;
};