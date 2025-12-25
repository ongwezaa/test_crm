export type ID = number;

export interface User {
  id: ID;
  email: string;
  name: string;
}

export interface Account {
  id: ID;
  name: string;
  industry?: string | null;
  website?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: ID;
  account_id: ID;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: ID;
  name: string;
  order_index: number;
  is_won: number;
  is_lost: number;
}

export interface Deal {
  id: ID;
  account_id: ID;
  primary_contact_id?: ID | null;
  title: string;
  amount: number;
  currency: string;
  stage_id: ID;
  owner_user_id: ID;
  close_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: ID;
  deal_id: ID;
  type: string;
  subject: string;
  due_date?: string | null;
  status: string;
  assigned_user_id: ID;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: ID;
  deal_id: ID;
  author_user_id: ID;
  body: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  details?: string;
}
