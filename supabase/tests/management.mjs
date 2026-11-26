/** PostgreSQL embebido: transacciones, integridad y autorización de la fase 3. */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let passed = 0;
const check = async (name, fn) => {
  await fn();
  console.log(`OK gestión ${++passed}: ${name}`);
};
const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0];
async function role(id, fn, pgRole = "authenticated") {
  await db.exec(`set role ${pgRole}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id || "",
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
  assert.ok(error, "La operación debía rechazarse");
  if (pattern) assert.match(error.message, pattern);
}
const count = async (table) =>
  Number((await scalar(`select count(*) n from public.${table}`)).n);
const persona = {
  nombres: "Estudiante ficticio",
  apellido_paterno: "Prueba",
  ci: "CI-FICTICIO",
};
const ficha = {
  rude: "RUDE-FICTICIO",
  genero: "NO_ESPECIFICADO",
  fecha_nacimiento: "2019-01-01",
  activo: true,
};
const save = async (tipo, id, p, f, v = null, pv = null) =>
  (
    await scalar(
      "select public.guardar_ficha_academica($1,$2,$3,$4,$5,$6) id",
      [tipo, id, p, f, v, pv],
    )
  ).id;
const course = async (id, g, grade, parallel, active = true, version = null) =>
  (
    await scalar(
      "select public.guardar_curso_academico($1,$2,$3,$4,$5,$6) id",
      [id, g, grade, parallel, active, version],
    )
  ).id;
const link = async (s, t, main = false, auth = true) =>
  db.query("select public.vincular_tutor_academico($1,$2,'Madre',$3,$4)", [
    s,
    t,
    auth,
    main,
  ]);
const enrol = async (
  id,
  s,
  c,
  ingreso,
  salida = null,
  estado = "ACTIVA",
  version = null,
) =>
  (
    await scalar(
      "select public.guardar_matricula_academica($1,$2,$3,$4,$5,$6,$7) id",
      [id, s, c, ingreso, salida, estado, version],
    )
  ).id;
const version = async (table, id) =>
  scalar(`select to_jsonb(r) r from public.${table} r where id=$1`, [id]).then(
    (x) => x.r,
  );
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  const dir = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(new URL(f, dir), "utf8"));
  await check("migración incremental se puede reaplicar sin borrar datos", () =>
    db.exec(
      readFileSync(
        new URL(
          "../migrations/202610060001_gestion_academica.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );
  for (let n = 1; n <= 5; n++) {
    await db.query("insert into auth.users values($1)", [uid(n)]);
    await db.query(
      "insert into public.personas(id,nombres) values($1,'Cuenta ficticia')",
      [uid(100 + n)],
    );
  }
  await db.query("insert into public.docentes(persona_id) values($1)", [
    uid(103),
  ]);
  await db.query("insert into public.tutores(persona_id) values($1)", [
    uid(104),
  ]);
  for (const [n, r] of [
    [1, "DIRECTOR"],
    [2, "SECRETARIA"],
    [3, "DOCENTE"],
    [4, "PADRE"],
  ])
    await db.query(
      "insert into public.perfiles(id,persona_id,rol) values($1,$2,$3)",
      [uid(n), uid(100 + n), r],
    );
  const g = (await scalar("select id from public.gestiones where anio=2026"))
    .id;
  let student, tutor, tutor2, c, m;
  await check("Secretaría crea persona y estudiante en una transacción", () =>
    role(uid(2), async () => {
      student = await save("estudiantes", null, persona, ficha);
      assert.equal(await count("estudiantes"), 1);
    }),
  );
  await check("un RUDE duplicado revierte persona y auditoría nuevas", () =>
    role(uid(2), async () => {
      const before = await count("personas");
      const auditBefore = await roleAuditCount();
      await rejects(
        () => save("estudiantes", null, { nombres: "Otra ficha" }, ficha),
        /unique constraint/,
      );
      assert.equal(await count("personas"), before);
      assert.equal(await roleAuditCount(), auditBefore);
    }),
  );
  // Secretaría no puede leer auditoría; el recuento anterior se realiza a través del propietario.
  async function roleAuditCount() {
    await db.exec("reset role");
    const n = await count("auditoria");
    await db.exec("set role authenticated");
    return n;
  }
  await check(
    "edición mantiene referencias y detecta una versión anterior",
    () =>
      role(uid(1), async () => {
        const r = await version("estudiantes", student);
        const p = await version("personas", r.persona_id);
        await save(
          "estudiantes",
          student,
          { ...persona, nombres: "Ficha actualizada" },
          ficha,
          r.updated_at,
          p.updated_at,
        );
        await rejects(
          () =>
            save(
              "estudiantes",
              student,
              persona,
              ficha,
              r.updated_at,
              p.updated_at,
            ),
          /Otra persona modificó/,
        );
        assert.equal(
          (await version("personas", p.id)).nombres,
          "Ficha actualizada",
        );
      }),
  );
  await check("Dirección crea tutores sin cuentas Auth nuevas", () =>
    role(uid(1), async () => {
      tutor = await save(
        "tutores",
        null,
        { nombres: "Tutor uno" },
        { activo: true },
      );
      tutor2 = await save(
        "tutores",
        null,
        { nombres: "Tutor dos" },
        { activo: true },
      );
      assert.equal(await count("tutores"), 3);
    }),
  );
  await check("contacto principal cambia de forma atómica sin duplicados", () =>
    role(uid(2), async () => {
      await link(student, tutor, true);
      await link(student, tutor2, true);
      assert.equal(
        Number(
          (
            await scalar(
              "select count(*) n from public.estudiante_tutor where estudiante_id=$1 and contacto_principal",
              [student],
            )
          ).n,
        ),
        1,
      );
      assert.equal(
        (
          await scalar(
            "select tutor_id from public.estudiante_tutor where estudiante_id=$1 and contacto_principal",
            [student],
          )
        ).tutor_id,
        tutor2,
      );
    }),
  );
  await check(
    "un tutor inválido no elimina el contacto principal anterior",
    () =>
      role(uid(2), async () => {
        await rejects(() => link(student, uid(999), true), /tutor activo/);
        assert.equal(
          (
            await scalar(
              "select tutor_id from public.estudiante_tutor where estudiante_id=$1 and contacto_principal",
              [student],
            )
          ).tutor_id,
          tutor2,
        );
      }),
  );
  await check("curso normaliza paralelo y conserva sus claves al editar", () =>
    role(uid(2), async () => {
      c = await course(null, g, 1, "a");
      const r = await version("cursos", c);
      assert.equal(r.paralelo, "A");
      await rejects(() => course(c, g, 2, "A", true, r.updated_at), /conserva/);
      await course(c, g, 1, "A", false, r.updated_at);
      assert.equal((await version("cursos", c)).activo, false);
    }),
  );
  await check("curso inactivo no admite matrícula", () =>
    role(uid(2), () =>
      rejects(
        () => enrol(null, student, c, "2026-02-01"),
        /curso de una gestión activa/,
      ),
    ),
  );
  await role(uid(2), async () => {
    const r = await version("cursos", c);
    await course(c, g, 1, "A", true, r.updated_at);
  });
  await check("matrícula válida deriva la gestión del curso", () =>
    role(uid(2), async () => {
      m = await enrol(null, student, c, "2026-02-01");
      assert.equal((await version("matriculas", m)).gestion_id, g);
    }),
  );
  await check("bloquea matrícula duplicada y fecha fuera de gestión", () =>
    role(uid(2), async () => {
      await rejects(
        () => enrol(null, student, c, "2026-03-01"),
        /superpuestas|unique constraint/,
      );
      await rejects(
        () => enrol(null, student, c, "2027-02-01"),
        /fuera de su gestión/,
      );
    }),
  );
  await check("retiro exige fecha y conserva estudiante/curso", () =>
    role(uid(2), async () => {
      const r = await version("matriculas", m);
      await rejects(
        () =>
          enrol(m, student, c, r.fecha_ingreso, null, "RETIRADA", r.updated_at),
        /check constraint/,
      );
      await rejects(
        () =>
          enrol(
            m,
            student,
            c,
            r.fecha_ingreso,
            "2026-05-01",
            "ACTIVA",
            r.updated_at,
          ),
        /activa sin fecha/,
      );
      await enrol(
        m,
        student,
        c,
        r.fecha_ingreso,
        "2026-05-01",
        "RETIRADA",
        r.updated_at,
      );
      assert.equal((await version("matriculas", m)).estado, "RETIRADA");
    }),
  );
  await check(
    "Docente, Padre, Estudiante, cuenta inactiva y sin perfil no pueden invocar escrituras",
    async () => {
      for (const n of [6, 7]) {
        await db.query("insert into auth.users values($1)", [uid(n)]);
        await db.query(
          "insert into public.personas(id,nombres) values($1,'Cuenta no autorizada')",
          [uid(100 + n)],
        );
      }
      await db.query("insert into public.estudiantes(persona_id) values($1)", [
        uid(107),
      ]);
      await db.query(
        "insert into public.perfiles(id,persona_id,rol,activo) values($1,$2,'DIRECTOR',false),($3,$4,'ESTUDIANTE',true)",
        [uid(6), uid(106), uid(7), uid(107)],
      );
      for (const n of [3, 4, 5, 6, 7])
        await role(uid(n), async () => {
          await rejects(
            () => save("estudiantes", null, persona, ficha),
            /Dirección y Secretaría/,
          );
          await rejects(() => link(student, tutor), /Dirección y Secretaría/);
          await rejects(
            () => course(null, g, 2, "A"),
            /Dirección y Secretaría/,
          );
          await rejects(
            () => enrol(null, student, c, "2026-06-01"),
            /Dirección y Secretaría/,
          );
        });
    },
  );
  await check(
    "anon no tiene EXECUTE y las cuatro RPC son security invoker",
    async () => {
      await role(
        null,
        () =>
          rejects(
            () => save("estudiantes", null, persona, ficha),
            /permission denied/,
          ),
        "anon",
      );
      assert.equal(
        Number(
          (
            await scalar(
              "select count(*) n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef",
            )
          ).n,
        ),
        0,
      );
    },
  );
  await check(
    "desactivar ficha conserva relaciones y evita nuevas matrículas",
    () =>
      role(uid(1), async () => {
        const r = await version("estudiantes", student),
          p = await version("personas", r.persona_id);
        await save(
          "estudiantes",
          student,
          persona,
          { ...ficha, activo: false },
          r.updated_at,
          p.updated_at,
        );
        assert.equal(
          Number(
            (
              await scalar(
                "select count(*) n from public.estudiante_tutor where estudiante_id=$1",
                [student],
              )
            ).n,
          ),
          2,
        );
        assert.equal(await count("matriculas"), 1);
        await rejects(
          () => enrol(null, student, c, "2026-06-01"),
          /estudiante activo/,
        );
      }),
  );
  await check("auditoría conserva el actor de la sesión en los guardados", () =>
    role(uid(1), async () => {
      assert.ok(
        Number(
          (
            await scalar(
              "select count(*) n from public.auditoria where actor_id=$1 and tabla=$2",
              [uid(2), "estudiantes"],
            )
          ).n,
        ) > 0,
      );
    }),
  );
  console.log(`RESULTADO gestión: ${passed} pruebas correctas.`);
} catch (e) {
  console.error("FALLO gestión:", e.message, e.where || "");
  process.exitCode = 1;
} finally {
  await db.close();
}
