import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData, SavedReceiptData } from '../types';

// FIX: Initialize GoogleGenAI with API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const categories = [
    "Food & Drink", "Groceries", "Transportation", "Shopping", "Utilities",
    "Entertainment", "Health & Wellness", "Travel", "Other"
];

export const analyzeReceipt = async (imageFile: File): Promise<ReceiptData> => {
  // FIX: Use a model that supports multimodal input.
  const model = 'gemini-2.5-flash';
  
  const imagePart = await fileToGenerativePart(imageFile);

  const prompt = `Analyze the receipt image and extract the following information. The transaction date should be in YYYY-MM-DD format. For the category, choose the most appropriate one from this list: ${categories.join(', ')}. If any information is not found, return null for that field.`;

  // FIX: Use generateContent with responseSchema for structured JSON output.
  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        { text: prompt },
        imagePart,
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transaction_name: { type: Type.STRING, description: "The name of the merchant or transaction." },
          total_amount: { type: Type.NUMBER, description: "The final total amount of the transaction." },
          transaction_date: { type: Type.STRING, description: "The date of the transaction in YYYY-MM-DD format. If the user says 'today', use the current date." },
          category: { type: Type.STRING, description: `The category of the purchase. Must be one of: ${categories.join(', ')}.` },
        },
      },
    },
  });

  // FIX: Correctly parse the JSON response from the 'text' property.
  const jsonText = response.text.trim();
  const data = JSON.parse(jsonText) as ReceiptData;

  // Validate and clean up data
  const validatedData: ReceiptData = {
      transaction_name: data.transaction_name || null,
      total_amount: typeof data.total_amount === 'number' ? data.total_amount : null,
      transaction_date: data.transaction_date || null,
      category: data.category && categories.includes(data.category) ? data.category : 'Other',
  };
  
  return validatedData;
};

export const analyzeTransactionFromVoice = async (audioFile: File): Promise<ReceiptData> => {
    const model = 'gemini-2.5-flash';

    const audioPart = await fileToGenerativePart(audioFile);
    
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `Analyze the following audio and extract the transaction details. Today's date is ${today}. For the category, choose the most appropriate one from this list: ${categories.join(', ')}. If any information is not found, return null for that field.`;

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }, audioPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    transaction_name: { type: Type.STRING },
                    total_amount: { type: Type.NUMBER },
                    transaction_date: { type: Type.STRING, description: `The date in YYYY-MM-DD format. If the user says 'today', use ${today}.` },
                    category: { type: Type.STRING, description: `Must be one of: ${categories.join(', ')}.` },
                },
            },
        },
    });

    const jsonText = response.text.trim();
    const data = JSON.parse(jsonText) as ReceiptData;
    
    // Validate and clean up data
    const validatedData: ReceiptData = {
        transaction_name: data.transaction_name || null,
        total_amount: typeof data.total_amount === 'number' ? data.total_amount : null,
        transaction_date: data.transaction_date || today,
        category: data.category && categories.includes(data.category) ? data.category : 'Other',
    };
  
    return validatedData;
};

const formatTransactionsForAI = (transactions: SavedReceiptData[]): string => {
  if (transactions.length === 0) return "No transactions available.";
  
  let formattedString = "Date,Transaction,Amount,Category\n";
  
  transactions.forEach(t => {
    const row = [
      t.transaction_date || 'N/A',
      t.transaction_name || 'N/A',
      t.total_amount?.toFixed(2) || '0.00',
      t.category || 'N/A'
    ].join(',');
    formattedString += row + "\n";
  });
  
  return formattedString;
};

export const getSpendingAnalysis = async (transactions: SavedReceiptData[], query: string): Promise<string> => {
    const model = 'gemini-2.5-flash';
    
    const transactionData = formatTransactionsForAI(transactions);
    
    const prompt = `You are a helpful financial assistant for a user in the Philippines. All transactions are in Philippine Pesos (PHP). Based on the following transaction data in CSV format, please answer the user's question. Provide a concise and clear answer, and make sure to use the '₱' symbol for all currency amounts.
    
    Transaction Data:
    ${transactionData}
    
    User's Question: "${query}"
    
    Your analysis:`;
    
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
    });
    
    return response.text;
};