import { expect, test } from '@playwright/test';
import { registrarCuentaTemporal } from './cuentas';
import {
  abrirMenuSiHaceFalta,
  campoPassword,
  conApiDe,
  iniciarSesionPorUI,
  omitirOnboarding,
  registrarPorUI,
} from './ui';

test.use({ storageState: { cookies: [], origins: [] } });

const RUTAS_PROTEGIDAS = ['/mis-postulaciones', '/ofertas', '/mi-progreso', '/mi-perfil', '/tablero', '/analytics', '/configuracion', '/onboarding'];

test('rutas protegidas sin sesión redirigen a Login', async ({ page }) => {
  for (const ruta of RUTAS_PROTEGIDAS) {
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  }
});

test('Mi cuenta (nombre, tema, contraseña) y sesión (cerrar, reingresar, los datos siguen)', async ({ page }) => {
  const nuevaPassword = 'Otra-clave-de-prueba-9!';

  // Cuenta propia: cambiar la contraseña o cerrar sesión no puede romper la sesión compartida de las demás specs.
  const cuenta = await registrarPorUI(page);
  await omitirOnboarding(page);
  const api = await conApiDe(cuenta);
  await api.sembrarOfertas([{ empresa: 'Delta Soft', rol: 'Analista Funcional', puntaje_scoring: 0 }]);

  // --- Nombre ---
  await abrirMenuSiHaceFalta(page);
  await page.getByRole('button', { name: 'Mi cuenta' }).click();
  await page.getByLabel('Nombre para mostrar').fill('Sofía Gimenez');
  await page.getByRole('button', { name: 'Guardar nombre' }).click();
  await expect(page.getByText('Nombre guardado.')).toBeVisible();

  await page.reload();
  await abrirMenuSiHaceFalta(page);
  await page.getByRole('button', { name: 'Mi cuenta' }).click();
  await expect(page.getByLabel('Nombre para mostrar')).toHaveValue('Sofía Gimenez');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Mi cuenta' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Mi cuenta' }).click();

  // --- Tema ---
  const html = page.locator('html');
  const claro = await html.getAttribute('data-theme');
  const interruptor = page.getByRole('switch', { name: /modo (claro|oscuro)/ });
  await interruptor.click();
  const otro = claro === 'dark' ? 'light' : 'dark';
  await expect(html).toHaveAttribute('data-theme', otro);
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', otro);

  // --- Contraseña ---
  await abrirMenuSiHaceFalta(page);
  await page.getByRole('button', { name: 'Mi cuenta' }).click();
  await page.getByLabel(/^Nueva contraseña/).fill(nuevaPassword);
  await page.getByLabel('Confirmar nueva contraseña').fill(nuevaPassword);
  await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
  await expect(page.getByText('Contraseña actualizada.')).toBeVisible();
  registrarCuentaTemporal({ email: cuenta.email, password: nuevaPassword });

  // --- Cerrar sesión: vuelve a Login y la ruta protegida ya no deja pasar ---
  await page.reload();
  await abrirMenuSiHaceFalta(page);
  await page.getByRole('button', { name: 'Cerrar Sesión' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/ofertas');
  await expect(page).toHaveURL(/\/$/);

  // --- La contraseña vieja ya no sirve; la nueva sí, y los datos siguen ahí ---
  await iniciarSesionPorUI(page, cuenta);
  await expect(page.getByText('El email y la contraseña no coinciden. Revisalos o recuperá tu contraseña.')).toBeVisible();
  await campoPassword(page).fill(nuevaPassword);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/mis-postulaciones$/);

  await page.goto('/ofertas');
  await expect(page.getByRole('heading', { name: 'Analista Funcional', level: 3 })).toBeVisible();
});
