-- IBERDROLA A - Primaria. Migración inicial v1, PostgreSQL 15+ / Supabase.
-- Ejecutar completa UNA VEZ en un proyecto nuevo, como postgres (SQL Editor).
-- No contiene alumnos reales, contraseñas, borrado de esquemas ni claves API.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.rol_usuario as enum ('DIRECTOR','SECRETARIA','DOCENTE','PADRE','ESTUDIANTE');
create type public.dimension_evaluacion as enum ('SER','SABER','HACER');
create type public.estado_asistencia as enum ('A','F','R','L');
create type public.estado_trimestre as enum ('PLANIFICADO','ABIERTO','CERRADO');
create type public.estado_publicacion as enum ('BORRADOR','PUBLICADO');

-- Identidad personal independiente del inicio de sesión.
create table public.personas (
 id uuid primary key default gen_random_uuid(),
 nombres text not null check (btrim(nombres) <> ''),
 apellido_paterno text not null default '', apellido_materno text not null default '',
 ci text unique check (ci is null or btrim(ci) <> ''), telefono text,
 direccion text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.perfiles (
 id uuid primary key references auth.users(id) on delete cascade,
 persona_id uuid not null unique references public.personas(id),
 rol public.rol_usuario not null, activo boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.estudiantes (
 id uuid primary key default gen_random_uuid(), persona_id uuid not null unique references public.personas(id),
 rude text unique check (rude is null or btrim(rude) <> ''),
 genero text check (genero in ('M','F','NO_ESPECIFICADO')),
 fecha_nacimiento date check (fecha_nacimiento >= date '1900-01-01'),
 activo boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.docentes (
 id uuid primary key default gen_random_uuid(), persona_id uuid not null unique references public.personas(id),
 especialidad text, activo boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tutores (
 id uuid primary key default gen_random_uuid(), persona_id uuid not null unique references public.personas(id),
 activo boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.estudiante_tutor (
 estudiante_id uuid not null references public.estudiantes(id), tutor_id uuid not null references public.tutores(id),
 parentesco text not null check (btrim(parentesco) <> ''),
 autorizado_consulta boolean not null default true, contacto_principal boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key (estudiante_id,tutor_id)
);
create unique index estudiante_contacto_principal on public.estudiante_tutor(estudiante_id) where contacto_principal;

create table public.configuracion (
 id boolean primary key default true check (id), nombre_institucion text not null default 'U.E. Iberdrola A',
 zona_horaria text not null default 'America/La_Paz' check (zona_horaria = 'America/La_Paz'),
 nivel text not null default 'PRIMARIA' check (nivel = 'PRIMARIA'),
 turno text not null default 'TARDE' check (turno = 'TARDE'),
 hora_ingreso time not null default '14:00' check (hora_ingreso = time '14:00'),
 hora_salida time not null default '18:05' check (hora_salida = time '18:05'),
 updated_at timestamptz not null default now()
);
create table public.gestiones (
 id uuid primary key default gen_random_uuid(), anio smallint not null unique check (anio between 2026 and 2200),
 activo boolean not null default true, updated_at timestamptz not null default now()
);
create table public.grados (
 id smallint primary key check (id between 1 and 6), nombre text not null unique
);
create table public.cursos (
 id uuid primary key default gen_random_uuid(), gestion_id uuid not null references public.gestiones(id),
 grado_id smallint not null references public.grados(id), paralelo text not null check (paralelo ~ '^[A-Z]{1,2}$'),
 activo boolean not null default true, updated_at timestamptz not null default now(),
 unique (gestion_id,grado_id,paralelo), unique (id,gestion_id)
);
create table public.matriculas (
 id uuid primary key default gen_random_uuid(), estudiante_id uuid not null references public.estudiantes(id),
 curso_id uuid not null, gestion_id uuid not null,
 fecha_ingreso date not null, fecha_salida date,
 estado text not null default 'ACTIVA' check (estado in ('ACTIVA','RETIRADA','FINALIZADA')),
 updated_at timestamptz not null default now(),
 foreign key (curso_id,gestion_id) references public.cursos(id,gestion_id),
 check (fecha_salida is null or fecha_salida >= fecha_ingreso),
 check (estado = 'ACTIVA' or fecha_salida is not null),
 unique (id,curso_id,gestion_id)
);
create unique index una_matricula_activa on public.matriculas(estudiante_id,gestion_id) where estado = 'ACTIVA';
create table public.asignaturas (
 id uuid primary key default gen_random_uuid(), nombre text not null unique check (btrim(nombre) <> ''),
 descripcion text, activo boolean not null default true, updated_at timestamptz not null default now()
);
create table public.asignaciones_docente (
 id uuid primary key default gen_random_uuid(), docente_id uuid not null references public.docentes(id),
 curso_id uuid not null, gestion_id uuid not null, asignatura_id uuid not null references public.asignaturas(id),
 activo boolean not null default true, updated_at timestamptz not null default now(),
 foreign key (curso_id,gestion_id) references public.cursos(id,gestion_id),
 unique (curso_id,asignatura_id), unique (id,curso_id,gestion_id), unique (id,curso_id,docente_id)
);
create table public.periodos (
 id uuid primary key default gen_random_uuid(), gestion_id uuid not null references public.gestiones(id),
 numero smallint not null check (numero between 1 and 6), hora_inicio time, hora_fin time,
 updated_at timestamptz not null default now(),
 check ((hora_inicio is null and hora_fin is null) or
   (hora_inicio is not null and hora_fin is not null and hora_fin-hora_inicio=interval '40 minutes'
    and hora_inicio >= time '14:00' and hora_fin <= time '18:05')),
 unique (gestion_id,numero), unique(id,gestion_id)
);
create table public.horarios (
 id uuid primary key default gen_random_uuid(), curso_id uuid not null, gestion_id uuid not null,
 asignacion_docente_id uuid not null, docente_id uuid not null,
 dia_semana smallint not null check (dia_semana between 1 and 5), periodo_id uuid not null,
 updated_at timestamptz not null default now(),
 foreign key (asignacion_docente_id,curso_id,gestion_id) references public.asignaciones_docente(id,curso_id,gestion_id),
 foreign key (asignacion_docente_id,curso_id,docente_id) references public.asignaciones_docente(id,curso_id,docente_id) on update cascade,
 foreign key (periodo_id,gestion_id) references public.periodos(id,gestion_id),
 unique (curso_id,dia_semana,periodo_id), unique (docente_id,dia_semana,periodo_id)
);
create table public.trimestres (
 id uuid primary key default gen_random_uuid(), gestion_id uuid not null references public.gestiones(id),
 numero smallint not null check (numero between 1 and 3), fecha_inicio date, fecha_fin date,
 estado public.estado_trimestre not null default 'PLANIFICADO', updated_at timestamptz not null default now(),
 check ((fecha_inicio is null and fecha_fin is null) or
   (fecha_inicio is not null and fecha_fin is not null and fecha_fin >= fecha_inicio)),
 check (estado='PLANIFICADO' or fecha_inicio is not null),
 unique (gestion_id,numero), unique (id,gestion_id)
);
create table public.criterios_evaluacion (
 id uuid primary key default gen_random_uuid(), asignacion_docente_id uuid not null,
 curso_id uuid not null, gestion_id uuid not null, trimestre_id uuid not null,
 dimension public.dimension_evaluacion not null, nombre text not null check (btrim(nombre) <> ''),
 puntaje_maximo numeric(5,2) not null, orden integer not null default 1 check (orden > 0),
 updated_at timestamptz not null default now(),
 check ((dimension='SER' and puntaje_maximo=10) or (dimension='SABER' and puntaje_maximo=45)
   or (dimension='HACER' and puntaje_maximo=40)),
 foreign key (asignacion_docente_id,curso_id,gestion_id) references public.asignaciones_docente(id,curso_id,gestion_id),
 foreign key (trimestre_id,gestion_id) references public.trimestres(id,gestion_id),
 unique (id,curso_id,gestion_id), unique(asignacion_docente_id,trimestre_id,dimension,orden)
);
create table public.notas_criterios (
 id uuid primary key default gen_random_uuid(), criterio_id uuid not null, matricula_id uuid not null,
 curso_id uuid not null, gestion_id uuid not null, puntaje numeric(5,2) not null check (puntaje between 0 and 45),
 updated_at timestamptz not null default now(),
 foreign key (criterio_id,curso_id,gestion_id) references public.criterios_evaluacion(id,curso_id,gestion_id),
 foreign key (matricula_id,curso_id,gestion_id) references public.matriculas(id,curso_id,gestion_id),
 unique (criterio_id,matricula_id)
);
create table public.calificaciones_trimestrales (
 id uuid primary key default gen_random_uuid(), asignacion_docente_id uuid not null,
 matricula_id uuid not null, curso_id uuid not null, gestion_id uuid not null, trimestre_id uuid not null,
 autoevaluacion numeric(4,2) check (autoevaluacion between 0 and 5),
 puntos_extra numeric(5,2) not null default 0 check (puntos_extra between 0 and 100), motivo_extra text,
 estado public.estado_publicacion not null default 'BORRADOR', publicada_at timestamptz,
 updated_at timestamptz not null default now(),
 check (puntos_extra=0 or nullif(btrim(motivo_extra),'') is not null),
 foreign key (asignacion_docente_id,curso_id,gestion_id) references public.asignaciones_docente(id,curso_id,gestion_id),
 foreign key (matricula_id,curso_id,gestion_id) references public.matriculas(id,curso_id,gestion_id),
 foreign key (trimestre_id,gestion_id) references public.trimestres(id,gestion_id),
 unique (asignacion_docente_id,matricula_id,trimestre_id)
);
create table public.jornadas_asistencia (
 id uuid primary key default gen_random_uuid(), curso_id uuid not null, gestion_id uuid not null,
 fecha date not null, observacion text, estado public.estado_publicacion not null default 'BORRADOR',
 updated_at timestamptz not null default now(),
 foreign key (curso_id,gestion_id) references public.cursos(id,gestion_id),
 unique (curso_id,fecha), unique(id,curso_id,gestion_id)
);
create table public.asistencias (
 id uuid primary key default gen_random_uuid(), jornada_id uuid not null, matricula_id uuid not null,
 curso_id uuid not null, gestion_id uuid not null, estado public.estado_asistencia not null, observacion text,
 updated_at timestamptz not null default now(),
 foreign key (jornada_id,curso_id,gestion_id) references public.jornadas_asistencia(id,curso_id,gestion_id),
 foreign key (matricula_id,curso_id,gestion_id) references public.matriculas(id,curso_id,gestion_id),
 unique(jornada_id,matricula_id)
);
create table public.avances_curriculares (
 id uuid primary key default gen_random_uuid(), asignacion_docente_id uuid not null,
 curso_id uuid not null, gestion_id uuid not null, trimestre_id uuid not null,
 tema text not null check (btrim(tema) <> ''), descripcion text, fecha date not null,
 estado text not null default 'PLANIFICADO' check (estado in ('PLANIFICADO','EN_PROGRESO','COMPLETADO')),
 updated_at timestamptz not null default now(),
 foreign key (asignacion_docente_id,curso_id,gestion_id) references public.asignaciones_docente(id,curso_id,gestion_id),
 foreign key (trimestre_id,gestion_id) references public.trimestres(id,gestion_id)
);
create table public.observaciones_estudiantes (
 id uuid primary key default gen_random_uuid(), asignacion_docente_id uuid not null,
 matricula_id uuid not null, curso_id uuid not null, gestion_id uuid not null, trimestre_id uuid not null,
 tipo text not null check (tipo in ('DIFICULTAD','LOGRO','APRENDIZAJE','CONDUCTA','OTRO')),
 descripcion text not null check (btrim(descripcion) <> ''), fecha date not null,
 visible_familia boolean not null default false, updated_at timestamptz not null default now(),
 foreign key (asignacion_docente_id,curso_id,gestion_id) references public.asignaciones_docente(id,curso_id,gestion_id),
 foreign key (matricula_id,curso_id,gestion_id) references public.matriculas(id,curso_id,gestion_id),
 foreign key (trimestre_id,gestion_id) references public.trimestres(id,gestion_id)
);
create table public.comunicados (
 id uuid primary key default gen_random_uuid(), autor_id uuid not null references public.perfiles(id),
 titulo text not null check (btrim(titulo) <> ''), contenido text not null check (btrim(contenido) <> ''),
 institucional boolean not null default false, estado public.estado_publicacion not null default 'BORRADOR',
 publicado_at timestamptz, updated_at timestamptz not null default now()
);
create table public.destinatarios_comunicado (
 id uuid primary key default gen_random_uuid(), comunicado_id uuid not null references public.comunicados(id),
 curso_id uuid references public.cursos(id), perfil_id uuid references public.perfiles(id),
 check ((curso_id is not null)::integer + (perfil_id is not null)::integer = 1),
 unique (comunicado_id,curso_id), unique(comunicado_id,perfil_id)
);
create table public.lecturas_comunicado (
 comunicado_id uuid not null references public.comunicados(id), perfil_id uuid not null references public.perfiles(id),
 leido_at timestamptz not null default now(), primary key(comunicado_id,perfil_id)
);
create table public.dispositivos (
 id uuid primary key default gen_random_uuid(), perfil_id uuid not null references public.perfiles(id) on delete cascade,
 expo_push_token text not null unique check (expo_push_token ~ '^(ExponentPushToken|ExpoPushToken)\[[^]]+\]$'),
 plataforma text not null check (plataforma in ('ANDROID','IOS')), activo boolean not null default true,
 updated_at timestamptz not null default now()
);
create table public.auditoria (
 id bigint generated always as identity primary key, actor_id uuid, tabla text not null,
 operacion text not null check (operacion in ('INSERT','UPDATE','DELETE')),
 registro_id text, anterior jsonb, nuevo jsonb, fecha timestamptz not null default now()
);

-- Funciones de permisos: esquema NO expuesto en la Data API. No usar user_metadata.
create function private.rol() returns public.rol_usuario
language sql stable security definer set search_path='' as $$
 select p.rol from public.perfiles p where p.id=(select auth.uid()) and p.activo
$$;
create function private.admin() returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(private.rol() in ('DIRECTOR','SECRETARIA'),false)
$$;
create function private.director() returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(private.rol()='DIRECTOR',false)
$$;
create function private.mi_docente() returns uuid
language sql stable security definer set search_path='' as $$
 select d.id from public.docentes d join public.perfiles p on p.persona_id=d.persona_id
 where p.id=(select auth.uid()) and p.activo and p.rol='DOCENTE' and d.activo
$$;
create function private.docente_curso(c uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.asignaciones_docente a
 where a.curso_id=c and a.activo and a.docente_id=private.mi_docente())
$$;
-- Solo la familia; un profesor de otra materia no gana acceso por esta función.
create function private.familia_estudiante(e uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.estudiantes s join public.perfiles p on p.persona_id=s.persona_id
 where s.id=e and p.id=(select auth.uid()) and p.activo and p.rol='ESTUDIANTE')
 or exists(select 1 from public.estudiante_tutor et join public.tutores t on t.id=et.tutor_id
 join public.perfiles p on p.persona_id=t.persona_id
 where et.estudiante_id=e and et.autorizado_consulta and t.activo
 and p.id=(select auth.uid()) and p.activo and p.rol='PADRE')
$$;
create function private.ver_estudiante(e uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.admin() or private.familia_estudiante(e) or exists
 (select 1 from public.matriculas m where m.estudiante_id=e and private.docente_curso(m.curso_id))
$$;
create function private.familia_matricula(m uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.matriculas x where x.id=m and private.familia_estudiante(x.estudiante_id))
$$;
create function private.ver_curso(c uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.admin() or private.docente_curso(c) or exists
 (select 1 from public.matriculas m where m.curso_id=c and private.familia_estudiante(m.estudiante_id))
$$;
create function private.editar_asignacion(a uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.director() or exists(select 1 from public.asignaciones_docente x
 where x.id=a and x.activo and x.docente_id=private.mi_docente())
$$;
create function private.ver_asignacion(a uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.admin() or exists(select 1 from public.asignaciones_docente x
 where x.id=a and (x.docente_id=private.mi_docente() or exists
 (select 1 from public.matriculas m where m.curso_id=x.curso_id and private.familia_estudiante(m.estudiante_id))))
$$;
create function private.ver_persona(p uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.admin() or exists(select 1 from public.perfiles x where x.persona_id=p
 and x.id=(select auth.uid()) and x.activo)
 or exists(select 1 from public.estudiantes e where e.persona_id=p and private.ver_estudiante(e.id))
 or exists(select 1 from public.tutores t join public.estudiante_tutor et on et.tutor_id=t.id
 where t.persona_id=p and private.ver_estudiante(et.estudiante_id))
$$;
create function private.editar_persona(p uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.director() or (private.admin() and not exists
 (select 1 from public.perfiles x where x.persona_id=p and x.rol in ('DIRECTOR','SECRETARIA')))
$$;
create function private.nota_publicada(m uuid,a uuid,t uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.calificaciones_trimestrales c where c.matricula_id=m
 and c.asignacion_docente_id=a and c.trimestre_id=t and c.estado='PUBLICADO')
$$;
create function private.ver_nota(m uuid,k uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.criterios_evaluacion c where c.id=k and
 (private.admin() or private.editar_asignacion(c.asignacion_docente_id) or
 (private.familia_matricula(m) and private.nota_publicada(m,c.asignacion_docente_id,c.trimestre_id))))
$$;
create function private.editar_criterio(k uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.criterios_evaluacion c where c.id=k and private.editar_asignacion(c.asignacion_docente_id))
$$;
create function private.ver_jornada(j uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.jornadas_asistencia x where x.id=j and
 (private.admin() or private.docente_curso(x.curso_id) or (x.estado='PUBLICADO' and private.ver_curso(x.curso_id))))
$$;
create function private.editar_jornada(j uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.jornadas_asistencia x where x.id=j and
 (private.director() or private.docente_curso(x.curso_id)))
$$;
create function private.ver_comunicado(c uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.rol() is not null and exists(select 1 from public.comunicados x where x.id=c and
 (private.admin() or x.autor_id=(select auth.uid()) or
 (x.estado='PUBLICADO' and (x.institucional or exists
 (select 1 from public.destinatarios_comunicado d where d.comunicado_id=x.id
 and (d.perfil_id=(select auth.uid()) or private.ver_curso(d.curso_id)))))))
$$;
create function private.editar_comunicado(c uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.comunicados x where x.id=c and
 (private.admin() or (private.rol()='DOCENTE' and x.autor_id=(select auth.uid()))))
$$;

-- Todas las modificaciones sensibles se auditan; clientes no pueden escribir auditoría.
create function private.registrar_auditoria() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_old jsonb; v_new jsonb;
begin
 if TG_OP <> 'INSERT' then v_old := to_jsonb(old); end if;
 if TG_OP <> 'DELETE' then v_new := to_jsonb(new); end if;
 insert into public.auditoria(actor_id,tabla,operacion,registro_id,anterior,nuevo)
 values(auth.uid(),TG_TABLE_NAME,TG_OP,coalesce(v_new->>'id',v_old->>'id',
 v_new->>'estudiante_id',v_old->>'estudiante_id'),v_old,v_new);
 return coalesce(new,old);
end $$;
create function private.actualizar_fecha() returns trigger
language plpgsql set search_path='' as $$
begin new.updated_at := now(); return new; end $$;
create function private.claves_inmutables() returns trigger
language plpgsql set search_path='' as $$
declare col text;
begin
 foreach col in array TG_ARGV loop
  if to_jsonb(old)->col is distinct from to_jsonb(new)->col then
   raise exception 'No se permite modificar la clave % en %',col,TG_TABLE_NAME using errcode='23514';
  end if;
 end loop;
 return new;
end $$;

-- Integridad cruzada y serialización: las FK compuestas evitan mezclar curso/gestión.
create function private.validar_catalogos() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_anio integer; v_persona uuid;
begin
 if TG_TABLE_NAME='perfiles' then
  if new.rol='DOCENTE' and not exists(select 1 from public.docentes where persona_id=new.persona_id) then
   raise exception 'Crear docente antes de vincular su cuenta';
  elsif new.rol='PADRE' and not exists(select 1 from public.tutores where persona_id=new.persona_id) then
   raise exception 'Crear tutor antes de vincular su cuenta';
  elsif new.rol='ESTUDIANTE' and not exists(select 1 from public.estudiantes where persona_id=new.persona_id) then
   raise exception 'Crear estudiante antes de vincular su cuenta';
  end if;
 elsif TG_TABLE_NAME='estudiantes' then
  if new.fecha_nacimiento > (now() at time zone 'America/La_Paz')::date then
   raise exception 'Fecha de nacimiento futura'; end if;
 elsif TG_TABLE_NAME='matriculas' then
  perform 1 from public.estudiantes where id=new.estudiante_id for update;
  select anio into v_anio from public.gestiones where id=new.gestion_id;
  if extract(year from new.fecha_ingreso) <> v_anio or
    (new.fecha_salida is not null and extract(year from new.fecha_salida) <> v_anio) then
   raise exception 'Matrícula fuera de su gestión'; end if;
  if exists(select 1 from public.matriculas m where m.estudiante_id=new.estudiante_id
    and m.gestion_id=new.gestion_id and m.id<>new.id
    and daterange(m.fecha_ingreso,coalesce(m.fecha_salida,make_date(v_anio,12,31)),'[]') &&
        daterange(new.fecha_ingreso,coalesce(new.fecha_salida,make_date(v_anio,12,31)),'[]')) then
   raise exception 'Matrículas superpuestas para el mismo estudiante'; end if;
  if TG_OP='UPDATE' and exists(select 1 from public.asistencias a
    join public.jornadas_asistencia j on j.id=a.jornada_id
    where a.matricula_id=new.id and
      (j.fecha<new.fecha_ingreso or (new.fecha_salida is not null and j.fecha>new.fecha_salida))) then
   raise exception 'El cambio de vigencia dejaría asistencias fuera de matrícula'; end if;
  if TG_OP='UPDATE' and exists(select 1 from public.calificaciones_trimestrales c
    join public.trimestres t on t.id=c.trimestre_id where c.matricula_id=new.id and
    (new.fecha_ingreso>t.fecha_fin or (new.fecha_salida is not null and new.fecha_salida<t.fecha_inicio))) then
   raise exception 'El cambio de vigencia dejaría calificaciones fuera de matrícula'; end if;
 elsif TG_TABLE_NAME in ('periodos','trimestres') then
  perform 1 from public.gestiones where id=new.gestion_id for update;
  if TG_TABLE_NAME='periodos' then
   if new.hora_inicio is null and exists(select 1 from public.horarios h where h.periodo_id=new.id) then
    raise exception 'No se pueden quitar horas a un periodo con horarios asignados'; end if;
   if exists(select 1 from public.periodos p where p.gestion_id=new.gestion_id and p.id<>new.id
    and p.hora_inicio < new.hora_fin and new.hora_inicio < p.hora_fin) then
    raise exception 'Periodos superpuestos'; end if;
  else
   if TG_OP='UPDATE' and (new.fecha_inicio is distinct from old.fecha_inicio or new.fecha_fin is distinct from old.fecha_fin)
    and (exists(select 1 from public.criterios_evaluacion where trimestre_id=new.id)
      or exists(select 1 from public.calificaciones_trimestrales where trimestre_id=new.id)
      or exists(select 1 from public.avances_curriculares where trimestre_id=new.id)
      or exists(select 1 from public.observaciones_estudiantes where trimestre_id=new.id)
      or exists(select 1 from public.jornadas_asistencia j where j.gestion_id=new.gestion_id
        and j.fecha between old.fecha_inicio and old.fecha_fin)) then
    raise exception 'Fechas de trimestre bloqueadas porque existen registros académicos'; end if;
   select anio into v_anio from public.gestiones where id=new.gestion_id;
   if extract(year from new.fecha_inicio) <> v_anio or extract(year from new.fecha_fin) <> v_anio then
    raise exception 'Trimestre fuera de su gestión'; end if;
   if new.fecha_inicio is not null and exists(select 1 from public.trimestres t where t.gestion_id=new.gestion_id and t.id<>new.id and t.fecha_inicio is not null
     and daterange(t.fecha_inicio,t.fecha_fin,'[]') && daterange(new.fecha_inicio,new.fecha_fin,'[]')) then
    raise exception 'Trimestres superpuestos'; end if;
  end if;
 elsif TG_TABLE_NAME='horarios' then
  if not exists(select 1 from public.periodos p where p.id=new.periodo_id and p.hora_inicio is not null) then
   raise exception 'Configurar las horas reales del periodo antes de asignar el horario'; end if;
 end if;
 return new;
end $$;

-- Resultado central: promedio redondeado por dimensión; incompletos NO son cero.
create function private.resumen_nota(m uuid,a uuid,t uuid)
returns table(ser numeric,saber numeric,hacer numeric,completa boolean)
language sql stable security definer set search_path='' as $$
 select round(avg(n.puntaje) filter(where k.dimension='SER'),0),
 round(avg(n.puntaje) filter(where k.dimension='SABER'),0),
 round(avg(n.puntaje) filter(where k.dimension='HACER'),0),
 count(distinct k.dimension)=3 and count(n.id)=count(k.id)
 from public.criterios_evaluacion k left join public.notas_criterios n
 on n.criterio_id=k.id and n.matricula_id=m
 where k.asignacion_docente_id=a and k.trimestre_id=t
$$;

create function private.validar_evaluacion() returns trigger
language plpgsql security definer set search_path='' as $$
declare r record; k record; tr record; v_a uuid; v_t uuid; v_m uuid; v_g uuid; v_estado public.estado_publicacion;
begin
 r := coalesce(new,old);
 if TG_TABLE_NAME='notas_criterios' then
  select * into k from public.criterios_evaluacion where id=r.criterio_id;
  v_a:=k.asignacion_docente_id; v_t:=k.trimestre_id; v_m:=r.matricula_id;
  if TG_OP<>'DELETE' and new.puntaje>k.puntaje_maximo then raise exception 'Puntaje supera máximo del criterio'; end if;
 else
  v_a:=r.asignacion_docente_id; v_t:=r.trimestre_id;
  if TG_TABLE_NAME<>'criterios_evaluacion' and TG_TABLE_NAME<>'avances_curriculares' then v_m:=r.matricula_id; end if;
 end if;
 -- El mismo bloqueo en cada escritura evita carreras entre publicar/cerrar/editar.
 select * into tr from public.trimestres where id=v_t for update;
 if tr.estado<>'ABIERTO' then raise exception 'Trimestre no abierto: modificaciones bloqueadas'; end if;
 perform 1 from public.asignaciones_docente where id=v_a for update;
 if v_m is not null then perform 1 from public.matriculas where id=v_m for update; end if;
 if v_m is not null and not exists(select 1 from public.matriculas m where m.id=v_m
  and m.fecha_ingreso<=tr.fecha_fin and coalesce(m.fecha_salida,tr.fecha_fin)>=tr.fecha_inicio) then
  raise exception 'Matrícula sin vigencia en este trimestre'; end if;
 if TG_TABLE_NAME='criterios_evaluacion' and exists(select 1 from public.calificaciones_trimestrales c
  where c.asignacion_docente_id=v_a and c.trimestre_id=v_t and c.estado='PUBLICADO') then
  raise exception 'Despublicar calificaciones antes de modificar sus criterios';
 elsif TG_TABLE_NAME='notas_criterios' and private.nota_publicada(v_m,v_a,v_t) then
  raise exception 'Despublicar la calificación antes de modificar sus notas';
 elsif TG_TABLE_NAME='calificaciones_trimestrales' then
  if TG_OP<>'INSERT' and old.estado='PUBLICADO' then
   if TG_OP='DELETE' or new.estado<>'BORRADOR' or
    (to_jsonb(new)-array['estado','publicada_at','updated_at']) is distinct from
    (to_jsonb(old)-array['estado','publicada_at','updated_at']) then
    raise exception 'Despublicar primero, sin modificar notas, autoevaluación o extras'; end if;
  end if;
  if TG_OP<>'DELETE' then
   if new.estado='PUBLICADO' then
    select * into k from private.resumen_nota(v_m,v_a,v_t);
    if not k.completa or new.autoevaluacion is null then raise exception 'Calificación incompleta: no puede publicarse'; end if;
    new.publicada_at:=now();
   else new.publicada_at:=null;
   end if;
  end if;
 elsif TG_TABLE_NAME in ('avances_curriculares','observaciones_estudiantes') and TG_OP<>'DELETE' then
  if new.fecha < tr.fecha_inicio or new.fecha > tr.fecha_fin then raise exception 'Fecha fuera del trimestre'; end if;
  if TG_TABLE_NAME='observaciones_estudiantes' and not exists(select 1 from public.matriculas m
    where m.id=v_m and new.fecha between m.fecha_ingreso and coalesce(m.fecha_salida,new.fecha)) then
    raise exception 'Observación fuera de la vigencia de matrícula'; end if;
 end if;
 return coalesce(new,old);
end $$;

create function private.validar_asistencia() returns trigger
language plpgsql security definer set search_path='' as $$
declare r record; j record; v_anio integer;
begin
 r:=coalesce(new,old);
 if TG_TABLE_NAME='jornadas_asistencia' then
  j:=r;
  select anio into v_anio from public.gestiones where id=r.gestion_id;
  if extract(year from r.fecha)<>v_anio then raise exception 'Jornada fuera de la gestión'; end if;
  if TG_OP<>'INSERT' and old.estado='PUBLICADO' then
   if TG_OP='DELETE' or new.estado<>'BORRADOR' or
    (to_jsonb(new)-array['estado','updated_at']) is distinct from (to_jsonb(old)-array['estado','updated_at']) then
    raise exception 'Despublicar primero la jornada'; end if;
  end if;
  if TG_OP<>'DELETE' and new.estado='PUBLICADO' and exists
   (select 1 from public.matriculas m where m.curso_id=new.curso_id
    and new.fecha between m.fecha_ingreso and coalesce(m.fecha_salida,new.fecha)
    and not exists(select 1 from public.asistencias s where s.jornada_id=new.id and s.matricula_id=m.id)) then
    raise exception 'Completar asistencia de todos los estudiantes de la jornada'; end if;
 else
  select * into j from public.jornadas_asistencia where id=r.jornada_id for update;
  if j.estado='PUBLICADO' then raise exception 'Despublicar jornada antes de editar asistencia'; end if;
  perform 1 from public.matriculas where id=r.matricula_id for update;
  if not exists(select 1 from public.matriculas m where m.id=r.matricula_id
    and j.fecha between m.fecha_ingreso and coalesce(m.fecha_salida,j.fecha)) then
    raise exception 'Estudiante sin matrícula vigente en esta fecha'; end if;
 end if;
 perform 1 from public.trimestres t where t.gestion_id=j.gestion_id
   and j.fecha between t.fecha_inicio and t.fecha_fin for update;
 if exists(select 1 from public.trimestres t where t.gestion_id=j.gestion_id and t.estado='CERRADO'
    and j.fecha between t.fecha_inicio and t.fecha_fin) then raise exception 'Asistencia de trimestre cerrado'; end if;
 return coalesce(new,old);
end $$;

create function private.validar_comunicacion() returns trigger
language plpgsql security definer set search_path='' as $$
declare r record; c record;
begin
 r:=coalesce(new,old);
 if TG_TABLE_NAME='comunicados' then
  if TG_OP<>'INSERT' and old.estado='PUBLICADO' then
   if TG_OP='DELETE' or new.estado<>'BORRADOR' or
    (to_jsonb(new)-array['estado','publicado_at','updated_at']) is distinct from
    (to_jsonb(old)-array['estado','publicado_at','updated_at']) then raise exception 'Despublicar primero el comunicado'; end if;
  end if;
  if TG_OP<>'DELETE' then
   if new.estado='PUBLICADO' then
    if not new.institucional and not exists(select 1 from public.destinatarios_comunicado d where d.comunicado_id=new.id)
     then raise exception 'Comunicado sin destinatarios'; end if;
    new.publicado_at:=now();
   else new.publicado_at:=null; end if;
  end if;
 else
  select * into c from public.comunicados where id=r.comunicado_id for update;
  if c.estado='PUBLICADO' then raise exception 'Destinatarios bloqueados: despublicar primero'; end if;
 end if;
 return coalesce(new,old);
end $$;

-- Triggers, índices, políticas y datos iniciales continúan debajo.
create trigger z_fecha before update on public.personas for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.personas for each row execute function private.claves_inmutables('id');
create trigger zz_auditoria after insert or update or delete on public.personas for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.perfiles for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.perfiles for each row execute function private.claves_inmutables('id','persona_id');
create trigger zz_auditoria after insert or update or delete on public.perfiles for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.estudiantes for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.estudiantes for each row execute function private.claves_inmutables('id','persona_id');
create trigger zz_auditoria after insert or update or delete on public.estudiantes for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.docentes for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.docentes for each row execute function private.claves_inmutables('id','persona_id');
create trigger zz_auditoria after insert or update or delete on public.docentes for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.tutores for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.tutores for each row execute function private.claves_inmutables('id','persona_id');
create trigger zz_auditoria after insert or update or delete on public.tutores for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.estudiante_tutor for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.estudiante_tutor for each row execute function private.claves_inmutables('estudiante_id','tutor_id');
create trigger zz_auditoria after insert or update or delete on public.estudiante_tutor for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.configuracion for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.configuracion for each row execute function private.claves_inmutables('id');
create trigger zz_auditoria after insert or update or delete on public.configuracion for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.gestiones for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.gestiones for each row execute function private.claves_inmutables('id','anio');
create trigger zz_auditoria after insert or update or delete on public.gestiones for each row execute function private.registrar_auditoria();
create trigger a_claves before update on public.grados for each row execute function private.claves_inmutables('id');
create trigger zz_auditoria after insert or update or delete on public.grados for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.cursos for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.cursos for each row execute function private.claves_inmutables('id','gestion_id','grado_id','paralelo');
create trigger zz_auditoria after insert or update or delete on public.cursos for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.matriculas for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.matriculas for each row execute function private.claves_inmutables('id','estudiante_id','curso_id','gestion_id');
create trigger zz_auditoria after insert or update or delete on public.matriculas for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.asignaturas for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.asignaturas for each row execute function private.claves_inmutables('id');
create trigger zz_auditoria after insert or update or delete on public.asignaturas for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.asignaciones_docente for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.asignaciones_docente for each row execute function private.claves_inmutables('id','curso_id','gestion_id','asignatura_id');
create trigger zz_auditoria after insert or update or delete on public.asignaciones_docente for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.periodos for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.periodos for each row execute function private.claves_inmutables('id','gestion_id','numero');
create trigger zz_auditoria after insert or update or delete on public.periodos for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.horarios for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.horarios for each row execute function private.claves_inmutables('id','curso_id','gestion_id');
create trigger zz_auditoria after insert or update or delete on public.horarios for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.trimestres for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.trimestres for each row execute function private.claves_inmutables('id','gestion_id','numero');
create trigger zz_auditoria after insert or update or delete on public.trimestres for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.criterios_evaluacion for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.criterios_evaluacion for each row execute function private.claves_inmutables('id','asignacion_docente_id','curso_id','gestion_id','trimestre_id','dimension');
create trigger zz_auditoria after insert or update or delete on public.criterios_evaluacion for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.notas_criterios for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.notas_criterios for each row execute function private.claves_inmutables('id','criterio_id','matricula_id','curso_id','gestion_id');
create trigger zz_auditoria after insert or update or delete on public.notas_criterios for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.calificaciones_trimestrales for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.calificaciones_trimestrales for each row execute function private.claves_inmutables('id','asignacion_docente_id','matricula_id','curso_id','gestion_id','trimestre_id');
create trigger zz_auditoria after insert or update or delete on public.calificaciones_trimestrales for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.jornadas_asistencia for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.jornadas_asistencia for each row execute function private.claves_inmutables('id','curso_id','gestion_id','fecha');
create trigger zz_auditoria after insert or update or delete on public.jornadas_asistencia for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.asistencias for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.asistencias for each row execute function private.claves_inmutables('id','jornada_id','matricula_id','curso_id','gestion_id');
create trigger zz_auditoria after insert or update or delete on public.asistencias for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.avances_curriculares for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.avances_curriculares for each row execute function private.claves_inmutables('id','asignacion_docente_id','curso_id','gestion_id','trimestre_id');
create trigger zz_auditoria after insert or update or delete on public.avances_curriculares for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.observaciones_estudiantes for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.observaciones_estudiantes for each row execute function private.claves_inmutables('id','asignacion_docente_id','matricula_id','curso_id','gestion_id','trimestre_id');
create trigger zz_auditoria after insert or update or delete on public.observaciones_estudiantes for each row execute function private.registrar_auditoria();
create trigger z_fecha before update on public.comunicados for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.comunicados for each row execute function private.claves_inmutables('id','autor_id');
create trigger zz_auditoria after insert or update or delete on public.comunicados for each row execute function private.registrar_auditoria();
create trigger a_claves before update on public.destinatarios_comunicado for each row execute function private.claves_inmutables('id','comunicado_id');
create trigger zz_auditoria after insert or update or delete on public.destinatarios_comunicado for each row execute function private.registrar_auditoria();
create trigger a_claves before update on public.lecturas_comunicado for each row execute function private.claves_inmutables('comunicado_id','perfil_id');
create trigger z_fecha before update on public.dispositivos for each row execute function private.actualizar_fecha();
create trigger a_claves before update on public.dispositivos for each row execute function private.claves_inmutables('id','perfil_id');
create trigger b_validar before insert or update on public.perfiles for each row execute function private.validar_catalogos();
create trigger b_validar before insert or update on public.estudiantes for each row execute function private.validar_catalogos();
create trigger b_validar before insert or update on public.matriculas for each row execute function private.validar_catalogos();
create trigger b_validar before insert or update on public.periodos for each row execute function private.validar_catalogos();
create trigger b_validar before insert or update on public.trimestres for each row execute function private.validar_catalogos();
create trigger b_validar before insert or update on public.horarios for each row execute function private.validar_catalogos();
create trigger b_validar before insert or update or delete on public.criterios_evaluacion for each row execute function private.validar_evaluacion();
create trigger b_validar before insert or update or delete on public.notas_criterios for each row execute function private.validar_evaluacion();
create trigger b_validar before insert or update or delete on public.calificaciones_trimestrales for each row execute function private.validar_evaluacion();
create trigger b_validar before insert or update or delete on public.avances_curriculares for each row execute function private.validar_evaluacion();
create trigger b_validar before insert or update or delete on public.observaciones_estudiantes for each row execute function private.validar_evaluacion();
create trigger b_validar before insert or update or delete on public.jornadas_asistencia for each row execute function private.validar_asistencia();
create trigger b_validar before insert or update or delete on public.asistencias for each row execute function private.validar_asistencia();
create trigger b_validar before insert or update or delete on public.comunicados for each row execute function private.validar_comunicacion();
create trigger b_validar before insert or update or delete on public.destinatarios_comunicado for each row execute function private.validar_comunicacion();
create index estudiante_tutor_tutor_id_idx on public.estudiante_tutor(tutor_id);
create index matriculas_curso_id_idx on public.matriculas(curso_id);
create index matriculas_gestion_id_idx on public.matriculas(gestion_id);
create index asignaciones_docente_docente_id_idx on public.asignaciones_docente(docente_id);
create index asignaciones_docente_asignatura_id_idx on public.asignaciones_docente(asignatura_id);
create index asignaciones_docente_gestion_id_idx on public.asignaciones_docente(gestion_id);
create index horarios_asignacion_docente_id_idx on public.horarios(asignacion_docente_id);
create index horarios_periodo_id_idx on public.horarios(periodo_id);
create index notas_criterios_matricula_id_idx on public.notas_criterios(matricula_id);
create index calificaciones_trimestrales_matricula_id_idx on public.calificaciones_trimestrales(matricula_id);
create index calificaciones_trimestrales_trimestre_id_idx on public.calificaciones_trimestrales(trimestre_id);
create index criterios_evaluacion_trimestre_id_idx on public.criterios_evaluacion(trimestre_id);
create index asistencias_matricula_id_idx on public.asistencias(matricula_id);
create index avances_curriculares_asignacion_docente_id_idx on public.avances_curriculares(asignacion_docente_id);
create index avances_curriculares_trimestre_id_idx on public.avances_curriculares(trimestre_id);
create index observaciones_estudiantes_matricula_id_idx on public.observaciones_estudiantes(matricula_id);
create index observaciones_estudiantes_asignacion_docente_id_idx on public.observaciones_estudiantes(asignacion_docente_id);
create index observaciones_estudiantes_trimestre_id_idx on public.observaciones_estudiantes(trimestre_id);
create index destinatarios_comunicado_curso_id_idx on public.destinatarios_comunicado(curso_id);
create index destinatarios_comunicado_perfil_id_idx on public.destinatarios_comunicado(perfil_id);
create index dispositivos_perfil_id_idx on public.dispositivos(perfil_id);
create index auditoria_fecha_idx on public.auditoria(fecha);
create index auditoria_actor_id_idx on public.auditoria(actor_id);
create index personas_apellidos_idx on public.personas(lower(apellido_paterno),lower(apellido_materno),lower(nombres));

-- RLS en las 28 tablas, anon sin acceso. No conceder TRUNCATE/REFERENCES/TRIGGER a clientes.
alter table public.personas enable row level security;
revoke all on public.personas from public, anon, authenticated;
grant select, insert, update on public.personas to authenticated;
create policy personas_select on public.personas for select to authenticated using (private.ver_persona(id));
create policy personas_insert on public.personas for insert to authenticated with check (private.admin());
create policy personas_update on public.personas for update to authenticated using (private.editar_persona(id)) with check (private.editar_persona(id));
grant all on public.personas to service_role;
alter table public.perfiles enable row level security;
revoke all on public.perfiles from public, anon, authenticated;
grant select, insert, update on public.perfiles to authenticated;
create policy perfiles_select on public.perfiles for select to authenticated using (private.director() or (id=(select auth.uid()) and activo));
create policy perfiles_insert on public.perfiles for insert to authenticated with check (private.director());
create policy perfiles_update on public.perfiles for update to authenticated using (private.director()) with check (private.director());
grant all on public.perfiles to service_role;
alter table public.estudiantes enable row level security;
revoke all on public.estudiantes from public, anon, authenticated;
grant select, insert, update on public.estudiantes to authenticated;
create policy estudiantes_select on public.estudiantes for select to authenticated using (private.ver_estudiante(id));
create policy estudiantes_insert on public.estudiantes for insert to authenticated with check (private.admin());
create policy estudiantes_update on public.estudiantes for update to authenticated using (private.admin()) with check (private.admin());
grant all on public.estudiantes to service_role;
alter table public.docentes enable row level security;
revoke all on public.docentes from public, anon, authenticated;
grant select, insert, update on public.docentes to authenticated;
create policy docentes_select on public.docentes for select to authenticated using (private.admin() or id=private.mi_docente());
create policy docentes_insert on public.docentes for insert to authenticated with check (private.admin());
create policy docentes_update on public.docentes for update to authenticated using (private.admin()) with check (private.admin());
grant all on public.docentes to service_role;
alter table public.tutores enable row level security;
revoke all on public.tutores from public, anon, authenticated;
grant select, insert, update on public.tutores to authenticated;
create policy tutores_select on public.tutores for select to authenticated using (private.ver_persona(persona_id));
create policy tutores_insert on public.tutores for insert to authenticated with check (private.admin());
create policy tutores_update on public.tutores for update to authenticated using (private.admin()) with check (private.admin());
grant all on public.tutores to service_role;
alter table public.estudiante_tutor enable row level security;
revoke all on public.estudiante_tutor from public, anon, authenticated;
grant select, insert, update, delete on public.estudiante_tutor to authenticated;
create policy estudiante_tutor_select on public.estudiante_tutor for select to authenticated using (private.ver_estudiante(estudiante_id));
create policy estudiante_tutor_insert on public.estudiante_tutor for insert to authenticated with check (private.admin());
create policy estudiante_tutor_update on public.estudiante_tutor for update to authenticated using (private.admin()) with check (private.admin());
create policy estudiante_tutor_delete on public.estudiante_tutor for delete to authenticated using (private.admin());
grant all on public.estudiante_tutor to service_role;
alter table public.configuracion enable row level security;
revoke all on public.configuracion from public, anon, authenticated;
grant select, insert, update on public.configuracion to authenticated;
create policy configuracion_select on public.configuracion for select to authenticated using (private.rol() is not null);
create policy configuracion_insert on public.configuracion for insert to authenticated with check (private.director());
create policy configuracion_update on public.configuracion for update to authenticated using (private.director()) with check (private.director());
grant all on public.configuracion to service_role;
alter table public.gestiones enable row level security;
revoke all on public.gestiones from public, anon, authenticated;
grant select, insert, update on public.gestiones to authenticated;
create policy gestiones_select on public.gestiones for select to authenticated using (private.rol() is not null);
create policy gestiones_insert on public.gestiones for insert to authenticated with check (private.director());
create policy gestiones_update on public.gestiones for update to authenticated using (private.director()) with check (private.director());
grant all on public.gestiones to service_role;
alter table public.grados enable row level security;
revoke all on public.grados from public, anon, authenticated;
grant select, insert, update on public.grados to authenticated;
create policy grados_select on public.grados for select to authenticated using (private.rol() is not null);
create policy grados_insert on public.grados for insert to authenticated with check (private.director());
create policy grados_update on public.grados for update to authenticated using (private.director()) with check (private.director());
grant all on public.grados to service_role;
alter table public.cursos enable row level security;
revoke all on public.cursos from public, anon, authenticated;
grant select, insert, update on public.cursos to authenticated;
create policy cursos_select on public.cursos for select to authenticated using (private.ver_curso(id));
create policy cursos_insert on public.cursos for insert to authenticated with check (private.admin());
create policy cursos_update on public.cursos for update to authenticated using (private.admin()) with check (private.admin());
grant all on public.cursos to service_role;
alter table public.matriculas enable row level security;
revoke all on public.matriculas from public, anon, authenticated;
grant select, insert, update on public.matriculas to authenticated;
create policy matriculas_select on public.matriculas for select to authenticated using (private.ver_estudiante(estudiante_id));
create policy matriculas_insert on public.matriculas for insert to authenticated with check (private.admin());
create policy matriculas_update on public.matriculas for update to authenticated using (private.admin()) with check (private.admin());
grant all on public.matriculas to service_role;
alter table public.asignaturas enable row level security;
revoke all on public.asignaturas from public, anon, authenticated;
grant select, insert, update on public.asignaturas to authenticated;
create policy asignaturas_select on public.asignaturas for select to authenticated using (private.rol() is not null);
create policy asignaturas_insert on public.asignaturas for insert to authenticated with check (private.admin());
create policy asignaturas_update on public.asignaturas for update to authenticated using (private.admin()) with check (private.admin());
grant all on public.asignaturas to service_role;
alter table public.asignaciones_docente enable row level security;
revoke all on public.asignaciones_docente from public, anon, authenticated;
grant select, insert, update on public.asignaciones_docente to authenticated;
create policy asignaciones_docente_select on public.asignaciones_docente for select to authenticated using (private.ver_asignacion(id));
create policy asignaciones_docente_insert on public.asignaciones_docente for insert to authenticated with check (private.admin());
create policy asignaciones_docente_update on public.asignaciones_docente for update to authenticated using (private.admin()) with check (private.admin());
grant all on public.asignaciones_docente to service_role;
alter table public.periodos enable row level security;
revoke all on public.periodos from public, anon, authenticated;
grant select, insert, update on public.periodos to authenticated;
create policy periodos_select on public.periodos for select to authenticated using (private.rol() is not null);
create policy periodos_insert on public.periodos for insert to authenticated with check (private.admin());
create policy periodos_update on public.periodos for update to authenticated using (private.admin()) with check (private.admin());
grant all on public.periodos to service_role;
alter table public.horarios enable row level security;
revoke all on public.horarios from public, anon, authenticated;
grant select, insert, update, delete on public.horarios to authenticated;
create policy horarios_select on public.horarios for select to authenticated using (private.ver_curso(curso_id));
create policy horarios_insert on public.horarios for insert to authenticated with check (private.admin());
create policy horarios_update on public.horarios for update to authenticated using (private.admin()) with check (private.admin());
create policy horarios_delete on public.horarios for delete to authenticated using (private.admin());
grant all on public.horarios to service_role;
alter table public.trimestres enable row level security;
revoke all on public.trimestres from public, anon, authenticated;
grant select, insert, update on public.trimestres to authenticated;
create policy trimestres_select on public.trimestres for select to authenticated using (private.rol() is not null);
create policy trimestres_insert on public.trimestres for insert to authenticated with check (private.director());
create policy trimestres_update on public.trimestres for update to authenticated using (private.director()) with check (private.director());
grant all on public.trimestres to service_role;
alter table public.criterios_evaluacion enable row level security;
revoke all on public.criterios_evaluacion from public, anon, authenticated;
grant select, insert, update, delete on public.criterios_evaluacion to authenticated;
create policy criterios_evaluacion_select on public.criterios_evaluacion for select to authenticated using (private.ver_asignacion(asignacion_docente_id));
create policy criterios_evaluacion_insert on public.criterios_evaluacion for insert to authenticated with check (private.editar_asignacion(asignacion_docente_id));
create policy criterios_evaluacion_update on public.criterios_evaluacion for update to authenticated using (private.editar_asignacion(asignacion_docente_id)) with check (private.editar_asignacion(asignacion_docente_id));
create policy criterios_evaluacion_delete on public.criterios_evaluacion for delete to authenticated using (private.editar_asignacion(asignacion_docente_id));
grant all on public.criterios_evaluacion to service_role;
alter table public.notas_criterios enable row level security;
revoke all on public.notas_criterios from public, anon, authenticated;
grant select, insert, update, delete on public.notas_criterios to authenticated;
create policy notas_criterios_select on public.notas_criterios for select to authenticated using (private.ver_nota(matricula_id,criterio_id));
create policy notas_criterios_insert on public.notas_criterios for insert to authenticated with check (private.editar_criterio(criterio_id));
create policy notas_criterios_update on public.notas_criterios for update to authenticated using (private.editar_criterio(criterio_id)) with check (private.editar_criterio(criterio_id));
create policy notas_criterios_delete on public.notas_criterios for delete to authenticated using (private.editar_criterio(criterio_id));
grant all on public.notas_criterios to service_role;
alter table public.calificaciones_trimestrales enable row level security;
revoke all on public.calificaciones_trimestrales from public, anon, authenticated;
grant select, insert, update, delete on public.calificaciones_trimestrales to authenticated;
create policy calificaciones_trimestrales_select on public.calificaciones_trimestrales for select to authenticated using (private.admin() or private.editar_asignacion(asignacion_docente_id) or (estado='PUBLICADO' and private.familia_matricula(matricula_id)));
create policy calificaciones_trimestrales_insert on public.calificaciones_trimestrales for insert to authenticated with check (private.editar_asignacion(asignacion_docente_id));
create policy calificaciones_trimestrales_update on public.calificaciones_trimestrales for update to authenticated using (private.editar_asignacion(asignacion_docente_id)) with check (private.editar_asignacion(asignacion_docente_id));
create policy calificaciones_trimestrales_delete on public.calificaciones_trimestrales for delete to authenticated using (private.editar_asignacion(asignacion_docente_id));
grant all on public.calificaciones_trimestrales to service_role;
alter table public.jornadas_asistencia enable row level security;
revoke all on public.jornadas_asistencia from public, anon, authenticated;
grant select, insert, update, delete on public.jornadas_asistencia to authenticated;
create policy jornadas_asistencia_select on public.jornadas_asistencia for select to authenticated using (private.ver_jornada(id));
create policy jornadas_asistencia_insert on public.jornadas_asistencia for insert to authenticated with check (private.director() or private.docente_curso(curso_id));
create policy jornadas_asistencia_update on public.jornadas_asistencia for update to authenticated using (private.director() or private.docente_curso(curso_id)) with check (private.director() or private.docente_curso(curso_id));
create policy jornadas_asistencia_delete on public.jornadas_asistencia for delete to authenticated using (private.director() or private.docente_curso(curso_id));
grant all on public.jornadas_asistencia to service_role;
alter table public.asistencias enable row level security;
revoke all on public.asistencias from public, anon, authenticated;
grant select, insert, update, delete on public.asistencias to authenticated;
create policy asistencias_select on public.asistencias for select to authenticated using (private.admin() or private.editar_jornada(jornada_id) or (private.familia_matricula(matricula_id) and private.ver_jornada(jornada_id)));
create policy asistencias_insert on public.asistencias for insert to authenticated with check (private.editar_jornada(jornada_id));
create policy asistencias_update on public.asistencias for update to authenticated using (private.editar_jornada(jornada_id)) with check (private.editar_jornada(jornada_id));
create policy asistencias_delete on public.asistencias for delete to authenticated using (private.editar_jornada(jornada_id));
grant all on public.asistencias to service_role;
alter table public.avances_curriculares enable row level security;
revoke all on public.avances_curriculares from public, anon, authenticated;
grant select, insert, update, delete on public.avances_curriculares to authenticated;
create policy avances_curriculares_select on public.avances_curriculares for select to authenticated using (private.ver_asignacion(asignacion_docente_id));
create policy avances_curriculares_insert on public.avances_curriculares for insert to authenticated with check (private.editar_asignacion(asignacion_docente_id));
create policy avances_curriculares_update on public.avances_curriculares for update to authenticated using (private.editar_asignacion(asignacion_docente_id)) with check (private.editar_asignacion(asignacion_docente_id));
create policy avances_curriculares_delete on public.avances_curriculares for delete to authenticated using (private.editar_asignacion(asignacion_docente_id));
grant all on public.avances_curriculares to service_role;
alter table public.observaciones_estudiantes enable row level security;
revoke all on public.observaciones_estudiantes from public, anon, authenticated;
grant select, insert, update, delete on public.observaciones_estudiantes to authenticated;
create policy observaciones_estudiantes_select on public.observaciones_estudiantes for select to authenticated using (private.admin() or private.editar_asignacion(asignacion_docente_id) or (visible_familia and private.familia_matricula(matricula_id)));
create policy observaciones_estudiantes_insert on public.observaciones_estudiantes for insert to authenticated with check (private.editar_asignacion(asignacion_docente_id));
create policy observaciones_estudiantes_update on public.observaciones_estudiantes for update to authenticated using (private.editar_asignacion(asignacion_docente_id)) with check (private.editar_asignacion(asignacion_docente_id));
create policy observaciones_estudiantes_delete on public.observaciones_estudiantes for delete to authenticated using (private.editar_asignacion(asignacion_docente_id));
grant all on public.observaciones_estudiantes to service_role;
alter table public.comunicados enable row level security;
revoke all on public.comunicados from public, anon, authenticated;
grant select, insert, update, delete on public.comunicados to authenticated;
create policy comunicados_select on public.comunicados for select to authenticated using (private.ver_comunicado(id));
create policy comunicados_insert on public.comunicados for insert to authenticated with check (autor_id=(select auth.uid()) and (private.admin() or (private.rol()='DOCENTE' and not institucional)));
create policy comunicados_update on public.comunicados for update to authenticated using (private.editar_comunicado(id) and (private.admin() or not institucional)) with check (private.editar_comunicado(id) and (private.admin() or not institucional));
create policy comunicados_delete on public.comunicados for delete to authenticated using (private.editar_comunicado(id));
grant all on public.comunicados to service_role;
alter table public.destinatarios_comunicado enable row level security;
revoke all on public.destinatarios_comunicado from public, anon, authenticated;
grant select, insert, update, delete on public.destinatarios_comunicado to authenticated;
create policy destinatarios_comunicado_select on public.destinatarios_comunicado for select to authenticated using (private.ver_comunicado(comunicado_id) and (private.admin() or private.editar_comunicado(comunicado_id) or perfil_id=(select auth.uid()) or private.ver_curso(curso_id)));
create policy destinatarios_comunicado_insert on public.destinatarios_comunicado for insert to authenticated with check (private.editar_comunicado(comunicado_id) and (private.admin() or (perfil_id is null and private.docente_curso(curso_id))));
create policy destinatarios_comunicado_update on public.destinatarios_comunicado for update to authenticated using (private.editar_comunicado(comunicado_id) and (private.admin() or (perfil_id is null and private.docente_curso(curso_id)))) with check (private.editar_comunicado(comunicado_id) and (private.admin() or (perfil_id is null and private.docente_curso(curso_id))));
create policy destinatarios_comunicado_delete on public.destinatarios_comunicado for delete to authenticated using (private.editar_comunicado(comunicado_id) and (private.admin() or (perfil_id is null and private.docente_curso(curso_id))));
grant all on public.destinatarios_comunicado to service_role;
alter table public.lecturas_comunicado enable row level security;
revoke all on public.lecturas_comunicado from public, anon, authenticated;
grant select, insert on public.lecturas_comunicado to authenticated;
create policy lecturas_comunicado_select on public.lecturas_comunicado for select to authenticated using (private.admin() or (perfil_id=(select auth.uid()) and private.rol() is not null) or private.editar_comunicado(comunicado_id));
create policy lecturas_comunicado_insert on public.lecturas_comunicado for insert to authenticated with check (perfil_id=(select auth.uid()) and private.rol() is not null and private.ver_comunicado(comunicado_id));
grant all on public.lecturas_comunicado to service_role;
alter table public.dispositivos enable row level security;
revoke all on public.dispositivos from public, anon, authenticated;
grant select, insert, update, delete on public.dispositivos to authenticated;
create policy dispositivos_select on public.dispositivos for select to authenticated using (perfil_id=(select auth.uid()) and private.rol() is not null);
create policy dispositivos_insert on public.dispositivos for insert to authenticated with check (perfil_id=(select auth.uid()) and private.rol() is not null);
create policy dispositivos_update on public.dispositivos for update to authenticated using (perfil_id=(select auth.uid()) and private.rol() is not null) with check (perfil_id=(select auth.uid()) and private.rol() is not null);
create policy dispositivos_delete on public.dispositivos for delete to authenticated using (perfil_id=(select auth.uid()) and private.rol() is not null);
grant all on public.dispositivos to service_role;
alter table public.auditoria enable row level security;
revoke all on public.auditoria from public, anon, authenticated;
grant select on public.auditoria to authenticated;
create policy auditoria_select on public.auditoria for select to authenticated using (private.director());
grant all on public.auditoria to service_role;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.rol() to authenticated, service_role;
grant execute on function private.admin() to authenticated, service_role;
grant execute on function private.director() to authenticated, service_role;
grant execute on function private.mi_docente() to authenticated, service_role;
grant execute on function private.docente_curso(uuid) to authenticated, service_role;
grant execute on function private.familia_estudiante(uuid) to authenticated, service_role;
grant execute on function private.ver_estudiante(uuid) to authenticated, service_role;
grant execute on function private.familia_matricula(uuid) to authenticated, service_role;
grant execute on function private.ver_curso(uuid) to authenticated, service_role;
grant execute on function private.editar_asignacion(uuid) to authenticated, service_role;
grant execute on function private.ver_asignacion(uuid) to authenticated, service_role;
grant execute on function private.ver_persona(uuid) to authenticated, service_role;
grant execute on function private.editar_persona(uuid) to authenticated, service_role;
grant execute on function private.nota_publicada(uuid,uuid,uuid) to authenticated, service_role;
grant execute on function private.ver_nota(uuid,uuid) to authenticated, service_role;
grant execute on function private.editar_criterio(uuid) to authenticated, service_role;
grant execute on function private.ver_jornada(uuid) to authenticated, service_role;
grant execute on function private.editar_jornada(uuid) to authenticated, service_role;
grant execute on function private.ver_comunicado(uuid) to authenticated, service_role;
grant execute on function private.editar_comunicado(uuid) to authenticated, service_role;
grant usage, select on sequence public.auditoria_id_seq to service_role;

-- Vistas calculadas: security_invoker respeta RLS, no expone borradores de otros alumnos.
create view public.v_calificaciones with (security_invoker=true) as
with dimensiones as (
 select c.id,
 round(avg(n.puntaje) filter(where k.dimension='SER'),0) as ser,
 round(avg(n.puntaje) filter(where k.dimension='SABER'),0) as saber,
 round(avg(n.puntaje) filter(where k.dimension='HACER'),0) as hacer,
 count(distinct k.dimension)=3 and count(n.id)=count(k.id) and c.autoevaluacion is not null as completa
 from public.calificaciones_trimestrales c
 left join public.criterios_evaluacion k on k.asignacion_docente_id=c.asignacion_docente_id and k.trimestre_id=c.trimestre_id
 left join public.notas_criterios n on n.criterio_id=k.id and n.matricula_id=c.matricula_id
 group by c.id
), resultados as (
 select c.*, d.ser,d.saber,d.hacer,d.completa,
 case when d.completa then least(100,round(d.ser+d.saber+d.hacer+c.autoevaluacion+c.puntos_extra,0)) end as nota_final
 from public.calificaciones_trimestrales c join dimensiones d on d.id=c.id
)
select r.*, case when not completa then 'PENDIENTE' when nota_final>=51 then 'APROBADO' else 'REPROBADO' end as situacion
from resultados r;
create view public.v_resumen_asistencia with (security_invoker=true) as
select a.matricula_id,a.curso_id,a.gestion_id,date_trunc('month',j.fecha)::date as mes,
 count(*) filter(where a.estado='A') as presentes,
 count(*) filter(where a.estado='F') as faltas,
 count(*) filter(where a.estado='R') as retrasos,
 count(*) filter(where a.estado='L') as licencias,
 count(*) as dias_registrados,
 round(100.0 * count(*) filter(where a.estado in ('A','R')) / nullif(count(*),0),2) as porcentaje_presencia
from public.asistencias a join public.jornadas_asistencia j on j.id=a.jornada_id
where j.estado='PUBLICADO'
group by a.matricula_id,a.curso_id,a.gestion_id,date_trunc('month',j.fecha);
revoke all on public.v_calificaciones, public.v_resumen_asistencia from public, anon, authenticated;
grant select on public.v_calificaciones, public.v_resumen_asistencia to authenticated, service_role;

-- Datos iniciales de catálogo; sin asumir paralelos, receso ni fechas de trimestre.
insert into public.configuracion(id) values(true);
insert into public.grados(id,nombre) values (1,'Primero'),(2,'Segundo'),(3,'Tercero'),(4,'Cuarto'),(5,'Quinto'),(6,'Sexto');
insert into public.asignaturas(nombre) values ('Matemática'),('Lenguaje'),('Ciencias Naturales'),('Ciencias Sociales'),
 ('Artes Plásticas'),('Religión'),('Educación Física'),('Educación Musical'),('Técnica Vocacional');
insert into public.gestiones(anio) values(2026);
insert into public.trimestres(gestion_id,numero) select g.id,n from public.gestiones g cross join generate_series(1,3) n where g.anio=2026;
insert into public.periodos(gestion_id,numero) select g.id,n from public.gestiones g cross join generate_series(1,6) n where g.anio=2026;
commit;
