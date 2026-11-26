// HISTÓRICO: suite de fase 0.9, anterior a la retirada de comunicados. Usar npm run test:db para el esquema vigente.
/** Pruebas en PostgreSQL embebido PGlite. No conectan a cuentas/proyectos remotos. */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync,readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
let passed=0;
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const U={director:uid(1),secretaria:uid(2),docente:uid(3),otroDocente:uid(4),padre:uid(5),otroPadre:uid(6),estudiante:uid(7),otroEstudiante:uid(8),inactivo:uid(9),sinPerfil:uid(10)};
const C={primero:uid(101),segundo:uid(102)};
const E=[uid(201),uid(202),uid(203)];
const M=[uid(301),uid(302),uid(303)];
const D=[uid(401),uid(402)], T=[uid(501),uid(502)];
const A=[uid(601),uid(602),uid(603)], K=[uid(701),uid(702),uid(703),uid(704),uid(705)];
const N=[uid(801),uid(802)];
const scalar=async sql=>(await db.query(sql)).rows[0];
const q=(sql)=>db.exec(sql);
async function check(name,fn){await fn(); passed++; console.log(`OK ${passed}: ${name}`);}
async function role(id,fn,pgRole='authenticated'){
 await q(`set role ${pgRole}`);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
 try{return await fn();}finally{await q('reset role'); await q("select set_config('request.jwt.claim.sub','',false)");}
}
async function reject(sql, pattern){
 await q('begin'); let e;
 try{await q(sql);}catch(err){e=err;}finally{await q('rollback');}
 assert.ok(e,`Debía rechazarse: ${sql}`);
 if(pattern) assert.match(e.message,pattern);
}
async function count(table){return Number((await scalar(`select count(*) n from public.${table}`)).n);}
try{
 await q(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key,email text unique);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
 const migrations=new URL('../migrations/',import.meta.url);
 for(const file of readdirSync(migrations).filter(f=>f.endsWith('.sql')).sort()) await q(readFileSync(new URL(file,migrations),'utf8'));
 await check('migración completa y 28 tablas con RLS',async()=>{
  assert.equal(Number((await scalar("select count(*) n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity")).n),28);
  assert.equal(await count('grados'),6);assert.equal(await count('asignaturas'),9);assert.equal(await count('trimestres'),3);assert.equal(await count('periodos'),6);
 });
 await check('alta inicial de Dirección vincula una cuenta existente sin contraseña',async()=>{
  const bootstrap=readFileSync(new URL('../02_primer_director.sql',import.meta.url),'utf8');
  await reject(bootstrap,/Editar correo/);
  await q(`insert into auth.users(id,email) values('${uid(11)}','director-ficticio@example.invalid')`);
  const filled=bootstrap.replaceAll('CAMBIA_POR_TU_CORREO','director-ficticio@example.invalid')
    .replace("v_nombres text := 'CAMBIA_POR_NOMBRES'","v_nombres text := 'Director ficticio'")
    .replace("v_apellidos text := 'CAMBIA_POR_APELLIDOS'","v_apellidos text := 'Prueba'");
  // Mantener los valores sentinela en las comprobaciones; solo sustituir asignaciones.
  const final=filled.replace("if v_email = 'director-ficticio@example.invalid'","if v_email = 'CAMBIA_POR_TU_CORREO'");
  await q(final);
  const p=await scalar(`select persona_id,rol from public.perfiles where id='${uid(11)}'`);
  assert.equal(p.rol,'DIRECTOR');
  await reject(final,/ya tiene perfil/);
  await q(`delete from public.perfiles where id='${uid(11)}'; delete from public.personas where id='${p.persona_id}'; delete from auth.users where id='${uid(11)}'`);
 });
 const g=(await scalar('select id from public.gestiones where anio=2026')).id;
 const tr=(await scalar('select id from public.trimestres where numero=1')).id;
 const materias=(await db.query("select id from public.asignaturas where nombre in ('Lenguaje','Matemática') order by nombre")).rows;
 await q(`update public.trimestres set fecha_inicio='2026-02-01',fecha_fin='2026-04-30',estado='ABIERTO' where id='${tr}';`);
 for(let i=1;i<=10;i++){
  await q(`insert into auth.users(id) values('${uid(i)}'); insert into public.personas(id,nombres,apellido_paterno) values('${uid(1000+i)}','Usuario ficticio ${i}','Prueba');`);
 }
 await q(`insert into public.docentes(id,persona_id) values('${D[0]}','${uid(1003)}'),('${D[1]}','${uid(1004)}');
 insert into public.tutores(id,persona_id) values('${T[0]}','${uid(1005)}'),('${T[1]}','${uid(1006)}');
 insert into public.estudiantes(id,persona_id,rude,fecha_nacimiento) values('${E[0]}','${uid(1007)}','FICTICIO1','2019-01-01'),('${E[1]}','${uid(1008)}','FICTICIO2','2019-02-01');
 insert into public.personas(id,nombres) values('${uid(1011)}','Hermano ficticio');
 insert into public.estudiantes(id,persona_id) values('${E[2]}','${uid(1011)}');`);
 const roles=['DIRECTOR','SECRETARIA','DOCENTE','DOCENTE','PADRE','PADRE','ESTUDIANTE','ESTUDIANTE','PADRE'];
 await q(`insert into public.tutores(id,persona_id) values('${uid(503)}','${uid(1009)}');`);
 for(let i=1;i<=9;i++) await q(`insert into public.perfiles(id,persona_id,rol,activo) values('${uid(i)}','${uid(1000+i)}','${roles[i-1]}',${i!==9});`);
 await q(`insert into public.cursos(id,gestion_id,grado_id,paralelo) values('${C.primero}','${g}',1,'A'),('${C.segundo}','${g}',2,'A');
 insert into public.matriculas(id,estudiante_id,curso_id,gestion_id,fecha_ingreso) values
 ('${M[0]}','${E[0]}','${C.primero}','${g}','2026-02-01'),('${M[1]}','${E[1]}','${C.primero}','${g}','2026-02-01'),('${M[2]}','${E[2]}','${C.segundo}','${g}','2026-02-01');
 insert into public.estudiante_tutor(estudiante_id,tutor_id,parentesco) values('${E[0]}','${T[0]}','PADRE'),('${E[2]}','${T[0]}','PADRE'),('${E[1]}','${T[1]}','MADRE');
 insert into public.asignaciones_docente(id,docente_id,curso_id,gestion_id,asignatura_id) values
 ('${A[0]}','${D[0]}','${C.primero}','${g}','${materias[0].id}'),('${A[1]}','${D[1]}','${C.primero}','${g}','${materias[1].id}'),('${A[2]}','${D[1]}','${C.segundo}','${g}','${materias[1].id}');`);
 const dims=['SER','SER','SER','SABER','HACER'];
 for(let i=0;i<5;i++) await role(U.docente,()=>q(`insert into public.criterios_evaluacion(id,asignacion_docente_id,curso_id,gestion_id,trimestre_id,dimension,nombre,puntaje_maximo,orden) values('${K[i]}','${A[0]}','${C.primero}','${g}','${tr}','${dims[i]}','Actividad ${i+1}',${i<3?10:i===3?45:40},${i<3?i+1:1});`));
 await role(U.docente,()=>q(`insert into public.calificaciones_trimestrales(id,asignacion_docente_id,matricula_id,curso_id,gestion_id,trimestre_id,autoevaluacion) values('${N[0]}','${A[0]}','${M[0]}','${C.primero}','${g}','${tr}',3),('${N[1]}','${A[0]}','${M[1]}','${C.primero}','${g}','${tr}',5);`));
 await check('una nota incompleta queda PENDIENTE, sin cero artificial',async()=>{
  const r=await scalar(`select nota_final,situacion from public.v_calificaciones where id='${N[0]}'`);assert.equal(r.nota_final,null);assert.equal(r.situacion,'PENDIENTE');
 });
 await check('no se publica una nota incompleta',()=>role(U.docente,()=>reject(`update public.calificaciones_trimestrales set estado='PUBLICADO' where id='${N[0]}'`,/incompleta/)));
 const notas=[[7,6,4,45,25],[10,10,10,45,40]];
 for(let e=0;e<2;e++)for(let i=0;i<5;i++)await role(U.docente,()=>q(`insert into public.notas_criterios(criterio_id,matricula_id,curso_id,gestion_id,puntaje) values('${K[i]}','${M[e]}','${C.primero}','${g}',${notas[e][i]});`));
 await check('promedios redondeados por dimensión: 7,6,4 -> SER 6 y final 79',async()=>{
  const r=await scalar(`select ser,nota_final,situacion from public.v_calificaciones where id='${N[0]}'`);assert.equal(Number(r.ser),6);assert.equal(Number(r.nota_final),79);assert.equal(r.situacion,'APROBADO');
 });
 await check('100 de base + 8 extras se limita a 100',async()=>{
  await role(U.docente,()=>q(`update public.calificaciones_trimestrales set puntos_extra=8,motivo_extra='Refuerzo documentado' where id='${N[1]}'`));
  assert.equal(Number((await scalar(`select nota_final from public.v_calificaciones where id='${N[1]}'`)).nota_final),100);
 });
 await check('extras requieren motivo',()=>role(U.docente,()=>reject(`update public.calificaciones_trimestrales set puntos_extra=3,motivo_extra=null where id='${N[0]}'`,/check constraint/)));
 await check('puntajes SER no pueden superar 10',()=>role(U.docente,()=>reject(`update public.notas_criterios set puntaje=11 where criterio_id='${K[0]}' and matricula_id='${M[0]}'`,/máximo/)));
 await check('FK compuesta impide cargar notas de un curso ajeno',()=>role(U.docente,()=>reject(`insert into public.notas_criterios(criterio_id,matricula_id,curso_id,gestion_id,puntaje) values('${K[0]}','${M[2]}','${C.primero}','${g}',5)`,/foreign key/)));
 await check('no se reutiliza la misma actividad/alumno',()=>role(U.docente,()=>reject(`insert into public.notas_criterios(criterio_id,matricula_id,curso_id,gestion_id,puntaje) values('${K[0]}','${M[0]}','${C.primero}','${g}',5)`,/unique constraint/)));
 await check('el padre ve dos hijos vinculados y ningún estudiante ajeno',()=>role(U.padre,async()=>assert.equal(await count('estudiantes'),2)));
 await check('otro padre ve únicamente su hijo',()=>role(U.otroPadre,async()=>assert.equal(await count('estudiantes'),1)));
 await check('el estudiante ve solo sus datos',()=>role(U.estudiante,async()=>assert.equal(await count('estudiantes'),1)));
 await check('el docente ve únicamente alumnos de sus cursos',()=>role(U.docente,async()=>assert.equal(await count('estudiantes'),2)));
 await check('familias no ven notas en BORRADOR',()=>role(U.padre,async()=>{assert.equal(await count('calificaciones_trimestrales'),0);assert.equal(await count('notas_criterios'),0);assert.equal(await count('v_calificaciones'),0);}));
 await check('docente de otra materia del mismo curso no puede leer las notas',()=>role(U.otroDocente,async()=>assert.equal(await count('calificaciones_trimestrales'),0)));
 await check('docente de otra materia no puede insertar criterios ajenos',()=>role(U.otroDocente,()=>reject(`insert into public.criterios_evaluacion(asignacion_docente_id,curso_id,gestion_id,trimestre_id,dimension,nombre,puntaje_maximo,orden) values('${A[0]}','${C.primero}','${g}','${tr}','SER','Ajena',10,4)`,/row-level security/)));
 await check('Secretaría consulta notas sin poder modificarlas',()=>role(U.secretaria,async()=>{
  assert.equal(await count('calificaciones_trimestrales'),2);
  const r=await db.query(`update public.calificaciones_trimestrales set autoevaluacion=0 returning id`);assert.equal(r.rows.length,0);
 }));
 await check('padre no puede elevar su rol a DIRECTOR',()=>role(U.padre,async()=>{
  const r=await db.query(`update public.perfiles set rol='DIRECTOR' where id='${U.padre}' returning id`);assert.equal(r.rows.length,0);
  await reject(`insert into public.perfiles(id,persona_id,rol) values('${U.sinPerfil}','${uid(1010)}','DIRECTOR')`,/row-level security/);
 }));
 await check('anónimo no tiene acceso a ninguna tabla ni vistas',()=>role(null,async()=>{
  const tables=(await db.query("select tablename from pg_tables where schemaname='public'")).rows;
  for(const {tablename}of tables)await reject(`select * from public.${tablename}`,/permission denied/);
  await reject('select * from public.v_calificaciones',/permission denied/);
 },'anon'));
 await check('sin perfil e inactivo no tienen datos ni catálogos',async()=>{
  for(const id of [U.sinPerfil,U.inactivo])await role(id,async()=>{
   for(const t of ['personas','perfiles','estudiantes','tutores','cursos','asignaturas','trimestres','calificaciones_trimestrales','comunicados','dispositivos'])assert.equal(await count(t),0,`${id} ${t}`);
  });
 });
 await role(U.docente,()=>q("update public.calificaciones_trimestrales set estado='PUBLICADO'"));
 await check('padre ve su nota publicada y no la del compañero; vista respeta RLS',()=>role(U.padre,async()=>{
  assert.equal(await count('calificaciones_trimestrales'),1);assert.equal(await count('v_calificaciones'),1);assert.equal(await count('notas_criterios'),5);
  assert.equal((await scalar('select matricula_id from public.v_calificaciones')).matricula_id,M[0]);
 }));
 await check('nota publicada bloquea cambio directo de notas/criterios/extras',()=>role(U.docente,async()=>{
  await reject(`update public.notas_criterios set puntaje=0 where matricula_id='${M[0]}'`,/Despublicar/);
  await reject(`update public.criterios_evaluacion set nombre='Cambio' where id='${K[0]}'`,/Despublicar/);
  await reject(`update public.calificaciones_trimestrales set puntos_extra=2,motivo_extra='Cambio' where id='${N[0]}'`,/Despublicar/);
 }));
 await role(U.docente,()=>q(`update public.calificaciones_trimestrales set estado='BORRADOR' where id='${N[0]}'`));
 await check('despublicar permite corregir y volver a publicar',async()=>{
  await role(U.docente,()=>q(`update public.notas_criterios set puntaje=0 where matricula_id='${M[0]}'; update public.calificaciones_trimestrales set autoevaluacion=5,puntos_extra=45,motivo_extra='Recuperación' where id='${N[0]}'`));
  assert.equal(Number((await scalar(`select nota_final from public.v_calificaciones where id='${N[0]}'`)).nota_final),50);
  assert.equal((await scalar(`select situacion from public.v_calificaciones where id='${N[0]}'`)).situacion,'REPROBADO');
  await role(U.docente,()=>q(`update public.calificaciones_trimestrales set puntos_extra=46,estado='PUBLICADO' where id='${N[0]}'`));
  assert.equal((await scalar(`select situacion from public.v_calificaciones where id='${N[0]}'`)).situacion,'APROBADO');
 });
 const J=uid(901), S=uid(902);
 await role(U.docente,()=>q(`insert into public.jornadas_asistencia(id,curso_id,gestion_id,fecha) values('${J}','${C.primero}','${g}','2026-03-02')`));
 await check('no publicar asistencia con alumnos sin marcar',()=>role(U.docente,()=>reject(`update public.jornadas_asistencia set estado='PUBLICADO' where id='${J}'`,/Completar/)));
 await role(U.docente,()=>q(`insert into public.asistencias(id,jornada_id,matricula_id,curso_id,gestion_id,estado) values('${S}','${J}','${M[0]}','${C.primero}','${g}','R'),('${uid(903)}','${J}','${M[1]}','${C.primero}','${g}','F'); update public.jornadas_asistencia set estado='PUBLICADO' where id='${J}';`));
 await check('familia ve solo asistencia de su hijo; R cuenta como presencia',()=>role(U.padre,async()=>{
  assert.equal(await count('asistencias'),1);const r=await scalar('select * from public.v_resumen_asistencia');assert.equal(Number(r.retrasos),1);assert.equal(Number(r.porcentaje_presencia),100);
 }));
 await check('jornada publicada bloquea cambios y borrado',()=>role(U.docente,async()=>{
  await reject(`update public.asistencias set estado='A' where id='${S}'`,/Despublicar/);
  await reject(`delete from public.jornadas_asistencia where id='${J}'`,/Despublicar/);
 }));
 await check('matrícula superpuesta se rechaza incluso con estado distinto',()=>reject(`insert into public.matriculas(estudiante_id,curso_id,gestion_id,fecha_ingreso,fecha_salida,estado) values('${E[0]}','${C.segundo}','${g}','2026-02-15','2026-03-01','RETIRADA')`,/superpuestas/));
 await check('cambio de vigencia no puede invalidar asistencia existente',()=>reject(`update public.matriculas set fecha_salida='2026-02-28',estado='RETIRADA' where id='${M[0]}'`,/asistencias fuera/));
 await check('no se cambian fechas de un trimestre con registros',()=>role(U.director,()=>reject(`update public.trimestres set fecha_fin='2026-04-29' where id='${tr}'`,/Fechas de trimestre bloqueadas/)));
 await check('cambio de curso en una matrícula existente se rechaza',()=>reject(`update public.matriculas set curso_id='${C.segundo}' where id='${M[0]}'`,/clave/));
 const P=(await scalar('select id from public.periodos where numero=1')).id;
 await check('horarios no inventan horas de periodos sin configurar',()=>role(U.secretaria,()=>reject(`insert into public.horarios(curso_id,gestion_id,asignacion_docente_id,docente_id,dia_semana,periodo_id) values('${C.primero}','${g}','${A[0]}','${D[0]}',1,'${P}')`,/Configurar/)));
 await role(U.director,()=>q(`update public.periodos set hora_inicio='14:00',hora_fin='14:40' where id='${P}';`));
 await role(U.secretaria,()=>q(`insert into public.horarios(curso_id,gestion_id,asignacion_docente_id,docente_id,dia_semana,periodo_id) values('${C.primero}','${g}','${A[1]}','${D[1]}',1,'${P}')`));
 await check('docente no puede impartir dos cursos en la misma hora',()=>role(U.secretaria,()=>reject(`insert into public.horarios(curso_id,gestion_id,asignacion_docente_id,docente_id,dia_semana,periodo_id) values('${C.segundo}','${g}','${A[2]}','${D[1]}',1,'${P}')`,/unique constraint/)));
 await check('no se quitan horas a un periodo ya usado',()=>reject(`update public.periodos set hora_inicio=null,hora_fin=null where id='${P}'`,/quitar horas/));
 await check('periodos de una gestión no pueden superponerse',()=>reject("update public.periodos set hora_inicio='14:20',hora_fin='15:00' where numero=2",/superpuestos/));
 const B=uid(910);
 await role(U.docente,()=>q(`insert into public.comunicados(id,autor_id,titulo,contenido) values('${B}','${U.docente}','Reunión','Aviso ficticio')`));
 await check('docente no envía avisos institucionales ni a cursos ajenos',()=>role(U.docente,async()=>{
  await reject(`update public.comunicados set institucional=true where id='${B}'`,/row-level security/);
  await reject(`insert into public.destinatarios_comunicado(comunicado_id,curso_id) values('${B}','${C.segundo}')`,/row-level security/);
 }));
 await role(U.docente,()=>q(`insert into public.destinatarios_comunicado(comunicado_id,curso_id) values('${B}','${C.primero}'); update public.comunicados set estado='PUBLICADO' where id='${B}'`));
 await check('comunicado publicado llega a las familias del curso',()=>role(U.padre,async()=>{assert.equal(await count('comunicados'),1);await q(`insert into public.lecturas_comunicado(comunicado_id,perfil_id) values('${B}','${U.padre}')`);}));
 await check('destinatarios publicados y autor son inmutables',()=>role(U.docente,async()=>{
  await reject(`delete from public.destinatarios_comunicado where comunicado_id='${B}'`,/bloqueados/);
  await reject(`update public.comunicados set autor_id='${U.director}' where id='${B}'`,/clave/);
 }));
 await role(U.padre,()=>q(`insert into public.dispositivos(perfil_id,expo_push_token,plataforma) values('${U.padre}','ExpoPushToken[ficticio]','ANDROID')`));
 await check('tokens push privados por propietario',()=>role(U.otroPadre,async()=>assert.equal(await count('dispositivos'),0)));
 await check('no se puede registrar token push en cuenta ajena',()=>role(U.padre,()=>reject(`insert into public.dispositivos(perfil_id,expo_push_token,plataforma) values('${U.otroPadre}','ExpoPushToken[ajeno]','ANDROID')`,/row-level security/)));
 await role(U.docente,()=>q(`insert into public.observaciones_estudiantes(asignacion_docente_id,matricula_id,curso_id,gestion_id,trimestre_id,tipo,descripcion,fecha) values('${A[0]}','${M[0]}','${C.primero}','${g}','${tr}','LOGRO','Comentario interno','2026-03-02'); insert into public.avances_curriculares(asignacion_docente_id,curso_id,gestion_id,trimestre_id,tema,fecha) values('${A[0]}','${C.primero}','${g}','${tr}','Tema ficticio','2026-03-02');`));
 await check('observaciones internas no llegan a familias',()=>role(U.padre,async()=>assert.equal(await count('observaciones_estudiantes'),0)));
 await check('auditoría registra actor y no admite escrituras de clientes',()=>role(U.director,async()=>{
  assert.ok(await count('auditoria')>0);assert.ok(Number((await scalar(`select count(*) n from public.auditoria where actor_id='${U.docente}' and tabla='notas_criterios'`)).n)>0);
  await reject("insert into public.auditoria(tabla,operacion) values('falsa','INSERT')",/permission denied/);
 }));
 await check('funciones de resumen y trigger no son ejecutables por clientes',()=>role(U.padre,async()=>{
  assert.equal((await scalar("select has_function_privilege(current_user,'private.resumen_nota(uuid,uuid,uuid)','execute') ok")).ok,false);
 }));
 await role(U.director,()=>q(`update public.trimestres set estado='CERRADO' where id='${tr}'`));
 await check('cierre bloquea notas, avance y asistencia incluso para Dirección',async()=>{
  await role(U.director,()=>reject(`update public.calificaciones_trimestrales set estado='BORRADOR' where id='${N[0]}'`,/no abierto/));
  await role(U.docente,()=>reject(`update public.avances_curriculares set estado='COMPLETADO'`,/no abierto/));
  await role(U.director,()=>reject(`update public.jornadas_asistencia set estado='BORRADOR' where id='${J}'`,/cerrado/));
 });
 await check('anular vínculo familiar revoca notas publicadas',async()=>{
  await role(U.secretaria,()=>q(`update public.estudiante_tutor set autorizado_consulta=false where estudiante_id='${E[0]}'`));
  await role(U.padre,async()=>{assert.equal(await count('v_calificaciones'),0);assert.equal(await count('estudiantes'),1);});
 });
 await check('consultas de verificación se ejecutan completas',()=>q(readFileSync(new URL('../03_verificar_instalacion.sql',import.meta.url),'utf8')));
 console.log(`\nRESULTADO: ${passed} pruebas correctas. Sin datos reales ni llamadas remotas.`);
}catch(e){console.error(`FALLO tras ${passed} pruebas:`,e.message,e.where||'');process.exitCode=1;}
finally{await db.close();}
