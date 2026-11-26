-- SQL Editor, como administrador. Configura UN trimestre con el calendario real del colegio.
-- Cambia solo las cinco variables iniciales. Ejecuta de nuevo para otro trimestre.
-- Las fechas null son marcadores: NO se asignan fechas ficticias automáticamente.
begin;
do $$
declare
 v_anio integer := 2026;
 v_numero integer := 1;
 v_inicio date := null; -- Sustituye null por DATE 'AAAA-MM-DD'.
 v_fin date := null; -- Sustituye null por DATE 'AAAA-MM-DD'.
 v_estado public.estado_trimestre := 'ABIERTO'; -- ABIERTO o PLANIFICADO, según el calendario real.
 v_gestion uuid; v_id uuid; v_actual public.trimestres;
begin
 if v_numero not between 1 and 3 or v_inicio is null or v_fin is null or v_inicio>v_fin
  or extract(year from v_inicio)<>v_anio or extract(year from v_fin)<>v_anio
  or v_estado not in ('ABIERTO','PLANIFICADO') then
  raise exception 'Completa año, número, fechas y estado con el calendario real antes de ejecutar'; end if;
 select id into v_gestion from public.gestiones where anio=v_anio;
 if not found then raise exception 'La gestión no existe'; end if;
 select * into v_actual from public.trimestres where gestion_id=v_gestion and numero=v_numero for update;
 if not found then raise exception 'El trimestre no existe; revisar configuración de la gestión'; end if;
 if v_actual.estado='CERRADO' then raise exception 'Este script no reabre un trimestre cerrado'; end if;
 v_id:=v_actual.id;
 update public.trimestres set fecha_inicio=v_inicio,fecha_fin=v_fin,estado=v_estado where id=v_id;
 -- Los triggers mantienen la validación de superposición y fechas con registros existentes.
end $$;
commit;
