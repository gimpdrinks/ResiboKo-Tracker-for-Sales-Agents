import React, { useState, useCallback, useEffect } from 'react';
import { analyzeReceipt } from './services/geminiService';
import { ReceiptData, SavedReceiptData } from './types';
import ImageUploader from './components/ImageUploader';
import ResultDisplay from './components/ResultDisplay';
import ManualEntry from './components/ManualEntry';
import CameraCapture from './components/CameraCapture';
import TransactionHistory from './components/TransactionHistory';
import AIAnalytics from './components/AIAnalytics';
import Spinner from './components/Spinner';
import { CameraIcon } from './components/icons/CameraIcon';
import { PlusCircleIcon } from './components/icons/PlusCircleIcon';

const App: React.FC = () => {
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
    const [savedReceipts, setSavedReceipts] = useState<SavedReceiptData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showManualEntry, setShowManualEntry] = useState<boolean>(false);
    const [showCamera, setShowCamera] = useState<boolean>(false);

    // Load receipts from local storage on initial render
    useEffect(() => {
        try {
            const storedReceipts = localStorage.getItem('savedReceipts');
            if (storedReceipts) {
                setSavedReceipts(JSON.parse(storedReceipts));
            }
        } catch (error) {
            console.error("Failed to load receipts from local storage", error);
        }
    }, []);

    // Save receipts to local storage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem('savedReceipts', JSON.stringify(savedReceipts));
        } catch (error) {
            console.error("Failed to save receipts to local storage", error);
        }
    }, [savedReceipts]);

    const handleImageSelect = useCallback(async (file: File) => {
        setIsLoading(true);
        setError(null);
        setReceiptData(null);
        try {
            const data = await analyzeReceipt(file);
            // Basic validation for current year
            if (data.transaction_date) {
                const receiptYear = new Date(data.transaction_date).getFullYear();
                const currentYear = new Date().getFullYear();
                if (receiptYear !== currentYear) {
                    setError(`This receipt is from ${receiptYear}. Only transactions for the current year (${currentYear}) are allowed.`);
                    setIsLoading(false);
                    return;
                }
            }
            setReceiptData(data);
        } catch (err) {
            console.error(err);
            setError('Failed to analyze the receipt. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleSaveReceipt = useCallback((data: ReceiptData) => {
        if (!data.transaction_name || data.total_amount === null || !data.transaction_date || !data.category) {
            setError("Cannot save incomplete receipt data.");
            return;
        }
        const newReceipt: SavedReceiptData = {
            ...data,
            id: Date.now(),
        };
        setSavedReceipts(prev => [newReceipt, ...prev].sort((a, b) => new Date(b.transaction_date!).getTime() - new Date(a.transaction_date!).getTime()));
        setReceiptData(null);
        setShowManualEntry(false);
    }, []);
    
    const handleDiscard = () => {
        setReceiptData(null);
        setError(null);
    };
    
    const handleDeleteReceipt = (id: number) => {
        setSavedReceipts(prev => prev.filter(receipt => receipt.id !== id));
    };

    return (
        <div className="bg-slate-100 min-h-screen font-sans">
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center">
                   <img src="https://res.cloudinary.com/dbylka4xx/image/upload/v1751883360/AiForPinoys_Logo_ttg2id.png" alt="ResiboKo Logo" className="h-16 w-auto mx-auto mb-2"/>
                   <h1 className="text-3xl font-bold font-poppins text-slate-800">ResiboKo</h1>
                   <p className="mt-1 text-slate-600">Master your cash flow, one receipt at a time.</p>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                 <div className="p-6 bg-white rounded-2xl shadow-lg border border-slate-200">
                    {!receiptData && !isLoading && (
                         <>
                            <h2 className="text-xl font-bold text-slate-800 mb-1 text-center">Upload a Receipt</h2>
                            <p className="text-slate-500 mb-6 text-center text-sm">Extract transaction data using AI.</p>
                            <ImageUploader onImageSelect={handleImageSelect} />
                            <div className="my-4 flex items-center text-slate-400 text-sm">
                                <div className="flex-grow border-t border-slate-200"></div>
                                <span className="flex-shrink mx-4">OR</span>
                                <div className="flex-grow border-t border-slate-200"></div>
                            </div>
                            <div className="space-y-3">
                                <button onClick={() => setShowCamera(true)} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-white bg-slate-700 hover:bg-slate-800 rounded-lg font-semibold transition-colors shadow-sm">
                                    <CameraIcon className="w-5 h-5" />
                                    Use Camera
                                </button>
                                 <button onClick={() => setShowManualEntry(true)} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-white bg-slate-700 hover:bg-slate-800 rounded-lg font-semibold transition-colors shadow-sm">
                                    <PlusCircleIcon className="w-5 h-5" />
                                    Manual / Voice Entry
                                </button>
                             </div>
                         </>
                    )}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center p-8">
                            <Spinner className="w-10 h-10 text-indigo-600" />
                            <p className="mt-4 text-slate-600 font-semibold">Analyzing your receipt...</p>
                            <p className="text-sm text-slate-500">This may take a moment.</p>
                        </div>
                    )}
                     {error && !isLoading && (
                         <div className="text-center p-4">
                             <p className="text-red-600 font-semibold">Analysis Failed</p>
                             <p className="text-slate-600 mt-1">{error}</p>
                             <button onClick={handleDiscard} className="mt-4 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg">
                                 Try Again
                            </button>
                         </div>
                    )}
                    {receiptData && !isLoading && (
                        <ResultDisplay 
                            data={receiptData} 
                            onSave={handleSaveReceipt} 
                            onDiscard={handleDiscard} 
                        />
                    )}
                </div>
                
                <TransactionHistory 
                    receipts={savedReceipts}
                    onDelete={handleDeleteReceipt}
                />

                <AIAnalytics receipts={savedReceipts} />
            </main>
            
            {showManualEntry && (
                <ManualEntry 
                    onClose={() => setShowManualEntry(false)}
                    onSave={handleSaveReceipt}
                />
            )}
            
            {showCamera && (
                <CameraCapture 
                    onClose={() => setShowCamera(false)}
                    onCapture={(file) => {
                        setShowCamera(false);
                        handleImageSelect(file);
                    }}
                />
            )}
        </div>
    );
};

export default App;