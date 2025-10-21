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

  const prompt = `Analyze the receipt image and extract the following information. The transaction date should be in YYYY-MM-DD format. For the category, choose the most appropriate one from this list: ${categories.join(', ')}. Also extract the client/prospect name if mentioned, and the purpose of the expense (e.g., tripping, client coffee, toll, or parking). If any information is not found, return null for that field.`;

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
          client_or_prospect: { type: Type.STRING, description: 'The client or prospect name associated with the expense.' },
          purpose: { type: Type.STRING, description: 'The purpose of the expense, e.g., tripping, client coffee, toll.' },
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
      client_or_prospect: data.client_or_prospect || null,
      purpose: data.purpose || null,
  };
  
  return validatedData;
};

export const analyzeTransactionFromVoice = async (audioFile: File): Promise<ReceiptData> => {
    const model = 'gemini-2.5-flash';

    const audioPart = await fileToGenerativePart(audioFile);
    
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `Analyze the following audio and extract the transaction details. Today's date is ${today}. For the category, choose the most appropriate one from this list: ${categories.join(', ')}. Also extract the client/prospect name if mentioned, and the purpose of the expense (e.g., tripping, client coffee, toll, or parking). If any information is not found, return null for that field.`;

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
                    client_or_prospect: { type: Type.STRING, description: 'The client or prospect name associated with the expense.' },
                    purpose: { type: Type.STRING, description: 'The purpose of the expense, e.g., tripping, client coffee, toll.' },
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
        client_or_prospect: data.client_or_prospect || null,
        purpose: data.purpose || null,
    };
  
    return validatedData;
};

const formatTransactionsForAI = (transactions: SavedReceiptData[]): string => {
  if (transactions.length === 0) return "No transactions available.";
  
  // Add client and purpose to the header and rows
  let formattedString = "Date,Transaction,Amount,Category,Client/Prospect,Purpose\n";
  
  transactions.forEach(t => {
    const row = [
      t.transaction_date || 'N/A',
      t.transaction_name || 'N/A',
      t.total_amount?.toFixed(2) || '0.00',
      t.category || 'N/A',
      t.client_or_prospect || 'N/A',
      t.purpose || 'N/A'
    ].join(',');
    formattedString += row + "\n";
  });
  
  return formattedString;
};

export const getSpendingAnalysis = async (transactions: SavedReceiptData[], query: string): Promise<string> => {
    const model = 'gemini-2.5-flash';
    
    const transactionData = formatTransactionsForAI(transactions);
    
    // NEW UPGRADED PROMPT
    const prompt = `
        **Persona:** You are "Kuya Claims," an expert and professional liquidation assistant for a field sales agent in the Philippines. Your tone is direct, helpful, and professional, using "Taglish" where it makes sense (e.g., "para aprubado," "baka ma-flag," "sayang," "clear na clear"). Your single goal is to ensure the agent's liquidation report is 100% compliant and gets approved by their manager with zero rejections. All currency is in Philippine Pesos (PHP).

        **Objective:** Analyze the user's transaction data based on their query. The user's query is: "${query}".
        
        First, answer the user's query directly.
        
        Second, PROACTIVELY scan all transactions for "Reimbursement Leaks." A "Reimbursement Leak" is any expense that a manager might flag or reject, causing the agent to lose money. Find the top 2-3 most critical risks.

        **Reimbursement Leak Categories:**

        1.  **"Baka Ma-Flag" (Missing Details):**
            * THIS IS THE #1 RISK. Scan for transactions where 'purpose' or 'client_or_prospect' is 'N/A' or empty.
            * Sum the total amount (₱) of these "incomplete" claims. This is money at risk.

        2.  **"Di-Clear" Expenses (Vague Descriptions):**
            * Identify generic transaction names (e.g., '7-Eleven', 'Grab', 'Misc', 'Convenience Store') where the 'purpose' is also generic (e.g., 'Food', 'Transpo').
            * Explain *why* a manager might question this (e.g., "Was this a personal snack or a client treat?").

        3.  **"Sayang" Claims (Potential Missed Reimbursements):**
            * If you see many 'Transportation' receipts but no 'Mileage' logs, ask if they used their own car and forgot to claim mileage.
            * If you see "personal-looking" categories like 'Groceries' or 'Shopping', gently warn that these need a very strong business 'purpose' to be approved.

        **Output Format (Strictly follow this):**

        Start with a direct answer to the user's query: "${query}". Use the '₱' symbol for currency.

        Then, if you found any reimbursement leaks, present them using this "card" structure:

        ---
        **Risk #1: [Leak Title - e.g., Incomplete Purpose on 3 Claims 📄]**
        * **Observation:** [Simple, non-judgmental data. e.g., "Nakita ko na may 3 transactions (total ₱850) na walang 'purpose' field, like your 'Gas' receipt on Oct 15."]
        * **The Risk:** [Explain why this is a problem for reimbursement. e.g., "Managers often flag claims without a clear business purpose. Baka ma-delay or ma-reject ang reimbursement mo dito."]
        * **Para Aprubado! (Tip):** [Provide a simple, concrete action. e.g., "Just tap 'edit' on those items and add a quick purpose, like 'Site tripping for Client Ayala' or 'Team meeting.' This makes your liquidation clear na clear!"]
        ---

        End with an encouraging sign-off.

        **Example Report (if user asks "How much did I spend on gas?"):**

        "You spent a total of **₱4,500 on gas** this month across 5 transactions.

        I also scanned your report for any risks, and I found one potential leak:

        ---
        **Risk #1: Missing Client Tags on 2 Claims 👥**
        * **Observation:** Nakita ko na yung 'Client Coffee' (₱320) and 'Team Lunch' (₱1,200) transactions mo ay walang naka-tag na 'client_or_prospect'.
        * **The Risk:** Your manager might ask *who* these meetings were for before approving the claim. Sayang if it gets delayed!
        * **Para Aprubado! (Tip):** Mabilis lang 'to! Just edit those two claims and add the client or team name to the 'Client/Prospect' field. That way, your report is 100% compliant.
        ---

        Great job logging your expenses. Let's get these approved!
        
        **Now, analyze the following transaction data based on the user's query:**
        ${transactionData}
    `;
    
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
    });
    
    return response.text;
};