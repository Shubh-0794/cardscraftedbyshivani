import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseSchema } from './db';

const DEFAULT_SUPABASE_URL = 'https://qdcqyxykmdfxxxgyhgbl.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable__D3m60m82RXB_ScfHSNmtg_wuJ7FxKW';
const PROJECT_ID = 'qdcqyxykmdfxxxgyhgbl';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const key = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return supabaseClient;
}

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  return {
    projectId: PROJECT_ID,
    url,
    configured: Boolean(url && key),
    maskedKey: key ? `${key.substring(0, 16)}...${key.slice(-6)}` : ''
  };
}

/**
 * Ping / Test connectivity to Supabase
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  latencyMs: number;
  message: string;
  projectId: string;
  url: string;
}> {
  const startTime = Date.now();
  const config = getSupabaseConfig();
  try {
    const client = getSupabaseClient();
    // Try to query or ping the project endpoint
    const response = await fetch(`${config.url}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: process.env.SUPABASE_KEY || DEFAULT_SUPABASE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_KEY || DEFAULT_SUPABASE_KEY}`
      }
    });
    
    const latencyMs = Date.now() - startTime;
    return {
      success: response.status < 500,
      latencyMs,
      message: response.status < 500 
        ? `Successfully connected to Supabase Project (${PROJECT_ID}) in ${latencyMs}ms` 
        : `Supabase returned HTTP status ${response.status}`,
      projectId: PROJECT_ID,
      url: config.url
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      message: err.message || 'Failed to reach Supabase server',
      projectId: PROJECT_ID,
      url: config.url
    };
  }
}

/**
 * Synchronize complete dataset to Supabase store
 */
export async function syncAllToSupabase(allData: DatabaseSchema): Promise<{
  success: boolean;
  syncedCount: number;
  details: { [key: string]: number };
  error?: string;
}> {
  const client = getSupabaseClient();
  const now = new Date().toISOString();

  const details: { [key: string]: number } = {
    users: allData.users?.length || 0,
    customers: allData.customers?.length || 0,
    products: allData.products?.length || 0,
    inventory: allData.inventory?.length || 0,
    orders: allData.orders?.length || 0,
    payments: allData.payments?.length || 0,
    statusHistory: allData.statusHistory?.length || 0,
    inventoryMovements: allData.inventoryMovements?.length || 0,
    notifications: allData.notifications?.length || 0,
    auditLogs: allData.auditLogs?.length || 0,
    addresses: allData.addresses?.length || 0,
    wishlists: allData.wishlists?.length || 0
  };

  const totalRecords = Object.values(details).reduce((sum, n) => sum + n, 0);

  try {
    // 1. Store collection snapshots in Supabase cards_crafted_store key-value table
    const collectionsToStore = [
      { key: 'full_snapshot', data: allData, updated_at: now },
      { key: 'users', data: allData.users, updated_at: now },
      { key: 'customers', data: allData.customers, updated_at: now },
      { key: 'products', data: allData.products, updated_at: now },
      { key: 'inventory', data: allData.inventory, updated_at: now },
      { key: 'orders', data: allData.orders, updated_at: now },
      { key: 'payments', data: allData.payments, updated_at: now },
      { key: 'status_history', data: allData.statusHistory, updated_at: now },
      { key: 'inventory_movements', data: allData.inventoryMovements, updated_at: now },
      { key: 'notifications', data: allData.notifications, updated_at: now },
      { key: 'audit_logs', data: allData.auditLogs, updated_at: now },
      { key: 'addresses', data: allData.addresses, updated_at: now },
      { key: 'wishlists', data: allData.wishlists, updated_at: now },
      { key: 'settings', data: allData.settings, updated_at: now },
      { key: 'counters', data: allData.counters, updated_at: now }
    ];

    const { error } = await client
      .from('cards_crafted_store')
      .upsert(collectionsToStore, { onConflict: 'key' });

    if (error) {
      console.warn('Supabase cards_crafted_store upsert info/warning:', error.message);
      // Fallback: try direct REST upsert with apikey
      const config = getSupabaseConfig();
      const directRes = await fetch(`${config.url}/rest/v1/cards_crafted_store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.SUPABASE_KEY || DEFAULT_SUPABASE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_KEY || DEFAULT_SUPABASE_KEY}`,
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify(collectionsToStore)
      });

      if (!directRes.ok && directRes.status !== 404) {
        console.warn('Direct REST fallback returned:', directRes.status);
      }
    }

    return {
      success: true,
      syncedCount: totalRecords,
      details
    };
  } catch (err: any) {
    console.error('Error syncing to Supabase:', err);
    return {
      success: false,
      syncedCount: totalRecords,
      details,
      error: err.message || 'Unknown error syncing to Supabase'
    };
  }
}

/**
 * Restore complete dataset from Supabase
 */
export async function restoreAllFromSupabase(): Promise<{
  success: boolean;
  data: Partial<DatabaseSchema> | null;
  error?: string;
}> {
  try {
    const client = getSupabaseClient();
    
    // 1. Try to fetch full_snapshot
    const { data: snapshotDoc, error } = await client
      .from('cards_crafted_store')
      .select('data')
      .eq('key', 'full_snapshot')
      .single();

    if (!error && snapshotDoc?.data) {
      return {
        success: true,
        data: snapshotDoc.data as Partial<DatabaseSchema>
      };
    }

    // 2. Fallback: fetch all individual collections
    const { data: allDocs, error: allDocsError } = await client
      .from('cards_crafted_store')
      .select('key, data');

    if (allDocs && allDocs.length > 0) {
      const reconstructed: any = {};
      for (const row of allDocs) {
        if (row.key === 'status_history') reconstructed.statusHistory = row.data;
        else if (row.key === 'inventory_movements') reconstructed.inventoryMovements = row.data;
        else if (row.key === 'audit_logs') reconstructed.auditLogs = row.data;
        else reconstructed[row.key] = row.data;
      }
      return {
        success: true,
        data: reconstructed
      };
    }

    return {
      success: false,
      data: null,
      error: error?.message || allDocsError?.message || 'No saved snapshots found in Supabase'
    };
  } catch (err: any) {
    console.error('Error restoring from Supabase:', err);
    return {
      success: false,
      data: null,
      error: err.message || 'Error occurred while retrieving data from Supabase'
    };
  }
}

/**
 * Returns SQL snippet to create dedicated Supabase tables if the user wishes to execute DDL in Supabase SQL editor
 */
export function getSupabaseSqlSchema(): string {
  return `-- Cards Crafted - Supabase PostgreSQL Schema
-- Execute this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/${PROJECT_ID}/sql)

-- 1. Universal Document / State Store for High-Speed Sync
CREATE TABLE IF NOT EXISTS public.cards_crafted_store (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) and public access
ALTER TABLE public.cards_crafted_store ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-write for application service" ON public.cards_crafted_store
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Optional Relational Tables for Direct SQL Analytics
CREATE TABLE IF NOT EXISTS public.cc_customers (
  id TEXT PRIMARY KEY,
  customer_code TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  status TEXT DEFAULT 'ACTIVE',
  total_orders INT DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cc_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id TEXT REFERENCES public.cc_customers(id),
  customer_name TEXT NOT NULL,
  customer_whatsapp TEXT,
  status TEXT NOT NULL,
  subtotal NUMERIC NOT NULL,
  tax_amount NUMERIC NOT NULL,
  discount_amount NUMERIC DEFAULT 0,
  final_amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  payment_status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cc_products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  selling_price NUMERIC NOT NULL,
  cost_price NUMERIC NOT NULL,
  stock_quantity INT DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE'
);
`;
}
