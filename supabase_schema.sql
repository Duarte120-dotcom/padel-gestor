-- =============================================
-- PADEL GESTOR — Schema completo Supabase
-- Ejecutar en SQL Editor de Supabase
-- =============================================

-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- =============================================
-- TABLA: profiles (extiende auth.users)
-- =============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  role text not null default 'collaborator' check (role in ('admin', 'collaborator')),
  created_at timestamptz default now()
);

-- =============================================
-- TABLA: tournaments
-- =============================================
create table public.tournaments (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  date date not null,
  venue text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'configured', 'active', 'finished')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- TABLA: tournament_categories
-- =============================================
create table public.tournament_categories (
  id uuid default uuid_generate_v4() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  name text not null,
  status text not null default 'setup' check (status in ('setup', 'groups', 'bracket', 'finished')),
  preferred_group_size int not null default 3 check (preferred_group_size in (3, 4)),
  qualifiers_per_group int not null default 1 check (qualifiers_per_group between 1 and 3),
  sets_per_match int not null default 2 check (sets_per_match in (1, 2, 3)),
  has_super_tiebreak boolean default false,
  groups_confirmed boolean default false,
  bracket_confirmed boolean default false,
  created_at timestamptz default now()
);

-- =============================================
-- TABLA: players
-- =============================================
create table public.players (
  id uuid default uuid_generate_v4() primary key,
  first_name text not null,
  last_name text not null,
  phone text,
  notes text,
  created_at timestamptz default now()
);

-- =============================================
-- TABLA: teams (parejas)
-- =============================================
create table public.teams (
  id uuid default uuid_generate_v4() primary key,
  tournament_category_id uuid references public.tournament_categories(id) on delete cascade not null,
  player1_id uuid references public.players(id) not null,
  player2_id uuid references public.players(id) not null,
  name text, -- nombre opcional para mostrar (ej: "García / Rodríguez")
  status text not null default 'confirmed' check (status in ('confirmed', 'pending', 'withdrawn')),
  created_at timestamptz default now(),
  constraint no_same_player check (player1_id <> player2_id)
);

-- =============================================
-- TABLA: groups
-- =============================================
create table public.groups (
  id uuid default uuid_generate_v4() primary key,
  tournament_category_id uuid references public.tournament_categories(id) on delete cascade not null,
  name text not null, -- "Grupo A", "Grupo B", etc.
  draw_order int not null default 0,
  created_at timestamptz default now()
);

-- =============================================
-- TABLA: group_teams (qué parejas están en qué grupo)
-- =============================================
create table public.group_teams (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  seed_position int,
  constraint unique_team_per_group unique (group_id, team_id)
);

-- =============================================
-- TABLA: matches
-- =============================================
create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  tournament_category_id uuid references public.tournament_categories(id) on delete cascade not null,
  phase_type text not null check (phase_type in ('group', 'bracket')),

  -- Fase de grupos
  group_id uuid references public.groups(id) on delete set null,

  -- Fase eliminatoria
  bracket_round int,        -- 1=final, 2=semis, 4=cuartos, etc.
  bracket_position int,     -- posición dentro de la ronda
  source_match1_id uuid references public.matches(id),  -- de qué partido viene team1
  source_match2_id uuid references public.matches(id),  -- de qué partido viene team2

  team1_id uuid references public.teams(id),
  team2_id uuid references public.teams(id),
  winner_id uuid references public.teams(id),

  -- Resultado por sets: array de arrays [[6,4],[7,5]]
  sets_score jsonb default '[]'::jsonb,
  is_walkover boolean default false,
  status text not null default 'pending' check (status in ('pending', 'played', 'walkover', 'suspended', 'bye')),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- VISTA: standings (posiciones por grupo)
-- =============================================
create or replace view public.group_standings as
select
  gt.group_id,
  gt.team_id,
  t.name as team_name,
  t.tournament_category_id,
  count(m.id) filter (
    where m.status = 'played' and (m.team1_id = gt.team_id or m.team2_id = gt.team_id)
  ) as played,
  count(m.id) filter (
    where m.status = 'played' and m.winner_id = gt.team_id
  ) as won,
  count(m.id) filter (
    where m.status = 'played'
    and (m.team1_id = gt.team_id or m.team2_id = gt.team_id)
    and m.winner_id <> gt.team_id
  ) as lost,
  -- Games a favor
  coalesce(sum(
    case
      when m.team1_id = gt.team_id then
        (select coalesce(sum((s->0)::int), 0) from jsonb_array_elements(m.sets_score) s)
      when m.team2_id = gt.team_id then
        (select coalesce(sum((s->1)::int), 0) from jsonb_array_elements(m.sets_score) s)
      else 0
    end
  ) filter (where m.status = 'played'), 0) as games_for,
  -- Games en contra
  coalesce(sum(
    case
      when m.team1_id = gt.team_id then
        (select coalesce(sum((s->1)::int), 0) from jsonb_array_elements(m.sets_score) s)
      when m.team2_id = gt.team_id then
        (select coalesce(sum((s->0)::int), 0) from jsonb_array_elements(m.sets_score) s)
      else 0
    end
  ) filter (where m.status = 'played'), 0) as games_against,
  -- Puntos (3 por victoria)
  count(m.id) filter (
    where m.status = 'played' and m.winner_id = gt.team_id
  ) * 3 as points
from public.group_teams gt
join public.teams t on t.id = gt.team_id
left join public.matches m on m.group_id = gt.group_id
  and (m.team1_id = gt.team_id or m.team2_id = gt.team_id)
group by gt.group_id, gt.team_id, t.name, t.tournament_category_id;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_categories enable row level security;
alter table public.players enable row level security;
alter table public.teams enable row level security;
alter table public.groups enable row level security;
alter table public.group_teams enable row level security;
alter table public.matches enable row level security;

-- Profiles: cada uno ve el suyo, admins ven todos
create policy "profiles_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);

-- Función helper para verificar si el usuario es admin
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Función helper para verificar si el usuario está autenticado
create or replace function public.is_authenticated()
returns boolean language sql security definer as $$
  select auth.uid() is not null;
$$;

-- Torneos: cualquier usuario autenticado puede ver, solo admins pueden modificar
create policy "tournaments_select" on public.tournaments for select using (is_authenticated());
create policy "tournaments_insert" on public.tournaments for insert with check (is_admin());
create policy "tournaments_update" on public.tournaments for update using (is_admin());
create policy "tournaments_delete" on public.tournaments for delete using (is_admin());

-- Categorías: mismo patrón
create policy "categories_select" on public.tournament_categories for select using (is_authenticated());
create policy "categories_insert" on public.tournament_categories for insert with check (is_admin());
create policy "categories_update" on public.tournament_categories for update using (is_admin());
create policy "categories_delete" on public.tournament_categories for delete using (is_admin());

-- Jugadores: cualquiera autenticado puede ver/crear
create policy "players_select" on public.players for select using (is_authenticated());
create policy "players_insert" on public.players for insert with check (is_authenticated());
create policy "players_update" on public.players for update using (is_authenticated());

-- Teams, groups, group_teams, matches: cualquier autenticado puede ver y colaboradores pueden cargar resultados
create policy "teams_select" on public.teams for select using (is_authenticated());
create policy "teams_insert" on public.teams for insert with check (is_authenticated());
create policy "teams_update" on public.teams for update using (is_authenticated());
create policy "teams_delete" on public.teams for delete using (is_admin());

create policy "groups_select" on public.groups for select using (is_authenticated());
create policy "groups_all" on public.groups for all using (is_admin());

create policy "group_teams_select" on public.group_teams for select using (is_authenticated());
create policy "group_teams_all" on public.group_teams for all using (is_admin());

create policy "matches_select" on public.matches for select using (is_authenticated());
create policy "matches_insert" on public.matches for insert with check (is_admin());
create policy "matches_update" on public.matches for update using (is_authenticated()); -- colaboradores pueden cargar resultados
create policy "matches_delete" on public.matches for delete using (is_admin());

-- =============================================
-- TRIGGER: actualizar updated_at automáticamente
-- =============================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tournaments_updated_at before update on public.tournaments
  for each row execute function public.handle_updated_at();

create trigger matches_updated_at before update on public.matches
  for each row execute function public.handle_updated_at();

-- =============================================
-- TRIGGER: crear profile automáticamente al registrarse
-- =============================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'collaborator')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================
-- DATOS INICIALES: crear el primer admin
-- (Reemplazá el email con el tuyo DESPUÉS de registrarte)
-- =============================================
-- insert into public.profiles (id, full_name, role)
-- values ('<tu-user-id-de-supabase>', 'Admin Principal', 'admin')
-- on conflict (id) do update set role = 'admin';
