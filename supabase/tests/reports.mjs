/** Fase 9: informes publicados, cálculos y privacidad bajo RLS. */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
let passed = 0;
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0];
const check = async (name, fn) => {
  await fn();
  console.log(`OK informes ${++passed}: ${name}`);
};
async function role(n, fn, pgRole = "authenticated") {
  await db.exec(`set role ${pgRole}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    n ? uid(n) : "",
  ]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub','',false)");
  }
}
async function rejects(fn, pattern) {
  await db.exec("begin");
  let error;
  try {
    await fn();
  } catch (e) {
    error = e;
  } finally {
    await db.exec("rollback");
  }
  assert.ok(error, "Debía rechazarse");
  if (pattern) assert.match(error.message, pattern);
}
const row = async (table, id) =>
  (
    await scalar(`select to_jsonb(x) r from public.${table} x where id=$1`, [
      id,
    ])
  ).r;

const course = uid(301),
  otherCourse = uid(302);
let g, term, assignment;
const read = async (m = uid(401), a = assignment) =>
  (
    await scalar(
      "select public.consultar_registro_calificaciones($1,$2,$3) r",
      [a, term, m],
    )
  ).r;
const criterion = async (d, name = d, order = 1, k = null, remove = false) =>
  (
    await scalar(
      "select public.gestionar_criterio_calificacion($1,$2,$3,$4,$5,$6,$7,$8) id",
      [
        assignment,
        term,
        k?.id || null,
        k?.updated_at || null,
        d,
        name,
        order,
        remove,
      ],
    )
  ).id;
const save = async (
  s,
  {
    notes = s.criterios.map((k) => ({
      criterio_id: k.id,
      puntaje: s.notas.find((n) => n.criterio_id === k.id)?.puntaje ?? null,
    })),
    auto = s.calificacion?.autoevaluacion ?? null,
    extra = s.calificacion?.puntos_extra ?? 0,
    motivo = s.calificacion?.motivo_extra || "",
    action = "guardar",
  } = {},
) =>
  (
    await scalar(
      "select public.guardar_calificacion_estudiante($1,$2,$3,$4,$5,$6,$7,$8,$9) id",
      [
        s.asignacion.id,
        term,
        s.matricula.id,
        s.version,
        notes,
        auto,
        extra,
        motivo,
        action,
      ],
    )
  ).id;
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  const dir = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(new URL(f, dir), "utf8"));
  for (let n = 1; n <= 9; n++) {
    await db.query("insert into auth.users(id) values($1)", [uid(n)]);
    await db.query(
      "insert into public.personas(id,nombres,apellido_paterno) values($1,$2,'Prueba')",
      [uid(100 + n), `Persona ${n}`],
    );
  }
  const roles = [
    "DIRECTOR",
    "SECRETARIA",
    "DOCENTE",
    "DOCENTE",
    "PADRE",
    "ESTUDIANTE",
    "DOCENTE",
  ];

  await db.query(
    "insert into public.docentes(id,persona_id) values($1,$2),($3,$4),($5,$6)",
    [uid(203), uid(103), uid(204), uid(104), uid(207), uid(107)],
  );
  await db.query("insert into public.tutores(id,persona_id) values($1,$2)", [
    uid(205),
    uid(105),
  ]);
  await db.query(
    "insert into public.estudiantes(id,persona_id) values($1,$2),($3,$4),($5,$6)",
    [uid(206), uid(106), uid(209), uid(109), uid(208), uid(108)],
  );
  for (let n = 1; n <= 7; n++)
    await db.query(
      "insert into public.perfiles(id,persona_id,rol,activo) values($1,$2,$3,$4)",
      [uid(n), uid(100 + n), roles[n - 1], n !== 7],
    );
  await db.query(
    "insert into public.estudiante_tutor(estudiante_id,tutor_id,parentesco) values($1,$2,'Tutor ficticio')",
    [uid(206), uid(205)],
  );
  g = (await scalar("select id from public.gestiones where anio=2026")).id;
  term = (
    await scalar(
      "select id from public.trimestres where gestion_id=$1 and numero=1",
      [g],
    )
  ).id;
  await db.query(
    "update public.trimestres set fecha_inicio='2026-01-01',fecha_fin='2026-04-30',estado='ABIERTO' where id=$1",
    [term],
  );
  await db.query(
    "insert into public.cursos(id,gestion_id,grado_id,paralelo) values($1,$3,1,'A'),($2,$3,1,'B')",
    [course, otherCourse, g],
  );
  const subject = (
    await scalar("select id from public.asignaturas order by nombre limit 1")
  ).id;
  await db.query(
    "insert into public.asignaciones_docente(docente_id,curso_id,gestion_id,asignatura_id) values($1,$2,$3,$4),($5,$6,$3,$4)",
    [uid(203), course, g, subject, uid(204), otherCourse],
  );
  await db.query(
    "insert into public.matriculas(id,estudiante_id,curso_id,gestion_id,fecha_ingreso,fecha_salida,estado) values($1,$2,$3,$4,'2026-01-01',null,'ACTIVA'),($5,$6,$3,$4,'2026-03-01','2026-03-31','RETIRADA'),($7,$8,$9,$4,'2026-01-01',null,'ACTIVA')",
    [
      uid(401),
      uid(206),
      course,
      g,
      uid(402),
      uid(209),
      uid(403),
      uid(208),
      otherCourse,
    ],
  );

  assignment = (
    await scalar(
      "select id from public.asignaciones_docente where curso_id=$1",
      [course],
    )
  ).id;

  const report = async (
    tipo = "calificaciones",
    c = course,
    t = term,
    d = null,
    h = null,
  ) =>
    (
      await scalar("select public.consultar_informe($1,$2,$3,$4,$5) r", [
        tipo,
        c,
        t,
        d,
        h,
      ])
    ).r;
  await check("migración reaplicable e invoker sin anon", async () => {
    await db.exec(
      readFileSync(
        new URL("../migrations/202610130001_informes.sql", import.meta.url),
        "utf8",
      ),
    );
    const f = await scalar(
      "select prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') anon from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname='consultar_informe'",
    );
    assert.equal(f.prosecdef, false);
    assert.equal(f.anon, false);
  });
  await role(3, async () => {
    for (const d of ["SER", "SABER", "HACER"]) await criterion(d);
    for (const m of [uid(401), uid(402)]) {
      const s = await read(m);
      await save(s, {
        notes: s.criterios.map((k) => ({
          criterio_id: k.id,
          puntaje: k.puntaje_maximo,
        })),
        auto: 5,
        extra: 10,
        motivo: "Ejemplo",
      });
    }
  });
  await check("borradores excluidos incluso para dirección", () =>
    role(1, async () => assert.equal((await report()).filas.length, 0)),
  );
  await role(3, async () => {
    await save(await read(), { action: "publicar" });
    await save(await read(uid(402)), { action: "publicar" });
  });
  await check("notas publicadas conservan cálculo y tope 100", () =>
    role(1, async () => {
      const r = await report();
      assert.equal(r.filas.length, 2);
      assert.ok(r.filas.every((x) => x.nota_final === 100));
      assert.equal(r.curso, "1° A");
    }),
  );
  await check("padre y estudiante solo consultan su ficha", async () => {
    for (const n of [5, 6])
      await role(n, async () => {
        const r = await report();
        assert.equal(r.filas.length, 1);
        assert.ok(r.filas[0].nombre.includes("Persona 6"));
      });
  });
  await check("docente ajeno e inactivo no acceden", async () => {
    for (const n of [4, 7]) await role(n, () => rejects(() => report()));
  });
  await check("rechaza trimestre ajeno, tipo y rango inválidos", () =>
    role(1, async () => {
      await rejects(() => report("calificaciones", course, uid(999)));
      await rejects(() => report("otro"));
      await rejects(() =>
        report("asistencia", course, null, "2025-01-01", "2026-01-01"),
      );
      await rejects(() =>
        report("asistencia", course, null, "2026-03-02", "2026-03-01"),
      );
    }),
  );
  for (let i = 0; i < 5; i++) {
    const j = uid(700 + i);
    await db.query(
      "insert into public.jornadas_asistencia(id,curso_id,gestion_id,fecha) values($1,$2,$3,$4)",
      [j, course, g, "2026-03-0" + (i + 1)],
    );
    for (const m of [uid(401), uid(402)])
      await db.query(
        "insert into public.asistencias(jornada_id,matricula_id,curso_id,gestion_id,estado) values($1,$2,$3,$4,$5)",
        [j, m, course, g, ["A", "R", "F", "L", "F"][i]],
      );
    if (i < 4)
      await db.query(
        "update public.jornadas_asistencia set estado='PUBLICADO' where id=$1",
        [j],
      );
  }
  await check(
    "asistencia excluye borradores y calcula porcentaje sobre marcas",
    () =>
      role(1, async () => {
        const r = await report(
          "asistencia",
          course,
          null,
          "2026-03-01",
          "2026-03-31",
        );
        assert.equal(r.filas.length, 2);
        for (const x of r.filas) {
          assert.equal(x.registrados, 4);
          assert.equal(x.porcentaje, 50);
          assert.equal(x.faltas, 1);
          assert.equal(x.licencias, 1);
        }
      }),
  );
  await check("asistencia respeta familia y extremos inclusivos", () =>
    role(5, async () => {
      const r = await report(
        "asistencia",
        course,
        null,
        "2026-03-01",
        "2026-03-02",
      );
      assert.equal(r.filas.length, 1);
      assert.equal(r.filas[0].registrados, 2);
      assert.equal(r.filas[0].porcentaje, 100);
    }),
  );
  await check("sin registros devuelve vacío, sin fabricar ceros", () =>
    role(2, async () =>
      assert.equal(
        (await report("asistencia", course, null, "2026-04-01", "2026-04-02"))
          .filas.length,
        0,
      ),
    ),
  );
  console.log(passed + " pruebas de informes correctas");
} finally {
  await db.close();
}
