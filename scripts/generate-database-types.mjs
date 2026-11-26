// Tipos derivados de la migración local. En un proyecto instalado: supabase gen types typescript.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;`);
  const migrationDir = new URL("../supabase/migrations/", import.meta.url);
  for (const migration of readdirSync(migrationDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(new URL(migration, migrationDir), "utf8"));
  }
  const enums = (
    await db.query(`select t.typname, array_agg(e.enumlabel order by e.enumsortorder) values
 from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace
 where n.nspname='public' group by t.typname order by t.typname`)
  ).rows;
  const enumNames = new Set(enums.map((e) => e.typname));
  const tables = (
    await db.query(`select c.relname,c.relkind from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in ('r','v') order by c.relname`)
  ).rows;
  let result =
    "// Generado por scripts/generate-database-types.mjs desde la migración local.\n";
  const functions = (
    await db.query(`select p.proname, p.proargnames,
    array(select t.typname from unnest(p.proargtypes) with ordinality a(oid,n) join pg_type t on t.oid=a.oid order by a.n) argtypes,
    t.typname returns from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_type t on t.oid=p.prorettype
    where n.nspname='public' order by p.proname`)
  ).rows;
  const scalarType = (type) =>
    type === "jsonb"
      ? "Json"
      : type === "bool"
        ? "boolean"
        : ["int2", "int4", "int8", "numeric"].includes(type)
          ? "number"
          : type === "void"
            ? "undefined"
            : "string";
  const functionTypes = functions
    .map(
      (f) =>
        `${JSON.stringify(f.proname)}: { Args: {${f.proargnames.map((name, i) => `${JSON.stringify(name)}: ${scalarType(f.argtypes[i])} | null;`).join("\n")}}; Returns: ${scalarType(f.returns)}; };`,
    )
    .join("\n");
  result +=
    "export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\nexport type Database = { public: {\nTables: {\n";
  let views = "Views: {\n";
  for (const table of tables) {
    const cols = (
      await db.query(
        `select a.attname,t.typname,a.attnotnull,a.atthasdef,a.attidentity
   from pg_attribute a join pg_type t on t.oid=a.atttypid join pg_class c on c.oid=a.attrelid
   join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=$1 and a.attnum>0 and not a.attisdropped order by a.attnum`,
        [table.relname],
      )
    ).rows;
    const type = (c) =>
      enumNames.has(c.typname)
        ? `Database['public']['Enums']['${c.typname}']`
        : ["int2", "int4", "int8", "float4", "float8", "numeric"].includes(
              c.typname,
            )
          ? "number"
          : c.typname === "bool"
            ? "boolean"
            : ["json", "jsonb"].includes(c.typname)
              ? "Json"
              : "string";
    const fields = (insert = false) =>
      cols
        .map(
          (c) =>
            `${JSON.stringify(c.attname)}${insert && (!c.attnotnull || c.atthasdef || c.attidentity) ? "?" : ""}: ${type(c)}${!c.attnotnull ? " | null" : ""};`,
        )
        .join("\n");
    const fks = (
      await db.query(
        `select con.conname,con.confrelid::regclass::text as target,
   array(select attname from pg_attribute where attrelid=con.conrelid and attnum=any(con.conkey) order by array_position(con.conkey,attnum)) as columns,
   array(select attname from pg_attribute where attrelid=con.confrelid and attnum=any(con.confkey) order by array_position(con.confkey,attnum)) as referenced,
   exists(select 1 from pg_constraint u where u.conrelid=con.conrelid and u.contype in ('p','u') and u.conkey=con.conkey) as one_to_one
   from pg_constraint con where con.contype='f' and con.conrelid=('public.'||$1)::regclass order by con.conname`,
        [table.relname],
      )
    ).rows;
    const rel = fks
      .map(
        (f) =>
          `{foreignKeyName: ${JSON.stringify(f.conname)};columns: ${JSON.stringify(f.columns)};isOneToOne: ${f.one_to_one};referencedRelation: ${JSON.stringify(f.target.replace(/^public\./, ""))};referencedColumns: ${JSON.stringify(f.referenced)};}`,
      )
      .join(",\n");
    const block = `${JSON.stringify(table.relname)}: { Row: {${fields()}}; ${table.relkind === "r" ? `Insert: {${fields(true)}}; Update: Partial<Database['public']['Tables'][${JSON.stringify(table.relname)}]['Insert']>;` : ""} Relationships: [${rel}] };\n`;
    if (table.relkind === "r") result += block;
    else views += block;
  }
  result +=
    "};\n" +
    views +
    `};\nFunctions: { ${functionTypes} };\nEnums: {\n` +
    enums
      .map(
        (e) =>
          `${JSON.stringify(e.typname)}: ${e.values.map((v) => JSON.stringify(v)).join(" | ")};`,
      )
      .join("\n") +
    "\n};\nCompositeTypes: { [_ in never]: never };\n} };\n";
  writeFileSync(
    new URL("../packages/shared/src/database.types.ts", import.meta.url),
    result,
  );
  console.log(`Tipos: ${tables.length} tablas/vistas y ${enums.length} enums.`);
} finally {
  await db.close();
}
