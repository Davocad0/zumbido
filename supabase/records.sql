-- Los récords de ZUMBIDO en línea (2026-11-21). Se corre una vez en la base de Supabase (SQL Editor, o la migración).
-- Solo el servidor del juego (con la clave secreta, en Render) lee y escribe: la tabla no tiene permisos públicos.
-- El juego ya revisa antes el nivel, el tiempo mínimo posible y el nickname (app/api/records/route.js); acá se
-- vuelve a revisar lo básico, por las dudas.

create table if not exists public.records (
  id bigint generated always as identity primary key,
  nivel text not null check (nivel ~ '^[a-z0-9-]{1,40}$'),
  segundos integer not null check (segundos > 0 and segundos <= 86400),
  nombre text not null check (char_length(nombre) between 1 and 16),
  fecha timestamptz not null default now()
);
create index if not exists records_nivel_segundos on public.records (nivel, segundos, fecha);

-- Sin políticas: con RLS prendida y ninguna política, nadie entra con la clave pública. El servidor usa la secreta.
alter table public.records enable row level security;

-- Los 10 mejores de cada nivel (lo que muestra la página de récords).
create or replace view public.records_mejores with (security_invoker = true) as
select nivel, segundos, nombre, fecha
from (
  select r.*, row_number() over (partition by nivel order by segundos, fecha) as puesto
  from public.records r
) t
where puesto <= 10;

-- Guarda un tiempo y dice en qué puesto quedó y entre cuántos.
create or replace function public.registrar_record(p_nivel text, p_segundos integer, p_nombre text)
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_puesto integer;
  v_total integer;
begin
  insert into public.records (nivel, segundos, nombre) values (p_nivel, p_segundos, p_nombre);
  select count(*) + 1 into v_puesto from public.records where nivel = p_nivel and segundos < p_segundos;
  select count(*) into v_total from public.records where nivel = p_nivel;
  return json_build_object('puesto', v_puesto, 'total', v_total);
end;
$$;

-- Nadie más que el servidor puede llamar a la función ni leer la vista.
revoke all on function public.registrar_record(text, integer, text) from public, anon, authenticated;
revoke all on public.records_mejores from anon, authenticated;
revoke all on public.records from anon, authenticated;
grant execute on function public.registrar_record(text, integer, text) to service_role;
grant select on public.records_mejores to service_role;
grant select, insert on public.records to service_role;

-- (Si el proyecto se creó con «Enable RLS on new tables automatically», Supabase agrega la función rls_auto_enable,
-- que solo corre como disparador: igual se le saca el permiso público, como pide el control de seguridad.)
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
