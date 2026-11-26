import { test, expect } from "@playwright/test";

test("un acordeón principal abierto, CRUD y nombres exactos", async ({
  page,
}) => {
  await page.goto("/demo?rol=DIRECTOR");
  const nav = page.getByRole("navigation", { name: "Módulos académicos" });
  const users = nav.getByRole("button", {
    name: "Gestión de usuarios",
    exact: true,
  });
  const subjects = nav.getByRole("button", {
    name: "Administración de asignaturas",
    exact: true,
  });
  await users.click();
  await expect(users).toHaveAttribute("aria-expanded", "true");
  await nav
    .getByRole("button", { name: "Registro de estudiante", exact: true })
    .click();
  await nav.getByRole("link", { name: "Registrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Registro de estudiante", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Guardar ejemplo" }),
  ).toBeVisible();
  await subjects.click();
  await expect(users).toHaveAttribute("aria-expanded", "false");
  await expect(subjects).toHaveAttribute("aria-expanded", "true");
  await nav
    .getByRole("button", { name: "Control de horarios", exact: true })
    .click();
  await expect(
    nav.getByRole("link", { name: "Consultar", exact: true }),
  ).toBeVisible();
});

test("docente y estudiante reciben únicamente acciones permitidas", async ({
  page,
}) => {
  await page.goto("/demo?rol=DOCENTE");
  const nav = page.getByRole("navigation", { name: "Módulos académicos" });
  await nav
    .getByRole("button", { name: "Gestión de usuarios", exact: true })
    .click();
  await expect(
    nav.getByRole("button", { name: "Gestionar usuarios", exact: true }),
  ).toHaveCount(0);
  await expect(
    nav.getByRole("button", { name: "Gestión de docente", exact: true }),
  ).toHaveCount(0);
  await nav
    .getByRole("button", { name: "Registro de estudiante", exact: true })
    .click();
  await expect(
    nav.getByRole("link", { name: "Consultar", exact: true }),
  ).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Registrar", exact: true }),
  ).toHaveCount(0);
  await page.goto("/demo?rol=ESTUDIANTE");
  await expect(
    nav.getByRole("button", { name: "Gestión de usuarios", exact: true }),
  ).toHaveCount(0);
  await nav
    .getByRole("button", { name: "Control de asistencia", exact: true })
    .click();
  await expect(
    nav.getByRole("link", { name: "Consultar asistencia", exact: true }),
  ).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Registrar asistencia", exact: true }),
  ).toHaveCount(0);
  await nav
    .getByRole("button", { name: "Informes y reportes", exact: true })
    .click();
  await expect(
    nav.getByRole("link", { name: "Generar informe/reporte", exact: true }),
  ).toHaveCount(0);
});

test("menú móvil deslizable, Escape y contenido sin desbordamiento", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo?rol=DIRECTOR");
  const open = page.getByRole("button", { name: "Abrir menú", exact: true });
  await open.click();
  await expect(open).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("button", { name: "Control de asistencia", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Consultar asistencia", exact: true })
    .click();
  await expect(open).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("heading", { name: "Control de asistencia", exact: true }),
  ).toBeVisible();
  await open.click();
  await page.keyboard.press("Escape");
  await expect(open).toBeFocused();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
});
