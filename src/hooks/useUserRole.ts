import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'parent' | 'child' | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Initial load
    fetchUserRole();

    // Keep role in sync with auth state.
    // IMPORTANT: don't call Supabase functions directly in the callback.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        fetchUserRole();
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      // Fetch user role from database
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user role:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить роль пользователя',
          variant: 'destructive',
        });
      }

      setRole(data?.role || null);
    } catch (error) {
      console.error('Error in useUserRole:', error);
    } finally {
      setLoading(false);
    }
  };

  return { role, loading, refetch: fetchUserRole };
}