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
        "How much did I spend on food this month?",
        "What are my top 3 spending categories?",
        "Show me my expenses from last week.",
        "What was my most expensive purchase?",
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

    return (
        <div className="p-6 bg-white rounded-2xl shadow-lg border border-slate-200 animate-fade-in-up">
            <div className="flex items-center gap-3">
                 <SparklesIcon className="w-8 h-8 text-indigo-500" />
                 <div>
                    <h2 className="text-xl font-bold text-slate-800">AI Financial Assistant</h2>
                    <p className="text-sm text-slate-500 mt-1">Ask questions about your spending.</p>
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
                        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <h3 className="font-semibold text-slate-700 mb-2">Analysis:</h3>
                            <p className="text-slate-600 whitespace-pre-wrap">{analysis}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AIAnalytics;
