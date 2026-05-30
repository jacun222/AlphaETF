
import { GoogleGenAI, Chat } from '@google/genai';
import { ETF, AIAnalysisResult, InvestmentHorizon, PlaceResult, PortfolioProposal, MarketPulseData } from '../types';

/**
 * AI Analyser Module
 * Handles communication with Google Gemini API to generate structured investment insights.
 */

const getClient = () => {
    if (!process.env.API_KEY) {
        console.warn("API Key is missing. AI features will not work.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
}

export const fetchMarketPulse = async (category: string = "Global Markets"): Promise<MarketPulseData | null> => {
  const client = getClient();
  const prompt = `
    You are an elite live market summary engine.
    Search for the latest real-time news regarding "${category}" or broad macroeconomic and geopolitical events affecting index funds and ETFs.
    
    Output a STRICT JSON object:
    {
      "summary": "A 2-3 sentence executive summary of the current market mood.",
      "geopoliticalRisk": "Low" | "Medium" | "High" | "Extreme",
      "trendingSectors": ["Sector 1", "Sector 2"],
      "events": [
         {
            "headline": "A short, live news headline",
            "sentiment": "Positive" | "Negative" | "Neutral",
            "impact": "How does this affect ETFs?",
            "uri": "Optional link to the news if you have it"
         }
      ]
    }
    Keep it strictly 3-4 top events.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text;
    if (!text) return null;
    
    let data: any = null;
    try {
        data = JSON.parse(text);
    } catch (e) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) data = JSON.parse(match[0]);
    }
    return data as MarketPulseData;
  } catch (error) {
    console.error("Gemini Market Pulse Error:", error);
    return null;
  }
};

export const buildPortfolioFromPrompt = async (userPrompt: string, availableEtfs: ETF[]): Promise<PortfolioProposal | null> => {
    const client = getClient();
    
    // Create a lean representation of available ETFs to save tokens
    const etfDataStr = JSON.stringify(availableEtfs.map(e => ({
        ticker: e.ticker,
        name: e.name,
        category: e.category,
        ter: e.ter,
        distribution: e.distribution
    })));

    const prompt = `
        You are an elite AI Robo-advisor.
        The user has provided this natural language request: "${userPrompt}"
        
        Using ONLY the following available ETFs, construct the mathematically optimal portfolio matching their request:
        ${etfDataStr}

        RULES:
        1. Allocations must sum to 100.
        2. Pick 2 to 5 ETFs maximum. Do not overcomplicate.
        3. Match the user's risk tolerance, time horizon, and thematic preferences (e.g. accumulating vs distributing, tech vs safe).
        
        Output STRICT JSON:
        {
           "title": "A catchy title for this portfolio (e.g., 'Aggressive Tech Compounder')",
           "description": "2-3 sentences explaining why this matches their exact prompt.",
           "riskLevel": "Low" | "Medium" | "High" | "Extreme",
           "expectedAnnualReturn": "e.g., 7-9%",
           "allocations": [
              {
                 "ticker": "TICKER_SYMBOL",
                 "name": "ETF Name",
                 "percentage": 50,
                 "reason": "1 short sentence explaining why this ETF was included."
              }
           ]
        }
    `;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });
        const text = response.text;
        if(!text) return null;
        let data: any = null;
        try {
            data = JSON.parse(text);
        } catch (e) {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) data = JSON.parse(match[0]);
        }
        return data as PortfolioProposal;
    } catch(err) {
        console.error("Gemini Portfolio Builder Error:", err);
        return null;
    }
};

export const createChatSession = (etf1: ETF | null, etf2: ETF | null): Chat => {
    const client = getClient();
    
    let context = "You are a helpful financial assistant for the 'Alpha ETF' dashboard.";
    
    if (etf1 && etf2) {
        context += `
        The user is currently comparing two ETFs:
        1. ${etf1.ticker} (${etf1.name}) - Category: ${etf1.category}, TER: ${etf1.ter}%
        2. ${etf2.ticker} (${etf2.name}) - Category: ${etf2.category}, TER: ${etf2.ter}%
        
        Answer their follow-up questions specifically about these two assets. 
        Be concise, professional, and data-driven.
        Use Google Search to find the latest real-time information if asked about current events, prices, or recent news.
        `;
    } else if (etf1) {
        context += `The user has selected ${etf1.ticker} (${etf1.name}).`;
    } else {
        context += `The user has not selected any ETFs yet. Encourage them to select assets to compare.`;
    }

    return client.chats.create({
        model: 'gemini-3-flash-preview', 
        config: {
            systemInstruction: context,
            tools: [{ googleSearch: {} }],
        }
    });
};

export const analyzeEtfComparison = async (etf1: ETF, etf2: ETF, horizon: InvestmentHorizon): Promise<AIAnalysisResult | null> => {
  const client = getClient();
  
  const prompt = `
    You are a Senior Fintech Algo & Investment Analyst. 
    Compare these two ETFs for a specific user scenario.
    
    USER PROFILE:
    Investment Horizon: ${horizon}
    Goal: Maximize risk-adjusted returns based on this timeline.
    
    Asset A: ${etf1.ticker} (${etf1.name}) 
    - Category: ${etf1.category}
    - TER: ${etf1.ter}% 
    - Holdings: ${etf1.holdingsCount}
    - Top Holdings: ${etf1.topHoldings.join(', ')}
    
    Asset B: ${etf2.ticker} (${etf2.name}) 
    - Category: ${etf2.category}
    - TER: ${etf2.ter}% 
    - Holdings: ${etf2.holdingsCount}
    - Top Holdings: ${etf2.topHoldings.join(', ')}

    INSTRUCTIONS:
    1. If Horizon is "5 Years", prioritize lower volatility and capital preservation.
    2. If Horizon is "30+ Years", prioritize aggressive growth and compounding, ignoring short-term volatility.
    3. Analyze "Composition" based on the fund tickers (infer exposure to USA vs Global, Tech vs Broad).
    4. Use Google Search to verify current market sentiment or major recent news affecting these sectors.

    Output a STRICT JSON object with this structure:
    {
      "winnerTicker": "Ticker of the better fund or 'Tie'",
      "confidenceScore": number (0-100),
      "headline": "A short, punchy 1-sentence summary (max 10 words)",
      "investmentHorizon": "${horizon}",
      "etf1Advantages": ["Short bullet point", "Short bullet point"],
      "etf2Advantages": ["Short bullet point", "Short bullet point"],
      "composition": {
         "topRegions": ["Region %", "Region %"],
         "topSectors": ["Sector %", "Sector %"],
         "riskLevel": "Low" | "Medium" | "High" | "Extreme",
         "diversificationScore": number (1-10)
      },
      "factors": [
        {
          "category": "Cost",
          "winnerTicker": "Ticker",
          "summary": "Analysis of TER."
        },
        {
          "category": "Tax Efficiency",
          "winnerTicker": "Ticker",
          "summary": "Impact of Domicile/Distribution."
        },
        {
          "category": "Diversification",
          "winnerTicker": "Ticker",
          "summary": "Market cap and geo coverage analysis."
        },
        {
          "category": "Safety",
          "winnerTicker": "Ticker",
          "summary": "Fund size and replication."
        }
      ],
      "finalVerdict": "A professional paragraph summarizing the strategic advice based on the ${horizon} horizon."
    }
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text;
    if (!text) return null;

    try {
        const data = JSON.parse(text) as AIAnalysisResult;
        return data;
    } catch (e) {
        console.error("JSON Parse Error", e);
        return null;
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

export const fetchHoldingLocations = async (holdings: string[]): Promise<PlaceResult[]> => {
    const client = getClient();
    const companies = holdings.slice(0, 3).join(', ');
    const prompt = `Show me the headquarters locations for: ${companies}`;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleMaps: {} }],
            }
        });

        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const results: PlaceResult[] = [];

        if (chunks) {
            chunks.forEach((chunk: any) => {
                if (chunk.maps?.uri) {
                    results.push({
                        name: chunk.maps.title || 'Location',
                        uri: chunk.maps.uri
                    });
                }
            });
        }
        
        // Remove duplicates based on URI
        const unique = new Map();
        results.forEach(r => unique.set(r.uri, r));
        return Array.from(unique.values());

    } catch (e) {
        console.error("Gemini Maps Error", e);
        return [];
    }
}

export type { PlaceResult };
