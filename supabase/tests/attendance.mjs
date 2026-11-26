/** Fase 5: guardado atómico, versiones, publicación y privacidad de asistencia. */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
let passed = 0;
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0];
const check = async (name, fn) => {
  await fn();
  console.log(`OK asistencia ${++passed}: ${name}`);
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
  otherCourse = uid(302),
  date = "2026-03-16";
const read = async (c = course, d = date) =>
  (await scalar("select public.consultar_asistencia_curso($1,$2) r", [c, d])).r;
const save = async (
  sheet,
  rows = sheet.filas,
  note = "Prueba ficticia",
  d = date,
) =>
  (
    await scalar(
      "select public.guardar_asistencia_curso($1,$2,$3,$4,$5,$6) id",
      [
        sheet.curso.id,
        d,
        sheet.jornada?.id || null,
        sheet.jornada?.updated_at || null,
        rows,
        note,
      ],
    )
  ).id;
const publish = async (sheet, active = true) =>
  (
    await scalar("select public.cambiar_publicacion_asistencia($1,$2,$3) id", [
      sheet.jornada.id,
      sheet.jornada.updated_at,
      active,
    ])
  ).id;
let g, term, initial;
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  const dir = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(new URL(f, dir), "utf8"));
  await check(
    "migración incremental reaplicable y RPC sin privilegios elevados",
    async () => {
      await db.exec(
        readFileSync(
          new URL(
            "../migrations/202610070001_registro_asistencia.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      await db.exec(
        readFileSync(
          new URL("../07_verificar_registro_asistencia.sql", import.meta.url),
          "utf8",
        ),
      );
      const funcs = (
        await db.query(
          "select p.proname,p.prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') anon from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like '%asistencia%'",
        )
      ).rows;
      assert.equal(funcs.length, 3);
      assert.ok(funcs.every((f) => !f.prosecdef && !f.anon));
    },
  );
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
  await check("lista por vigencia incluye retirados en fecha histórica", () =>
    role(3, async () => {
      initial = await read();
      assert.equal(initial.filas.length, 2);
      assert.equal(initial.jornada, null);
      assert.equal(initial.bloqueo, null);
      assert.ok(initial.filas.every((r) => r.estado === null));
      assert.equal((await read(course, "2026-04-01")).filas.length, 1);
      assert.equal((await read(course, "2026-02-01")).filas.length, 1);
    }),
  );
  await check(
    "docente guarda borrador parcial sin convertir blancos en presentes",
    () =>
      role(3, async () => {
        initial.filas[0].estado = "A";
        await save(initial);
        const s = await read();
        assert.equal(s.jornada.estado, "BORRADOR");
        assert.equal(s.filas.filter((r) => r.estado === null).length, 1);
      }),
  );
  await check("borrador invisible para Padre y Estudiante", async () => {
    for (const n of [5, 6])
      await role(n, async () =>
        assert.equal(
          Number((await scalar("select count(*) n from public.asistencias")).n),
          0,
        ),
      );
  });
  await check("lista incompleta no publica y mantiene borrador", () =>
    role(3, async () => {
      await rejects(async () => publish(await read()), /Completar asistencia/);
      assert.equal((await read()).jornada.estado, "BORRADOR");
    }),
  );
  await check(
    "marcas y observaciones inválidas revierten toda la escritura",
    () =>
      role(3, async () => {
        const s = await read(),
          before = await row("jornadas_asistencia", s.jornada.id);
        await rejects(
          () =>
            save(
              s,
              s.filas.map((r, i) => ({ ...r, estado: i ? "X" : "F" })),
            ),
          /Revisa las marcas/,
        );
        await rejects(
          () =>
            save(
              s,
              s.filas.map((r) => ({ ...r, observacion: "x".repeat(501) })),
            ),
          /Revisa las marcas/,
        );
        await rejects(
          () =>
            save(
              s,
              s.filas.map((r) => ({
                ...r,
                estado: null,
                observacion: "Nota pendiente",
              })),
            ),
          /Revisa las observaciones/,
        );
        assert.deepEqual(
          await row("jornadas_asistencia", s.jornada.id),
          before,
        );
      }),
  );
  await check("duplicados, matrícula ajena y lista antigua rechazados", () =>
    role(3, async () => {
      const s = await read();
      await rejects(
        () => save(s, [s.filas[0], s.filas[0]]),
        /Revisa las marcas/,
      );
      await rejects(() => save(s, [s.filas[0]]), /lista de matrículas cambió/);
      await rejects(
        () => save(s, [s.filas[0], { ...s.filas[1], matricula_id: uid(403) }]),
        /lista de matrículas cambió/,
      );
    }),
  );
  await check("conflicto de versión de jornada no sobrescribe", () =>
    role(3, async () => {
      const stale = await read();
      const rows = stale.filas.map((r, i) => ({
        ...r,
        estado: i ? "L" : "R",
        observacion: i ? "Licencia ficticia" : "",
      }));
      await save(stale, rows);
      await rejects(() => save(stale), /Otra persona modificó la jornada/);
      assert.deepEqual(
        (await read()).filas.map((r) => r.estado),
        ["R", "L"],
      );
    }),
  );
  await check(
    "publicación completa visible solo para la familia correspondiente",
    async () => {
      await role(3, async () => publish(await read()));
      for (const n of [5, 6])
        await role(n, async () => {
          const a = (await db.query("select * from public.asistencias")).rows;
          assert.equal(a.length, 1);
          assert.equal(a[0].matricula_id, uid(401));
          assert.equal(a[0].estado, "R");
        });
      await role(4, async () =>
        assert.equal(
          Number((await scalar("select count(*) n from public.asistencias")).n),
          0,
        ),
      );
    },
  );
  await check("publicado rechaza edición por RPC y tabla directa", () =>
    role(3, async () => {
      const s = await read();
      await rejects(() => save(s), /Despublica/);
      await rejects(
        () =>
          db.query(
            "update public.asistencias set estado='F' where jornada_id=$1",
            [s.jornada.id],
          ),
        /Despublicar jornada/,
      );
    }),
  );
  await check(
    "despublicar oculta marcas y permite corregir sin duplicar jornada",
    async () => {
      await role(1, async () => publish(await read(), false));
      await role(5, async () =>
        assert.equal(
          Number((await scalar("select count(*) n from public.asistencias")).n),
          0,
        ),
      );
      await role(3, async () => {
        const s = await read();
        await save(
          s,
          s.filas.map((r) => ({ ...r, estado: "F" })),
        );
        assert.equal((await read()).jornada.id, s.jornada.id);
      });
    },
  );
  await check(
    "asistencia editada directamente exige recargar versiones de fila",
    () =>
      role(3, async () => {
        const s = await read();
        await db.query(
          "update public.asistencias set observacion='Cambio directo ficticio' where jornada_id=$1 and matricula_id=$2",
          [s.jornada.id, s.filas[0].matricula_id],
        );
        await rejects(() => save(s), /Otra persona modificó la asistencia/);
      }),
  );
  await check(
    "cambio de matrícula exige recargar y revierte marcas",
    async () => {
      const s = await role(3, () => read());
      await db.query(
        "update public.matriculas set fecha_ingreso='2026-01-02' where id=$1",
        [uid(401)],
      );
      await role(3, async () => {
        await rejects(
          () =>
            save(
              s,
              s.filas.map((r) => ({ ...r, estado: "A" })),
            ),
          /La matrícula cambió/,
        );
        assert.equal((await read()).filas[0].estado, "F");
      });
    },
  );
  await check(
    "Secretaría, familia, docente ajeno, inactivo, sin perfil y anon no capturan",
    async () => {
      const target = await role(1, () => read());
      for (const n of [2, 4, 5, 6, 7, 8])
        await role(n, async () => {
          await rejects(() => read(), /no puede registrar/);
          await rejects(() => save(initial), /no puede registrar/);
          await rejects(() => publish(target), /no puede cambiar/);
        });
      await role(
        null,
        () => rejects(() => read(), /permission denied/),
        "anon",
      );
    },
  );
  await check(
    "curso inactivo, fecha futura, año ajeno y trimestre cerrado bloquean",
    async () => {
      await role(3, async () => {
        for (const d of ["2027-01-01", "2026-05-01"])
          assert.ok((await read(course, d)).bloqueo);
        await rejects(
          () => save(initial, initial.filas, "", "2099-01-01"),
          /fecha futura/,
        );
      });
      await db.query("update public.cursos set activo=false where id=$1", [
        course,
      ]);
      await role(3, async () => {
        assert.ok((await read()).bloqueo);
        await rejects(() => save(initial), /activos/);
      });
      await db.query("update public.cursos set activo=true where id=$1", [
        course,
      ]);
      await db.query(
        "update public.trimestres set estado='CERRADO' where id=$1",
        [term],
      );
      await role(3, async () => {
        assert.ok((await read()).bloqueo);
        await rejects(async () => save(await read()), /trimestre abierto/);
        await rejects(async () => publish(await read()), /trimestre abierto/);
      });
      await db.query(
        "update public.trimestres set estado='ABIERTO' where id=$1",
        [term],
      );
    },
  );
  await check(
    "revocar asignación retira lectura de lista y escritura docente",
    async () => {
      await db.query(
        "update public.asignaciones_docente set activo=false where curso_id=$1",
        [course],
      );
      await role(3, async () => {
        await rejects(() => read(), /no puede registrar/);
        await rejects(() => save(initial), /no puede registrar/);
      });
      await db.query(
        "update public.asignaciones_docente set activo=true where curso_id=$1",
        [course],
      );
    },
  );
  await check(
    "nueva matrícula posterior al guardado impide publicar hasta completar",
    async () => {
      await db
        .query(
          "insert into public.matriculas(estudiante_id,curso_id,gestion_id,fecha_ingreso) values($1,$2,$3,'2026-03-16')",
          [uid(208), course, g],
        )
        .catch(async () => {
          await db.query(
            "update public.matriculas set estado='RETIRADA',fecha_salida='2026-03-15' where id=$1",
            [uid(403)],
          );
          await db.query(
            "insert into public.matriculas(estudiante_id,curso_id,gestion_id,fecha_ingreso) values($1,$2,$3,'2026-03-16')",
            [uid(208), course, g],
          );
        });
      await role(3, async () => {
        await rejects(
          async () => publish(await read()),
          /Completar asistencia/,
        );
        const s = await read();
        assert.equal(s.filas.length, 3);
        await save(
          s,
          s.filas.map((r) => ({ ...r, estado: r.estado || "A" })),
        );
        await publish(await read());
      });
    },
  );
  await check(
    "auditoría identifica al actor y configuración no inventa fechas",
    async () => {
      assert.ok(
        Number(
          (
            await scalar(
              "select count(*) n from public.auditoria where tabla in ('asistencias','jornadas_asistencia') and actor_id=$1",
              [uid(3)],
            )
          ).n,
        ) > 0,
      );
      await rejects(
        () =>
          db.exec(
            readFileSync(
              new URL(
                "../08_configurar_trimestre_asistencia.sql",
                import.meta.url,
              ),
              "utf8",
            ),
          ),
        /calendario real/,
      );
      const config = readFileSync(
        new URL("../08_configurar_trimestre_asistencia.sql", import.meta.url),
        "utf8",
      )
        .replace("v_numero integer := 1", "v_numero integer := 2")
        .replace("v_inicio date := null", "v_inicio date := DATE '2026-05-01'")
        .replace("v_fin date := null", "v_fin date := DATE '2026-08-31'");
      await db.exec(config);
      assert.equal(
        (
          await scalar(
            "select estado from public.trimestres where gestion_id=$1 and numero=2",
            [g],
          )
        ).estado,
        "ABIERTO",
      );
      await db.query(
        "update public.trimestres set estado='CERRADO' where gestion_id=$1 and numero=2",
        [g],
      );
      await rejects(() => db.exec(config), /no reabre/);
    },
  );
  console.log(`RESULTADO asistencia: ${passed} pruebas correctas.`);
} catch (error) {
  console.error("FALLO asistencia:", error.message, error.where || "");
  process.exitCode = 1;
} finally {
  await db.close();
}
