/** Fase 6: calificaciones, actividades, permisos, cálculo y conflictos. */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
let passed = 0;
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0];
const check = async (name, fn) => {
  await fn();
  console.log(`OK calificaciones ${++passed}: ${name}`);
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
  await check(
    "migración reaplicable, RPC invoker, sin acceso anónimo",
    async () => {
      await db.exec(
        readFileSync(
          new URL(
            "../migrations/202610090001_registro_calificaciones.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      const funcs = (
        await db.query(
          "select p.proname,p.prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') anon from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('consultar_registro_calificaciones','gestionar_criterio_calificacion','guardar_calificacion_estudiante')",
        )
      ).rows;
      assert.equal(funcs.length, 3);
      assert.ok(funcs.every((f) => !f.prosecdef && !f.anon));
    },
  );
  await check(
    "docente configura actividades por dimensión y mantiene vigencias históricas",
    () =>
      role(3, async () => {
        for (const d of ["SER", "SABER", "HACER"]) await criterion(d);
        const s = await read();
        assert.equal(s.criterios.length, 3);
        assert.equal(s.alumnos.length, 2);
        assert.equal(s.calificacion, null);
        const k = s.criterios.find((k) => k.dimension === "SER");
        await criterion("SER", "Respeto", 1, k);
        const id = await criterion("SER", "Sin notas", 2);
        const fresh = (await read()).criterios.find((k) => k.id === id);
        await criterion("SER", "Sin notas", 2, fresh, true);
      }),
  );
  await check(
    "borrador parcial distingue cero y vacío; publicación incompleta revierte",
    () =>
      role(3, async () => {
        let s = await read();
        await save(s, {
          notes: s.criterios.map((k) => ({
            criterio_id: k.id,
            puntaje: k.dimension === "SER" ? 0 : null,
          })),
        });
        s = await read();
        assert.equal(s.notas.length, 1);
        assert.equal(s.notas[0].puntaje, 0);
        assert.equal(s.calificacion.nota_final, null);
        await rejects(
          () => save(s, { auto: 5, action: "publicar" }),
          /incompleta/,
        );
        assert.equal((await read()).calificacion.autoevaluacion, null);
      }),
  );
  await check("borradores y notas invisibles a familia", async () => {
    for (const n of [5, 6])
      await role(n, async () => {
        assert.equal(
          (await db.query("select * from public.v_calificaciones")).rows.length,
          0,
        );
        assert.equal(
          (await db.query("select * from public.notas_criterios")).rows.length,
          0,
        );
      });
  });
  await check(
    "rango por dimensión, decimales y extra sin motivo revierten",
    () =>
      role(3, async () => {
        const s = await read();
        const notes = s.criterios.map((k) => ({
          criterio_id: k.id,
          puntaje: k.dimension === "SER" ? 11 : 30,
        }));
        await rejects(() => save(s, { notes }), /puntaje/);
        await rejects(() => save(s, { auto: 5.001 }), /autoevaluación/);
        await rejects(() => save(s, { extra: 2 }), /motivo/);
        assert.equal((await read()).notas.length, 1);
      }),
  );
  await check("lista truncada, duplicada o de otra materia rechazada", () =>
    role(3, async () => {
      const s = await read(),
        n = s.criterios.map((k) => ({ criterio_id: k.id, puntaje: null }));
      await rejects(() => save(s, { notes: n.slice(1) }), /actividades cambió/);
      await rejects(
        () => save(s, { notes: [n[0], n[0], n[2]] }),
        /actividades cambió/,
      );
      await rejects(
        () =>
          save(s, {
            notes: [...n.slice(1), { criterio_id: uid(999), puntaje: 10 }],
          }),
        /actividades cambió/,
      );
    }),
  );
  await check(
    "promedia varias actividades, redondea por dimensión y publica nota 96",
    () =>
      role(3, async () => {
        await criterion("SER", "Convivencia", 2);
        const s = await read();
        await save(s, {
          notes: s.criterios.map((k) => ({
            criterio_id: k.id,
            puntaje:
              k.dimension === "SER"
                ? k.orden === 1
                  ? 8
                  : 9
                : k.dimension === "SABER"
                  ? 42.5
                  : 38,
          })),
          auto: 4,
          extra: 2,
          motivo: "Participación ficticia",
          action: "publicar",
        });
        const c = (await read()).calificacion;
        assert.equal(c.ser, 9);
        assert.equal(c.saber, 43);
        assert.equal(c.hacer, 38);
        assert.equal(c.nota_final, 96);
        assert.equal(c.situacion, "APROBADO");
        assert.equal(c.estado, "PUBLICADO");
      }),
  );
  await check(
    "publicación visible solo a familia vinculada y Secretaría consulta",
    async () => {
      for (const n of [5, 6, 2])
        await role(n, async () => {
          const rows = (await db.query("select * from public.v_calificaciones"))
            .rows;
          assert.equal(rows.length, 1);
          assert.equal(rows[0].matricula_id, uid(401));
        });
      await role(4, async () =>
        assert.equal(
          (await db.query("select * from public.v_calificaciones")).rows.length,
          0,
        ),
      );
    },
  );
  await check("nota publicada y criterios quedan bloqueados", () =>
    role(3, async () => {
      await rejects(async () => save(await read()), /Despublica/);
      await rejects(() => criterion("HACER", "Otra", 2), /Despublicar/);
      const k = (await read()).criterios[0];
      await rejects(
        () =>
          db.query(
            "update public.notas_criterios set puntaje=1 where criterio_id=$1",
            [k.id],
          ),
        /Despublicar/,
      );
    }),
  );
  await check(
    "despublicar oculta notas; extras limitan total a 100",
    async () => {
      await role(1, async () => save(await read(), { action: "despublicar" }));
      await role(5, async () =>
        assert.equal(
          (await db.query("select * from public.v_calificaciones")).rows.length,
          0,
        ),
      );
      await role(3, async () => {
        await save(await read(), { extra: 100, motivo: "Mérito ficticio" });
        assert.equal((await read()).calificacion.nota_final, 100);
        const k = (await read()).criterios[0];
        await rejects(
          () => criterion(k.dimension, k.nombre, k.orden, k, true),
          /tiene notas/,
        );
      });
    },
  );
  await check("cero completo reprueba y blanco vuelve a pendiente", () =>
    role(3, async () => {
      const s = await read();
      await save(s, {
        notes: s.criterios.map((k) => ({ criterio_id: k.id, puntaje: 0 })),
        auto: 0,
        extra: 0,
        motivo: "",
      });
      assert.equal((await read()).calificacion.nota_final, 0);
      assert.equal((await read()).calificacion.situacion, "REPROBADO");
      const next = await read();
      await save(next, {
        notes: next.criterios.map((k, i) => ({
          criterio_id: k.id,
          puntaje: i ? 0 : null,
        })),
      });
      assert.equal((await read()).calificacion.nota_final, null);
    }),
  );
  await check("conflictos en guardado y publicación no sobrescriben", () =>
    role(3, async () => {
      const stale = await read();
      await save(stale, { auto: 1 });
      await rejects(() => save(stale, { auto: 4 }), /Otra persona modificó/);
      await rejects(
        () => save(stale, { action: "publicar" }),
        /Otra persona modificó/,
      );
      assert.equal((await read()).calificacion.autoevaluacion, 1);
    }),
  );
  await check(
    "cambios directos de notas, criterios y matrícula exigen recargar",
    async () => {
      let s = await role(3, () => read());
      await role(3, async () => {
        await db.query(
          "update public.notas_criterios set puntaje=2 where criterio_id=$1 and matricula_id=$2",
          [s.notas[0].criterio_id, uid(401)],
        );
        await rejects(() => save(s), /Otra persona modificó/);
      });
      s = await role(3, () => read());
      await role(3, async () => {
        const k = s.criterios[0];
        await criterion(k.dimension, "Nombre cambiado", k.orden, k);
        await rejects(() => save(s), /Otra persona modificó/);
        await rejects(
          () => criterion(k.dimension, "Viejo", k.orden, k),
          /Otra persona modificó/,
        );
      });
      s = await role(3, () => read());
      await db.query(
        "update public.matriculas set fecha_ingreso='2026-01-02' where id=$1",
        [uid(401)],
      );
      await role(3, () => rejects(() => save(s), /Otra persona modificó/));
    },
  );
  await check(
    "Secretaría, otros docentes, familia, inactivo y sin perfil no escriben",
    async () => {
      const s = await role(1, () => read());
      for (const n of [2, 4, 5, 6, 7, 8])
        await role(n, async () => {
          await rejects(() => read(), /no puede registrar/);
          await rejects(() => save(s), /no puede registrar/);
          await rejects(() => criterion("SER"), /no puede registrar/);
        });
      await role(
        null,
        () => rejects(() => read(), /permission denied/),
        "anon",
      );
    },
  );
  await check(
    "docente de otra materia del mismo curso tampoco ve ni modifica notas",
    async () => {
      const sub = (
        await scalar("select id from public.asignaturas where id<>$1 limit 1", [
          subject,
        ])
      ).id;
      await db.query(
        "insert into public.asignaciones_docente(docente_id,curso_id,gestion_id,asignatura_id) values($1,$2,$3,$4)",
        [uid(204), course, g, sub],
      );
      await role(4, async () => {
        await rejects(() => read(), /no puede registrar/);
        assert.equal(
          (await db.query("select * from public.v_calificaciones")).rows.length,
          0,
        );
      });
    },
  );
  await check(
    "matrícula ajena, trimestre cerrado y curso inactivo bloquean",
    async () => {
      await role(3, () =>
        rejects(() => read(uid(403)), /matrícula no corresponde/),
      );
      const s = await role(3, () => read());
      await db.query(
        "update public.trimestres set estado='CERRADO' where id=$1",
        [term],
      );
      await role(3, async () => {
        assert.ok((await read()).bloqueo);
        await rejects(() => save(s), /trimestre abierto/);
        await rejects(() => criterion("SER"), /trimestre abierto/);
      });
      await db.query(
        "update public.trimestres set estado='ABIERTO' where id=$1",
        [term],
      );
      await db.query("update public.cursos set activo=false where id=$1", [
        course,
      ]);
      await role(3, () => rejects(() => save(s), /trimestre abierto/));
      await db.query("update public.cursos set activo=true where id=$1", [
        course,
      ]);
    },
  );
  await check("asignación revocada y auditoría", async () => {
    const s = await role(3, () => read());
    await db.query(
      "update public.asignaciones_docente set activo=false where id=$1",
      [assignment],
    );
    await role(3, async () => {
      await rejects(() => read(), /no puede registrar/);
      await rejects(() => save(s), /no puede registrar/);
    });
    assert.ok(
      Number(
        (
          await scalar(
            "select count(*) n from public.auditoria where tabla='calificaciones_trimestrales' and actor_id=$1",
            [uid(3)],
          )
        ).n,
      ) > 0,
    );
  });
  console.log(`RESULTADO calificaciones: ${passed} pruebas correctas.`);
} catch (error) {
  console.error("FALLO calificaciones:", error.message, error.where || "");
  process.exitCode = 1;
} finally {
  await db.close();
}
