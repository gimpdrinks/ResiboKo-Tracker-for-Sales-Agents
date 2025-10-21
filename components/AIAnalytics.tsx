import React, { useState } from 'react';
import { SavedReceiptData } from '../types';
import { getSpendingAnalysis } from '../services/geminiService';
import Spinner from './Spinner';
import { SparklesIcon } from './icons/SparklesIcon';

interface AIAnalyticsProps {
    receipts: SavedReceiptData[];
}

const AIAnalytics: React.FC<AIAnalyticsProps> = ({ receipts }) => {
    const [query, setQuery] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const examplePrompts = [
        "Are my claims ready for submission?",
        "How much did I spend on gas and toll?",
        "Show all expenses for client meetings.",
        "Find any issues that might get my claims rejected.",
    ];

    const handleGetInsights = async () => {
        if (!query.trim() || receipts.length === 0) return;

        setIsLoading(true);
        setError(null);
        setAnalysis('');

        try {
            const result = await getSpendingAnalysis(receipts, query);
            setAnalysis(result);
        } catch (err) {
            console.error(err);
            setError('Failed to get insights. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePromptClick = (prompt: string) => {
        setQuery(prompt);
    }

    // New function to render the AI's markdown response as styled HTML
    const renderAnalysis = (text: string) => {
        return text.split('\n').map((line, i) => {
            // Handle horizontal rule
            if (line.trim() === '---') {
                return <hr key={i} className="my-4 border-slate-300" />;
            }

            // Handle list items starting with '*'
            if (line.trim().startsWith('* ')) {
                const content = line.trim().substring(2);
                // Split by bold tags to style them separately
                const parts = content.split(/(\*\*.*?\*\*)/g).filter(part => part);
                return (
                    <p key={i} className="text-slate-600 mb-2 pl-4 relative">
                        <span className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                        {parts.map((part, index) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={index} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                        })}
                    </p>
                );
            }

            // Handle headings/bold lines
            if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
                const content = line.trim().slice(2, -2);
                 return <h3 key={i} className="font-bold text-slate-800 text-md my-3">{content}</h3>
            }

            // Handle empty lines by returning null (they will be filtered out)
            if (line.trim() === '') {
                return null;
            }

            // Default paragraph
            return <p key={i} className="text-slate-600 mb-2">{line}</p>;
        }).filter(Boolean); // Filter out the nulls from empty lines
    };

    return (
        <div className="p-6 bg-white rounded-2xl shadow-lg border border-slate-200 animate-fade-in-up">
            <div className="flex items-center gap-3">
                 <SparklesIcon className="w-8 h-8 text-indigo-500" />
                 <div>
                    <h2 className="text-xl font-bold text-slate-800">AI Financial Assistant</h2>
                    <p className="text-sm text-slate-500 mt-1">Ask "Kuya Claims" about your spending.</p>
                </div>
            </div>
            
            {receipts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                    <p>Add some transactions to start analyzing your spending.</p>
                </div>
            ) : (
                <div className="mt-6">
                     <div className="space-y-2">
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., How much did I spend on groceries this week?"
                            className="w-full px-3 py-2 text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow"
                            rows={3}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleGetInsights();
                                }
                            }}
                        />
                         <div className="flex flex-wrap gap-2">
                            {examplePrompts.map(prompt => (
                                <button key={prompt} onClick={() => handlePromptClick(prompt)} className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors">
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                   
                    <button
                        onClick={handleGetInsights}
                        disabled={isLoading || !query.trim()}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-white bg-slate-700 hover:bg-slate-800 rounded-lg font-semibold transition-colors shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Spinner /> : <SparklesIcon className="w-5 h-5" />}
                        {isLoading ? 'Analyzing...' : 'Get Insights'}
                    </button>
                    {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

                    {analysis && !isLoading && (
                        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                            <h3 className="font-semibold text-slate-700 mb-2">Kuya Claims says:</h3>
                            <div>{renderAnalysis(analysis)}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AIAnalytics;