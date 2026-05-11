-- Run this in your Supabase SQL editor (supabase.com → Project → SQL Editor)

create table if not exists moodboard_projects (
  id                text primary key,
  created_at        timestamptz default now() not null,
  client_name       text not null,
  client_email      text,
  session_type      text,
  notion_page_id    text,
  original_prompt   text not null,
  direction         jsonb not null default '{}',
  images            jsonb not null default '[]',
  drive_folder_id   text,
  drive_folder_url  text,
  status            text not null default 'review'
                      check (status in ('generating','review','approved','exported')),
  image_model       text not null default 'fal',
  triggered_by      text not null default 'manual'
                      check (triggered_by in ('webhook','manual'))
);

-- Indexes
create index if not exists idx_mb_status      on moodboard_projects(status);
create index if not exists idx_mb_created_at  on moodboard_projects(created_at desc);
create index if not exists idx_mb_client      on moodboard_projects(client_email);
create index if not exists idx_mb_notion      on moodboard_projects(notion_page_id);
create index if not exists idx_mb_triggered   on moodboard_projects(triggered_by);

-- RLS: disable for service role (we use service role key in API routes)
alter table moodboard_projects disable row level security;
