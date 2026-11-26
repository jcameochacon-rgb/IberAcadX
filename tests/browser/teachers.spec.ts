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
async function pick(
  page: Page,
  label: string,
  query: string,
  optionLabel: string,
) {
  const search = page.getByRole("textbox", {
    name: `Buscar ${label.toLowerCase()}`,
    exact: true,
  });
  await search.fill(query);
  await search
    .locator("..")
    .getByRole("button", { name: "Buscar", exact: true })
    .click();
  const select = page.getByLabel(`${label} *`, { exact: true });
  await expect(select).toContainText(optionLabel);
  await select.selectOption({ label: optionLabel });
}
async function createTeacher(page: Page, name: string, ci: string) {
  await page.goto("/panel/gestion/docentes?nuevo=1");
  await page.getByLabel("Nombres *", { exact: true }).fill(name);
  await page.getByLabel("Apellido paterno", { exact: true }).fill("Prueba");
  await page.getByLabel("CI", { exact: true }).fill(ci);
  await page.getByLabel("Especialidad").fill("Primaria");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Registro guardado" }),
  ).toBeVisible();
  return new URL(page.url()).searchParams.get("id")!;
}
async function createCourse(page: Page, parallel: string) {
  await page.goto("/panel/gestion/cursos?nuevo=1");
  await page.getByLabel("Grado de primaria").selectOption("2");
  await page.getByLabel("Paralelo *", { exact: true }).fill(parallel);
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Registro guardado" }),
  ).toBeVisible();
  return new URL(page.url()).searchParams.get("id")!;
}

test("Secretaría registra y edita docente, y reutiliza la persona de un tutor", async ({
  page,
}) => {
  await login(page, "secretaria@example.invalid");
  const teacher = await createTeacher(page, "Docente fase cuatro", "CI-F4-1");
  await page.getByLabel("Especialidad").fill("Matemática");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("Especialidad")).toHaveValue("Matemática");
  await page.goto("/panel/gestion/docentes?q=fase");
  await expect(page.getByRole("table")).toContainText("Docente fase cuatro");
  await expect(
    page.getByRole("link", { name: /Editar Docente fase cuatro/ }),
  ).toHaveAttribute("href", `/panel/gestion/docentes?id=${teacher}`);
  await page.goto("/panel/gestion/tutores?nuevo=1");
  await page
    .getByLabel("Nombres *", { exact: true })
    .fill("Persona compartida");
  await page.getByLabel("CI", { exact: true }).fill("CI-COMPARTIDA-F4");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Registro guardado" }),
  ).toBeVisible();
  await page.goto("/panel/gestion/docentes?nuevo=1");
  await page
    .getByLabel("Datos personales *", { exact: true })
    .selectOption("existente");
  await expect(page.getByLabel("Nombres *", { exact: true })).toHaveCount(0);
  await pick(
    page,
    "Persona",
    "CI-COMPARTIDA-F4",
    "Persona compartida · CI CI-COMPARTIDA-F4",
  );
  await page.getByLabel("Especialidad").fill("Educación física");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Registro guardado" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nombres *", { exact: true })).toHaveValue(
    "Persona compartida",
  );
});

test("asigna materia, evita duplicados y permite reactivar la misma asignación", async ({
  page,
}) => {
  await login(page);
  await createCourse(page, "DA");
  const teacher = await createTeacher(page, "Docente asignado", "CI-F4-2");
  await page
    .getByRole("link", { name: "Asignar materia", exact: true })
    .click();
  await pick(page, "Curso", "DA", "2° DA · 2026");
  await pick(page, "Materia", "Matemática", "Matemática");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Registro guardado" }),
  ).toBeVisible();
  const assignment = new URL(page.url()).searchParams.get("id")!;
  await page.getByLabel("Asignación activa").uncheck();
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("Asignación activa")).not.toBeChecked();
  await page.goto(`/panel/gestion/asignaciones?nuevo=1&docente=${teacher}`);
  await pick(page, "Curso", "DA", "2° DA · 2026");
  await pick(page, "Materia", "Matemática", "Matemática");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "ya tiene una asignación" }),
  ).toBeVisible();
  await expect(page.getByLabel("Materia *", { exact: true })).toHaveValue(
    /^[0-9a-f-]+$/,
  );
  await page.goto(`/panel/gestion/asignaciones?id=${assignment}`);
  await page.getByLabel("Asignación activa").check();
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page.goto(`/panel/gestion/asignaciones?docente=${teacher}`);
  await expect(page.getByRole("table")).toContainText("Matemática");
  await expect(page.getByRole("table")).toContainText("Activa");
});

test("asignación concede acceso al curso y su desactivación lo revoca", async ({
  page,
}) => {
  await login(page);
  const course = await createCourse(page, "DB");
  await page
    .getByRole("link", { name: "Asignar materia", exact: true })
    .click();
  await pick(page, "Docente", "Cuenta", "Cuenta ficticia Prueba");
  await pick(page, "Materia", "Lenguaje", "Lenguaje");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Registro guardado" }),
  ).toBeVisible();
  const assignment = new URL(page.url()).searchParams.get("id")!;
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "docente@example.invalid");
  await page.goto("/panel/cursos");
  await expect(page.getByRole("table")).toContainText("2° DB");
  await expect(
    page.getByRole("link", { name: "Gestión académica", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page);
  await page.goto(`/panel/gestion/asignaciones?id=${assignment}`);
  await page.getByLabel("Asignación activa").uncheck();
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page.goto(`/panel/gestion/asignaciones?curso=${course}`);
  await expect(page.getByRole("table")).toContainText("Inactiva");
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "docente@example.invalid");
  await page.goto("/panel/cursos");
  await expect(page.getByRole("main")).not.toContainText("2° DB");
  await page.goto("/panel/gestion/asignaciones?nuevo=1");
  await expect(
    page.getByRole("heading", { name: "Acceso restringido" }),
  ).toBeVisible();
});

test("docente no pierde datos ante CI duplicado y formulario móvil no desborda", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await createTeacher(page, "Docente móvil", "CI-F4-3");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/panel/gestion/docentes?nuevo=1");
  await page.getByLabel("Nombres *", { exact: true }).fill("Ficha sin guardar");
  await page.getByLabel("CI", { exact: true }).fill("CI-F4-3");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Ya existe ese CI" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nombres *", { exact: true })).toHaveValue(
    "Ficha sin guardar",
  );
});
