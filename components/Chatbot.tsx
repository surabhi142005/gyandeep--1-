import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { Coordinates } from '../types';
import { getChatbotResponse } from '../services/geminiService';
import Spinner from './Spinner';
import { voiceService } from '../services/voiceService';
import type { VoiceServiceState } from '../services/voiceService';

interface ChatbotProps {
    theme: string;
    userLocation: Coordinates | null;
}

interface Message {
    sender: 'user' | 'bot';
    text: string;
    sources?: Array<{ uri: string; title: string; }>;
    thinking?: boolean; // Shown while in thinking mode
}

const WELCOME_MESSAGE: Message = {
    sender: 'bot',
    text: "Hello! I'm your AI assistant. Ask me anything about your coursework, or try a location-based query like 'Find good study spots near me'."
};

const SESSION_STORAGE_KEY = 'gyandeep-chatbot-history';

const THEME_COLORS: Record<string, Record<string, string>> = {
    indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', ring: 'focus:ring-indigo-500', border: 'border-indigo-500' },
    teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', ring: 'focus:ring-teal-500', border: 'border-teal-500' },
    crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', ring: 'focus:ring-red-500', border: 'border-red-500' },
    purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', ring: 'focus:ring-purple-500', border: 'border-purple-500' },
};

// Load messages from sessionStorage (persists across chatbot open/close but clears on tab close)
function loadMessages(): Message[] {
    try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : [WELCOME_MESSAGE];
    } catch {
        return [WELCOME_MESSAGE];
    }
}

function saveMessages(msgs: Message[]) {
    try {
        // Keep only last 50 messages to avoid storage overflow
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(msgs.slice(-50)));
    } catch (err) {
        console.warn('Failed to save chatbot messages to sessionStorage', err);
    }
}

const Chatbot: React.FC<ChatbotProps> = ({ theme, userLocation }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>(loadMessages);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chatbotModel, setChatbotModel] = useState<'fast' | 'smart'>('fast');
    const [thinkingMode, setThinkingMode] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [voiceState, setVoiceState] = useState<VoiceServiceState>(voiceService.getState());

    const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

    // Persist messages to sessionStorage whenever they change
    useEffect(() => {
        saveMessages(messages);
    }, [messages]);

    useEffect(() => {
        return voiceService.subscribe(setVoiceState);
    }, []);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen, scrollToBottom]);

    const handleModelChange = (model: 'fast' | 'smart') => {
        if (model !== chatbotModel) {
            setChatbotModel(model);
        }
    };

    const handleClearHistory = () => {
        const fresh = [WELCOME_MESSAGE];
        setMessages(fresh);
        saveMessages(fresh);
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

        // Add thinking indicator for thinking mode
        if (thinkingMode) {
            setMessages(prev => [...prev, { sender: 'bot', text: '🧠 Thinking deeply...', thinking: true }]);
        }

        try {
            const response = await getChatbotResponse({
                prompt: trimmedInput,
                location: userLocation,
                model: thinkingMode ? 'smart' : chatbotModel
            });
            const botMessage: Message = { sender: 'bot', text: response.text, sources: response.sources };
            // Remove the "thinking" placeholder and add real response
            setMessages(prev => [...prev.filter(m => !m.thinking), botMessage]);
            voiceService.autoSpeak(response.text);
        } catch (err: any) {
            setMessages(prev => prev.filter(m => !m.thinking));
            const errMsg = err.message?.includes('API key')
                ? 'AI service unavailable. Please check your API key configuration.'
                : err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')
                    ? 'Network error. Please check your internet connection.'
                    : err.message || 'An unexpected error occurred.';
            setError(errMsg);
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
            <div className={`fixed bottom-24 right-6 w-[calc(100%-3rem)] max-w-md bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out z-50 origin-bottom-right ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`} style={{ height: 'min(600px, 70vh)' }}>
                <header className={`p-4 ${colors.primary} rounded-t-2xl text-white font-bold text-lg flex justify-between items-center flex-shrink-0`}>
                    <span>AI Assistant</span>
                    <div className="flex items-center gap-2">
                        {/* Thinking Mode Toggle */}
                        <button
                            onClick={() => setThinkingMode(!thinkingMode)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-colors ${thinkingMode ? 'bg-yellow-400/90 text-yellow-900' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                            title={thinkingMode ? 'Thinking Mode ON (slower, smarter)' : 'Enable Thinking Mode'}
                        >
                            🧠 {thinkingMode ? 'Deep' : 'Fast'}
                        </button>
                        {/* TTS Toggle */}
                        <button
                            onClick={() => voiceService.setTTSEnabled(!voiceState.ttsEnabled)}
                            className={`p-1.5 rounded-md transition-colors ${voiceState.ttsEnabled ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
                            aria-label={voiceState.ttsEnabled ? 'Disable text-to-speech' : 'Enable text-to-speech'}
                            title={voiceState.ttsEnabled ? 'TTS On' : 'TTS Off'}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {voiceState.ttsEnabled ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                )}
                            </svg>
                        </button>
                        {/* Model Switcher (only when not in thinking mode) */}
                        {!thinkingMode && (
                            <div className="flex items-center text-xs space-x-1 bg-white/20 p-1 rounded-lg font-semibold">
                                <button onClick={() => handleModelChange('fast')} className={`px-2 py-1 rounded-md transition-colors ${chatbotModel === 'fast' ? `bg-white ${colors.text}` : 'text-white hover:bg-white/10'}`}>Fast</button>
                                <button onClick={() => handleModelChange('smart')} className={`px-2 py-1 rounded-md transition-colors ${chatbotModel === 'smart' ? `bg-white ${colors.text}` : 'text-white hover:bg-white/10'}`}>Smart</button>
                            </div>
                        )}
                        {/* Clear history */}
                        <button
                            onClick={handleClearHistory}
                            className="p-1.5 rounded-md bg-white/10 hover:bg-white/30 transition-colors text-white"
                            title="Clear chat history"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </header>
                <div className="flex-1 p-4 overflow-y-auto bg-gray-50 min-h-0">
                    <div className="space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-xl ${msg.thinking
                                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 animate-pulse'
                                    : msg.sender === 'user'
                                        ? `${colors.primary} text-white`
                                        : 'bg-white text-gray-800 border border-gray-100 shadow-sm'
                                    }`}>
                                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.text}</pre>
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-3 border-t border-gray-200 pt-2">
                                            <h4 className="text-xs font-semibold text-gray-500 mb-1">Sources:</h4>
                                            <ul className="space-y-1">
                                                {msg.sources.map((source, i) => (
                                                    <li key={i}>
                                                        <a
                                                            href={source.uri}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-600 hover:underline break-all flex items-center gap-1"
                                                        >
                                                            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                            {source.title || source.uri}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && !messages.some(m => m.thinking) && (
                            <div className="flex justify-start">
                                <div className="max-w-[80%] p-3 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center gap-2">
                                    <Spinner size="w-4 h-4" color={colors.text} />
                                    <span className="text-sm text-gray-500 italic">Thinking...</span>
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className="flex justify-start">
                                <div className="max-w-[80%] p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                                    <strong>Error:</strong> {error}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white rounded-b-2xl flex-shrink-0">
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1">
                        {voiceService.isSTTSupported() && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (voiceState.isListening) {
                                        voiceService.stopListening();
                                    } else {
                                        voiceService.startListening(
                                            (text) => setInputValue(text),
                                            (err) => setError(err)
                                        );
                                    }
                                }}
                                className={`p-2 rounded-lg transition-all ${voiceState.isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
                                aria-label={voiceState.isListening ? 'Stop listening' : 'Voice input'}
                                title={voiceState.isListening ? 'Listening... click to stop' : 'Voice input'}
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            </button>
                        )}
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={voiceState.isListening ? '🎤 Listening...' : thinkingMode ? '🧠 Ask anything (thinking mode)...' : 'Ask a question...'}
                            disabled={isLoading}
                            className={`flex-1 bg-transparent border-0 p-2 text-gray-800 focus:outline-none text-sm`}
                            aria-label="Chat input"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !inputValue.trim()}
                            className={`p-2 rounded-lg ${colors.primary} ${colors.hover} text-white disabled:opacity-50 transition-all`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </button>
                    </div>
                    {thinkingMode && (
                        <p className="text-xs text-center text-amber-600 mt-2">🧠 Thinking mode: deeper analysis, slower responses</p>
                    )}
                </form>
            </div>
        </>
    );
};

export default Chatbot;