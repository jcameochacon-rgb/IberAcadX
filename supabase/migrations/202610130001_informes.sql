-- Informes de consulta. Usa RLS y solo datos publicados; no modifica registros.
create or replace function public.consultar_informe(p_tipo text,p_curso uuid,p_trimestre uuid,p_desde date,p_hasta date) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare c record; t public.trimestres; filas jsonb;
begin
 if private.rol() is null or not private.ver_curso(p_curso) then raise exception 'Sin acceso al curso' using errcode='42501'; end if;
 select cu.*,g.anio into c from public.cursos cu join public.gestiones g on g.id=cu.gestion_id where cu.id=p_curso;
 if not found then raise exception 'Curso no disponible' using errcode='42501'; end if;
 if p_tipo='calificaciones' then
  select * into t from public.trimestres where id=p_trimestre and gestion_id=c.gestion_id;
  if not found then raise exception 'Selecciona un trimestre de la gestión del curso' using errcode='23514'; end if;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into filas from (
   select concat_ws(' ',nullif(p.apellido_paterno,''),nullif(p.apellido_materno,''),p.nombres) nombre,e.rude,
    a.nombre materia,v.ser,v.saber,v.hacer,v.autoevaluacion,v.puntos_extra,v.nota_final,v.situacion
   from public.v_calificaciones v join public.matriculas m on m.id=v.matricula_id
   join public.estudiantes e on e.id=m.estudiante_id join public.personas p on p.id=e.persona_id
   join public.asignaciones_docente ad on ad.id=v.asignacion_docente_id join public.asignaturas a on a.id=ad.asignatura_id
   where v.curso_id=p_curso and v.trimestre_id=p_trimestre and v.estado='PUBLICADO'
   order by p.apellido_paterno,p.apellido_materno,p.nombres,e.id,a.nombre,v.id limit 5001
  ) x;
 elsif p_tipo='asistencia' then
  if p_desde is null or p_hasta is null or p_hasta<p_desde or p_hasta-p_desde>366 or extract(year from p_desde)<>c.anio or extract(year from p_hasta)<>c.anio then raise exception 'Selecciona un rango válido dentro del año de la gestión (máximo 367 días)' using errcode='23514'; end if;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into filas from (
   select concat_ws(' ',nullif(p.apellido_paterno,''),nullif(p.apellido_materno,''),p.nombres) nombre,e.rude,
    count(*) filter(where a.estado='A') presentes,count(*) filter(where a.estado='F') faltas,
    count(*) filter(where a.estado='R') retrasos,count(*) filter(where a.estado='L') licencias,
    count(*) registrados,round(100.0*count(*) filter(where a.estado in ('A','R'))/nullif(count(*),0),2) porcentaje
   from public.asistencias a join public.jornadas_asistencia j on j.id=a.jornada_id
   join public.matriculas m on m.id=a.matricula_id join public.estudiantes e on e.id=m.estudiante_id
   join public.personas p on p.id=e.persona_id
   where a.curso_id=p_curso and j.estado='PUBLICADO' and j.fecha between p_desde and p_hasta
   group by m.id,e.id,e.rude,p.apellido_paterno,p.apellido_materno,p.nombres
   order by p.apellido_paterno,p.apellido_materno,p.nombres,e.id,m.id limit 5001
  ) x;
 else raise exception 'Tipo de informe inválido' using errcode='23514'; end if;
 if jsonb_array_length(filas)>5000 then raise exception 'El informe supera 5000 filas. No se exportó un resultado parcial.' using errcode='23514'; end if;
 return jsonb_build_object('tipo',p_tipo,'curso',concat(c.grado_id,'° ',c.paralelo),'gestion',c.anio,
 'periodo',case when p_tipo='calificaciones' then concat('Trimestre ',t.numero) else concat(p_desde,' al ',p_hasta) end,
 'generado',clock_timestamp(),'filas',filas);
end $$;
revoke all on function public.consultar_informe(text,uuid,uuid,date,date) from public,anon;
grant execute on function public.consultar_informe(text,uuid,uuid,date,date) to authenticated,service_role;
