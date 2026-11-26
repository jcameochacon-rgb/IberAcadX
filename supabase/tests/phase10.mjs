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

 await check('comunicados fuera del esquema público',async()=>{assert.equal((await scalar("select to_regclass('public.comunicados') x")).x,null);assert.ok((await scalar("select to_regclass('archivo.comunicados') x")).x);});
 await check('secretaría edita calificaciones sin convertirse en director',()=>role(U.secretaria,async()=>{assert.equal((await scalar('select private.director() x')).x,false);assert.equal((await scalar(`select private.editar_asignacion('${A[0]}') x`)).x,true);await q(`update public.calificaciones_trimestrales set autoevaluacion=4 where id='${N[0]}'`);}));
 await check('secretaría consulta planilla de asistencia',()=>role(U.secretaria,()=>q(`select public.consultar_asistencia_curso('${C.primero}','2026-03-02')`)));
 await check('docente ajeno no edita asignación',()=>role(U.otroDocente,async()=>{assert.equal((await scalar(`select private.editar_asignacion('${A[0]}') x`)).x,false);await reject(`select public.eliminar_registro_academico('calificaciones','${N[0]}')`,/Sin permiso/);}));
 await check('padre no administra cuentas ni elimina notas',()=>role(U.padre,async()=>{await reject(`select public.administrar_cuenta('${U.docente}',null,'DOCENTE',false,false)`,/Sin permiso/);await reject(`select public.eliminar_registro_academico('calificaciones','${N[0]}')`,/Sin permiso/);}));
 await check('secretaría no puede alterar administrador ni ascender usuarios',()=>role(U.secretaria,async()=>{await reject(`select public.administrar_cuenta('${U.director}',null,'DOCENTE',true,false)`,/protegida/);await reject(`select public.administrar_cuenta('${U.docente}',null,'DIRECTOR',true,false)`,/protegida/);}));
 await check('cuenta propia protegida',()=>role(U.director,()=>reject(`select public.administrar_cuenta('${U.director}',null,'DIRECTOR',false,true)`,/propio acceso/)));
 await check('secretaría puede desactivar docente y restaurarlo',()=>role(U.secretaria,async()=>{await q(`select public.administrar_cuenta('${U.docente}',null,'DOCENTE',false,false)`);assert.equal((await scalar(`select activo from public.perfiles where id='${U.docente}'`)).activo,false);await q(`select public.administrar_cuenta('${U.docente}',null,'DOCENTE',true,false)`);}));
 await check('reportes guardados aislados por propietario',async()=>{await role(U.secretaria,()=>q(`insert into public.reportes_guardados(propietario_id,nombre,parametros) values('${U.secretaria}','Prueba','tipo=asistencia')`));await role(U.docente,async()=>assert.equal(await count('reportes_guardados'),0));await role(U.secretaria,async()=>assert.equal(await count('reportes_guardados'),1));});
 await check('secretaría elimina borrador de calificación',()=>role(U.secretaria,async()=>{await q(`select public.eliminar_registro_academico('calificaciones','${N[0]}')`);assert.equal(Number((await scalar(`select count(*) n from public.calificaciones_trimestrales where id='${N[0]}'`)).n),0);}));

 await check('estudiante ve únicamente su propia ficha',()=>role(U.estudiante,async()=>{assert.equal(await count('estudiantes'),1);assert.equal((await scalar('select id from public.estudiantes')).id,E[0]);}));
 await check('familia ve únicamente sus estudiantes vinculados',()=>role(U.padre,async()=>{const rows=(await db.query('select id from public.estudiantes order by id')).rows;assert.deepEqual(rows.map(r=>r.id),[E[0],E[2]]);}));
 await check('docente ve alumnos de sus cursos',()=>role(U.docente,async()=>{assert.equal(await count('estudiantes'),2);}));
 await check('estudiante no puede matricular ni asignar docentes',()=>role(U.estudiante,async()=>{
   await reject(`select public.guardar_matricula_academica(null,'${E[0]}','${C.primero}','2026-02-01',null,'ACTIVA',null)`,/Solo Dirección/);
   await reject(`select public.guardar_asignacion_academica(null,'${D[0]}','${C.primero}','${materias[0].id}',true,null)`,/Solo Dirección/);
 }));
 await check('secretaría matricula, impide duplicados y controla versiones',async()=>{
   await q(`insert into public.personas(id,nombres) values('${uid(1020)}','Estudiante prueba matrícula');insert into public.estudiantes(id,persona_id) values('${uid(220)}','${uid(1020)}');`);
   await role(U.secretaria,async()=>{
     const matricula=(await scalar(`select public.guardar_matricula_academica(null,'${uid(220)}','${C.primero}','2026-02-02',null,'ACTIVA',null) id`)).id;
     await reject(`select public.guardar_matricula_academica(null,'${uid(220)}','${C.segundo}','2026-02-02',null,'ACTIVA',null)`);
     await reject(`select public.guardar_matricula_academica('${matricula}','${uid(220)}','${C.primero}','2026-02-02',null,'ACTIVA','2000-01-01')`,/Otra persona modificó/);
     const version=(await scalar(`select updated_at::text v from public.matriculas where id='${matricula}'`)).v;
     await q(`select public.guardar_matricula_academica('${matricula}','${uid(220)}','${C.primero}','2026-02-02','2026-03-01','RETIRADA','${version}')`);
     assert.equal((await scalar(`select estado from public.matriculas where id='${matricula}'`)).estado,'RETIRADA');
   });
 });
 await check('secretaría asigna un docente sin duplicar materia y curso',()=>role(U.secretaria,async()=>{
   const assigned=(await scalar(`select public.guardar_asignacion_academica(null,'${D[0]}','${C.segundo}','${materias[0].id}',true,null) id`)).id;
   assert.ok(assigned);
   await reject(`select public.guardar_asignacion_academica(null,'${D[1]}','${C.segundo}','${materias[0].id}',true,null)`);
 }));
 console.log(`${passed} pruebas de actualización correctas`);
}finally{await db.close();}
