import { test, expect } from "@playwright/test";
test("portada y páginas institucionales mantienen navegación pública", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Más cerca",
  );
  for (const [label, route, title] of [
    ["Institución", "/institucion", "Nuestra institución"],
    ["Vida escolar", "/vida-escolar", "Vida escolar"],
    ["Trayectoria", "/trayectoria", "Trayectoria institucional"],
    ["Contacto y ubicación", "/contacto", "Contacto y ubicación"],
  ]) {
    await page
      .getByRole("navigation", { name: "Navegación institucional" })
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(route + "$"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  }
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    /google.com\/maps\/embed/,
  );
});
test("menú público móvil accesible y sin desbordamiento", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Abrir menú institucional" });
  await toggle.click();
  await expect(
    page.getByRole("button", { name: "Cerrar menú institucional" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("navigation", { name: "Navegación institucional" })
    .getByRole("link", { name: "Iniciar sesión" })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "Abrir menú institucional" }),
  ).toHaveAttribute("aria-expanded", "false");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
