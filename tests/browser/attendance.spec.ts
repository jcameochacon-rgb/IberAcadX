import { test, expect, type Page } from "@playwright/test";
const date = "2026-03-16";
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
async function sheet(page: Page, id: string) {
  await page.goto(`/panel/asistencia/registro?curso=${id}&fecha=${date}`);
  await expect(
    page.getByRole("heading", { name: "Registro de asistencia." }),
  ).toBeVisible();
}
async function draft(page: Page) {
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      r.url().includes("/panel/asistencia/registro"),
  );
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await response;
  await expect(
    page.getByRole("status").filter({ hasText: "Borrador guardado" }),
  ).toBeVisible();
}
test("Dirección guarda parcial, completa, publica y despublica sin duplicar la jornada", async ({
  page,
}) => {
  await login(page);
  const c = await course(page, "EA");
  await student(page, "Ana asistencia", "EA");
  await student(page, "Luis asistencia", "EA");
  await sheet(page, c);
  const ana = page.getByLabel("Marca de Prueba Ana asistencia", {
      exact: true,
    }),
    luis = page.getByLabel("Marca de Prueba Luis asistencia", { exact: true });
  await expect(ana).toHaveValue("");
  await ana.selectOption("A");
  await draft(page);
  await page.reload();
  await expect(ana).toHaveValue("A");
  await expect(luis).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Publicar jornada", exact: true }),
  ).toBeDisabled();
  await luis.selectOption("L");
  await page
    .getByLabel("Observación de Prueba Luis asistencia", { exact: true })
    .fill("Licencia ficticia");
  await draft(page);
  await expect(
    page.getByRole("button", { name: "Publicar jornada", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Publicar jornada", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jornada publicada" }),
  ).toBeVisible();
  await expect(ana).toBeDisabled();
  await page
    .getByRole("button", { name: "Despublicar para corregir", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jornada despublicada" }),
  ).toBeVisible();
  await expect(ana).toBeEnabled();
  await ana.selectOption("R");
  await draft(page);
  await page.reload();
  await expect(ana).toHaveValue("R");
});
test("docente asignado publica y Padre consulta solamente marcas publicadas", async ({
  page,
}) => {
  await login(page);
  const c = await course(page, "EB");
  await student(page, "Familia asistencia", "EB", true);
  await page.goto(`/panel/gestion/asignaciones?nuevo=1&curso=${c}`);
  await pick(page, "Docente", "Cuenta", "Cuenta ficticia Prueba");
  await pick(page, "Materia", "Matemática", "Matemática");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await saved(page);
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "docente@example.invalid");
  await page.goto("/panel/asistencia");
  await page
    .getByRole("link", { name: "Registrar asistencia", exact: true })
    .click();
  await sheet(page, c);
  await page
    .getByLabel("Marca de Prueba Familia asistencia", { exact: true })
    .selectOption("F");
  await draft(page);
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "padre@example.invalid");
  await page.goto("/panel/asistencia");
  await expect(page.getByRole("main")).not.toContainText("Familia asistencia");
  await expect(
    page.getByRole("link", { name: "Registrar asistencia", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "docente@example.invalid");
  await sheet(page, c);
  await page
    .getByRole("button", { name: "Publicar jornada", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jornada publicada" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "padre@example.invalid");
  await page.goto("/panel/asistencia");
  await expect(page.getByRole("table")).toContainText("Familia asistencia");
  await expect(page.getByRole("table")).toContainText("Falta");
  await page.goto(`/panel/asistencia/registro?curso=${c}&fecha=${date}`);
  await expect(
    page.getByRole("heading", { name: "Acceso restringido" }),
  ).toBeVisible();
});
test("edición simultánea muestra conflicto y conserva las marcas sin guardar", async ({
  page,
  context,
}) => {
  await login(page);
  const c = await course(page, "EC");
  await student(page, "Simultánea asistencia", "EC");
  await sheet(page, c);
  await page
    .getByLabel("Marca de Prueba Simultánea asistencia", { exact: true })
    .selectOption("A");
  await draft(page);
  const other = await context.newPage();
  await sheet(other, c);
  await page
    .getByLabel("Marca de Prueba Simultánea asistencia", { exact: true })
    .selectOption("F");
  await draft(page);
  await other
    .getByLabel("Marca de Prueba Simultánea asistencia", { exact: true })
    .selectOption("L");
  await other
    .getByLabel("Observación de Prueba Simultánea asistencia", { exact: true })
    .fill("Edición sin guardar");
  await other
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await expect(
    other.getByRole("alert").filter({ hasText: "Otra persona modificó" }),
  ).toBeVisible();
  await expect(
    other.getByLabel("Marca de Prueba Simultánea asistencia", { exact: true }),
  ).toHaveValue("L");
  await expect(
    other.getByLabel("Observación de Prueba Simultánea asistencia", {
      exact: true,
    }),
  ).toHaveValue("Edición sin guardar");
  await other.reload();
  await expect(
    other.getByLabel("Marca de Prueba Simultánea asistencia", { exact: true }),
  ).toHaveValue("F");
  await other.close();
});
test("registro móvil no desborda y marcar pendientes respeta faltas existentes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const c = await course(page, "ED");
  await student(page, "Móvil uno", "ED");
  await student(page, "Móvil dos", "ED");
  await sheet(page, c);
  const first = page.getByLabel("Marca de Prueba Móvil uno", { exact: true });
  await first.selectOption("F");
  await page
    .getByRole("button", {
      name: "Marcar pendientes como presentes",
      exact: true,
    })
    .click();
  await expect(first).toHaveValue("F");
  await expect(
    page.getByLabel("Marca de Prueba Móvil dos", { exact: true }),
  ).toHaveValue("A");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await draft(page);
  await page.reload();
  await expect(first).toHaveValue("F");
});
test("Secretaría conserva consulta y no puede abrir la captura", async ({
  page,
}) => {
  await login(page, "secretaria@example.invalid");
  await page.goto("/panel/asistencia");
  await expect(
    page.getByRole("link", { name: "Registrar asistencia", exact: true }),
  ).toHaveCount(0);
  await page.goto("/panel/asistencia/registro");
  await expect(
    page.getByRole("heading", { name: "Acceso restringido" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Guardar borrador", exact: true }),
  ).toHaveCount(0);
});
