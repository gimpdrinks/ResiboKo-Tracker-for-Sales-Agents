import React, { useState, useEffect } from 'react';
import { ReceiptData } from '../types';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ResultDisplayProps {
  data: ReceiptData;
  onSave: (data: ReceiptData) => void;
  onDiscard: () => void;
}

const categories = [
    "Food & Drink", "Groceries", "Transportation", "Shopping", "Utilities",
    "Entertainment", "Health & Wellness", "Travel", "Other"
];

const formatCurrency = (amount: number | null) => {
    if (amount === null) return '';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ data, onSave, onDiscard }) => {
  const [formData, setFormData] = useState<ReceiptData>({ ...data });

  useEffect(() => {
    setFormData({ ...data });
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value === '' ? null : parseFloat(value) }))
  }

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="p-6 bg-white rounded-2xl animate-fade-in-up">
      <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">Extracted Details</h2>
      <p className="text-sm text-slate-500 mb-6 text-center">Please review and edit if needed.</p>

      <div className="space-y-4">
        <div>
          <label htmlFor="transaction_name" className="block text-sm font-medium text-slate-600 mb-1">
            Transaction Name
          </label>
          <input
            id="transaction_name"
            name="transaction_name"
            type="text"
            value={formData.transaction_name || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="e.g., Coffee Shop"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="total_amount" className="block text-sm font-medium text-slate-600 mb-1">
              Amount ({formatCurrency(formData.total_amount)})
            </label>
            <input
              id="total_amount"
              name="total_amount"
              type="number"
              step="0.01"
              value={formData.total_amount ?? ''}
              onChange={handleAmountChange}
              className="w-full px-3 py-2 text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g., 250.00"
            />
          </div>
          <div>
            <label htmlFor="transaction_date" className="block text-sm font-medium text-slate-600 mb-1">
              Date
            </label>
            <input
              id="transaction_date"
              name="transaction_date"
              type="date"
              value={formData.transaction_date || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-slate-600 mb-1">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={formData.category || 'Other'}
            onChange={handleChange}
            className="w-full px-3 py-2 text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleSave}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-white bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <PlusCircleIcon className="w-5 h-5" />
          Save Transaction
        </button>
        <button
          onClick={onDiscard}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-white bg-red-500 hover:bg-red-600 rounded-lg font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <TrashIcon className="w-5 h-5" />
          Discard
        </button>
      </div>
    </div>
  );
};

export default ResultDisplay;
