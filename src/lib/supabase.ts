import { createClient } from '@supabase/supabase-js';
import { MoodboardProject } from '@/types';

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
}

export async function saveProject(project: MoodboardProject): Promise<MoodboardProject> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('moodboard_projects')
    .upsert(project)
    .select()
    .single();
  if (error) throw new Error(`Supabase save error: ${error.message}`);
  return data as MoodboardProject;
}

export async function updateProject(
  id: string,
  updates: Partial<MoodboardProject>
): Promise<MoodboardProject> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('moodboard_projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Supabase update error: ${error.message}`);
  return data as MoodboardProject;
}

export async function getProjects(limit = 50): Promise<MoodboardProject[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('moodboard_projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Supabase fetch error: ${error.message}`);
  return (data || []) as MoodboardProject[];
}

export async function getProject(id: string): Promise<MoodboardProject | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('moodboard_projects')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as MoodboardProject;
}

// ── SUPABASE SCHEMA (run this in Supabase SQL editor) ────────────────────────
export const SCHEMA_SQL = `
create table if not exists moodboard_projects (
  id                text primary key,
  created_at        timestamptz default now(),
  client_name       text not null,
  client_email      text,
  session_type      text,
  notion_page_id    text,
  original_prompt   text not null,
  direction         jsonb not null,
  images            jsonb not null default '[]',
  drive_folder_id   text,
  drive_folder_url  text,
  status            text not null default 'review',
  image_model       text not null default 'fal',
  triggered_by      text not null default 'manual'
);

create index if not exists idx_moodboard_projects_status on moodboard_projects(status);
create index if not exists idx_moodboard_projects_created_at on moodboard_projects(created_at desc);
create index if not exists idx_moodboard_projects_client_email on moodboard_projects(client_email);
`;
