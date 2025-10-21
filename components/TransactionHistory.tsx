import React, { useState, useMemo } from 'react';
import { SavedReceiptData } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { SyncIcon } from './icons/SyncIcon';
import Spinner from './Spinner';

interface TransactionHistoryProps {
  receipts: SavedReceiptData[];
  onDelete: (id: number) => void;
}

type FilterType = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'All';

// Date helper functions
const getWeekRange = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

const getQuarterRange = (date: Date) => {
    const quarter = Math.floor(date.getMonth() / 3);
    const start = new Date(date.getFullYear(), quarter * 3, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ receipts, onDelete }) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');

  const categoryColors: { [key: string]: string } = {
    "Food & Drink": "bg-red-100 text-red-800",
    "Groceries": "bg-green-100 text-green-800",
    "Transportation": "bg-blue-100 text-blue-800",
    "Shopping": "bg-purple-100 text-purple-800",
    "Utilities": "bg-yellow-100 text-yellow-800",
    "Entertainment": "bg-pink-100 text-pink-800",
    "Health & Wellness": "bg-teal-100 text-teal-800",
    "Travel": "bg-indigo-100 text-indigo-800",
    "Other": "bg-slate-100 text-slate-800",
    "Uncategorized": "bg-gray-100 text-gray-800",
  };
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  
  const { filteredData, periodTitle } = useMemo(() => {
    const now = new Date();
    let filtered = receipts;
    let title = "All Transactions";

    switch (activeFilter) {
      case 'Daily':
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        filtered = receipts.filter(r => new Date(r.transaction_date!) >= todayStart);
        title = `Summary for ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        break;
      case 'Weekly':
        const { start: weekStart, end: weekEnd } = getWeekRange(now);
        filtered = receipts.filter(r => {
            const d = new Date(r.transaction_date!);
            return d >= weekStart && d <= weekEnd;
        });
        title = `Summary for ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
        break;
      case 'Monthly':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = receipts.filter(r => new Date(r.transaction_date!) >= monthStart);
        title = `Summary for ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
        break;
      case 'Quarterly':
        const { start: quarterStart } = getQuarterRange(now);
        filtered = receipts.filter(r => new Date(r.transaction_date!) >= quarterStart);
        title = `Summary for Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
        break;
      case 'Yearly':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        filtered = receipts.filter(r => new Date(r.transaction_date!) >= yearStart);
        title = `Summary for ${now.getFullYear()}`;
        break;
      case 'All':
      default:
        break;
    }
    
    if (activeFilter !== 'All') {
        const summary = filtered.reduce((acc, receipt) => {
            const category = receipt.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + (receipt.total_amount || 0);
            return acc;
        }, {} as { [key: string]: number });
        
        const summaryArray = Object.entries(summary).map(([category, total]) => ({ category, total }));
        return { filteredData: summaryArray, periodTitle: title };
    }

    return { filteredData: filtered, periodTitle: title };
  }, [receipts, activeFilter]);
  
  const handleSync = async () => {
    setSyncStatus('syncing');

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzoHCui3GWkDkfTzpjhoCp9kIeCvCyzrKKweEtuIAm9cVLmrYO0SiZaqg0a3GI5hRApIw/exec';

    try {
        // We send the receipts data in the body of the POST request.
        // The Apps Script is set up to receive this data.
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            // mode: 'no-cors' is often necessary for simple browser-to-Apps-Script calls
            // to avoid CORS errors. The downside is we can't read the response body.
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            // The body has to be a string, so we stringify our receipts array.
            // The Apps Script expects an object with a 'receipts' key.
            body: JSON.stringify({ receipts: receipts }),
        });

        // Since we can't read the response with 'no-cors', we'll assume success if the fetch doesn't throw an error.
        setSyncStatus('synced');

    } catch (error) {
        console.error('Sync failed:', error);
        alert('Syncing failed. Check the browser console for more details.');
        setSyncStatus('idle'); // Reset on error
    } finally {
        // Reset the button state after a couple of seconds so the user can see the success message.
        setTimeout(() => setSyncStatus('idle'), 2500);
    }
  };
  
  const syncButtonText = {
      idle: 'Sync to Google Sheets',
      syncing: 'Syncing...',
      synced: 'Synced Successfully!'
  };

  const syncButtonClasses = {
    idle: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    syncing: 'bg-yellow-500 text-white',
    synced: 'bg-green-600 text-white'
  };

  const handleDownloadCsv = () => {
      let csvContent = "data:text/csv;charset=utf-8,";
      let rows: string[][] = [];

      if (activeFilter === 'All') {
          csvContent += "Date,Transaction,Amount,Category\n";
          rows = (filteredData as SavedReceiptData[]).map(r => [
              r.transaction_date || '',
              `"${r.transaction_name?.replace(/"/g, '""') || ''}"`,
              r.total_amount?.toString() || '0',
              r.category || 'Uncategorized'
          ]);
      } else {
          csvContent += `Category,Total Amount for ${periodTitle}\n`;
          rows = (filteredData as {category: string, total: number}[]).map(s => [
              s.category,
              s.total.toString()
          ]);
      }
      
      const csvRows = rows.map(row => row.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent + csvRows);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `ResiboKo_Export_${activeFilter}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }

  const filters: FilterType[] = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'All'];

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg border border-slate-200 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Transaction History</h2>
          <p className="text-sm text-slate-500 mt-1">View summaries or manage individual transactions.</p>
        </div>
        {receipts.length > 0 && (
            <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                <button 
                    onClick={handleSync} 
                    disabled={syncStatus !== 'idle'}
                    className={`flex-shrink-0 w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-75 disabled:cursor-wait ${syncButtonClasses[syncStatus]}`}
                >
                    {syncStatus === 'syncing' ? <Spinner className="w-4 h-4" /> : <SyncIcon className="w-4 h-4" />}
                    {syncButtonText[syncStatus]}
                </button>
                <button onClick={handleDownloadCsv} className="flex-shrink-0 w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-lg font-semibold transition-colors shadow-sm">
                    <DownloadIcon className="w-4 h-4" />
                    Download CSV
                </button>
            </div>
        )}
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => (
            <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeFilter === filter ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {filter}
            </button>
          ))}
        </div>
      </div>
      
      {receipts.length === 0 ? (
        <div className="text-center py-12">
            <BookOpenIcon className="mx-auto h-16 w-16 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-800">No transactions yet</h3>
            <p className="mt-1 text-sm text-slate-500">Scan a receipt or add an entry to get started.</p>
        </div>
      ) : (
        <div>
          <h3 className="text-md font-semibold text-slate-600 mb-4">{periodTitle}</h3>
          {filteredData.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No transactions found for this period.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {activeFilter === 'All' ? (
                (filteredData as SavedReceiptData[]).map(receipt => (
                   <li key={receipt.id} className="flex items-center justify-between py-4">
                    <div className="flex-grow">
                      <p className="font-semibold text-slate-800">{receipt.transaction_name}</p>
                      <p className="text-sm text-slate-500">{receipt.transaction_date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-semibold text-green-600 text-right">{formatCurrency(receipt.total_amount || 0)}</p>
                        <p className={`text-xs font-medium px-2 py-0.5 rounded-full text-right ml-auto w-fit ${categoryColors[receipt.category || 'Other'] || categoryColors['Other']}`}>
                            {receipt.category}
                        </p>
                      </div>
                      <button onClick={() => onDelete(receipt.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" aria-label="Delete transaction">
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </li>
                ))
              ) : (
                 (filteredData as { category: string; total: number }[]).map(({ category, total }) => (
                  <li key={category} className="flex items-center justify-between py-3">
                    <span className={`text-sm font-semibold px-2 py-1 rounded-full ${categoryColors[category] || categoryColors['Other']}`}>{category}</span>
                    <span className="font-bold text-slate-800">{formatCurrency(total)}</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;