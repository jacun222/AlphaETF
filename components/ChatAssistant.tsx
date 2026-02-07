import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Chat, GenerateContentResponse } from '@google/genai';
import { ETF, ChatMessage, Source } from '../types';
import { createChatSession } from '../services/geminiService';

interface ChatAssistantProps {
  etfLeft: ETF | null;
  etfRight: ETF | null;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ etfLeft, etfRight }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Ref to hold the mutable chat session from the SDK
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or Reset chat when ETFs change
  useEffect(() => {
    chatSessionRef.current = createChatSession(etfLeft, etfRight);
    
    // Set initial greeting
    let greeting = "Hi! I'm your AI Analyst with Google Search access.";
    if (etfLeft && etfRight) {
        greeting = `Hi! I can help you compare **${etfLeft.ticker}** and **${etfRight.ticker}**. I can search the web for real-time news, specific risks, and overlapping holdings.`;
    } else {
        greeting = "Select two ETFs to start a detailed comparison, or ask me general investment questions.";
    }
    setMessages([{ role: 'model', text: greeting }]);
  }, [etfLeft, etfRight]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || !chatSessionRef.current) return;

    if (!textOverride) setInput(''); // Clear input if typed
    
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setIsTyping(true);

    try {
      const result = await chatSessionRef.current.sendMessageStream({ message: textToSend });
      
      let fullText = '';
      const uniqueSourceUrls = new Set<string>();
      const accumulatedSources: Source[] = [];

      // Create a placeholder message for the AI response
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        const textChunk = c.text || '';
        fullText += textChunk;

        // Process Grounding Metadata for Sources
        if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            c.candidates[0].groundingMetadata.groundingChunks.forEach((gc: any) => {
                if (gc.web?.uri && gc.web?.title) {
                    if (!uniqueSourceUrls.has(gc.web.uri)) {
                        uniqueSourceUrls.add(gc.web.uri);
                        accumulatedSources.push({ 
                            title: gc.web.title, 
                            uri: gc.web.uri 
                        });
                    }
                }
            });
        }
        
        // Update the last message with the accumulated text and sources
        setMessages(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = { 
                role: 'model', 
                text: fullText,
                sources: accumulatedSources.length > 0 ? [...accumulatedSources] : undefined
            };
            return newHistory;
        });
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error connecting to Gemini.", isError: true }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
      "Current yield comparison?",
      "Recent news about Tech sector?",
      "Which has lower volatility recently?",
      "Top 10 holdings overlap?"
  ];

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-700">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-800 leading-tight">AI Investment Consultant</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <p className="text-[10px] text-slate-500 font-medium">Google Search Enabled</p>
                    </div>
                 </div>
            </div>
            <button onClick={() => setMessages([])} className="text-slate-400 hover:text-red-500 transition-colors" title="Clear Chat">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'}`}>
                        {msg.role === 'model' ? (
                            <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-li:my-0 prose-strong:text-slate-900 prose-headings:text-slate-900 prose-a:text-indigo-600">
                                <ReactMarkdown>
                                    {msg.text}
                                </ReactMarkdown>
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-slate-100">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            Sources
                                        </p>
                                        <div className="grid gap-1">
                                            {msg.sources.map((source, i) => (
                                                <a 
                                                    key={i} 
                                                    href={source.uri} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="flex items-center gap-1.5 text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline bg-indigo-50/50 px-2 py-1 rounded truncate"
                                                >
                                                    <span className="w-1 h-1 rounded-full bg-indigo-400 flex-shrink-0"></span>
                                                    <span className="truncate">{source.title}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            msg.text
                        )}
                        {msg.isError && <span className="block mt-1 text-xs opacity-70">Error sending message</span>}
                    </div>
                </div>
            ))}
            {isTyping && (
                <div className="flex justify-start">
                     <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                         <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                         <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                         <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                     </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Suggestions & Input */}
        <div className="bg-white border-t border-slate-100 p-4">
            {/* Chips */}
            {etfLeft && etfRight && messages.length < 5 && !isTyping && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2 no-scrollbar">
                    {suggestions.map((s, i) => (
                        <button 
                            key={i} 
                            onClick={() => handleSend(s)}
                            className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 text-xs font-medium border border-slate-200 hover:border-indigo-200 transition-colors"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-2 relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isTyping}
                    placeholder="Ask about news, prices, or comparison..."
                    className="flex-1 bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                />
                <button 
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isTyping}
                    className="bg-indigo-600 text-white rounded-xl px-4 py-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                    <svg className="w-5 h-5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
            </div>
        </div>
    </div>
  );
};

export default ChatAssistant;