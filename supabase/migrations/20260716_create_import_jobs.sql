create table public.import_jobs (

    id uuid primary key default gen_random_uuid(),

    created_at timestamptz not null default now(),

    completed_at timestamptz,

    league_id integer,

    season integer,

    status text not null default 'running',

    current_step text,

    progress integer not null default 0,

    steps jsonb not null default '[]'::jsonb,

    error text

);

create index import_jobs_created_idx
on public.import_jobs(created_at desc);

create index import_jobs_status_idx
on public.import_jobs(status);
