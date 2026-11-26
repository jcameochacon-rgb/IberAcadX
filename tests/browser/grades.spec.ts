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
test("calificaciones: configura actividades, guarda parcial y publica con privacidad familiar", async ({
  page,
}) => {
  const url = await setup(page, "FA", "Familia calificaciones", true);
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "docente@example.invalid");
  await page.goto(url);
  await page.getByLabel("SER prueba / 10", { exact: true }).fill("0");
  await draftGrade(page);
  await page.reload();
  await expect(page.getByLabel("SER prueba / 10", { exact: true })).toHaveValue(
    "0",
  );
  await expect(
    page.getByLabel("SABER prueba / 45", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Guardar y publicar", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "padre@example.invalid");
  await page.goto("/panel/calificaciones");
  await expect(page.getByRole("main")).not.toContainText(
    "Familia calificaciones",
  );
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "docente@example.invalid");
  await page.goto(url);
  await completeGrade(page);
  await page.getByLabel("Puntos extra / 100", { exact: true }).fill("2");
  await page
    .getByLabel("Motivo de los puntos extra", { exact: true })
    .fill("Participación ficticia");
  await page
    .getByRole("button", { name: "Guardar y publicar", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Calificación publicada" }),
  ).toBeVisible();
  await expect(
    page.getByText("Nota final guardada:", { exact: false }),
  ).toContainText("96");
  await expect(
    page.getByLabel("SER prueba / 10", { exact: true }),
  ).toHaveAttribute("readonly", "");
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "padre@example.invalid");
  await page.goto("/panel/calificaciones");
  await expect(page.getByRole("main")).toContainText("Familia calificaciones");
  await expect(page.getByRole("main")).toContainText("96");
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "docente@example.invalid");
  await page.goto(url);
  await page
    .getByRole("button", { name: "Despublicar para corregir", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Calificación despublicada" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("SER prueba / 10", { exact: true }),
  ).not.toHaveAttribute("readonly", "");
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "padre@example.invalid");
  await page.goto("/panel/calificaciones");
  await expect(page.getByRole("main")).not.toContainText(
    "Familia calificaciones",
  );
});
test("calificaciones: conflicto entre pestañas conserva lo escrito", async ({
  page,
  context,
}) => {
  const url = await setup(page, "FB", "Conflicto calificaciones");
  await completeGrade(page);
  await draftGrade(page);
  const second = await context.newPage();
  await second.goto(url);
  await second.getByLabel("SER prueba / 10", { exact: true }).fill("7");
  await page.getByLabel("SER prueba / 10", { exact: true }).fill("8");
  await draftGrade(page);
  await second
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await expect(second.getByRole("main").getByRole("alert")).toContainText(
    "Otra persona modificó",
  );
  await expect(
    second.getByLabel("SER prueba / 10", { exact: true }),
  ).toHaveValue("7");
  await second.reload();
  await expect(
    second.getByLabel("SER prueba / 10", { exact: true }),
  ).toHaveValue("8");
  await second.close();
});
test("calificaciones: móvil, actividad nueva actualiza lista y trimestre planificado bloquea", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, "FC", "Móvil calificaciones");
  await completeGrade(page);
  await draftGrade(page);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
  });
  await page.screenshot({
    path: "docs/preview/calificaciones-movil.png",
    fullPage: true,
    style: "nextjs-portal { display: none; }",
  });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.reload();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
  });
  await page.screenshot({
    path: "docs/preview/calificaciones-escritorio.png",
    fullPage: true,
    style: "nextjs-portal { display: none; }",
  });
  const details = page.locator("details");
  if ((await details.getAttribute("open")) === null)
    await details.locator("summary").click();
  const f = page.locator("form").filter({
    has: page.getByRole("button", { name: "Añadir actividad", exact: true }),
  });
  await f.getByLabel("Nombre de actividad").fill("Nueva actividad");
  await f
    .getByRole("button", { name: "Añadir actividad", exact: true })
    .click();
  await expect(
    page.getByLabel("Nueva actividad / 10", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Guardar y publicar", exact: true }),
  ).toBeDisabled();
  const planned = page
    .locator("#trimestre option")
    .filter({ hasText: "Trimestre 2" });
  await page
    .getByLabel("Trimestre", { exact: true })
    .selectOption((await planned.getAttribute("value")) || "");
  await page
    .getByRole("button", { name: "Cargar trimestre", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "trimestre abierto",
  );
  await expect(
    page.getByRole("button", { name: "Añadir actividad", exact: true }),
  ).toBeDisabled();
});
test("calificaciones: Secretaría consulta y no abre registro", async ({
  page,
}) => {
  await login(page, "secretaria@example.invalid");
  await page.goto("/panel/calificaciones");
  await expect(
    page.getByRole("link", { name: "Registrar calificaciones", exact: true }),
  ).toHaveCount(0);
  await page.goto("/panel/calificaciones/registro");
  await expect(
    page.getByRole("heading", { name: "Acceso restringido" }),
  ).toBeVisible();
});
