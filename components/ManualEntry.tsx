import React, { useState, useRef, useEffect } from 'react';
import { ReceiptData } from '../types';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { analyzeTransactionFromVoice } from '../services/geminiService';
import Spinner from './Spinner';

interface ManualEntryProps {
  onClose: () => void;
  onSave: (data: ReceiptData) => void;
}

const categories = [
    "Food & Drink", "Groceries", "Transportation", "Shopping", "Utilities",
    "Entertainment", "Health & Wellness", "Travel", "Other"
];

const ManualEntry: React.FC<ManualEntryProps> = ({ onClose, onSave }) => {
  const [transactionName, setTransactionName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(categories[2]); // Default to Transportation
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleVoiceData = (data: ReceiptData) => {
    if (data.transaction_name) setTransactionName(data.transaction_name);
    if (data.total_amount) setTotalAmount(data.total_amount.toString());
    if (data.transaction_date) setTransactionDate(data.transaction_date);
    if (data.category) setCategory(data.category);
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });
        audioChunksRef.current = [];
        try {
            const result = await analyzeTransactionFromVoice(audioFile);
            handleVoiceData(result);
        } catch (err) {
            console.error(err);
            setError("Sorry, I couldn't understand that. Please try again or enter manually.");
        } finally {
            setIsProcessing(false);
        }
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Microphone access was denied. Please enable it in your browser settings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // Stop all tracks to turn off the microphone indicator
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };
  
  const handleRecordClick = () => {
      if (isRecording) {
          stopRecording();
      } else {
          startRecording();
      }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(totalAmount);
    if (transactionName && !isNaN(amount) && transactionDate && category) {
      onSave({
        transaction_name: transactionName,
        total_amount: amount,
        transaction_date: transactionDate,
        category: category,
      });
    } else {
        alert("Please fill in all fields correctly.");
    }
  };
  
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold font-poppins text-slate-800">Add Manual Entry</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">&times;</button>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <button
                type="button"
                onClick={handleRecordClick}
                disabled={isProcessing}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} disabled:bg-slate-300`}
            >
                {isProcessing ? <Spinner className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />}
                {isProcessing ? 'Processing...' : (isRecording ? 'Stop Recording' : 'Record with Voice')}
            </button>
            <p className="text-xs text-slate-500 mt-2 text-center">Example: "Jeepney ride, twenty pesos, today, transportation"</p>
          </div>
          <div className="flex items-center text-slate-400 text-sm">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4">OR</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>
          <div>
            <label htmlFor="transactionName" className="block text-sm font-medium text-slate-600 mb-1">
              Transaction Name
            </label>
            <input
              id="transactionName" type="text" value={transactionName} onChange={(e) => setTransactionName(e.target.value)}
              className="w-full px-3 py-2 text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g., Bus Fare" required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label htmlFor="totalAmount" className="block text-sm font-medium text-slate-600 mb-1">Amount</label>
                  <input
                      id="totalAmount" type="number" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)}
                      className="w-full px-3 py-2 text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g., 20.00" required
                  />
              </div>
              <div>
                   <label htmlFor="transactionDate" className="block text-sm font-medium text-slate-600 mb-1">Date</label>
                  <input
                      id="transactionDate" type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)}
                      className="w-full px-3 py-2 text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" required
                  />
              </div>
          </div>
          <div>
             <label htmlFor="category" className="block text-sm font-medium text-slate-600 mb-1">Category</label>
            <select
              id="category" value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" required
            >
              {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-white bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <PlusCircleIcon className="w-5 h-5" />
            Save Transaction
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManualEntry;