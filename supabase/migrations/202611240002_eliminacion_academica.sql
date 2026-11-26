begin;
create function public.eliminar_registro_academico(p_tipo text,p_id uuid) returns void language plpgsql security invoker set search_path='' as $$
declare c public.calificaciones_trimestrales; a public.asistencias; j public.jornadas_asistencia;
begin
 if p_tipo='calificaciones' then
 select * into c from public.calificaciones_trimestrales where id=p_id for update;
 if not found or not private.editar_asignacion(c.asignacion_docente_id) then raise exception 'Sin permiso' using errcode='42501'; end if;
 if c.estado<>'BORRADOR' then raise exception 'Retira la publicación'; end if;
 delete from public.notas_criterios where matricula_id=c.matricula_id and criterio_id in (select id from public.criterios_evaluacion where asignacion_docente_id=c.asignacion_docente_id and trimestre_id=c.trimestre_id);
 delete from public.calificaciones_trimestrales where id=c.id;
 elsif p_tipo='asistencia' then
 select * into a from public.asistencias where id=p_id;
 if not found or not private.editar_jornada(a.jornada_id) then raise exception 'Sin permiso' using errcode='42501'; end if;
 select * into j from public.jornadas_asistencia where id=a.jornada_id for update;
 if j.estado<>'BORRADOR' then raise exception 'Retira la publicación'; end if;
 delete from public.asistencias where id=p_id;
 else raise exception 'Tipo inválido'; end if;
end $$;
revoke all on function public.eliminar_registro_academico(text,uuid) from public,anon;
grant execute on function public.eliminar_registro_academico(text,uuid) to authenticated;
commit;
