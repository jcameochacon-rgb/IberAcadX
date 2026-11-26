import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
let passed = 0;
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
const check = async (name, fn) => {
  await fn();
  console.log(`OK horarios ${++passed}: ${name}`);
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
const course = uid(301),
  other = uid(302),
  a1 = uid(401),
  a2 = uid(402),
  a3 = uid(403);
const read = async (c = course) =>
  (await one("select public.consultar_horario_curso($1) r", [c])).r;
const period = async (p, start = "14:00", end = "14:40", confirm = true) =>
  (
    await one("select public.guardar_periodo_horario($1,$2,$3,$4,$5) id", [
      p.id,
      p.updated_at,
      start,
      end,
      confirm,
    ])
  ).id;
const save = async (
  s,
  { assignment = a1, day = 1, number = 1, block = null } = {},
) => {
  const a = s.asignaciones.find((a) => a.id === assignment),
    p = s.periodos.find((p) => p.numero === number);
  return (
    await one(
      "select public.guardar_bloque_horario($1,$2,$3,$4,$5,$6,$7,$8) id",
      [
        s.curso.id,
        block?.id || null,
        block?.updated_at || null,
        assignment,
        a?.updated_at || null,
        p.id,
        p.updated_at,
        day,
      ],
    )
  ).id;
};
const remove = async (h, confirm = true) =>
  (
    await one("select public.retirar_bloque_horario($1,$2,$3) id", [
      h.id,
      h.updated_at,
      confirm,
    ])
  ).id;
let gestion;
try {
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
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
  await db.query(
    "insert into public.docentes(id,persona_id) values($1,$2),($3,$4),($5,$6)",
    [uid(203), uid(103), uid(204), uid(104), uid(206), uid(106)],
  );
  await db.query("insert into public.tutores(id,persona_id) values($1,$2)", [
    uid(205),
    uid(105),
  ]);
  await db.query(
    "insert into public.estudiantes(id,persona_id) values($1,$2),($3,$4)",
    [uid(208), uid(108), uid(209), uid(109)],
  );
  const roles = {
    1: "DIRECTOR",
    2: "SECRETARIA",
    3: "DOCENTE",
    4: "DOCENTE",
    5: "PADRE",
    6: "DOCENTE",
    8: "ESTUDIANTE",
  };
  for (const [n, r] of Object.entries(roles))
    await db.query(
      "insert into public.perfiles(id,persona_id,rol,activo) values($1,$2,$3,$4)",
      [uid(Number(n)), uid(100 + Number(n)), r, n !== "6"],
    );
  gestion = (await one("select id from public.gestiones where anio=2026")).id;
  await db.query(
    "insert into public.cursos(id,gestion_id,grado_id,paralelo) values($1,$3,1,'A'),($2,$3,1,'B')",
    [course, other, gestion],
  );
  const subjects = (
    await db.query("select id from public.asignaturas order by nombre limit 2")
  ).rows;
  await db.query(
    "insert into public.asignaciones_docente(id,docente_id,curso_id,gestion_id,asignatura_id) values($1,$2,$3,$4,$5),($6,$2,$7,$4,$5),($8,$9,$3,$4,$10)",
    [
      a1,
      uid(203),
      course,
      gestion,
      subjects[0].id,
      a2,
      other,
      a3,
      uid(204),
      subjects[1].id,
    ],
  );
  await db.query(
    "insert into public.matriculas(estudiante_id,curso_id,gestion_id,fecha_ingreso) values($1,$2,$3,'2026-02-01'),($4,$5,$3,'2026-02-01')",
    [uid(208), course, gestion, uid(209), other],
  );
  await db.query(
    "insert into public.estudiante_tutor(estudiante_id,tutor_id,parentesco) values($1,$2,'Tutor')",
    [uid(208), uid(205)],
  );
  await check(
    "migración incremental reaplicable y cuatro RPC invoker sin anon",
    async () => {
      await db.exec(
        readFileSync(
          new URL(
            "../migrations/202610090002_registro_horarios.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      const fs = (
        await db.query(
          "select p.prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') anon from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('consultar_horario_curso','guardar_periodo_horario','guardar_bloque_horario','retirar_bloque_horario')",
        )
      ).rows;
      assert.equal(fs.length, 4);
      assert.ok(fs.every((f) => !f.prosecdef && !f.anon));
    },
  );
  await check("no inventa horas y rechaza asignar sin configuración", () =>
    role(1, async () => {
      const s = await read();
      assert.equal(s.periodos.length, 6);
      assert.ok(s.periodos.every((p) => p.hora_inicio === null));
      await rejects(() => save(s), /horas reales/);
    }),
  );
  await check(
    "Secretaría configura; duración, turno, confirmación y superposición",
    () =>
      role(2, async () => {
        let s = await read(),
          p = s.periodos[0];
        await rejects(() => period(p, "14:00", "14:39"), /40 minutos/);
        await rejects(() => period(p, "13:30", "14:10"), /40 minutos/);
        await rejects(() => period(p, "", ""), /horas reales/);
        await rejects(() => period(p, "14:00", "14:40", false), /Confirma/);
        await period(p);
        s = await read();
        await rejects(
          () => period(s.periodos[1], "14:20", "15:00"),
          /superpuestos/,
        );
        await period(s.periodos[1], "14:40", "15:20");
      }),
  );
  await check(
    "versiones de periodos evitan sobrescribir y descartan formularios antiguos",
    () =>
      role(2, async () => {
        const s = await read();
        await period(s.periodos[1], "14:45", "15:25");
        await rejects(
          () => period(s.periodos[1], "14:40", "15:20"),
          /Otra persona/,
        );
        await rejects(
          () => save(s, { number: 2 }),
          /Otra persona modificó el periodo/,
        );
        await period((await read()).periodos[1], "14:40", "15:20");
      }),
  );
  await check(
    "crea bloque, rechaza duplicado de curso y cruce del mismo docente",
    () =>
      role(1, async () => {
        await save(await read());
        await rejects(
          async () => save(await read(), { assignment: a3 }),
          /duplicate key/,
        );
        await rejects(
          async () => save(await read(other), { assignment: a2 }),
          /duplicate key/,
        );
        assert.equal((await read()).horarios.length, 1);
      }),
  );
  await check(
    "docente y familia consultan solo cursos autorizados",
    async () => {
      for (const n of [3, 4, 5, 8])
        await role(n, async () =>
          assert.equal((await read()).horarios.length, 1),
        );
      for (const n of [4, 5, 8])
        await role(n, () => rejects(() => read(other), /no tiene acceso/));
    },
  );
  await check("edición conserva identidad y conflicto no sobrescribe", () =>
    role(2, async () => {
      const s = await read(),
        h = s.horarios[0];
      const id = await save(s, { block: h, day: 2 });
      assert.equal(id, h.id);
      await rejects(
        () => save(s, { block: h, day: 3 }),
        /Otra persona modificó el bloque/,
      );
      assert.equal((await read()).horarios[0].dia_semana, 2);
    }),
  );
  await check("docente puede tener otro curso en distinto día o periodo", () =>
    role(1, async () => {
      await save(await read(other), { assignment: a2, day: 1 });
      await save(await read(), { day: 1, number: 2 });
      assert.equal((await read()).horarios.length, 2);
    }),
  );
  await check(
    "asignación ajena, día inválido y cambios de asignación rechazados",
    () =>
      role(1, async () => {
        const s = await read();
        await rejects(() => save(s, { day: 6 }), /lunes a viernes/);
        const otherSheet = await read(other),
          foreign = otherSheet.asignaciones.find((a) => a.id === a2);
        await rejects(
          () =>
            save(
              { ...s, asignaciones: [...s.asignaciones, foreign] },
              { assignment: a2, day: 3 },
            ),
          /materia activa del curso/,
        );
        await db.query(
          "update public.asignaciones_docente set activo=false where id=$1",
          [a1],
        );
        await rejects(
          () => save(s, { day: 3 }),
          /Otra persona modificó la asignación/,
        );
        await rejects(
          async () => save(await read(), { day: 3 }),
          /materia activa/,
        );
        await db.query(
          "update public.asignaciones_docente set activo=true where id=$1",
          [a1],
        );
      }),
  );
  await check(
    "roles sin gestión, inactivo, sin perfil y anon no escriben",
    async () => {
      const s = await role(1, () => read()),
        h = s.horarios[0];
      for (const n of [3, 4, 5, 6, 7, 8])
        await role(n, async () => {
          await rejects(() => save(s), /Solo Dirección/);
          await rejects(() => period(s.periodos[0]), /Solo Dirección/);
          await rejects(() => remove(h), /Solo Dirección/);
        });
      await role(
        null,
        () => rejects(() => read(), /permission denied/),
        "anon",
      );
    },
  );
  await check(
    "cursos inactivos bloquean altas pero permiten retirar con confirmación",
    async () => {
      await db.query("update public.cursos set activo=false where id=$1", [
        course,
      ]);
      await role(2, async () => {
        let s = await read();
        assert.ok(s.bloqueo);
        await rejects(() => save(s, { day: 3 }), /activos/);
        const h = s.horarios[0];
        await rejects(() => remove(h, false), /Confirma/);
        await remove(h);
        await rejects(() => remove(h), /Otra persona/);
        assert.equal((await read()).horarios.length, 1);
      });
      await db.query("update public.cursos set activo=true where id=$1", [
        course,
      ]);
    },
  );
  await check(
    "horas cambiadas afectan consulta global y se audita el retiro",
    () =>
      role(1, async () => {
        await period((await read()).periodos[1], "14:45", "15:25");
        assert.equal((await read(other)).periodos[1].hora_inicio, "14:45:00");
        const audit = await one(
          "select count(*) n from public.auditoria where tabla='horarios' and operacion='DELETE'",
        );
        assert.ok(Number(audit.n) > 0);
      }),
  );
  console.log(`RESULTADO horarios: ${passed} pruebas correctas.`);
} catch (e) {
  console.error("FALLO horarios:", e.message, e.where || "");
  process.exitCode = 1;
} finally {
  await db.close();
}
