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
async function setup(page: Page, parallel: string) {
  await page.goto("/panel/gestion/cursos?nuevo=1");
  await page.getByLabel("Grado de primaria").selectOption("4");
  await page.getByLabel("Paralelo *", { exact: true }).fill(parallel);
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await saved(page);
  const c = new URL(page.url()).searchParams.get("id")!;
  await page.goto(`/panel/gestion/asignaciones?nuevo=1&curso=${c}`);
  await pick(page, "Docente", "Cuenta", "Cuenta ficticia Prueba");
  await pick(page, "Materia", "Matemática", "Matemática");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await saved(page);
  const a = new URL(page.url()).searchParams.get("id")!;
  await page.goto(`/panel/horarios/semana?curso=${c}`);
  return { c, a };
}
async function configure(page: Page, n: number, start: string, end: string) {
  const details = page.locator("details");
  if ((await details.getAttribute("open")) === null)
    await details.locator("summary").click();
  const f = page.locator("form").filter({
    has: page.getByRole("button", {
      name: `Guardar periodo ${n}`,
      exact: true,
    }),
  });
  await f.getByLabel(`Inicio del periodo ${n}`, { exact: true }).fill(start);
  await f.getByLabel(`Fin del periodo ${n}`, { exact: true }).fill(end);
  await f.getByRole("checkbox").check();
  await f
    .getByRole("button", { name: `Guardar periodo ${n}`, exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Periodo actualizado" }),
  ).toBeVisible();
}
async function block(page: Page, a: string, day: string, n: number) {
  await page.getByLabel("Materia y docente", { exact: true }).selectOption(a);
  await page.getByLabel("Día de clase", { exact: true }).selectOption(day);
  const option = page
    .locator("#schedule-period option")
    .filter({ hasText: `Periodo ${n} ·` });
  await page
    .getByLabel("Periodo de clase", { exact: true })
    .selectOption((await option.getAttribute("value")) || "");
}
test("horarios: Secretaría configura periodos, evita cruces, edita y retira bloques", async ({
  page,
}) => {
  await login(page, "secretaria@example.invalid");
  const { c, a } = await setup(page, "HA");
  await configure(page, 1, "14:00", "14:40");
  await configure(page, 2, "14:40", "15:20");
  await block(page, a, "1", 1);
  await page
    .getByRole("button", { name: "Añadir bloque", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Bloque guardado" }),
  ).toBeVisible();
  await block(page, a, "1", 1);
  await page
    .getByRole("button", { name: "Añadir bloque", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "ya tiene una clase",
  );
  await expect(
    page.getByLabel("Materia y docente", { exact: true }),
  ).toHaveValue(a);
  await page
    .getByRole("link", { name: "Editar Lunes periodo 1", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Editar bloque", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Día de clase", { exact: true }).selectOption("2");
  await page
    .getByRole("button", { name: "Guardar cambios del bloque", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Editar Martes periodo 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Editar Lunes periodo 1", exact: true }),
  ).toHaveCount(0);
  const second = await setup(page, "HB");
  await block(page, second.a, "2", 1);
  await page
    .getByRole("button", { name: "Añadir bloque", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "ya tiene una clase",
  );
  await page.goto(`/panel/horarios/semana?curso=${c}`);
  await page
    .getByRole("link", { name: "Editar Martes periodo 1", exact: true })
    .click();
  const remove = page.locator("form").filter({
    has: page.getByRole("button", { name: "Retirar bloque", exact: true }),
  });
  await remove.getByRole("checkbox").check();
  await remove
    .getByRole("button", { name: "Retirar bloque", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Bloque retirado" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Editar Martes periodo 1", exact: true }),
  ).toHaveCount(0);
});
test("horarios: conflicto entre pestañas conserva selección y vista móvil no desborda", async ({
  page,
  context,
}) => {
  await login(page);
  const { c, a } = await setup(page, "HC");
  await configure(page, 1, "14:00", "14:40");
  await block(page, a, "3", 1);
  await page
    .getByRole("button", { name: "Añadir bloque", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Editar Miércoles periodo 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Editar Miércoles periodo 1", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Editar bloque", exact: true }),
  ).toBeVisible();
  const second = await context.newPage();
  await second.goto(page.url());
  await second.getByLabel("Día de clase", { exact: true }).selectOption("5");
  await page.getByLabel("Día de clase", { exact: true }).selectOption("4");
  await page
    .getByRole("button", { name: "Guardar cambios del bloque", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Editar Jueves periodo 1", exact: true }),
  ).toBeVisible();
  await second
    .getByRole("button", { name: "Guardar cambios del bloque", exact: true })
    .click();
  await expect(second.getByRole("main").getByRole("alert")).toContainText(
    "Otra persona modificó",
  );
  await expect(second.getByLabel("Día de clase", { exact: true })).toHaveValue(
    "5",
  );
  await second.close();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/panel/horarios/semana?curso=${c}`);
  await expect(
    page.getByRole("heading", { name: "Horario semanal.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Añadir bloque", exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
  });
  await page.screenshot({
    path: "docs/preview/horarios-escritorio.png",
    fullPage: true,
    style: "nextjs-portal {display:none}",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Horario semanal.", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Añadir bloque", exact: true })
    .scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
  });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: "docs/preview/horarios-movil.png",
    fullPage: true,
    style: "nextjs-portal {display:none}",
  });
});
test("horarios: docente consulta sin botones administrativos", async ({
  page,
}) => {
  await login(page);
  const { c, a } = await setup(page, "HD");
  await configure(page, 1, "14:00", "14:40");
  await block(page, a, "5", 1);
  await page
    .getByRole("button", { name: "Añadir bloque", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Bloque guardado" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "docente@example.invalid");
  await page.goto(`/panel/horarios/semana?curso=${c}`);
  await expect(page.getByRole("main")).toContainText("Matemática");
  await expect(
    page.getByRole("button", { name: "Añadir bloque", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Configurar horas de los periodos", { exact: true }),
  ).toHaveCount(0);
});
