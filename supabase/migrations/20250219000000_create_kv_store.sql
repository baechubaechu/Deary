-- Deary: KV store for diaries, user profiles, etc.
-- Run in Supabase Dashboard > SQL Editor if the table doesn't exist.

create table if not exists kv_store_dd0ac201 (
  key text primary key,
  value jsonb not null default '{}'
);
