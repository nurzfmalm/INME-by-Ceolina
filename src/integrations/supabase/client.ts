import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bczdklmojomdownmyssx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjemRrbG1vam9tZG93bm15c3N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDAwNTEsImV4cCI6MjA3NDkxNjA1MX0.JiD6NrxoE-Z1eJ1GBc687WBznVISTkAh0bpixq0vHaM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
