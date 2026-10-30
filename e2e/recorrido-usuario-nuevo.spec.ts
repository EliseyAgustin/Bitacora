import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { cuentaCompartida, proyectoDe } from './cuentas';
import { arbeitnow, mockearFuentes, remotive } from './mocks';
import { abrirMenuSiHaceFalta, campoPassword, conApiDe, iniciarSesionPorUI, registrarPorUI } from './ui';

// Recorrido completo de alguien que no conoce la app, desde un registro nuevo hasta volver a entrar.
// Las fuentes de ofertas y el envío de mails se interceptan; todo lo demás va contra el servicio real.
test.use({ storageState: { cookies: [], origins: [] } });

const DIA = 24 * 60 * 60 * 1000;
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

async function foto(page: Page, info: TestInfo, nombre: string) {
  await page.screenshot({ path: info.outputPath(`${nombre}.png`) });
}

test('registro con errores, perfil guiado, primeros pasos, postulación, recordatorio, salida y recuperación', async ({ page }, info) => {
  const { email: emailExistente } = cuentaCompartida(proyectoDe(info));

  // --- Registro con errores a propósito ---
  await page.goto('/');
  await page.getByRole('button', { name: '¿No tenés cuenta? Registrate' }).click();
  await page.getByLabel('Email').fill('sin-arroba.com');
  await campoPassword(page).fill('abc1234');
  await page.getByRole('button', { name: 'Registrarme' }).click();
  await expect(page.getByText('Escribí un email válido, por ejemplo nombre@correo.com')).toBeVisible();
  await expect(page.getByText('La contraseña tiene que tener al menos 8 caracteres.')).toBeVisible();
  await foto(page, info, '01-registro-errores');

  await page.getByLabel('Email').fill(emailExistente);
  await campoPassword(page).fill('Una-clave-larga-9!');
  await page.getByRole('button', { name: 'Registrarme' }).click();
  await expect(page.getByText('Ese email ya tiene una cuenta.')).toBeVisible();

  // --- Registro correcto y perfil guiado ---
  const cuenta = await registrarPorUI(page);
  await page.getByLabel('¿Cómo te llamás?').fill('Julieta Rojas');
  await page.getByLabel('Rol que buscás').fill('Frontend Developer');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'React', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Remoto', exact: true }).click();
  await page.getByPlaceholder('Ej: Buenos Aires, Argentina').fill('Argentina');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click(); // nivel de experiencia: opcional
  await expect(page.getByText('Podés cambiarlos cuando quieras en Mi perfil de búsqueda.')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar y terminar' }).click();
  await expect(page.getByRole('heading', { name: 'Tu perfil quedó listo' })).toBeVisible();
  await page.getByRole('button', { name: 'Ver ofertas' }).click();

  // --- Primeros pasos con el perfil ya armado, y la pantalla de Ofertas vacía que guía ---
  await expect(page).toHaveURL(/\/ofertas$/);
  const paso1 = page.getByRole('listitem').filter({ hasText: 'Revisá tu perfil de búsqueda' });
  await expect(paso1).toHaveAttribute('data-estado', 'hecho');
  await expect(page.getByText(/Todavía no armaste tu perfil de búsqueda/)).toHaveCount(0);
  await expect(page.getByText('Todavía no hay ofertas cargadas.')).toBeVisible();
  await foto(page, info, '02-ofertas-vacias');

  // --- Importar ofertas (fuentes interceptadas) ---
  await mockearFuentes(
    page,
    [remotive('Nubia Labs', 'React Engineer', 'Argentina', ['React']), remotive('Orbita Soft', 'Backend Dev', 'Worldwide', ['Go'])],
    [arbeitnow('Kappa GmbH', 'React Dev', 'Berlin', ['React'])]
  );
  await page.getByRole('button', { name: 'Importar ofertas remotas' }).first().click();
  await expect(page.getByText('3 ofertas nuevas importadas')).toBeVisible();
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);
  await expect(page.getByText('Máximo posible con tu perfil: 30 puntos')).toBeVisible();
  await foto(page, info, '03-ofertas-importadas');

  // --- Postularse ---
  // La tarjeta de esa oferta: el artículo que tiene su título (no depende de que todavía tenga el botón "Postularme").
  const tarjeta = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'React Engineer', level: 3 }) });
  await tarjeta.getByRole('button', { name: 'Postularme' }).click();
  await expect(tarjeta.getByTitle('Ver ficha de la postulación')).toBeVisible();

  // --- Mis postulaciones: la tarjeta aparece y "Primeros pasos" ya no hace falta ---
  await abrirMenuSiHaceFalta(page);
  await page.getByRole('link', { name: 'Mis postulaciones', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'React Engineer', level: 4 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Primeros pasos' })).toHaveCount(0);

  // --- Recordatorio: se retrasa la postulación 10 días (autenticado como esa misma cuenta) ---
  const api = await conApiDe(cuenta);
  const { error } = await api.sb
    .from('postulaciones')
    .update({ created_at: new Date(Date.now() - 10 * DIA).toISOString() })
    .eq('estado', 'por_aplicar');
  expect(error).toBeNull();
  await page.reload();
  await expect(page.getByText('Sin novedades hace 10 días')).toBeVisible();
  await expect(page.getByText(/es solo un aviso, no se borra ni se cambia nada/)).toBeVisible();
  await foto(page, info, '04-recordatorio');

  await page.getByRole('heading', { name: 'React Engineer', level: 4 }).click();
  await expect(page.getByText('Es solo un recordatorio: no se borró ni se cambió nada.')).toBeVisible();
  await foto(page, info, '05-ficha-recordatorio');
  await page.reload();

  // --- Cerrar sesión ---
  await abrirMenuSiHaceFalta(page);
  await page.getByRole('button', { name: 'Cerrar Sesión' }).click();
  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();

  // --- "¿Olvidaste tu contraseña?" (el mail se intercepta) ---
  await page.route('**/auth/v1/recover*', (route) =>
    route.fulfill({ status: route.request().method() === 'OPTIONS' ? 204 : 200, headers: CORS, json: {} })
  );
  await page.getByLabel('Email').fill(cuenta.email);
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page.getByLabel('Email')).toHaveValue(cuenta.email);
  await page.getByRole('button', { name: 'Enviar enlace' }).click();
  await expect(page.getByText(/Si el email existe, te enviamos un enlace/)).toBeVisible();
  await foto(page, info, '06-recuperar');

  // --- Volver a entrar: los datos siguen ahí ---
  await iniciarSesionPorUI(page, cuenta);
  await expect(page).toHaveURL(/\/mis-postulaciones$/);
  await expect(page.getByRole('heading', { name: 'React Engineer', level: 4 })).toBeVisible();
  await expect(page.getByText('Sin novedades hace 10 días')).toBeVisible();

  await abrirMenuSiHaceFalta(page);
  await page.getByRole('link', { name: 'Mi progreso', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mi progreso', level: 1 })).toBeVisible();
  await expect(page.getByText('Calculando métricas…')).toHaveCount(0);
  await foto(page, info, '07-mi-progreso');
});
