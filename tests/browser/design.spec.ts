import { test, expect } from "@playwright/test";

test("diseño: portada, login y panel adaptables con movimiento reducido", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/", "/login", "/demo"]) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      if (width !== 320)
        await page.screenshot({
          path: `docs/preview/diseno-${route === "/" ? "portada" : route.slice(1)}-${width}.png`,
          fullPage: true,
          animations: "disabled",
          style: "nextjs-portal { display:none; }",
        });
    }
  }
});

test("diseño: galería y contacto usan páginas propias", async ({ page }) => {
  await page.goto("/vida-escolar");
  await expect(page.locator("#galeria")).toBeVisible();
  await expect(page.locator("#galeria img").first()).toBeVisible();
  await page.goto("/contacto");
  await expect(page.locator("#contacto")).toBeVisible();
  await expect(page.locator("iframe")).toHaveAttribute("loading", "lazy");
});
