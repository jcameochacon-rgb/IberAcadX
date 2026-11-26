/** Simulador local de Auth y respuestas REST para probar HTTP/cookies de la web.
 * No sustituye RLS: la integridad y el aislamiento se comprueban en test:db.
 * Nunca conecta a Supabase. Todos los usuarios/tokens son ficticios. */
import http from "node:http";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createTestDatabase } from "./e2e-database.mjs";
const tokenFor = (id) => {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const head = encode({ alg: "HS256", typ: "JWT" });
  const body = encode({
    sub: id,
    aud: "authenticated",
    role: "authenticated",
    iat: now,
    exp: now + 3600,
    iss: "http://127.0.0.1:54329/auth/v1",
    session_id: "00000000-0000-4000-8000-000000000090",
  });
  return `${head}.${body}.${createHmac("sha256", "solo-simulador-no-utilizar").update(`${head}.${body}`).digest("base64url")}`;
};
const ids = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
  "00000000-0000-4000-8000-000000000005",
];
const emails = [
  "director@example.invalid",
  "pendiente@example.invalid",
  "secretaria@example.invalid",
  "docente@example.invalid",
  "padre@example.invalid",
];
const database = await createTestDatabase(ids);
const sessions = new Map();
const user = (id) => ({
  id,
  aud: "authenticated",
  role: "authenticated",
  email: emails[ids.indexOf(id)],
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
});
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:54329");
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const respond = (status, data) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  const id = sessions.get(token);
  if (
    process.env.E2E_CAPTCHA === "true" &&
    ["/auth/v1/token", "/auth/v1/recover"].includes(url.pathname)
  ) {
    const body = JSON.parse(raw || "{}");
    if (
      body.gotrue_meta_security?.captcha_token !== "token-captcha-solo-pruebas"
    )
      return respond(400, {
        code: "captcha_failed",
        error_code: "captcha_failed",
        msg: "Invalid CAPTCHA",
      });
  }
  if (url.pathname === "/auth/v1/token") {
    const body = JSON.parse(raw || "{}");
    const match = ids[emails.indexOf(body.email)];
    if (
      url.searchParams.get("grant_type") !== "password" ||
      !match ||
      body.password !== "ContraseñaFicticia!"
    )
      return respond(400, {
        code: "invalid_credentials",
        msg: "Invalid login credentials",
      });
    const access_token = tokenFor(match);
    sessions.set(access_token, match);
    return respond(200, {
      access_token,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: `ficticio-${match}`,
      user: user(match),
    });
  }
  if (url.pathname === "/auth/v1/user")
    return id
      ? respond(200, user(id))
      : respond(401, { code: "bad_jwt", msg: "Invalid token" });
  if (url.pathname === "/auth/v1/logout") {
    sessions.delete(token);
    res.writeHead(204);
    return res.end();
  }
  if (url.pathname === "/auth/v1/recover") return respond(200, {});
  if (url.pathname.startsWith("/rest/v1/")) {
    if (!id) return respond(401, { message: "Unauthorized" });
    const result = await database({
      url,
      id,
      method: req.method,
      raw,
      accept: req.headers.accept,
    });
    res.writeHead(result.status, {
      "Content-Type": "application/json",
      ...result.headers,
    });
    return res.end(req.method === "HEAD" ? "" : JSON.stringify(result.data));
  }
  return respond(404, { message: "Ruta no simulada" });
});
server.listen(54329, "127.0.0.1", () => {
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(
        new URL("../node_modules/next/dist/bin/next", import.meta.url),
      ),
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3010",
    ],
    {
      cwd: new URL("../apps/web/", import.meta.url),
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_solo_pruebas",
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3010",
        ENABLE_DEMO: "true",
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_TURNSTILE_SITE_KEY:
          process.env.E2E_CAPTCHA === "true" ? "sitekey-solo-pruebas" : "",
      },
    },
  );
  // next se instala en la raíz por npm workspaces.
  child.on("exit", (code) => {
    server.close();
    process.exit(code || 0);
  });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      child.kill(signal);
      server.close();
    });
});
