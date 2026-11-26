import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
let passed = 0;
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const check = async (name, fn) => {
  await fn();
  console.log(`OK comunicados ${++passed}: ${name}`);
};
async function role(n, fn) {
  await db.exec("set role authenticated");
  await q("select set_config('request.jwt.claim.sub',$1,false)", [uid(n)]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
async function reject(fn) {
  await db.exec("begin");
  let error;
  try {
    await fn();
  } catch (e) {
    error = e;
  } finally {
    await db.exec("rollback");
  }
  assert.ok(error, "Debe rechazar la operación");
}
const save = async ({
  id = null,
  version = null,
  title = "Aviso de prueba",
  body = "Texto ficticio",
  institutional = false,
  courses = [uid(30)],
} = {}) =>
  (
    await q("select public.guardar_comunicado($1,$2,$3,$4,$5,$6) id", [
      id,
      version,
      title,
      body,
      institutional,
      JSON.stringify(courses),
    ])
  )[0].id;
const read = async (id) =>
  (await q("select public.consultar_comunicado($1) x", [id]))[0].x;
const state = async (n, publish = true, confirm = true) =>
  q("select public.cambiar_estado_comunicado($1,$2,$3,$4)", [
    n.id,
    n.updated_at,
    publish,
    confirm,
  ]);
try {
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
  const dir = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(new URL(f, dir), "utf8"));
  for (let n = 1; n <= 6; n++) {
    await q("insert into auth.users values($1)", [uid(n)]);
    await q(
      "insert into public.personas(id,nombres,apellido_paterno) values($1,'Persona','Ficticia')",
      [uid(n)],
    );
  }
  await q("insert into public.docentes(id,persona_id) values($1,$2),($3,$4)", [
    uid(13),
    uid(3),
    uid(14),
    uid(4),
  ]);
  await q("insert into public.tutores(id,persona_id) values($1,$2)", [
    uid(15),
    uid(5),
  ]);
  for (const [n, r] of [
    [1, "DIRECTOR"],
    [2, "SECRETARIA"],
    [3, "DOCENTE"],
    [4, "DOCENTE"],
    [5, "PADRE"],
  ])
    await q("insert into public.perfiles(id,persona_id,rol) values($1,$1,$2)", [
      uid(n),
      r,
    ]);
  const g = (await q("select id from public.gestiones where anio=2026"))[0].id;
  await q(
    "insert into public.cursos(id,gestion_id,grado_id,paralelo) values($1,$3,1,'A'),($2,$3,1,'B')",
    [uid(30), uid(31), g],
  );
  const subject = (await q("select id from public.asignaturas limit 1"))[0].id;
  await q(
    "insert into public.asignaciones_docente(docente_id,curso_id,gestion_id,asignatura_id) values($1,$2,$3,$4)",
    [uid(13), uid(30), g, subject],
  );
  await q("insert into public.estudiantes(id,persona_id) values($1,$2)", [
    uid(16),
    uid(6),
  ]);
  await q(
    "insert into public.matriculas(estudiante_id,curso_id,gestion_id,fecha_ingreso) values($1,$2,$3,'2026-02-01')",
    [uid(16), uid(30), g],
  );
  await q(
    "insert into public.estudiante_tutor(estudiante_id,tutor_id,parentesco) values($1,$2,'Tutor')",
    [uid(16), uid(15)],
  );
  let id, draft;
  await check(
    "RPC invoker, sin ejecución anónima y migración reaplicable",
    async () => {
      await db.exec(
        readFileSync(new URL("202610120001_comunicados.sql", dir), "utf8"),
      );
      const rows = await q(
        "select prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') anon from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('consultar_comunicados','consultar_comunicado','guardar_comunicado','cambiar_estado_comunicado')",
      );
      assert.equal(rows.length, 4);
      assert.ok(rows.every((r) => !r.prosecdef && !r.anon));
    },
  );
  await check("docente crea borrador para su curso", () =>
    role(3, async () => {
      id = await save();
      draft = await read(id);
      assert.equal(draft.estado, "BORRADOR");
      assert.equal(draft.destinatarios.length, 1);
    }),
  );
  await check("familia y docente ajeno no ven borrador", async () => {
    await role(5, () => reject(() => read(id)));
    await role(4, () => reject(() => read(id)));
  });
  await check("docente no crea institucional ni para otro curso", () =>
    role(3, async () => {
      await reject(() => save({ institutional: true, courses: [] }));
      await reject(() => save({ courses: [uid(31)] }));
    }),
  );
  await check("validación rechaza vacío y destinatarios ausentes", () =>
    role(1, async () => {
      await reject(() => save({ title: " " }));
      await reject(() => save({ courses: [] }));
      await reject(() => save({ body: "x".repeat(10001) }));
    }),
  );
  await check("publicar requiere confirmación y versión vigente", () =>
    role(3, async () => {
      await reject(() => state(draft, true, false));
      await reject(() => state({ ...draft, updated_at: null }));
      await state(draft);
    }),
  );
  await check(
    "familia vinculada consulta publicado y docente ajeno no",
    async () => {
      await role(5, async () =>
        assert.equal((await read(id)).estado, "PUBLICADO"),
      );
      await role(4, () => reject(() => read(id)));
    },
  );
  await check("familia no puede redactar ni retirar", () =>
    role(5, async () => {
      const n = await read(id);
      await reject(() => save());
      await reject(() => state(n, false));
    }),
  );
  await check(
    "publicado no admite edición, retiro oculta a familia",
    async () => {
      await role(3, async () => {
        const n = await read(id);
        await reject(() => save({ id, version: n.updated_at }));
        await state(n, false);
      });
      await role(5, () => reject(() => read(id)));
    },
  );
  await check("edición rechaza versión anterior y conserva texto", () =>
    role(3, async () => {
      const n = await read(id);
      await save({ id, version: n.updated_at, title: "Revisado" });
      await reject(() =>
        save({ id, version: n.updated_at, title: "Obsoleto" }),
      );
      assert.equal((await read(id)).titulo, "Revisado");
    }),
  );
  await check(
    "secretaría publica institucional para cuentas activas",
    async () => {
      const iid = await role(2, async () => {
        const x = await save({ institutional: true, courses: [] });
        await state(await read(x));
        return x;
      });
      await role(4, async () =>
        assert.equal((await read(iid)).institucional, true),
      );
    },
  );
  await check("curso desactivado impide publicación", async () => {
    await q("update public.cursos set activo=false where id=$1", [uid(30)]);
    await role(3, async () => reject(async () => state(await read(id))));
  });
  await check("paginación y auditoría", async () => {
    await role(1, async () => {
      for (let i = 0; i < 21; i++)
        await save({ institutional: true, courses: [] });
      const a = (await q("select public.consultar_comunicados(1) x"))[0].x,
        b = (await q("select public.consultar_comunicados(2) x"))[0].x;
      assert.equal(a.items.length, 20);
      assert.ok(b.items.length > 0);
      assert.ok(a.items.every((x) => !b.items.some((y) => y.id === x.id)));
    });
    assert.ok((await q("select count(*) n from public.auditoria"))[0].n > 0);
  });
  console.log(`${passed} pruebas de comunicados correctas`);
} finally {
  await db.close();
}
