-- Tournament App Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Tournaments Table
create table tournaments (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  date date not null,
  location text,
  info text,
  is_active boolean not null default true,
  admin_password text not null,
  created_at timestamp with time zone default now()
);

-- 2. Age Groups Table
create table age_groups (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id) on delete cascade not null,
  name text not null,
  display_order integer not null default 0
);

-- 3. Teams Table
create table teams (
  id uuid primary key default uuid_generate_v4(),
  age_group_id uuid references age_groups(id) on delete cascade not null,
  name text not null
);

-- 4. Pools Table
create table pools (
  id uuid primary key default uuid_generate_v4(),
  age_group_id uuid references age_groups(id) on delete cascade not null,
  name text not null,
  court text not null,
  display_order integer not null default 0
);

-- 5. Pool Teams (junction table)
create table pool_teams (
  id uuid primary key default uuid_generate_v4(),
  pool_id uuid references pools(id) on delete cascade not null,
  team_id uuid references teams(id) on delete cascade not null,
  unique(pool_id, team_id)
);

-- 6. Brackets Table
create table brackets (
  id uuid primary key default uuid_generate_v4(),
  age_group_id uuid references age_groups(id) on delete cascade not null,
  name text not null, -- Gold or Silver
  display_order integer not null default 0
);

-- 7. Matches Table
create table matches (
  id uuid primary key default uuid_generate_v4(),
  age_group_id uuid references age_groups(id) on delete cascade not null,
  match_type text not null check (match_type in ('pool', 'bracket')),
  pool_id uuid references pools(id) on delete cascade,
  bracket_id uuid references brackets(id) on delete cascade,
  bracket_round integer check (bracket_round in (1, 2, 3)), -- 1=QF, 2=SF, 3=Final
  bracket_position integer,
  team1_id uuid references teams(id) on delete set null,
  team2_id uuid references teams(id) on delete set null,
  ref_team_id uuid references teams(id) on delete set null,
  court text,
  match_order integer not null default 0,
  status text not null default 'scheduled' check (status in ('scheduled', 'complete')),
  winner_id uuid references teams(id) on delete set null,
  source_match1_id uuid references matches(id),
  source_match2_id uuid references matches(id),
  
  -- Scores
  set1_team1 integer default 0,
  set1_team2 integer default 0,
  set2_team1 integer default 0,
  set2_team2 integer default 0,
  set3_team1 integer default 0,
  set3_team2 integer default 0,
  
  created_at timestamp with time zone default now()
);

-- RLS (Public read-only, Admin requires auth which we handle via password)
-- For simplicity and per specification "anon key exposed", we'll allow all public reads
alter table tournaments enable row level security;
alter table age_groups enable row level security;
alter table teams enable row level security;
alter table pools enable row level security;
alter table pool_teams enable row level security;
alter table brackets enable row level security;
alter table matches enable row level security;

create policy "Public Read" on tournaments for select using (true);
create policy "Public Read" on age_groups for select using (true);
create policy "Public Read" on teams for select using (true);
create policy "Public Read" on pools for select using (true);
create policy "Public Read" on pool_teams for select using (true);
create policy "Public Read" on brackets for select using (true);
create policy "Public Read" on matches for select using (true);

-- Admin policies (can be expanded later if proper auth is added)
-- For now, allowing all operations for development simplicity with anon key
create policy "Anon Full Access" on tournaments for all using (true) with check (true);
create policy "Anon Full Access" on age_groups for all using (true) with check (true);
create policy "Anon Full Access" on teams for all using (true) with check (true);
create policy "Anon Full Access" on pools for all using (true) with check (true);
create policy "Anon Full Access" on pool_teams for all using (true) with check (true);
create policy "Anon Full Access" on brackets for all using (true) with check (true);
create policy "Anon Full Access" on matches for all using (true) with check (true);
