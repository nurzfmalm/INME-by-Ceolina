// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    '❌ Missing VITE_SUPABASE_URL environment variable\n\n' +
    'Add to your .env file:\n' +
    'VITE_SUPABASE_URL=https://ragmaoabxrzcndasyggy.supabase.co'
  );
}

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    '❌ Missing VITE_SUPABASE_ANON_KEY environment variable\n\n' +
    'Add to your .env file:\n' +
    'VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZ21hb2FieHJ6Y25kYXN5Z2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODQzMTcsImV4cCI6MjA3ODc2MDMxN30.T2b74THQ-sqsh6E0jJy44iGiuZdtxdUbdR62LMs6Sis'
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});