/** Adaptador HTTP LOCAL para navegador: Auth simulado y PostgreSQL PGlite real.
 * Traduce un subconjunto de lecturas REST; no sustituye la Data API de Supabase.
 * Las RPC se ejecutan sin simulación, como authenticated y con RLS. */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
export async function createTestDatabase(ids) {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  const dir = new URL("../supabase/migrations/", import.meta.url);
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(new URL(file, dir), "utf8"));
  // Calendario exclusivamente ficticio del simulador; no se instala en Supabase.
  await db.exec(
    "update public.trimestres set fecha_inicio='2026-01-01',fecha_fin='2026-12-31',estado='ABIERTO' where numero=1",
  );
  for (const id of ids) {
    await db.query("insert into auth.users values($1)", [id]);
    await db.query(
      "insert into public.personas(id,nombres,apellido_paterno) values($1,$2,'Prueba')",
      [id, id === ids[0] ? "Dirección ficticia" : "Cuenta ficticia"],
    );
  }
  await db.query("insert into public.docentes(persona_id) values($1)", [
    ids[3],
  ]);
  await db.query("insert into public.tutores(persona_id) values($1)", [ids[4]]);
  for (const [n, role] of [
    [0, "DIRECTOR"],
    [2, "SECRETARIA"],
    [3, "DOCENTE"],
    [4, "PADRE"],
  ])
    await db.query(
      "insert into public.perfiles(id,persona_id,rol) values($1,$1,$2)",
      [ids[n], role],
    );
  const tables = new Set(
    (
      await db.query(
        "select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v')",
      )
    ).rows.map((r) => r.relname),
  );
  const rpc = {
    consultar_informe: [
      "p_tipo",
      "p_curso",
      "p_trimestre",
      "p_desde",
      "p_hasta",
    ],
    consultar_comunicados: ["p_pagina"],
    consultar_comunicado: ["p_id"],
    guardar_comunicado: [
      "p_id",
      "p_version",
      "p_titulo",
      "p_contenido",
      "p_institucional",
      "p_cursos",
    ],
    cambiar_estado_comunicado: [
      "p_id",
      "p_version",
      "p_publicar",
      "p_confirmar",
    ],
    consultar_horario_curso: ["p_curso"],
    guardar_periodo_horario: [
      "p_id",
      "p_version",
      "p_inicio",
      "p_fin",
      "p_confirmar",
    ],
    guardar_bloque_horario: [
      "p_curso",
      "p_id",
      "p_version",
      "p_asignacion",
      "p_asignacion_version",
      "p_periodo",
      "p_periodo_version",
      "p_dia",
    ],
    retirar_bloque_horario: ["p_id", "p_version", "p_confirmar"],
    consultar_registro_calificaciones: [
      "p_asignacion",
      "p_trimestre",
      "p_matricula",
    ],
    gestionar_criterio_calificacion: [
      "p_asignacion",
      "p_trimestre",
      "p_criterio",
      "p_version",
      "p_dimension",
      "p_nombre",
      "p_orden",
      "p_eliminar",
    ],
    guardar_calificacion_estudiante: [
      "p_asignacion",
      "p_trimestre",
      "p_matricula",
      "p_version",
      "p_notas",
      "p_autoevaluacion",
      "p_extra",
      "p_motivo",
      "p_accion",
    ],
    consultar_asistencia_curso: ["p_curso", "p_fecha"],
    guardar_asistencia_curso: [
      "p_curso",
      "p_fecha",
      "p_jornada",
      "p_version",
      "p_filas",
      "p_observacion",
    ],
    cambiar_publicacion_asistencia: ["p_jornada", "p_version", "p_publicar"],
    guardar_docente_academico: [
      "p_id",
      "p_persona_id",
      "p_persona",
      "p_especialidad",
      "p_activo",
      "p_version",
      "p_persona_version",
    ],
    guardar_asignacion_academica: [
      "p_id",
      "p_docente",
      "p_curso",
      "p_asignatura",
      "p_activo",
      "p_version",
    ],
    guardar_ficha_academica: [
      "p_tipo",
      "p_id",
      "p_persona",
      "p_ficha",
      "p_version",
      "p_persona_version",
    ],
    guardar_curso_academico: [
      "p_id",
      "p_gestion",
      "p_grado",
      "p_paralelo",
      "p_activo",
      "p_version",
    ],
    vincular_tutor_academico: [
      "p_estudiante",
      "p_tutor",
      "p_parentesco",
      "p_autorizado",
      "p_principal",
    ],
    guardar_matricula_academica: [
      "p_id",
      "p_estudiante",
      "p_curso",
      "p_ingreso",
      "p_salida",
      "p_estado",
      "p_version",
    ],
  };
  let queue = Promise.resolve();
  const serialized = (task) => {
    const next = queue.then(task, task);
    queue = next.catch(() => {});
    return next;
  };
  async function readTable(name) {
    return (
      await db.query(`select to_jsonb(r) r from public.${name} r`)
    ).rows.map((x) => x.r);
  }
  return async function handle({ url, id, method, raw, accept }) {
    return serialized(async () => {
      await db.exec("begin;set local role authenticated");
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
        id,
      ]);
      try {
        const name = url.pathname.split("/").pop();
        if (url.pathname.includes("/rpc/")) {
          if (!rpc[name] || method !== "POST")
            throw { code: "PGRST202", message: "Function not found" };
          const body = JSON.parse(raw || "{}");
          const args = rpc[name].map((key) => body[key] ?? null);
          const result = await db.query(
            `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) result`,
            args,
          );
          await db.exec("commit");
          return { status: 200, data: result.rows[0].result || null };
        }
        if (!tables.has(name) || !["GET", "HEAD"].includes(method))
          throw { code: "PGRST205", message: "Table not found" };
        let rows = await readTable(name);
        const select = url.searchParams.get("select") || "*";
        // Carga relaciones bajo la misma sesión/RLS; selecciones necesarias por las páginas.
        const cache = new Map();
        const related = async (table, column, id) => {
          if (!cache.has(table)) cache.set(table, await readTable(table));
          return cache.get(table).find((r) => r[column] === id) || null;
        };
        const enrich = async (table, row) => {
          const r = { ...row };
          if (table === "trimestres")
            r.gestiones = await related("gestiones", "id", r.gestion_id);
          if (["estudiantes", "tutores", "docentes"].includes(table))
            r.personas = await related("personas", "id", r.persona_id);
          if (table === "cursos") {
            r.gestiones = await related("gestiones", "id", r.gestion_id);
            r.grados = await related("grados", "id", r.grado_id);
          }
          if (table === "matriculas") {
            const s = await related("estudiantes", "id", r.estudiante_id),
              c = await related("cursos", "id", r.curso_id);
            r.estudiantes = s ? await enrich("estudiantes", s) : null;
            r.cursos = c ? await enrich("cursos", c) : null;
          }
          if (table === "estudiante_tutor") {
            const t = await related("tutores", "id", r.tutor_id);
            r.tutores = t ? await enrich("tutores", t) : null;
          }
          if (table === "asignaciones_docente") {
            const d = await related("docentes", "id", r.docente_id),
              c = await related("cursos", "id", r.curso_id);
            r.docentes = d ? await enrich("docentes", d) : null;
            r.cursos = c ? await enrich("cursos", c) : null;
            r.gestiones = await related("gestiones", "id", r.gestion_id);
            r.asignaturas = await related("asignaturas", "id", r.asignatura_id);
          }
          return r;
        };
        if (/personas|gestiones|grados|estudiantes|cursos|tutores/.test(select))
          rows = await Promise.all(rows.map((r) => enrich(name, r)));
        const valueAt = (r, path) =>
          path.split(".").reduce((v, k) => v?.[k], r);
        for (const [key, filter] of url.searchParams) {
          if (["select", "limit", "offset", "order"].includes(key)) continue;
          if (key.endsWith("or")) {
            const path = key === "or" ? "" : key.slice(0, -3);
            const parts = filter.replace(/^\(|\)$/g, "").split(",");
            rows = rows.filter((row) =>
              parts.some((part) => {
                const [column, op, ...text] = part.split(".");
                return (
                  op === "ilike" &&
                  String(
                    valueAt(row, path ? `${path}.${column}` : column) || "",
                  )
                    .toLowerCase()
                    .includes(text.join(".").replaceAll("%", "").toLowerCase())
                );
              }),
            );
          } else {
            const [op, ...tail] = filter.split(".");
            const value = tail.join(".");
            if (op === "eq")
              rows = rows.filter((r) => String(valueAt(r, key)) === value);
            if (op === "ilike")
              rows = rows.filter((r) =>
                String(valueAt(r, key) || "")
                  .toLowerCase()
                  .includes(value.replaceAll("%", "").toLowerCase()),
              );
            if (op === "in")
              rows = rows.filter((r) =>
                value
                  .replace(/^\(|\)$/g, "")
                  .split(",")
                  .includes(String(valueAt(r, key))),
              );
          }
        }
        const order = (url.searchParams.get("order") || "")
          .split(",")
          .filter(Boolean);
        rows.sort((a, b) => {
          for (const rule of order) {
            const [key, direction] = rule.split(".");
            const av = valueAt(a, key),
              bv = valueAt(b, key);
            if (av === bv) continue;
            const result = av < bv ? -1 : 1;
            return direction === "desc" ? -result : result;
          }
          return 0;
        });
        const total = rows.length;
        const offset = Number(url.searchParams.get("offset") || 0);
        const limit = Number(url.searchParams.get("limit") || total);
        rows = rows.slice(offset, offset + limit);
        const singular = String(accept).includes(
          "application/vnd.pgrst.object+json",
        );
        if (singular && rows.length !== 1)
          throw {
            code: "PGRST116",
            message: "JSON object requested, multiple (or no) rows returned",
            details: `The result contains ${rows.length} rows`,
          };
        await db.exec("commit");
        return {
          status: 200,
          data: singular ? rows[0] : rows,
          headers: {
            "Content-Range": rows.length
              ? `${offset}-${offset + rows.length - 1}/${total}`
              : `*/${total}`,
          },
        };
      } catch (error) {
        await db.exec("rollback");
        return {
          status:
            error.code === "42501"
              ? 403
              : error.code === "PGRST116"
                ? 406
                : 400,
          data: {
            code: error.code,
            message: error.message,
            details: error.details || null,
            hint: null,
          },
        };
      }
    });
  };
}
