-- Run once in Supabase: SQL Editor
create table public.categories(
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text default '',
  created_at timestamptz default now());

create table public.papers(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  abstract text default '',
  content text default '',          -- full text version
  pdf_path text,                    -- PDF version (Storage bucket "papers")
  category_id uuid references public.categories(id) on delete set null,
  published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now());
create index on public.papers(category_id);
create index on public.papers(created_at desc);

create table public.admins(user_id uuid primary key references auth.users(id) on delete cascade);

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = '' as
$$ select exists(select 1 from public.admins where user_id = (select auth.uid())) $$;

alter table public.categories enable row level security;
alter table public.papers enable row level security;
alter table public.admins enable row level security;

create policy "anyone reads categories" on public.categories for select to anon, authenticated using (true);
create policy "admin manages categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "anyone reads published papers" on public.papers for select to anon, authenticated using (published or public.is_admin());
create policy "admin manages papers" on public.papers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin sees own row" on public.admins for select to authenticated using (user_id = (select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('papers','papers',true,52428800,array['application/pdf']) on conflict (id) do nothing;
create policy "admin manages pdf files" on storage.objects for all to authenticated
  using (bucket_id='papers' and public.is_admin()) with check (bucket_id='papers' and public.is_admin());

-- AFTER you create your login in Authentication > Users, make yourself the only admin:
-- insert into public.admins(user_id) select id from auth.users where email = 'YOUR_EMAIL_HERE';

-- ===== Contributor submissions (added later) =====
alter table public.papers add column if not exists author text default '';
create table public.submissions(
  id uuid primary key default gen_random_uuid(),
  title text not null, author_name text not null, author_email text not null,
  affiliation text default '', category text default '', abstract text default '', content text default '',
  pdf_path text, status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now());
create index on public.submissions(status, created_at desc);
alter table public.submissions enable row level security;
create policy "anyone can submit" on public.submissions for insert to anon, authenticated
  with check (status = 'pending' and char_length(title) between 3 and 300 and char_length(author_name) between 2 and 120
    and char_length(author_email) between 5 and 200 and char_length(coalesce(abstract,'')) < 5000 and char_length(coalesce(content,'')) < 500000);
create policy "admin manages submissions" on public.submissions for all to authenticated using (public.is_admin()) with check (public.is_admin());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('submissions','submissions',false,20971520,array['application/pdf']) on conflict (id) do nothing;
create policy "anyone uploads submission pdf" on storage.objects for insert to anon, authenticated with check (bucket_id = 'submissions');
create policy "admin manages submission files" on storage.objects for all to authenticated
  using (bucket_id='submissions' and public.is_admin()) with check (bucket_id='submissions' and public.is_admin());

-- ===== Announcements (added later) =====
create table public.announcements(
  id uuid primary key default gen_random_uuid(), title text not null, body text default '',
  show_in_bar boolean default false, published boolean default true, created_at timestamptz default now());
create index on public.announcements(created_at desc);
alter table public.announcements enable row level security;
create policy "anyone reads published announcements" on public.announcements for select to anon, authenticated using (published or public.is_admin());
create policy "admin manages announcements" on public.announcements for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ===== Review features, author pages, issue reports (added later) =====
create table public.authors(
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, bio text default '',
  website text default '', github text default '', linkedin text default '', orcid text default '', created_at timestamptz default now());
alter table public.authors enable row level security;
create policy "anyone reads authors" on public.authors for select to anon, authenticated using (true);
create policy "admin manages authors" on public.authors for all to authenticated using (public.is_admin()) with check (public.is_admin());
alter table public.papers
  add column author_id uuid references public.authors(id) on delete set null,
  add column checked_original boolean default false, add column checked_sources boolean default false, add column checked_pdf boolean default false,
  add column reviewed_at timestamptz, add column reviewed_by text default '', add column editor_note text default '',
  add column references_text text default '', add column corrections jsonb not null default '[]'::jsonb;
create index on public.papers(author_id);
alter table public.submissions
  add column author_bio text default '' check (char_length(author_bio) <= 1500),
  add column author_website text default '' check (char_length(author_website) <= 300),
  add column author_github text default '' check (char_length(author_github) <= 300),
  add column author_linkedin text default '' check (char_length(author_linkedin) <= 300),
  add column author_orcid text default '' check (char_length(author_orcid) <= 300);
create table public.issue_reports(
  id uuid primary key default gen_random_uuid(), paper_id uuid not null references public.papers(id) on delete cascade,
  kind text not null check (kind in ('error','plagiarism','copyright','broken_pdf','other')), message text not null,
  reporter_email text default '', status text not null default 'new' check (status in ('new','confirmed','resolved','dismissed')),
  created_at timestamptz default now());
create index on public.issue_reports(paper_id);
create index on public.issue_reports(status, created_at desc);
alter table public.issue_reports enable row level security;
create policy "anyone can report an issue" on public.issue_reports for insert to anon, authenticated
  with check (status = 'new' and char_length(message) between 10 and 2000 and char_length(coalesce(reporter_email,'')) <= 200);
create policy "admin manages issue reports" on public.issue_reports for all to authenticated using (public.is_admin()) with check (public.is_admin());
