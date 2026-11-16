import { supabase } from './supabase';

//fetches signed links for a chore's photos
export async function getChorePhotoUrls(choreId: string | number): Promise<Record<string, string>> {
  const { data, error } = await supabase.functions.invoke('get-photo-urls', { body: { choreId } });
  if (error) {
    console.error('could not load chore photos:', error.message);
    return {};
  }
  return data?.urls ?? {};
}