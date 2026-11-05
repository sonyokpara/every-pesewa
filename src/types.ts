export type TxType = 'income' | 'expense';

export interface Transaction {
  id?: number;
  type: TxType;
  /** Amount in pesewas (integer, 1 GHS = 100 pesewas) */
  amount: number;
  categoryId: number;
  /** ISO date YYYY-MM-DD */
  date: string;
  note: string;
  createdAt: number;
}

export interface Category {
  id?: number;
  name: string;
  type: TxType;
  color: string;
  icon: string;
}

export interface Budget {
  id?: number;
  categoryId: number;
  /** YYYY-MM */
  month: string;
  /** Limit in pesewas */
  limit: number;
}
