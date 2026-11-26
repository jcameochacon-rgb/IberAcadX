import { test, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
const login = async (
  page: import("@playwright/test").Page,
  email = "director@example.invalid",
) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("ContraseñaFicticia!");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
};
test("login compacto mantiene el formulario visible en móvil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Inicia sesión", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Iniciar sesión", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("link", { name: "Olvidé mi contraseña", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("rutas privadas exigen sesión y no permiten acceso con cookie falsificada", async ({
  page,
  context,
}) => {
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/login$/);
  const fake = {
    access_token:
      "eyJhbGciOiJIUzI1NiJ9." +
      Buffer.from(
        JSON.stringify({
          sub: "00000000-0000-4000-8000-000000000001",
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString("base64url") +
      ".falsa",
    refresh_token: "ficticio",
  };
  await context.addCookies([
    {
      name: "sb-127-auth-token",
      value:
        "base64-" + Buffer.from(JSON.stringify(fake)).toString("base64url"),
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/login$/);
});
test("credenciales inválidas muestran error sin abrir el panel", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("director@example.invalid");
  await page.getByLabel("Contraseña", { exact: true }).fill("incorrecta");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "No pudimos iniciar sesión" }),
  ).toContainText("No pudimos iniciar sesión");
  await expect(page).toHaveURL(/\/login$/);
});
test("login con sesión simulada abre un dashboard vacío y logout cierra el acceso", async ({
  page,
}) => {
  await login(page);
  await expect(page).toHaveURL(/\/panel$/);
  await expect(
    page.getByRole("heading", { name: "Visión institucional" }),
  ).toBeVisible();
  await expect(
    page.getByText("Dirección ficticia Prueba", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/login$/);
});
test("cuenta sin perfil se queda en acceso pendiente", async ({ page }) => {
  await login(page, "pendiente@example.invalid");
  await expect(page).toHaveURL(/\/acceso-pendiente$/);
  await expect(
    page.getByRole("heading", { name: "Acceso pendiente" }),
  ).toBeVisible();
});
test("recuperación presenta un mensaje que no revela si existe la cuenta", async ({
  page,
}) => {
  await page.goto("/recuperar-clave");
  await page
    .getByLabel("Correo electrónico")
    .fill("desconocido@example.invalid");
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Si el correo corresponde",
  );
});
test("demo permite cambiar rol y buscar únicamente entre sus datos ficticios", async ({
  page,
}) => {
  await page.goto("/demo");
  await expect(
    page.getByText("Demostración visual.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Ver como").selectOption("PADRE");
  await expect(page).toHaveURL(/rol=PADRE/);
  await page.getByRole("link", { name: "Mis hijos", exact: true }).click();
  await expect(page.getByRole("table")).toContainText("Lucía Ejemplo");
  await expect(page.getByRole("table")).not.toContainText("Daniel Ejemplo");
  await page
    .getByRole("textbox", { name: "Buscar en Estudiantes" })
    .fill("Mateo");
  await expect(page.getByRole("table")).toContainText("Mateo Ejemplo");
  await expect(page.getByRole("table")).not.toContainText("Lucía Ejemplo");
});
test("los seis módulos demo navegan y una ruta desconocida devuelve 404", async ({
  page,
}) => {
  for (const module of [
    "estudiantes",
    "cursos",
    "calificaciones",
    "asistencia",
    "horarios",
    "comunicados",
  ]) {
    await page.goto(`/demo/${module}?rol=DIRECTOR`);
    await expect(page.getByRole("table")).toBeVisible();
  }
  const response = await page.goto("/demo/no-existe");
  expect(response?.status()).toBe(404);
});
test("menú y tabla funcionan en pantalla móvil sin desbordar la página", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
  await page.getByRole("link", { name: "Asistencia", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Asistencia." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
