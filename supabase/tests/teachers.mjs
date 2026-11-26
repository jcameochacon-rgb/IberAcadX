/** Fase 4: RPC, RLS, reutilización personal y protección del historial. */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
let passed = 0;
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0];
const check = async (name, fn) => {
  await fn();
  console.log(`OK docentes ${++passed}: ${name}`);
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
async function rejects(fn, regex) {
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
  if (regex) assert.match(error.message, regex);
}
const row = async (table, id) =>
  (
    await scalar(`select to_jsonb(r) r from public.${table} r where id=$1`, [
      id,
    ])
  ).r;
const count = async (table) =>
  Number((await scalar(`select count(*) n from public.${table}`)).n);
const person = {
  nombres: "Docente ficticio",
  apellido_paterno: "Prueba",
  ci: "CI-DOCENTE",
};
const save = async (
  id,
  p = person,
  existing = null,
  v = null,
  pv = null,
  active = true,
  speciality = "Primaria",
) =>
  (
    await scalar(
      "select public.guardar_docente_academico($1,$2,$3,$4,$5,$6,$7) id",
      [id, existing, p, speciality, active, v, pv],
    )
  ).id;
const assign = async (id, d, c, s, active = true, v = null) =>
  (
    await scalar(
      "select public.guardar_asignacion_academica($1,$2,$3,$4,$5,$6) id",
      [id, d, c, s, active, v],
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
  await check(
    "migración incremental y verificación se pueden reaplicar",
    async () => {
      await db.exec(
        readFileSync(
          new URL(
            "../migrations/202610060002_docentes_asignaciones.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      await db.exec(
        readFileSync(
          new URL("../05_verificar_docentes_asignaciones.sql", import.meta.url),
          "utf8",
        ),
      );
    },
  );
  for (let n = 1; n <= 7; n++) {
    await db.query("insert into auth.users(id,email) values($1,$2)", [
      uid(n),
      `cuenta${n}@example.invalid`,
    ]);
    await db.query(
      "insert into public.personas(id,nombres) values($1,'Cuenta ficticia')",
      [uid(100 + n)],
    );
  }
  await db.query(
    "insert into public.docentes(id,persona_id) values($1,$2),($3,$4)",
    [uid(203), uid(103), uid(204), uid(104)],
  );
  await db.query("insert into public.tutores(persona_id) values($1)", [
    uid(105),
  ]);
  await db.query(
    "insert into public.estudiantes(id,persona_id) values($1,$2)",
    [uid(206), uid(106)],
  );
  for (const [n, r] of [
    [1, "DIRECTOR"],
    [2, "SECRETARIA"],
    [3, "DOCENTE"],
    [4, "DOCENTE"],
    [5, "PADRE"],
    [6, "ESTUDIANTE"],
    [7, "DIRECTOR"],
  ])
    await db.query(
      "insert into public.perfiles(id,persona_id,rol,activo) values($1,$2,$3,$4)",
      [uid(n), uid(100 + n), r, n !== 7],
    );
  const g = (await scalar("select id from public.gestiones where anio=2026"))
    .id;
  const subjects = (
    await db.query("select id from public.asignaturas order by nombre")
  ).rows.map((s) => s.id);
  await db.query(
    "insert into public.cursos(id,gestion_id,grado_id,paralelo) values($1,$2,1,$3),($4,$2,2,$3)",
    [uid(301), g, "A", uid(302)],
  );
  await db.query(
    "insert into public.matriculas(estudiante_id,curso_id,gestion_id,fecha_ingreso) values($1,$2,$3,'2026-02-01')",
    [uid(206), uid(301), g],
  );
  let teacher, assignment;
  await check("Secretaría registra persona y docente en una transacción", () =>
    role(2, async () => {
      teacher = await save(null);
      assert.equal((await row("docentes", teacher)).especialidad, "Primaria");
    }),
  );
  await check("CI duplicado revierte toda el alta", async () => {
    const before = await count("personas"),
      audit = await count("auditoria");
    await role(2, () => rejects(() => save(null), /unique constraint/));
    assert.equal(await count("personas"), before);
    assert.equal(await count("auditoria"), audit);
  });
  await check(
    "reutiliza una persona sin sobrescribir datos ni duplicarla",
    async () => {
      const before = await count("personas");
      await role(2, async () => {
        const id = await save(null, { nombres: "No sobrescribir" }, uid(105));
        assert.equal((await row("docentes", id)).persona_id, uid(105));
        assert.equal(
          (await row("personas", uid(105))).nombres,
          "Cuenta ficticia",
        );
        await rejects(() => save(null, {}, uid(105)), /unique constraint/);
      });
      assert.equal(await count("personas"), before);
    },
  );
  await check("edición guarda especialidad y rechaza una versión antigua", () =>
    role(2, async () => {
      const d = await row("docentes", teacher),
        p = await row("personas", d.persona_id);
      await save(
        teacher,
        { ...person, nombres: "Docente actualizado" },
        null,
        d.updated_at,
        p.updated_at,
        true,
        "Matemática",
      );
      await rejects(
        () => save(teacher, person, null, d.updated_at, p.updated_at),
        /Otra persona modificó/,
      );
      assert.equal((await row("docentes", teacher)).especialidad, "Matemática");
    }),
  );
  await check("Secretaría asigna curso y materia con gestión derivada", () =>
    role(2, async () => {
      assignment = await assign(null, uid(203), uid(301), subjects[0]);
      assert.equal(
        (await row("asignaciones_docente", assignment)).gestion_id,
        g,
      );
    }),
  );
  await check("un curso/materia no se duplica, incluso al desactivar", () =>
    role(2, async () => {
      let a = await row("asignaciones_docente", assignment);
      await assign(
        a.id,
        a.docente_id,
        a.curso_id,
        a.asignatura_id,
        false,
        a.updated_at,
      );
      await rejects(
        () => assign(null, uid(204), uid(301), subjects[0]),
        /unique constraint/,
      );
      a = await row("asignaciones_docente", assignment);
      await assign(
        a.id,
        a.docente_id,
        a.curso_id,
        a.asignatura_id,
        true,
        a.updated_at,
      );
    }),
  );
  await check(
    "docente ve su curso y estudiantes; un docente ajeno no",
    async () => {
      await role(3, async () => {
        assert.equal(await count("cursos"), 1);
        assert.equal(await count("estudiantes"), 1);
      });
      await role(4, async () => {
        assert.equal(await count("cursos"), 0);
        assert.equal(await count("estudiantes"), 0);
      });
    },
  );
  await check(
    "desactivar asignación revoca acceso operativo y conserva fila",
    async () => {
      await role(2, async () => {
        const a = await row("asignaciones_docente", assignment);
        await assign(
          a.id,
          a.docente_id,
          a.curso_id,
          a.asignatura_id,
          false,
          a.updated_at,
        );
      });
      await role(3, async () => {
        assert.equal(await count("cursos"), 0);
        assert.equal(await count("estudiantes"), 0);
        assert.equal(await count("asignaciones_docente"), 1);
      });
    },
  );
  await check(
    "reactivar exige referencias activas; puede desactivar con docente inactivo",
    async () => {
      await db.query("update public.docentes set activo=false where id=$1", [
        uid(203),
      ]);
      await role(2, async () => {
        const a = await row("asignaciones_docente", assignment);
        await rejects(
          () =>
            assign(
              a.id,
              a.docente_id,
              a.curso_id,
              a.asignatura_id,
              true,
              a.updated_at,
            ),
          /docente activo/,
        );
        await assign(
          a.id,
          a.docente_id,
          a.curso_id,
          a.asignatura_id,
          false,
          a.updated_at,
        );
      });
      await db.query("update public.docentes set activo=true where id=$1", [
        uid(203),
      ]);
    },
  );
  await check(
    "cambio de docente sin actividad transfiere alcance y controla versión",
    () =>
      role(2, async () => {
        const a = await row("asignaciones_docente", assignment);
        await assign(
          a.id,
          uid(204),
          a.curso_id,
          a.asignatura_id,
          true,
          a.updated_at,
        );
        await rejects(
          () =>
            assign(
              a.id,
              uid(203),
              a.curso_id,
              a.asignatura_id,
              true,
              a.updated_at,
            ),
          /Otra persona modificó/,
        );
        const updated = await row("asignaciones_docente", assignment);
        await rejects(
          () =>
            assign(
              updated.id,
              uid(204),
              uid(302),
              subjects[0],
              true,
              updated.updated_at,
            ),
          /conserva su curso/,
        );
      }),
  );
  const tr = (await scalar("select id from public.trimestres where numero=1"))
    .id;
  await db.query(
    "update public.trimestres set fecha_inicio='2026-02-01',fecha_fin='2026-04-30',estado='ABIERTO' where id=$1",
    [tr],
  );
  await db.query(
    "insert into public.criterios_evaluacion(asignacion_docente_id,curso_id,gestion_id,trimestre_id,dimension,nombre,puntaje_maximo) values($1,$2,$3,$4,'SER','Actividad ficticia',10)",
    [assignment, uid(301), g, tr],
  );
  await check(
    "actividad bloquea cambio de docente por RPC y por tabla directa",
    () =>
      role(2, async () => {
        const a = await row("asignaciones_docente", assignment);
        await rejects(
          () =>
            assign(
              a.id,
              uid(203),
              a.curso_id,
              a.asignatura_id,
              true,
              a.updated_at,
            ),
          /ya tiene registros académicos/,
        );
        await rejects(
          () =>
            db.query(
              "update public.asignaciones_docente set docente_id=$1 where id=$2",
              [uid(203), a.id],
            ),
          /ya tiene registros académicos/,
        );
        await assign(
          a.id,
          a.docente_id,
          a.curso_id,
          a.asignatura_id,
          false,
          a.updated_at,
        );
      }),
  );
  await check(
    "roles no administrativos, perfil inactivo y anon no guardan",
    async () => {
      for (const n of [3, 4, 5, 6, 7, 8])
        await role(n, async () => {
          await rejects(() => save(null), /Dirección y Secretaría/);
          await rejects(
            () => assign(null, uid(203), uid(302), subjects[0]),
            /Dirección y Secretaría/,
          );
        });
      await role(
        null,
        () => rejects(() => save(null), /permission denied/),
        "anon",
      );
    },
  );
  await check(
    "SQL de vinculación exige Auth existente y no sobrescribe perfiles",
    async () => {
      const script = readFileSync(
        new URL("../06_vincular_cuenta_docente.sql", import.meta.url),
        "utf8",
      );
      await rejects(() => db.exec(script), /Edita correo/);
      const filled = script
        .replace(
          "v_correo text := 'CAMBIA_POR_CORREO_DOCENTE'",
          "v_correo text := 'nuevo@example.invalid'",
        )
        .replace(
          "v_docente text := 'CAMBIA_POR_UUID_DOCENTE'",
          `v_docente text := '${teacher}'`,
        );
      await rejects(() => db.exec(filled), /Crea primero/);
      await db.query(
        "insert into auth.users(id,email) values($1,'nuevo@example.invalid')",
        [uid(9)],
      );
      await db.exec(filled);
      assert.equal((await row("perfiles", uid(9))).rol, "DOCENTE");
      await rejects(() => db.exec(filled), /ya tiene perfil/);
    },
  );
  await check(
    "Secretaría no edita la persona de Dirección mediante docente",
    async () => {
      const d = await role(1, () => save(null, {}, uid(101)));
      const dr = await row("docentes", d),
        p = await row("personas", uid(101));
      await role(2, () =>
        rejects(
          () =>
            save(
              d,
              { nombres: "No cambiar" },
              null,
              dr.updated_at,
              p.updated_at,
            ),
          /no puede editar/,
        ),
      );
    },
  );
  await check(
    "auditoría registra actor y RPC no elevan privilegios",
    async () => {
      assert.ok(
        Number(
          (
            await scalar(
              "select count(*) n from public.auditoria where actor_id=$1 and tabla='asignaciones_docente'",
              [uid(2)],
            )
          ).n,
        ) > 0,
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
    "rechaza asignación a curso, materia o gestión inactivos",
    async () => {
      await db.query("update public.cursos set activo=false where id=$1", [
        uid(302),
      ]);
      await role(2, () =>
        rejects(
          () => assign(null, uid(203), uid(302), subjects[1]),
          /curso de una gestión activa/,
        ),
      );
      await db.query("update public.cursos set activo=true where id=$1", [
        uid(302),
      ]);
      await db.query("update public.asignaturas set activo=false where id=$1", [
        subjects[1],
      ]);
      await role(2, () =>
        rejects(
          () => assign(null, uid(203), uid(302), subjects[1]),
          /materia activa/,
        ),
      );
      await db.query("update public.asignaturas set activo=true where id=$1", [
        subjects[1],
      ]);
      await db.query("update public.gestiones set activo=false where id=$1", [
        g,
      ]);
      await role(2, () =>
        rejects(
          () => assign(null, uid(203), uid(302), subjects[1]),
          /curso de una gestión activa/,
        ),
      );
      await db.query("update public.gestiones set activo=true where id=$1", [
        g,
      ]);
    },
  );
  console.log(`RESULTADO docentes: ${passed} pruebas correctas.`);
} catch (e) {
  console.error("FALLO docentes:", e.message, e.where || "");
  process.exitCode = 1;
} finally {
  await db.close();
}
