import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, email = "director@example.invalid") {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("ContraseñaFicticia!");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/panel$/);
}
async function saved(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: "Registro guardado" }),
  ).toBeVisible();
}
async function pick(page: Page, label: string, query: string, option: string) {
  const search = page.getByRole("textbox", {
    name: `Buscar ${label.toLowerCase()}`,
    exact: true,
  });
  await search.fill(query);
  await search
    .locator("..")
    .getByRole("button", { name: "Buscar", exact: true })
    .click();
  await expect(page.getByLabel(`${label} *`, { exact: true })).toContainText(
    option,
  );
  await page
    .getByLabel(`${label} *`, { exact: true })
    .selectOption({ label: option });
}
async function course(page: Page, parallel: string) {
  await page.goto("/panel/gestion/cursos?nuevo=1");
  await page.getByLabel("Grado de primaria").selectOption("3");
  await page.getByLabel("Paralelo *", { exact: true }).fill(parallel);
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await saved(page);
  return new URL(page.url()).searchParams.get("id")!;
}
async function student(
  page: Page,
  name: string,
  parallel: string,
  parent = false,
) {
  await page.goto("/panel/gestion/estudiantes?nuevo=1");
  await page.getByLabel("Nombres *", { exact: true }).fill(name);
  await page.getByLabel("Apellido paterno", { exact: true }).fill("Prueba");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await saved(page);
  if (parent) {
    await pick(page, "Tutor", "Cuenta", "Cuenta ficticia Prueba");
    await page.getByLabel("Parentesco").fill("Tutor");
    await page
      .getByRole("button", { name: "Vincular tutor", exact: true })
      .click();
    await expect(
      page.getByText("Tutor · Consulta autorizada", { exact: false }),
    ).toBeVisible();
  }
  await page.getByRole("link", { name: "Matricular", exact: true }).click();
  await pick(page, "Curso", parallel, `3° ${parallel} · 2026`);
  await page.getByLabel("Fecha de ingreso").fill("2026-02-01");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await saved(page);
}
async function setup(
  page: Page,
  parallel: string,
  name: string,
  parent = false,
) {
  await login(page);
  const c = await course(page, parallel);
  await student(page, name, parallel, parent);
  await page.goto(`/panel/gestion/asignaciones?nuevo=1&curso=${c}`);
  await pick(page, "Docente", "Cuenta", "Cuenta ficticia Prueba");
  await pick(page, "Materia", "Matemática", "Matemática");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await saved(page);
  const a = new URL(page.url()).searchParams.get("id")!;
  await page.goto(`/panel/calificaciones/registro?asignacion=${a}`);
  await expect(
    page.getByRole("heading", { name: "Registro de calificaciones." }),
  ).toBeVisible();
  for (const d of ["SER", "SABER", "HACER"]) {
    const details = page.locator("details");
    if ((await details.getAttribute("open")) === null)
      await details.locator("summary").click();
    const f = page.locator("form").filter({
      has: page.getByRole("button", {
        name: "Añadir actividad",
        exact: true,
      }),
    });
    await f.getByLabel("Dimensión", { exact: true }).selectOption(d);
    await f.getByLabel("Nombre de actividad").fill(`${d} prueba`);
    await f
      .getByRole("button", { name: "Añadir actividad", exact: true })
      .click();
    await expect(details.locator("summary")).toHaveText(
      `Actividades de evaluación (${["SER", "SABER", "HACER"].indexOf(d) + 1})`,
    );
  }
  const option = page.locator("#matricula option").filter({ hasText: name });
  await page
    .getByLabel("Estudiante", { exact: true })
    .selectOption((await option.getAttribute("value")) || "");
  await page
    .getByRole("button", { name: "Cargar estudiante", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: `Prueba ${name}`, exact: true }),
  ).toBeVisible();
  return page.url();
}
async function draftGrade(page: Page) {
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Borrador guardado" }),
  ).toBeVisible();
}
async function completeGrade(page: Page) {
  await page.getByLabel("SER prueba / 10", { exact: true }).fill("9");
  await page.getByLabel("SABER prueba / 45", { exact: true }).fill("43");
  await page.getByLabel("HACER prueba / 40", { exact: true }).fill("38");
  await page.getByLabel("Autoevaluación / 5", { exact: true }).fill("4");
}

test("informe publicado, CSV completo, impresión y acceso familiar", async ({
  page,
}) => {
  await setup(page, "RP", "Informe ficticio", true);
  await completeGrade(page);
  await draftGrade(page);
  await page
    .getByRole("button", { name: "Guardar y publicar", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "publicada" }),
  ).toBeVisible();
  await page.goto("/panel/informes");
  await page
    .getByLabel("Curso", { exact: true })
    .selectOption({ label: "3° RP · 2026" });
  await page
    .getByLabel("Trimestre (calificaciones)", { exact: true })
    .selectOption({ label: "Trimestre 1 · 2026" });
  await page.getByRole("button", { name: "Generar informe" }).click();
  await expect(
    page.getByRole("cell", { name: "Prueba Informe ficticio", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "94", exact: true }),
  ).toBeVisible();
  const csvHref = await page
    .getByRole("link", { name: "Descargar CSV" })
    .getAttribute("href");
  const csv = await page.request.get(csvHref!);
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(csv.headers()["cache-control"]).toContain("no-store");
  expect(await csv.text()).toContain("Prueba Informe ficticio");
  expect(await csv.text()).toContain('"94"');
  await page.screenshot({
    path: "docs/preview/informes-escritorio.png",
    style: "nextjs-portal { display: none !important; }",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("link", { name: "Preparar impresión / PDF" }).click();
  await expect(
    page.getByRole("button", { name: "Imprimir / Guardar PDF" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "94", exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: "docs/preview/informe-ejemplo-ficticio.pdf",
    preferCSSPageSize: true,
  });
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("link", { name: "Volver al informe" }).click();
  await expect(
    page.getByRole("heading", { name: "Informes académicos." }),
  ).toBeVisible();
  const url = page.url();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/preview/informes-movil.png",
    style: "nextjs-portal { display: none !important; }",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/login");
  await page.context().clearCookies();
  await login(page, "padre@example.invalid");
  await page.goto(url);
  await expect(
    page.getByRole("cell", { name: "Prueba Informe ficticio", exact: true }),
  ).toBeVisible();
});
test("rechaza filtros inválidos y bloquea descarga sin sesión", async ({
  page,
}) => {
  const url =
    "/panel/informes/csv?tipo=calificaciones&curso=00000000-0000-4000-8000-000000000001";
  const anon = await page.request.get(url, { maxRedirects: 0 });
  expect([302, 303, 307, 308]).toContain(anon.status());
  await login(page);
  const bad = await page.request.get("/panel/informes/csv?tipo=otro");
  expect(bad.status()).toBe(400);
  expect(bad.headers()["content-disposition"]).toBeUndefined();
  await page.goto(
    "/panel/informes?tipo=asistencia&curso=00000000-0000-4000-8000-000000000001&desde=2026-02-30&hasta=2026-03-01",
  );
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "fechas válidas",
  );
});
