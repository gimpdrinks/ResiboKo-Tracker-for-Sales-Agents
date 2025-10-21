
export interface ReceiptData {
  transaction_name: string | null;
  total_amount: number | null;
  transaction_date: string | null;
  category: string | null;
}

export interface SavedReceiptData extends ReceiptData {
  id: number;
}
