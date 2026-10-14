import { expect, test, type Page } from '@playwright/test';
import { cuentaCompartida, emailNuevo, proyectoDe } from './cuentas';
import { campoPassword, iniciarSesionPorUI } from './ui';

// Login, Registro y recuperación de contraseña: solo interfaz y mensajes. El envío de mails se intercepta
// (no se manda ninguno real, por los límites del servicio de correo) y la cuenta compartida no se modifica.
test.use({ storageState: { cookies: [], origins: [] } });

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

async function mockearAuth(
  page: Page,
  patron: string,
  respuesta: { status: number; json?: unknown } | 'caida'
) {
  await page.route(patron, (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (respuesta === 'caida') return route.abort('connectionrefused');
    return route.fulfill({ status: respuesta.status, headers: CORS, json: respuesta.json ?? {} });
  });
}

const EMAIL_INVALIDO = 'Escribí un email válido, por ejemplo nombre@correo.com';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('valida en español y sin los avisos nativos del navegador', async ({ page }) => {
    await expect(page.locator('form')).toHaveAttribute('novalidate', '');

    // Todo vacío.
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByText('Escribí tu email.')).toBeVisible();
    await expect(page.getByText('Escribí tu contraseña.')).toBeVisible();

    // Email sin arroba: mensaje propio, sin la palabra "incluye".
    await page.getByLabel('Email').fill('nombrecorreo.com');
    await campoPassword(page).fill('cualquiera');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByText(EMAIL_INVALIDO)).toBeVisible();
    await expect(page.getByText(/incluye/i)).toHaveCount(0);
    await expect(page.getByLabel('Email')).toBeFocused();
  });

  test('credenciales incorrectas: mensaje en español, igual exista o no la cuenta', async ({ page }, testInfo) => {
    const { email } = cuentaCompartida(proyectoDe(testInfo));
    const mensaje = 'El email y la contraseña no coinciden. Revisalos o recuperá tu contraseña.';

    // Cuenta que existe, contraseña equivocada.
    await page.getByLabel('Email').fill(email);
    await campoPassword(page).fill('contraseña-equivocada-1');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByText(mensaje)).toBeVisible();
    const conCuentaExistente = await page.getByRole('alert').filter({ hasText: 'no coinciden' }).textContent();

    // Cuenta que no existe: exactamente el mismo texto (no revela cuál de los dos datos falla).
    await page.getByLabel('Email').fill(emailNuevo());
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByText(mensaje)).toBeVisible();
    expect(await page.getByRole('alert').filter({ hasText: 'no coinciden' }).textContent()).toBe(conCuentaExistente);

    await expect(page.getByText(/invalid|credentials/i)).toHaveCount(0);
  });

  test('error de red: mensaje genérico en español, nunca en inglés', async ({ page }) => {
    await mockearAuth(page, '**/auth/v1/token*', 'caida');
    await page.getByLabel('Email').fill('nombre@correo.com');
    await campoPassword(page).fill('lo-que-sea-123');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByText(/No pudimos conectarnos con el servicio/)).toBeVisible();
    await expect(page.getByText(/fetch|network|failed/i)).toHaveCount(0);
  });

  test('"¿Olvidaste tu contraseña?" lleva a la recuperación con el email ya escrito', async ({ page }) => {
    await page.getByLabel('Email').fill('nombre@correo.com');
    await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
    await expect(page).toHaveURL(/\/recuperar$/);
    await expect(page.getByLabel('Email')).toHaveValue('nombre@correo.com');
  });
});

test.describe('Registro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '¿No tenés cuenta? Registrate' }).click();
  });

  test('valida el email y la contraseña, y el medidor marca una contraseña débil', async ({ page }) => {
    await page.getByLabel('Email').fill('sin-arroba');
    await page.getByRole('button', { name: 'Registrarme' }).click();
    await expect(page.getByText(EMAIL_INVALIDO)).toBeVisible();
    await expect(page.getByText('Elegí una contraseña.')).toBeVisible();

    await page.getByLabel('Email').fill('nombre@correo.com');
    await campoPassword(page).fill('abc');
    await expect(page.getByText('Contraseña débil')).toBeVisible();
    await page.getByRole('button', { name: 'Registrarme' }).click();
    await expect(page.getByText('La contraseña tiene que tener al menos 8 caracteres.')).toBeVisible();

    await campoPassword(page).fill('Una-clave-larga-9!');
    await expect(page.getByText('Contraseña fuerte')).toBeVisible();
  });

  test('email repetido: avisa con enlaces para iniciar sesión o recuperar la contraseña', async ({ page }, testInfo) => {
    const { email } = cuentaCompartida(proyectoDe(testInfo));
    await page.getByLabel('Email').fill(email);
    await campoPassword(page).fill('Una-clave-larga-9!');
    await page.getByRole('button', { name: 'Registrarme' }).click();

    await expect(
      page.getByText('Ese email ya tiene una cuenta. Podés iniciar sesión o recuperar tu contraseña.')
    ).toBeVisible();
    await expect(page.getByText(/already|registered/i)).toHaveCount(0);

    await page.getByRole('button', { name: 'iniciar sesión', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();

    // Y el otro enlace lleva a la recuperación con el email ya cargado.
    await page.getByRole('button', { name: '¿No tenés cuenta? Registrate' }).click();
    await page.getByLabel('Email').fill(email);
    await campoPassword(page).fill('Una-clave-larga-9!');
    await page.getByRole('button', { name: 'Registrarme' }).click();
    await page.getByRole('link', { name: 'recuperar tu contraseña' }).click();
    await expect(page).toHaveURL(/\/recuperar$/);
    await expect(page.getByLabel('Email')).toHaveValue(email);
  });
});

test.describe('Recuperar contraseña', () => {
  test('valida el email y muestra el mensaje neutro al enviar', async ({ page }) => {
    let pedidos = 0;
    await page.route('**/auth/v1/recover*', (route) => {
      if (route.request().method() !== 'OPTIONS') pedidos++;
      return route.fulfill({
        status: route.request().method() === 'OPTIONS' ? 204 : 200,
        headers: CORS,
        json: {},
      });
    });
    await page.goto('/recuperar');

    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByText('Escribí tu email.')).toBeVisible();
    await page.getByLabel('Email').fill('sin-arroba');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByText(EMAIL_INVALIDO)).toBeVisible();
    expect(pedidos).toBe(0);

    await page.getByLabel('Email').fill('alguien@correo.com');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByText(/Si el email existe, te enviamos un enlace/)).toBeVisible();
    expect(pedidos).toBe(1);

    // No se puede reenviar enseguida: el servicio permite un envío por minuto.
    await expect(page.getByRole('button', { name: /Podés pedir otro enlace en \d+ s/ })).toBeDisabled();

    // La pantalla pasa a "Revisá tu correo": paso 2 de 3, el email al que se pidió, consejos y salidas claras.
    await expect(page.getByRole('heading', { name: 'Revisá tu correo', level: 1 })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'Pedí el enlace' })).not.toHaveAttribute('aria-current', 'step');
    await expect(page.getByRole('listitem').filter({ hasText: 'Revisá tu correo' })).toHaveAttribute('aria-current', 'step');
    await expect(page.getByText('alguien@correo.com')).toBeVisible();
    await expect(page.getByText(/carpeta de spam/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver a iniciar sesión' })).toBeVisible();

    // "Usar otro email" vuelve al formulario sin perder lo escrito.
    await page.getByRole('button', { name: 'Usar otro email' }).click();
    await expect(page.getByRole('heading', { name: '¿Olvidaste tu contraseña?', level: 1 })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveValue('alguien@correo.com');
    await expect(page.getByRole('listitem').filter({ hasText: 'Pedí el enlace' })).toHaveAttribute('aria-current', 'step');
  });

  test('si se superó el límite de envíos, lo dice en español', async ({ page }) => {
    await mockearAuth(page, '**/auth/v1/recover*', {
      status: 429,
      json: { code: 429, error_code: 'over_email_send_rate_limit', msg: 'email rate limit exceeded' },
    });
    await page.goto('/recuperar');
    await page.getByLabel('Email').fill('alguien@correo.com');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByText(/Hiciste muchos intentos seguidos/)).toBeVisible();
    await expect(page.getByText(/Si el email existe/)).toHaveCount(0);
  });
});

test.describe('Nueva contraseña', () => {
  test('sin un enlace válido muestra que venció y ofrece pedir uno nuevo', async ({ page }) => {
    await page.goto('/nueva-contrasena');
    await expect(page.getByText(/El enlace venció o ya se usó/)).toBeVisible();
    await page.getByRole('link', { name: 'Pedir un enlace nuevo' }).click();
    await expect(page).toHaveURL(/\/recuperar$/);
  });

  test('un enlace vencido que vuelve con error en la URL también se explica en español', async ({ page }) => {
    await page.goto('/nueva-contrasena#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    await expect(page.getByText(/El enlace venció o ya se usó/)).toBeVisible();
    await expect(page.getByText(/otp_expired|invalid or has expired/i)).toHaveCount(0);
  });
});

test.describe('Nueva contraseña con sesión de recuperación', () => {
  // Con la sesión de la cuenta compartida (la misma que deja el enlace del mail). Todo lo que se envía se intercepta.
  test.beforeEach(async ({ page }, testInfo) => {
    await iniciarSesionPorUI(page, cuentaCompartida(proyectoDe(testInfo)));
    await expect(page).toHaveURL(/\/mis-postulaciones$/);
  });

  test('misma validación y medidor que el Registro, y confirma el cambio', async ({ page }) => {
    await page.route('**/auth/v1/user', (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      return route.fulfill({
        status: 200,
        headers: CORS,
        json: {
          id: '00000000-0000-0000-0000-000000000000',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'cuenta@correo.com',
          app_metadata: {},
          user_metadata: {},
          created_at: '2026-01-01T00:00:00Z',
        },
      });
    });

    await page.goto('/nueva-contrasena');
    await expect(page.getByRole('button', { name: 'Guardar contraseña nueva' })).toBeVisible();

    await page.getByRole('button', { name: 'Guardar contraseña nueva' }).click();
    await expect(page.getByText('Elegí una contraseña.')).toBeVisible();

    // La lista de requisitos se tilda en vivo: con "abc" falta todo; con una contraseña completa están los cuatro.
    const requisito = (id: string) => page.locator(`[data-requisito="${id}"]`);
    await expect(requisito('largo')).toHaveAttribute('data-cumplido', 'false');
    await page.getByLabel('Contraseña nueva').fill('abc');
    await expect(requisito('largo')).toHaveAttribute('data-cumplido', 'false');
    await expect(requisito('mayusculas')).toHaveAttribute('data-cumplido', 'false');
    await expect(page.getByText('Contraseña débil')).toBeVisible();
    await page.getByRole('button', { name: 'Guardar contraseña nueva' }).click();
    await expect(page.getByText('La contraseña tiene que tener al menos 8 caracteres.')).toBeVisible();

    await page.getByLabel('Contraseña nueva').fill('Una-clave-larga-9!');
    await expect(page.getByText('Contraseña fuerte')).toBeVisible();
    for (const id of ['largo', 'mayusculas', 'numero', 'simbolo']) {
      await expect(requisito(id), id).toHaveAttribute('data-cumplido', 'true');
    }
    await expect(page.getByRole('listitem').filter({ hasText: 'Elegí tu contraseña' })).toHaveAttribute('aria-current', 'step');
    await page.getByRole('button', { name: 'Guardar contraseña nueva' }).click();
    await expect(page.getByText('Repetí la contraseña para confirmarla.')).toBeVisible();

    await page.getByLabel('Repetí la contraseña').fill('Otra-clave-larga-9!');
    await page.getByRole('button', { name: 'Guardar contraseña nueva' }).click();
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible();

    // Recién con todo válido se envía el cambio al servicio (hasta acá no salió ningún pedido).
    await page.getByLabel('Repetí la contraseña').fill('Una-clave-larga-9!');
    const pedido = page.waitForRequest((r) => r.url().includes('/auth/v1/user') && r.method() === 'PUT');
    await page.getByRole('button', { name: 'Guardar contraseña nueva' }).click();
    expect((await pedido).postDataJSON()).toMatchObject({ password: 'Una-clave-larga-9!' });
    await expect(page.getByText(/Tu contraseña quedó actualizada/)).toBeVisible();
  });

  test('si el servicio rechaza la contraseña, el motivo se muestra en español', async ({ page }) => {
    await mockearAuth(page, '**/auth/v1/user', {
      status: 422,
      json: { code: 422, error_code: 'same_password', msg: 'New password should be different from the old password.' },
    });
    await page.goto('/nueva-contrasena');
    await page.getByLabel('Contraseña nueva').fill('Una-clave-larga-9!');
    await page.getByLabel('Repetí la contraseña').fill('Una-clave-larga-9!');
    await page.getByRole('button', { name: 'Guardar contraseña nueva' }).click();
    await expect(page.getByText('La nueva contraseña tiene que ser distinta de la anterior.')).toBeVisible();
    await expect(page.getByText(/should be different/i)).toHaveCount(0);
  });
});
