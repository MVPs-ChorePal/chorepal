-- Photo keys: only the server-chosen format is accepted from now on.
--
-- get-upload-url makes every key as  chores/<chore_id>/<before|after>_<uuid>.<jpg|png>
-- Older app builds named photos  before_<id>_<n>.jpg  and the edge functions
-- used to accept that too. They don't any more, so:
--
--  1. Chores not yet approved whose attempts use old-style photos would be
--     stuck: every retry (and a parent's "ask to redo", see reject_chore)
--     reuses the first before photo, which is now refused. A 'completed' one
--     also can't be reviewed, because its photos no longer display. These
--     go back to 'todo' and their attempts are removed, so the child starts
--     again with a new before photo. Approved chores (and their coins and
--     transactions) are left alone; their old photos simply no longer display.
--
--  2. A trigger rejects any NEW or CHANGED photo key that isn't exactly the
--     server format for that row's chore, with before/after matching the
--     column - so nobody can write a made-up key, another chore's key, or an
--     after photo into the before column. Existing rows are not re-checked.

-- 1. reset stuck in-progress chores
with stuck as (
  select distinct a.chore_id
  from public.chore_analysis a
  join public.chores c on c.id = a.chore_id
  where c.status in ('pending', 'completed')
    and (a.before_image_key !~ '^chores/' or a.after_image_key !~ '^chores/')
)
, removed as (
  delete from public.chore_analysis a using stuck s where a.chore_id = s.chore_id
  returning a.chore_id
)
update public.chores c
set status = 'todo', ai_verified = false
where c.id in (select chore_id from stuck);

-- 2. enforce the key format on writes
create or replace function public.check_photo_keys()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_uuid constant text := '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
begin
  if new.before_image_key is not null
     and (tg_op = 'INSERT' or new.before_image_key is distinct from old.before_image_key or new.chore_id is distinct from old.chore_id)
     and new.before_image_key !~ ('^chores/' || new.chore_id || '/before_' || v_uuid || '\.(jpg|png)$') then
    raise exception 'invalid before photo key' using errcode = '22023';
  end if;

  if new.after_image_key is not null
     and (tg_op = 'INSERT' or new.after_image_key is distinct from old.after_image_key or new.chore_id is distinct from old.chore_id)
     and new.after_image_key !~ ('^chores/' || new.chore_id || '/after_' || v_uuid || '\.(jpg|png)$') then
    raise exception 'invalid after photo key' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function public.check_photo_keys() from public, anon, authenticated;

drop trigger if exists check_photo_keys on public.chore_analysis;
create trigger check_photo_keys
  before insert or update of before_image_key, after_image_key, chore_id
  on public.chore_analysis
  for each row execute function public.check_photo_keys();
