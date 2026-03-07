import { supabase } from '@/integrations/supabase/client';

export async function sendNotification(params: {
  userId: string;
  title: string;
  body: string;
  actionUrl?: string;
}) {
  return supabase.functions.invoke('send-in-app-notification', { body: params });
}
