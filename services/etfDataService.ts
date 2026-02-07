
import { GoogleGenAI } from '@google/genai';
import { ETF, EtfPerformance } from '../types';

/**
 * GEMINI PERFORMANCE SNAPSHOT SERVICE
 * Replaces heavy historical data fetching with lightweight "Return %" queries.
 */

const getClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
}

// Memory Cache to prevent re-fetching the same data
const CACHE: Record<string, EtfPerformance> = {};

export const getEtfs = async (): Promise<ETF[]> => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(FULL_ETF_UNIVERSE), 50);
    });
};

/**
 * Generates estimated returns based on asset class when API fails.
 * This ensures the UI never breaks, even if the API Quota is hit.
 */
const getCategoryEstimates = (category: string): EtfPerformance => {
    let baseAnnual = 0.08; // Global default
    let vol = 1;

    if (category.includes('Tech')) { baseAnnual = 0.16; vol = 1.5; }
    if (category.includes('USA')) { baseAnnual = 0.11; vol = 1.2; }
    if (category.includes('Bonds')) { baseAnnual = 0.04; vol = 0.4; }
    if (category.includes('Emerging')) { baseAnnual = 0.06; vol = 1.3; }
    if (category.includes('Europe')) { baseAnnual = 0.07; vol = 1.0; }
    if (category.includes('Multi')) { baseAnnual = 0.065; vol = 0.7; } // LifeStrategy profile
    if (category.includes('Dividend')) { baseAnnual = 0.075; vol = 0.8; }

    // Add slight randomization so it doesn't look static
    const noise = () => (Math.random() - 0.5) * 2; 

    return {
        "1M": parseFloat(((baseAnnual / 12) * 100 + noise() * vol).toFixed(2)),
        "3M": parseFloat(((baseAnnual / 4) * 100 + noise() * vol * 2).toFixed(2)),
        "1Y": parseFloat((baseAnnual * 100 + noise() * vol * 5).toFixed(2)),
        "3Y": parseFloat(((Math.pow(1+baseAnnual, 3) - 1) * 100 + noise() * vol * 8).toFixed(2)),
        "5Y": parseFloat(((Math.pow(1+baseAnnual, 5) - 1) * 100 + noise() * vol * 10).toFixed(2)),
        isEstimated: true
    };
};

/**
 * Main Function: Get Performance Table Data
 */
export const getEtfPerformance = async (
    ticker: string, 
    currency: string,
    category: string
): Promise<EtfPerformance> => {
    
    // Create a cache key that includes currency to support switching
    const cacheKey = `${ticker}-${currency}-perf-v2`;
    if (CACHE[cacheKey]) return CACHE[cacheKey];

    const client = getClient();
    
    // STRICT PROMPT to ensure Total Return parity between Acc and Dist
    const prompt = `
        Task: Find the cumulative **Total Return (NAV with Dividends Reinvested)** for ETF "${ticker}" expressed in **${currency}**.
        
        CRITICAL RULES:
        1. **Total Return Only**: If the ETF is Distributing (e.g. VWRL, VUSA), you MUST assume dividends are reinvested. The result MUST be comparable to the Accumulating version (e.g. VWCE). Do NOT provide Price Return.
        2. **Currency**: The output figures MUST be in ${currency}. If the ETF is traded in USD/EUR but requested in PLN, apply approximate FX rate impact to the return.
        
        Periods required (Cumulative %):
        - 1 Month
        - 3 Months
        - 1 Year
        - 3 Years (Cumulative)
        - 5 Years (Cumulative)

        Output strictly valid JSON only:
        {
          "1M": number,
          "3M": number,
          "1Y": number,
          "3Y": number,
          "5Y": number
        }
    `;

    try {
        // Fast timeout (12s)
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 12000));
        
        const apiPromise = client.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: 'application/json',
            }
        });

        const response: any = await Promise.race([apiPromise, timeoutPromise]);
        
        // Parse Response
        const text = response.text;
        let data: any = null;
        try {
            data = JSON.parse(text);
        } catch (e) {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) data = JSON.parse(match[0]);
        }

        if (!data || typeof data['1Y'] !== 'number') throw new Error("Invalid Data Structure");

        const result: EtfPerformance = {
            "1M": data['1M'],
            "3M": data['3M'],
            "1Y": data['1Y'],
            "3Y": data['3Y'],
            "5Y": data['5Y'],
            source: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.[0]?.web?.uri,
            isEstimated: false
        };

        CACHE[cacheKey] = result;
        return result;

    } catch (error) {
        console.warn(`API Failed for ${ticker}, using fallback model.`, error);
        const fallback = getCategoryEstimates(category);
        CACHE[cacheKey] = fallback; // Cache fallback to allow UI to render instantly next time
        return fallback;
    }
};

// Expanded Database with Geo and Sector data
const FULL_ETF_UNIVERSE: ETF[] = [
  // --- GLOBAL (All-World) ---
  {
    isin: 'IE00BK5BQT80', ticker: 'VWCE', category: 'Global',
    name: 'Vanguard FTSE All-World (Acc)', issuer: 'Vanguard', ter: 0.22, aum: 12000, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 3688, 
    topHoldings: ['Microsoft', 'Apple', 'NVIDIA', 'Amazon', 'Meta', 'Alphabet A', 'Alphabet C', 'Tesla', 'Broadcom', 'Eli Lilly'], 
    geoAllocation: { "USA": 62, "Europe": 15, "Emerging": 10, "Pacific": 8, "Other": 5 },
    sectorAllocation: { "Technology": 24, "Financials": 15, "Healthcare": 11, "Consumer Disc": 10, "Industrials": 10 },
    description: 'The default choice for passive investors. DM + EM coverage.', dividendYield: 0
  },
  {
    isin: 'IE00B3RBWM25', ticker: 'VWRL', category: 'Global',
    name: 'Vanguard FTSE All-World (Dist)', issuer: 'Vanguard', ter: 0.22, aum: 13500, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Distributing', holdingsCount: 3688, 
    topHoldings: ['Microsoft', 'Apple', 'NVIDIA', 'Amazon', 'Meta', 'Alphabet A', 'Alphabet C', 'Tesla', 'Broadcom', 'Eli Lilly'], 
    geoAllocation: { "USA": 62, "Europe": 15, "Emerging": 10, "Pacific": 8, "Other": 5 },
    sectorAllocation: { "Technology": 24, "Financials": 15, "Healthcare": 11, "Consumer Disc": 10, "Industrials": 10 },
    description: 'Classic distributing version of the world index.', dividendYield: 0.021,
    dividendHistory: [
        { year: 2023, amount: 2.10, yield: 2.05 },
        { year: 2022, amount: 2.02, yield: 2.15 },
        { year: 2021, amount: 1.85, yield: 1.90 },
        { year: 2020, amount: 1.55, yield: 1.85 }
    ]
  },
  {
    isin: 'IE00BK5BQV03', ticker: 'VHVG', category: 'Global',
    name: 'Vanguard FTSE Developed World', issuer: 'Vanguard', ter: 0.12, aum: 3000, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 2100, 
    topHoldings: ['Microsoft', 'Apple', 'NVIDIA', 'Amazon', 'Meta', 'Alphabet A', 'Alphabet C', 'Tesla', 'Broadcom', 'Eli Lilly'], 
    geoAllocation: { "USA": 68, "Europe": 18, "Pacific": 10, "Other": 4 },
    sectorAllocation: { "Technology": 25, "Financials": 14, "Healthcare": 12, "Consumer Disc": 10, "Industrials": 11 },
    description: 'Cheaper than VWCE (0.12%), but excludes Emerging Markets.', dividendYield: 0
  },
  {
    isin: 'IE00B4L5Y983', ticker: 'IWDA', category: 'Global',
    name: 'iShares Core MSCI World (Acc)', issuer: 'iShares', ter: 0.20, aum: 72000, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 1480, 
    topHoldings: ['Microsoft', 'Apple', 'NVIDIA', 'Amazon', 'Meta', 'Alphabet A', 'Alphabet C', 'Tesla', 'Broadcom', 'Eli Lilly'], 
    geoAllocation: { "USA": 70, "Europe": 17, "Pacific": 9, "Other": 4 },
    sectorAllocation: { "Technology": 26, "Financials": 14, "Healthcare": 12, "Consumer Disc": 10, "Industrials": 10 },
    description: 'Developed Markets only. No Emerging Markets.', dividendYield: 0
  },
  {
    isin: 'IE00B6R52259', ticker: 'EUNL', category: 'Global',
    name: 'iShares Core MSCI World (Acc/EUR)', issuer: 'iShares', ter: 0.20, aum: 72000, currency: 'EUR', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 1480, 
    topHoldings: ['Microsoft', 'Apple', 'NVIDIA', 'Amazon', 'Meta', 'Alphabet A', 'Alphabet C', 'Tesla', 'Broadcom', 'Eli Lilly'], 
    geoAllocation: { "USA": 70, "Europe": 17, "Pacific": 9, "Other": 4 },
    sectorAllocation: { "Technology": 26, "Financials": 14, "Healthcare": 12, "Consumer Disc": 10, "Industrials": 10 },
    description: 'Same as IWDA but often listed as EUNL in Germany.', dividendYield: 0
  },

  // --- HIGH DIVIDEND (NEW) ---
  {
    isin: 'IE00B8GKDB10', ticker: 'VHYD', category: 'High Dividend',
    name: 'Vanguard FTSE All-World High Div Yield', issuer: 'Vanguard', ter: 0.29, aum: 4800, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Distributing', holdingsCount: 1800,
    topHoldings: ['Broadcom', 'JPMorgan Chase', 'Exxon Mobil', 'Johnson & Johnson', 'Home Depot', 'Procter & Gamble', 'Merck', 'AbbVie', 'Chevron', 'PepsiCo'],
    geoAllocation: { "USA": 45, "Europe": 25, "Emerging": 12, "Pacific": 12, "Other": 6 },
    sectorAllocation: { "Financials": 25, "Consumer Staples": 13, "Energy": 10, "Healthcare": 11, "Industrials": 10 },
    description: 'Broad global exposure to higher-than-average dividend yielding stocks.', dividendYield: 0.035,
    dividendHistory: [
        { year: 2023, amount: 2.15, yield: 3.6 },
        { year: 2022, amount: 2.08, yield: 3.5 },
        { year: 2021, amount: 1.95, yield: 3.3 },
        { year: 2020, amount: 1.70, yield: 3.8 }
    ]
  },
  {
    isin: 'IE00B9CQXS71', ticker: 'GLDV', category: 'High Dividend',
    name: 'SPDR S&P Global Dividend Aristocrats', issuer: 'SPDR', ter: 0.45, aum: 1100, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Distributing', holdingsCount: 100,
    topHoldings: ['Enbridge', 'Novartis', 'IBM', 'Philip Morris', 'AT&T', 'Verizon', 'Pfizer', 'Realty Income', 'Allianz', 'Sanofi'],
    geoAllocation: { "USA": 42, "Europe": 25, "Canada": 10, "Japan": 8, "Other": 15 },
    sectorAllocation: { "Real Estate": 18, "Utilities": 15, "Financials": 15, "Comm Services": 12, "Staples": 10 },
    description: 'Companies that have maintained or increased dividends for at least 10 consecutive years.', dividendYield: 0.042,
    dividendHistory: [
        { year: 2023, amount: 1.25, yield: 4.3 },
        { year: 2022, amount: 1.20, yield: 4.1 },
        { year: 2021, amount: 1.15, yield: 3.9 },
        { year: 2020, amount: 1.10, yield: 4.5 }
    ]
  },
  {
    isin: 'IE00BYXVGZ48', ticker: 'FGEQ', category: 'High Dividend',
    name: 'Fidelity Global Quality Income', issuer: 'Fidelity', ter: 0.40, aum: 1500, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Distributing', holdingsCount: 250,
    topHoldings: ['Microsoft', 'Apple', 'NVIDIA', 'LVMH', 'Visa', 'Mastercard', 'Procter & Gamble', 'Nestle', 'Chevron', 'Eli Lilly'],
    geoAllocation: { "USA": 65, "Europe": 18, "Japan": 5, "Other": 12 },
    sectorAllocation: { "Technology": 22, "Financials": 18, "Healthcare": 14, "Consumer Disc": 11, "Staples": 10 },
    description: 'Focuses on quality companies with sustainable dividends, not just high yield.', dividendYield: 0.028,
    dividendHistory: [
        { year: 2023, amount: 0.22, yield: 2.9 },
        { year: 2022, amount: 0.20, yield: 2.8 },
        { year: 2021, amount: 0.18, yield: 2.6 },
        { year: 2020, amount: 0.16, yield: 2.9 }
    ]
  },
  {
    isin: 'NL0011683594', ticker: 'TDIV', category: 'High Dividend',
    name: 'VanEck Morningstar Dev Markets Div Leaders', issuer: 'VanEck', ter: 0.38, aum: 650, currency: 'EUR', domicile: 'Netherlands', replication: 'Physical', distribution: 'Distributing', holdingsCount: 100,
    topHoldings: ['TotalEnergies', 'Allianz', 'BNP Paribas', 'Mercedes-Benz', 'Verizon', 'IBM', 'Pfizer', 'British American Tobacco', 'Sanofi', 'AXA'],
    geoAllocation: { "Europe": 45, "USA": 30, "Pacific": 20, "Canada": 5 },
    sectorAllocation: { "Financials": 35, "Energy": 15, "Healthcare": 12, "Utilities": 10, "Staples": 8 },
    description: 'Top 100 income payers globally (Developed markets).', dividendYield: 0.048,
    dividendHistory: [
        { year: 2023, amount: 1.65, yield: 4.9 },
        { year: 2022, amount: 1.55, yield: 4.7 },
        { year: 2021, amount: 1.40, yield: 4.2 },
        { year: 2020, amount: 1.30, yield: 5.1 }
    ]
  },
  {
    isin: 'IE00B90LJD10', ticker: 'GGRP', category: 'High Dividend',
    name: 'WisdomTree Global Quality Div Growth', issuer: 'WisdomTree', ter: 0.38, aum: 1100, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Distributing', holdingsCount: 600,
    topHoldings: ['Microsoft', 'Apple', 'Broadcom', 'Coca-Cola', 'Novartis', 'Johnson & Johnson', 'Nestle', 'Roche', 'PepsiCo', 'Merck'],
    geoAllocation: { "USA": 58, "Europe": 22, "Japan": 6, "Other": 14 },
    sectorAllocation: { "Technology": 21, "Healthcare": 18, "Staples": 14, "Industrials": 12, "Financials": 10 },
    description: 'Combines quality and growth factors with dividend paying companies.', dividendYield: 0.024,
    dividendHistory: [
        { year: 2023, amount: 0.65, yield: 2.5 },
        { year: 2022, amount: 0.60, yield: 2.4 },
        { year: 2021, amount: 0.52, yield: 2.2 },
        { year: 2020, amount: 0.48, yield: 2.6 }
    ]
  },
  {
    isin: 'IE00B5M1WJ87', ticker: 'EUDV', category: 'High Dividend',
    name: 'SPDR S&P Euro Dividend Aristocrats', issuer: 'SPDR', ter: 0.30, aum: 1800, currency: 'EUR', domicile: 'Ireland', replication: 'Physical', distribution: 'Distributing', holdingsCount: 40,
    topHoldings: ['Bouygues', 'Red Electrica', 'Enagas', 'Terna', 'Snam', 'Allianz', 'Munich Re', 'Elisa', 'Fortum', 'Kone'],
    geoAllocation: { "France": 20, "Germany": 18, "Italy": 15, "Spain": 12, "Finland": 10 },
    sectorAllocation: { "Utilities": 25, "Financials": 20, "Industrials": 18, "Real Estate": 10, "Comm Services": 8 },
    description: 'Eurozone companies with 10+ years of stable/increasing dividends.', dividendYield: 0.051,
    dividendHistory: [
        { year: 2023, amount: 1.10, yield: 5.2 },
        { year: 2022, amount: 1.05, yield: 5.0 },
        { year: 2021, amount: 0.95, yield: 4.8 },
        { year: 2020, amount: 0.88, yield: 5.5 }
    ]
  },
  {
    isin: 'IE00B0M63177', ticker: 'IDVY', category: 'High Dividend',
    name: 'iShares Euro Dividend', issuer: 'iShares', ter: 0.40, aum: 750, currency: 'EUR', domicile: 'Ireland', replication: 'Physical', distribution: 'Distributing', holdingsCount: 30,
    topHoldings: ['Intesa Sanpaolo', 'Nordea', 'Orange', 'Credit Agricole', 'Assicurazioni Generali', 'TotalEnergies', 'AXA', 'BMW', 'Mercedes-Benz', 'Stellantis'],
    geoAllocation: { "France": 30, "Italy": 25, "Germany": 20, "Finland": 10, "Netherlands": 8 },
    sectorAllocation: { "Financials": 45, "Utilities": 15, "Industrials": 10, "Energy": 10, "Materials": 8 },
    description: 'High dividend paying stocks from the Eurozone.', dividendYield: 0.058,
    dividendHistory: [
        { year: 2023, amount: 1.25, yield: 5.9 },
        { year: 2022, amount: 1.15, yield: 5.7 },
        { year: 2021, amount: 0.90, yield: 4.5 },
        { year: 2020, amount: 0.80, yield: 6.2 }
    ]
  },
  {
    isin: 'IE00BZ56RN96', ticker: 'USDV', category: 'High Dividend',
    name: 'SPDR S&P US Dividend Aristocrats', issuer: 'SPDR', ter: 0.35, aum: 3200, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Distributing', holdingsCount: 115,
    topHoldings: ['3M', 'Realty Income', 'IBM', 'Exxon Mobil', 'Chevron', 'AbbVie', 'Walgreens', 'T. Rowe Price', 'Franklin Resources', 'Kimberly-Clark'],
    geoAllocation: { "USA": 100 },
    sectorAllocation: { "Industrials": 18, "Utilities": 16, "Financials": 15, "Consumer Staples": 14, "Real Estate": 10 },
    description: 'US companies with 20+ years of consecutive dividend increases.', dividendYield: 0.025,
    dividendHistory: [
        { year: 2023, amount: 1.45, yield: 2.6 },
        { year: 2022, amount: 1.38, yield: 2.4 },
        { year: 2021, amount: 1.25, yield: 2.3 },
        { year: 2020, amount: 1.20, yield: 2.7 }
    ]
  },
  {
    isin: 'IE00BYM11K57', ticker: 'JEPG', category: 'High Dividend',
    name: 'JPM Global Equity Premium Income', issuer: 'JPMorgan', ter: 0.35, aum: 500, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Distributing', holdingsCount: 80,
    topHoldings: ['Microsoft', 'Alphabet', 'Amazon', 'NVIDIA', 'Meta', 'Mastercard', 'UnitedHealth', 'PepsiCo', 'AbbVie', 'Coca-Cola'],
    geoAllocation: { "USA": 60, "Europe": 20, "Japan": 10, "Emerging": 5, "Other": 5 },
    sectorAllocation: { "Technology": 20, "Healthcare": 15, "Financials": 15, "Staples": 12, "Cons Disc": 10 },
    description: 'Active ETF using options to generate high monthly income (~7-9% yield).', dividendYield: 0.075,
    dividendHistory: [
        { year: 2023, amount: 3.80, yield: 7.8 },
        { year: 2022, amount: 3.50, yield: 7.2 },
        { year: 2021, amount: 0, yield: 0 }, // Launched recently
        { year: 2020, amount: 0, yield: 0 }
    ]
  },

  // --- LIFESTRATEGY / MULTI-ASSET (NEW) ---
  {
    isin: 'IE00BMVB5R56', ticker: 'V80A', category: 'LifeStrategy/Multi',
    name: 'Vanguard LifeStrategy 80% Equity', issuer: 'Vanguard', ter: 0.25, aum: 600, currency: 'EUR', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 15000, 
    topHoldings: ['Vanguard Global Stock Idx', 'Vanguard Global Bond Idx', 'Vanguard USD Treasury', 'Vanguard EUR Gov Bond', 'Vanguard Corp Bond', 'Vanguard EM Stock', 'Vanguard North America', 'Vanguard Japan', 'Vanguard Pacific', 'Vanguard UK'], 
    geoAllocation: { "USA": 55, "Europe": 20, "Emerging": 8, "Pacific": 7, "Other": 10 },
    sectorAllocation: { "Equity": 80, "Gov Bonds": 12, "Corp Bonds": 8 },
    description: '80% Stocks / 20% Bonds. Automated rebalancing.', dividendYield: 0
  },
  {
    isin: 'IE00BMVB5Q40', ticker: 'V60A', category: 'LifeStrategy/Multi',
    name: 'Vanguard LifeStrategy 60% Equity', issuer: 'Vanguard', ter: 0.25, aum: 550, currency: 'EUR', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 15000, 
    topHoldings: ['Vanguard Global Stock Idx', 'Vanguard Global Bond Idx', 'Vanguard USD Treasury', 'Vanguard EUR Gov Bond', 'Vanguard Corp Bond', 'Vanguard EM Stock', 'Vanguard North America', 'Vanguard Japan', 'Vanguard Pacific', 'Vanguard UK'], 
    geoAllocation: { "USA": 45, "Europe": 25, "Emerging": 6, "Pacific": 6, "Other": 18 },
    sectorAllocation: { "Equity": 60, "Gov Bonds": 25, "Corp Bonds": 15 },
    description: '60% Stocks / 40% Bonds. Classic balanced portfolio.', dividendYield: 0
  },
  {
    isin: 'IE00BMVB5P33', ticker: 'V40A', category: 'LifeStrategy/Multi',
    name: 'Vanguard LifeStrategy 40% Equity', issuer: 'Vanguard', ter: 0.25, aum: 400, currency: 'EUR', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 15000, 
    topHoldings: ['Vanguard Global Bond Idx', 'Vanguard Global Stock Idx', 'Vanguard USD Treasury', 'Vanguard EUR Gov Bond', 'Vanguard Corp Bond', 'Vanguard EM Stock', 'Vanguard North America', 'Vanguard Japan', 'Vanguard Pacific', 'Vanguard UK'], 
    geoAllocation: { "USA": 40, "Europe": 30, "Emerging": 4, "Pacific": 5, "Other": 21 },
    sectorAllocation: { "Gov Bonds": 40, "Equity": 40, "Corp Bonds": 20 },
    description: '40% Stocks / 60% Bonds. Conservative allocation.', dividendYield: 0
  },
  {
    isin: 'IE00BMVB5M02', ticker: 'V20A', category: 'LifeStrategy/Multi',
    name: 'Vanguard LifeStrategy 20% Equity', issuer: 'Vanguard', ter: 0.25, aum: 200, currency: 'EUR', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 15000, 
    topHoldings: ['Vanguard Global Bond Idx', 'Vanguard Global Stock Idx', 'Vanguard USD Treasury', 'Vanguard EUR Gov Bond', 'Vanguard Corp Bond', 'Vanguard EM Stock', 'Vanguard North America', 'Vanguard Japan', 'Vanguard Pacific', 'Vanguard UK'], 
    geoAllocation: { "USA": 35, "Europe": 35, "Emerging": 2, "Pacific": 4, "Other": 24 },
    sectorAllocation: { "Gov Bonds": 55, "Corp Bonds": 25, "Equity": 20 },
    description: '20% Stocks / 80% Bonds. Capital preservation focus.', dividendYield: 0
  },
  {
    isin: 'IE00BDBRDM35', ticker: 'MAPD', category: 'LifeStrategy/Multi',
    name: 'BlackRock ESG Multi-Asset Conservative', issuer: 'iShares', ter: 0.25, aum: 800, currency: 'EUR', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 5000, 
    topHoldings: ['iShares ESG Bond', 'iShares ESG Equity', 'Treasury Bond', 'Green Bond', 'Corp Bond ESG'], 
    geoAllocation: { "USA": 40, "Europe": 40, "Other": 20 },
    sectorAllocation: { "Bonds": 70, "Equity": 25, "Cash": 5 },
    description: 'Active allocation with ESG focus by BlackRock.', dividendYield: 0
  },

  // --- USA S&P 500 ---
  {
    isin: 'IE00B5BMR087', ticker: 'SXR8', category: 'USA S&P500',
    name: 'iShares Core S&P 500 (Acc)', issuer: 'iShares', ter: 0.07, aum: 84000, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 503, 
    topHoldings: ['Microsoft', 'Apple', 'NVIDIA', 'Amazon', 'Meta', 'Alphabet A', 'Alphabet C', 'Berkshire Hathaway', 'Tesla', 'Broadcom'], 
    geoAllocation: { "USA": 100 },
    sectorAllocation: { "Technology": 31, "Financials": 13, "Healthcare": 12, "Consumer Disc": 10, "Comm Services": 9 },
    description: 'The absolute giant of ETFs. Lowest tracking error.', dividendYield: 0
  },
  {
    isin: 'IE0031442068', ticker: 'VUSA', category: 'USA S&P500',
    name: 'Vanguard S&P 500 (Dist)', issuer: 'Vanguard', ter: 0.07, aum: 35000, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Distributing', holdingsCount: 503, 
    topHoldings: ['Microsoft', 'Apple', 'NVIDIA', 'Amazon', 'Meta', 'Alphabet A', 'Alphabet C', 'Berkshire Hathaway', 'Tesla', 'Broadcom'], 
    geoAllocation: { "USA": 100 },
    sectorAllocation: { "Technology": 31, "Financials": 13, "Healthcare": 12, "Consumer Disc": 10, "Comm Services": 9 },
    description: 'Highly liquid distributing S&P 500.', dividendYield: 0.014,
    dividendHistory: [
        { year: 2023, amount: 1.12, yield: 1.4 },
        { year: 2022, amount: 1.08, yield: 1.5 },
        { year: 2021, amount: 0.98, yield: 1.3 },
        { year: 2020, amount: 0.95, yield: 1.6 }
    ]
  },
  {
    isin: 'IE00BFMXXD54', ticker: 'VUAA', category: 'USA S&P500',
    name: 'Vanguard S&P 500 (Acc)', issuer: 'Vanguard', ter: 0.07, aum: 11000, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 503, 
    topHoldings: ['Microsoft', 'Apple', 'NVIDIA', 'Amazon', 'Meta', 'Alphabet A', 'Alphabet C', 'Berkshire Hathaway', 'Tesla', 'Broadcom'], 
    geoAllocation: { "USA": 100 },
    sectorAllocation: { "Technology": 31, "Financials": 13, "Healthcare": 12, "Consumer Disc": 10, "Comm Services": 9 },
    description: 'Vanguards Accumulating S&P 500 answer to iShares.', dividendYield: 0
  },
  {
    isin: 'IE00B5T61n12', ticker: 'SPY5', category: 'USA S&P500',
    name: 'SPDR S&P 500 UCITS ETF', issuer: 'SPDR', ter: 0.03, aum: 15000, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 503, 
    topHoldings: ['Microsoft', 'Apple', 'NVIDIA', 'Amazon', 'Meta', 'Alphabet A', 'Alphabet C', 'Berkshire Hathaway', 'Tesla', 'Broadcom'], 
    geoAllocation: { "USA": 100 },
    sectorAllocation: { "Technology": 31, "Financials": 13, "Healthcare": 12, "Consumer Disc": 10, "Comm Services": 9 },
    description: 'Extremely low TER (0.03%).', dividendYield: 0
  },

  // --- TECH / NASDAQ ---
  {
    isin: 'IE0032077012', ticker: 'EQQQ', category: 'Tech/Nasdaq',
    name: 'Invesco EQQQ Nasdaq-100 (Dist)', issuer: 'Invesco', ter: 0.30, aum: 8000, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Distributing', holdingsCount: 101, 
    topHoldings: ['Apple', 'Microsoft', 'NVIDIA', 'Broadcom', 'Meta', 'Amazon', 'Tesla', 'Costco', 'Alphabet A', 'Alphabet C'], 
    geoAllocation: { "USA": 98, "Other": 2 },
    sectorAllocation: { "Technology": 51, "Comm Services": 16, "Consumer Disc": 13, "Healthcare": 6, "Consumer Staples": 5 },
    description: 'The standard for Nasdaq-100 exposure.', dividendYield: 0.006,
    dividendHistory: [
        { year: 2023, amount: 2.15, yield: 0.6 },
        { year: 2022, amount: 1.80, yield: 0.7 },
        { year: 2021, amount: 1.45, yield: 0.5 },
        { year: 2020, amount: 1.20, yield: 0.6 }
    ]
  },
  {
    isin: 'IE00BFZXGZ54', ticker: 'EQAC', category: 'Tech/Nasdaq',
    name: 'Invesco EQQQ Nasdaq-100 (Acc)', issuer: 'Invesco', ter: 0.30, aum: 4000, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 101, 
    topHoldings: ['Apple', 'Microsoft', 'NVIDIA', 'Broadcom', 'Meta', 'Amazon', 'Tesla', 'Costco', 'Alphabet A', 'Alphabet C'], 
    geoAllocation: { "USA": 98, "Other": 2 },
    sectorAllocation: { "Technology": 51, "Comm Services": 16, "Consumer Disc": 13, "Healthcare": 6, "Consumer Staples": 5 },
    description: 'Accumulating version of EQQQ.', dividendYield: 0
  },
  {
    isin: 'IE00BWBXM948', ticker: 'QDVE', category: 'Tech/Nasdaq',
    name: 'iShares S&P 500 Info Tech', issuer: 'iShares', ter: 0.15, aum: 6000, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 65, 
    topHoldings: ['Microsoft', 'Apple', 'NVIDIA', 'Broadcom', 'AMD', 'Adobe', 'Salesforce', 'Oracle', 'Qualcomm', 'Intel'], 
    geoAllocation: { "USA": 100 },
    sectorAllocation: { "Technology": 100 },
    description: 'Pure Technology sector (not just Nasdaq). Very aggressive.', dividendYield: 0
  },
  {
    isin: 'IE00BYZK4552', ticker: 'RBOT', category: 'Tech/Nasdaq',
    name: 'iShares Automation & Robotics', issuer: 'iShares', ter: 0.40, aum: 2800, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 150, 
    topHoldings: ['NVIDIA', 'ServiceNow', 'Rockwell Automation', 'Teradyne', 'Fanuc', 'Keyence', 'SMC Corp', 'Schneider Electric', 'Siemens', 'ABB'], 
    geoAllocation: { "USA": 55, "Japan": 20, "Europe": 15, "Other": 10 },
    sectorAllocation: { "Technology": 60, "Industrials": 35, "Other": 5 },
    description: 'Thematic bet on AI and industrial automation.', dividendYield: 0
  },
  {
    isin: 'IE00BGBN6P67', ticker: 'SMH', category: 'Tech/Nasdaq',
    name: 'VanEck Semiconductor UCITS', issuer: 'VanEck', ter: 0.35, aum: 2000, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 25, 
    topHoldings: ['NVIDIA', 'TSMC', 'ASML', 'Broadcom', 'AMD', 'Intel', 'Texas Instruments', 'Qualcomm', 'Micron', 'Applied Materials'], 
    geoAllocation: { "USA": 75, "Taiwan": 10, "Netherlands": 10, "Other": 5 },
    sectorAllocation: { "Semiconductors": 100 },
    description: 'Pure semiconductor play. High volatility.', dividendYield: 0
  },

  // --- EMERGING MARKETS ---
  {
    isin: 'IE00BKM4GZ66', ticker: 'EMIM', category: 'Emerging',
    name: 'iShares Core MSCI EM IMI', issuer: 'iShares', ter: 0.18, aum: 20000, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 3100, 
    topHoldings: ['TSMC', 'Tencent', 'Samsung Electronics', 'Alibaba', 'Reliance Industries', 'Meituan', 'PDD Holdings', 'Vale', 'Infosys', 'China Construction Bank'], 
    geoAllocation: { "China": 25, "India": 18, "Taiwan": 17, "Korea": 12, "Brazil": 5 },
    sectorAllocation: { "Technology": 22, "Financials": 21, "Consumer Disc": 13, "Comm Services": 9, "Materials": 8 },
    description: 'Broadest EM coverage including small caps.', dividendYield: 0
  },
  {
    isin: 'IE00B3VVMM84', ticker: 'VFEM', category: 'Emerging',
    name: 'Vanguard FTSE Emerging Markets', issuer: 'Vanguard', ter: 0.22, aum: 3000, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Distributing', holdingsCount: 1400, 
    topHoldings: ['TSMC', 'Tencent', 'Alibaba', 'Reliance Industries', 'HDFC Bank', 'PDD Holdings', 'Infosys', 'Tata Consultancy', 'Vale', 'Baidu'], 
    geoAllocation: { "China": 28, "India": 20, "Taiwan": 18, "Brazil": 6, "Other": 28 },
    sectorAllocation: { "Technology": 23, "Financials": 22, "Consumer Disc": 14, "Other": 41 },
    description: 'Vanguards distributing EM choice.', dividendYield: 0.028,
    dividendHistory: [
        { year: 2023, amount: 1.15, yield: 2.9 },
        { year: 2022, amount: 1.08, yield: 3.1 },
        { year: 2021, amount: 0.95, yield: 2.7 },
        { year: 2020, amount: 0.85, yield: 2.5 }
    ]
  },
  
  // --- EUROPE ---
  {
    isin: 'IE00B4K48X80', ticker: 'MEUD', category: 'Europe',
    name: 'iShares Core MSCI Europe', issuer: 'iShares', ter: 0.12, aum: 6000, currency: 'EUR', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 430, 
    topHoldings: ['Novo Nordisk', 'ASML', 'Nestle', 'LVMH', 'Shell', 'AstraZeneca', 'SAP', 'Novartis', 'Roche', 'TotalEnergies'], 
    geoAllocation: { "UK": 22, "France": 18, "Switzerland": 15, "Germany": 13, "Netherlands": 7 },
    sectorAllocation: { "Financials": 18, "Industrials": 16, "Healthcare": 15, "Consumer Staples": 11, "Technology": 8 },
    description: 'Broad exposure to developed Europe.', dividendYield: 0
  },
  {
    isin: 'IE00B945VV12', ticker: 'VEUR', category: 'Europe',
    name: 'Vanguard FTSE Developed Europe', issuer: 'Vanguard', ter: 0.10, aum: 3500, currency: 'EUR', domicile: 'Ireland', replication: 'Physical', distribution: 'Distributing', holdingsCount: 600, 
    topHoldings: ['Novo Nordisk', 'ASML', 'Nestle', 'Shell', 'LVMH', 'AstraZeneca', 'SAP', 'Novartis', 'Roche', 'HSBC'], 
    geoAllocation: { "UK": 23, "France": 17, "Switzerland": 14, "Germany": 13, "Netherlands": 6 },
    sectorAllocation: { "Financials": 18, "Industrials": 16, "Healthcare": 15, "Consumer Staples": 10, "Technology": 8 },
    description: 'Low cost European exposure.', dividendYield: 0.03,
    dividendHistory: [
        { year: 2023, amount: 1.10, yield: 3.1 },
        { year: 2022, amount: 1.05, yield: 3.2 },
        { year: 2021, amount: 0.95, yield: 2.9 },
        { year: 2020, amount: 0.90, yield: 3.0 }
    ]
  },

  // --- BONDS & SPECIAL ---
  {
    isin: 'IE00B3F81409', ticker: 'AGGH', category: 'Bonds/Special',
    name: 'iShares Global Aggregate Bond', issuer: 'iShares', ter: 0.10, aum: 9500, currency: 'EUR', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 12000, 
    topHoldings: ['US Treasury', 'Japan Gov Bond', 'China Gov Bond', 'France Gov Bond', 'Germany Gov Bond', 'UK Gilts', 'Italy Gov Bond', 'Canada Gov Bond', 'Spain Gov Bond', 'Fannie Mae'], 
    geoAllocation: { "USA": 40, "Japan": 12, "China": 9, "France": 6, "Germany": 5 },
    sectorAllocation: { "Government": 55, "Corporate": 25, "Securitized": 20 },
    description: 'Global bonds EUR Hedged. Portfolio stabilizer.', dividendYield: 0
  },
  {
    isin: 'IE00BG47KH54', ticker: 'VAGF', category: 'Bonds/Special',
    name: 'Vanguard Global Aggregate Bond', issuer: 'Vanguard', ter: 0.10, aum: 800, currency: 'EUR', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 10000, 
    topHoldings: ['US Treasury', 'Japan Gov Bond', 'France Gov Bond', 'Germany Gov Bond', 'UK Gilts', 'Italy Gov Bond', 'Canada Gov Bond', 'Spain Gov Bond', 'Australia Gov Bond', 'US MBS'], 
    geoAllocation: { "USA": 42, "Japan": 13, "France": 7, "Germany": 6, "UK": 5 },
    sectorAllocation: { "Government": 60, "Corporate": 20, "Securitized": 20 },
    description: 'Vanguards answer to AGGH. EUR Hedged.', dividendYield: 0
  },
  {
    isin: 'IE00B4L60045', ticker: 'IHYG', category: 'Bonds/Special',
    name: 'iShares € High Yield Corp Bond', issuer: 'iShares', ter: 0.50, aum: 6000, currency: 'EUR', domicile: 'Ireland', replication: 'Physical', distribution: 'Distributing', holdingsCount: 600, 
    topHoldings: ['Telecom Italia', 'Teva Pharm', 'Vodafone', 'Thyssenkrupp', 'Renault', 'Nokia', 'Lufthansa', 'Jaguar Land Rover', 'Softbank', 'Faurecia'], 
    geoAllocation: { "Europe": 85, "USA": 10, "Other": 5 },
    sectorAllocation: { "Industrial": 50, "Financials": 30, "Utility": 10, "Other": 10 },
    description: 'Riskier corporate bonds for higher yield.', dividendYield: 0.045,
    dividendHistory: [
        { year: 2023, amount: 4.20, yield: 4.8 },
        { year: 2022, amount: 3.90, yield: 4.5 },
        { year: 2021, amount: 3.50, yield: 3.8 },
        { year: 2020, amount: 3.80, yield: 4.2 }
    ]
  },
  {
    isin: 'IE00B1XNHC34', ticker: 'INRG', category: 'Bonds/Special',
    name: 'iShares Global Clean Energy', issuer: 'iShares', ter: 0.65, aum: 2500, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Distributing', holdingsCount: 100, 
    topHoldings: ['First Solar', 'Enphase Energy', 'Iberdrola', 'Vestas Wind', 'Consolidated Edison', 'Orsted', 'Plug Power', 'SolarEdge', 'NextEra Energy', 'Enel'], 
    geoAllocation: { "USA": 45, "Europe": 30, "China": 10, "Other": 15 },
    sectorAllocation: { "Utilities": 50, "Industrials": 25, "Technology": 20, "Other": 5 },
    description: 'Clean Energy theme. Very high volatility.', dividendYield: 0.015
  },
  {
    isin: 'IE00B579F325', ticker: 'SGLD', category: 'Bonds/Special',
    name: 'Invesco Physical Gold ETC', issuer: 'Invesco', ter: 0.12, aum: 14000, currency: 'USD', domicile: 'Ireland', replication: 'Physical', distribution: 'Accumulating', holdingsCount: 1, 
    topHoldings: ['Gold Bullion'], 
    geoAllocation: { "Global": 100 },
    sectorAllocation: { "Commodities": 100 },
    description: 'Direct exposure to physical gold.', dividendYield: 0
  }
] as any[];
