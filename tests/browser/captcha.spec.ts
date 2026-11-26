import { test, expect, type Page } from "@playwright/test";

async function mockCaptcha(page: Page) {
  await page.route("https://challenges.cloudflare.com/turnstile/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
    window.turnstile = {
      render(el, options) {
        el.innerHTML = '<button type="button">Verificar prueba</button><button type="button">Vencer prueba</button><button type="button">Error prueba</button><button type="button">Token inválido prueba</button>';
        const b = el.querySelectorAll('button');
        b[0].onclick = () => options.callback('token-captcha-solo-pruebas');
        b[1].onclick = () => options['expired-callback']();
        b[2].onclick = () => options['error-callback']();
        b[3].onclick = () => options.callback('token-invalido');
        return 'mock';
      }, remove() {}, reset() {}
    };`,
    }),
  );
}
test("captcha: caducidad, error, rechazo del proveedor, renovación y acceso", async ({
  page,
}) => {
  await mockCaptcha(page);
  await page.goto("/login");
  const submit = page.getByRole("button", {
    name: "Iniciar sesión",
    exact: true,
  });
  await page.getByLabel("Correo electrónico").fill("director@example.invalid");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("ContraseñaFicticia!");
  await expect(submit).toBeDisabled();
  await page
    .getByRole("button", { name: "Verificar prueba", exact: true })
    .click();
  await expect(submit).toBeEnabled();
  await page.getByRole("button", { name: "Vencer prueba" }).click();
  await expect(submit).toBeDisabled();
  await page.getByRole("button", { name: "Error prueba" }).click();
  await expect(
    page.getByText("No se pudo verificar.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reintentar verificación" }).click();
  await page.getByRole("button", { name: "Token inválido prueba" }).click();
  await submit.click();
  await expect(
    page.getByText(
      "La verificación de seguridad no fue válida. Intenta de nuevo.",
    ),
  ).toBeVisible();
  await expect(submit).toBeDisabled();
  await page
    .getByRole("button", { name: "Verificar prueba", exact: true })
    .click();
  await page.getByLabel("Correo electrónico").fill("director@example.invalid");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("ContraseñaFicticia!");
  // A DOM manipulation cannot bypass server-side missing-token validation.
  await page
    .locator('input[name="captchaToken"]')
    .evaluate((el) => el.removeAttribute("name"));
  await submit.click();
  await expect(
    page.getByText("Completa la verificación de seguridad antes de continuar."),
  ).toBeVisible();
  await expect(submit).toBeDisabled();
  await page.reload();
  await page.getByLabel("Correo electrónico").fill("director@example.invalid");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("ContraseñaFicticia!");
  await page
    .getByRole("button", { name: "Verificar prueba", exact: true })
    .click();
  await submit.click();
  await expect(page).toHaveURL(/\/panel$/);
});
test("captcha también protege recuperación y se renueva tras enviar", async ({
  page,
}) => {
  await mockCaptcha(page);
  await page.goto("/recuperar-clave");
  await page.getByLabel("Correo electrónico").fill("director@example.invalid");
  const submit = page.getByRole("button", { name: "Enviar enlace" });
  await expect(submit).toBeDisabled();
  await page
    .getByRole("button", { name: "Verificar prueba", exact: true })
    .click();
  await submit.click();
  await expect(
    page.getByText("Si el correo corresponde", { exact: false }),
  ).toBeVisible();
  await expect(submit).toBeDisabled();
});
test("fallo al cargar captcha no habilita envío y permite reintentar", async ({
  page,
}) => {
  await page.route("https://challenges.cloudflare.com/turnstile/**", (r) =>
    r.abort(),
  );
  await page.goto("/login");
  await expect(
    page.getByText("No se pudo cargar el CAPTCHA.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Iniciar sesión", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Reintentar verificación" }),
  ).toBeVisible();
});
