
export interface ReceiptData {
  transaction_name: string | null;
  total_amount: number | null;
  transaction_date: string | null;
  category: string | null;
  client_or_prospect?: string | null;
  purpose?: string | null;
}

export interface SavedReceiptData extends ReceiptData {
  id: number;
}