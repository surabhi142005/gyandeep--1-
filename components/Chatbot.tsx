import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Coordinates } from '../types';
import { getChatbotResponse } from '../services/geminiService';
import Spinner from './Spinner';

interface ChatbotProps {
  theme: string;
  userLocation: Coordinates | null;
}

interface Message {
    sender: 'user' | 'bot';
    text: string;
    sources?: Array<{ uri: string; title: string; }>;
}

const THEME_COLORS: Record<string, Record<string, string>> = {
    indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', ring: 'focus:ring-indigo-500', border: 'border-indigo-500' },
    teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', ring: 'focus:ring-teal-500', border: 'border-teal-500' },
    crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', ring: 'focus:ring-red-500', border: 'border-red-500' },
    purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', ring: 'focus:ring-purple-500', border: 'border-purple-500' },
};

const Chatbot: React.FC<ChatbotProps> = ({ theme, userLocation }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'bot', text: "Hello! I'm your AI assistant. Ask me anything about your coursework, or try a location-based query like 'Find good study spots near me'." }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string|null>(null);
    const [chatbotModel, setChatbotModel] = useState<'fast' | 'smart'>('fast');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if(isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);
    
    const handleModelChange = (model: 'fast' | 'smart') => {
        if (model !== chatbotModel) {
            setChatbotModel(model);
            setMessages([
                { sender: 'bot', text: `Switched to ${model} model. How can I help you?` }
            ]);
            setError(null);
            setIsLoading(false); // Cancel any ongoing request
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = inputValue.trim();
        if (!trimmedInput || isLoading) return;

        const userMessage: Message = { sender: 'user', text: trimmedInput };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        setError(null);

        try {
            // FIX: The `getChatbotResponse` function expects a `location` property, not `userLocation`.
            const response = await getChatbotResponse({ prompt: trimmedInput, location: userLocation, model: chatbotModel });
            const botMessage: Message = { sender: 'bot', text: response.text, sources: response.sources };
            setMessages(prev => [...prev, botMessage]);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            handleSendMessage(e as any);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 ${colors.primary} ${colors.hover} text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center transform transition-transform duration-300 hover:scale-110 z-50`}
                aria-label="Toggle AI Assistant"
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                )}
            </button>
            <div className={`fixed bottom-24 right-6 w-[calc(100%-3rem)] max-w-md bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out z-50 origin-bottom-right ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`} style={{height: 'min(600px, 70vh)'}}>
                <header className={`p-4 ${colors.primary} rounded-t-2xl text-white font-bold text-lg flex justify-between items-center`}>
                    AI Assistant
                    <div className="flex items-center text-xs space-x-1 bg-white/20 p-1 rounded-lg font-semibold">
                        <button onClick={() => handleModelChange('fast')} className={`px-3 py-1 rounded-md transition-colors ${chatbotModel === 'fast' ? `bg-white ${colors.text}` : 'text-white'}`}>Fast</button>
                        <button onClick={() => handleModelChange('smart')} className={`px-3 py-1 rounded-md transition-colors ${chatbotModel === 'smart' ? `bg-white ${colors.text}` : 'text-white'}`}>Smart</button>
                    </div>
                </header>
                <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                    <div className="space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-xl ${msg.sender === 'user' ? `${colors.primary} text-white` : 'bg-gray-200 text-gray-800'}`}>
                                    <pre className="whitespace-pre-wrap font-sans text-sm">{msg.text}</pre>
                                     {msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-3 border-t border-gray-300 pt-2">
                                            <h4 className="text-xs font-semibold mb-1">Sources:</h4>
                                            <ul className="space-y-1">
                                                {msg.sources.map((source, i) => (
                                                    <li key={i}>
                                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all">
                                                            {source.title}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="max-w-[80%] p-3 rounded-xl bg-gray-200 text-gray-800 flex items-center">
                                    <Spinner size="w-5 h-5" color={colors.text} />
                                    <span className="ml-2 text-sm italic">Thinking...</span>
                                </div>
                            </div>
                        )}
                        {error && (
                             <div className="flex justify-start">
                                <div className="max-w-[80%] p-3 rounded-xl bg-red-100 text-red-700 text-sm">
                                    <strong>Error:</strong> {error}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask a question..."
                            disabled={isLoading}
                            className={`flex-1 bg-transparent border-0 p-2 text-gray-800 focus:outline-none ${colors.ring}`}
                            aria-label="Chat input"
                        />
                        <button type="submit" disabled={isLoading || !inputValue.trim()} className={`p-2 rounded-md ${colors.primary} ${colors.hover} text-white disabled:opacity-50 transition-colors`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default Chatbot;