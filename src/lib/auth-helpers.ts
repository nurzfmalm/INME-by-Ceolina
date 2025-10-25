import { supabase } from "@/integrations/supabase/client";

// Create a temporary user session for demo purposes
// This generates a consistent UUID based on browser fingerprint
export const getTempUserId = (): string => {
  const stored = localStorage.getItem('ceolinaTempUserId');
  if (stored) return stored;
  
  // Generate a simple UUID-like string
  const tempId = 'temp-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  localStorage.setItem('ceolinaTempUserId', tempId);
  return tempId;
};

// Check if user is authenticated
export const isUserAuthenticated = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
};

// Get current user ID (real or temp)
export const getCurrentUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  
  // For demo mode, return temp ID
  return getTempUserId();
};
