import AxeBuilder from '@axe-core/playwright';
import { expect, test as base, type Page } from '@playwright/test';
import { cuentaAdministrador } from './cuentas';
import { test } from './fixtures';
import { abrirMenuSiHaceFalta, cerrarSesion, completarOnboarding, iniciarSesionPorUI, registrarPorUI } from './ui';

// Auditoría de accesibilidad automática (axe-core, criterios WCAG 2.0/2.1 nivel A y AA) de cada pantalla y estado importante,
// en tema claro y oscuro. Cualquier violación (contraste, nombres de controles, etiquetas, jerarquía, etc.) hace fallar la prueba.
// No reemplaza una revisión manual con lector de pantalla, pero atrapa los errores más comunes.
const TEMAS = ['light', 'dark'] as const;

async function sinViolaciones(page: Page, donde: string) {
  for (const tema of TEMAS) {
    await page.emulateMedia({ colorScheme: tema });
    await page.waitForTimeout(350); // deja terminar las transiciones de color
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const detalle = violations.map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
    expect(detalle, `${donde} [tema ${tema}]`).toEqual([]);
  }
}

test.describe('candidato (cuenta compartida)', () => {
  test('Ofertas, Mis postulaciones, ficha, Mi perfil, Mi progreso, Mensajes y los modales', async ({ page, api }) => {
    await api.sembrarOfertas([
      {
        empresa: 'Nubia Labs',
        rol: 'React Engineer',
        ubicacion: 'Argentina',
        stack_tecnologico: ['React'],
        fuente: 'Remotive',
        url: 'https://remotive.com/remote-jobs/software-dev/react-engineer-1',
        descripcion: 'Buscamos una persona para el equipo de producto.\n\n• Experiencia con React',
        puntaje_scoring: 25,
      },
      { empresa: 'Orbita Soft', rol: 'Backend Dev', ubicacion: 'Worldwide', puntaje_scoring: 10 },
    ]);
    const { data } = await api.sb.from('ofertas').select('id').eq('rol', 'React Engineer').single();
    await api.crearPostulacionDe(data!.id);

    await page.goto('/ofertas');
    await expect(page.getByRole('heading', { name: 'Ofertas', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(2);
    await sinViolaciones(page, 'Ofertas');

    await page.getByRole('button', { name: 'Nueva oferta' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await sinViolaciones(page, 'Formulario Nueva oferta');
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await page.getByRole('button', { name: 'Ver detalle de React Engineer en Nubia Labs' }).click();
    await expect(page.getByRole('dialog', { name: 'React Engineer' })).toBeVisible();
    await sinViolaciones(page, 'Detalle de una oferta');
    await page.keyboard.press('Escape');

    await page.goto('/mis-postulaciones');
    await expect(page.getByRole('heading', { name: 'React Engineer', level: 4 })).toBeVisible();
    await sinViolaciones(page, 'Mis postulaciones');
    await page.getByRole('heading', { name: 'React Engineer', level: 4 }).click();
    await expect(page.getByRole('heading', { name: 'React Engineer', level: 2 })).toBeVisible();
    await sinViolaciones(page, 'Ficha de postulación');

    await page.goto('/mi-perfil');
    await expect(page.getByRole('heading', { name: 'Mi perfil de búsqueda', level: 1 })).toBeVisible();
    await sinViolaciones(page, 'Mi perfil de búsqueda');

    await page.goto('/mi-progreso');
    await expect(page.getByRole('heading', { name: 'Mi progreso', level: 1 })).toBeVisible();
    await expect(page.getByText('Calculando métricas…')).toHaveCount(0);
    await sinViolaciones(page, 'Mi progreso');

    await page.goto('/mensajes');
    await expect(page.getByRole('heading', { name: 'Mensajes', level: 1 })).toBeVisible();
    await sinViolaciones(page, 'Mensajes');

    await abrirMenuSiHaceFalta(page);
    await page.getByRole('button', { name: 'Mi cuenta' }).click();
    await expect(page.getByRole('dialog', { name: 'Mi cuenta' })).toBeVisible();
    await sinViolaciones(page, 'Mi cuenta');
  });
});

base.describe('sin sesión', () => {
  base.use({ storageState: { cookies: [], origins: [] } });

  base('inicio de sesión, registro, recuperar contraseña, enlace vencido y página no encontrada', async ({ page }) => {
    await page.goto('/');
    await sinViolaciones(page, 'Inicio de sesión');
    await page.getByRole('button', { name: 'Ingresar' }).click(); // con los errores de validación a la vista
    await expect(page.getByText('Escribí tu email.')).toBeVisible();
    await sinViolaciones(page, 'Inicio de sesión con errores');

    await page.getByRole('button', { name: '¿No tenés cuenta? Registrate' }).click();
    await page.getByLabel(/^Contraseña/).fill('abc');
    await sinViolaciones(page, 'Registro');

    await page.goto('/recuperar');
    await expect(page.getByRole('heading', { name: '¿Olvidaste tu contraseña?', level: 1 })).toBeVisible();
    await sinViolaciones(page, 'Recuperar contraseña');
    await page.route('**/auth/v1/recover*', (route) =>
      route.fulfill({
        status: route.request().method() === 'OPTIONS' ? 204 : 200,
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' },
        json: {},
      })
    );
    await page.getByLabel('Email').fill('alguien@correo.com');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByRole('heading', { name: 'Revisá tu correo', level: 1 })).toBeVisible();
    await sinViolaciones(page, 'Recuperar contraseña: Revisá tu correo');

    await page.goto('/nueva-contrasena');
    await expect(page.getByText(/El enlace venció o ya se usó/)).toBeVisible();
    await sinViolaciones(page, 'Nueva contraseña: enlace vencido');

    await page.goto('/ruta-que-no-existe');
    await expect(page.getByRole('heading', { name: 'No encontramos esa página', level: 1 })).toBeVisible();
    await sinViolaciones(page, 'Página no encontrada');
  });

  base('configuración inicial paso a paso y pantallas del administrador', async ({ page }) => {
    await registrarPorUI(page);
    const continuar = page.getByRole('button', { name: 'Continuar' });

    await continuar.click(); // paso 1 con errores
    await expect(page.getByText('Escribí tu nombre.')).toBeVisible();
    await sinViolaciones(page, 'Onboarding paso 1 con errores');
    await page.getByLabel('¿Cómo te llamás?').fill('Camila Ejemplo');
    await page.getByLabel('Rol que buscás').fill('QA Automation');
    await continuar.click();

    await page.getByRole('button', { name: 'SQL', exact: true }).click();
    await page.getByLabel('Otra tecnología').fill('Cypress');
    await sinViolaciones(page, 'Onboarding paso 2 (tecnologías)');
    await continuar.click();

    await continuar.click(); // paso 3 con errores
    await expect(page.getByText('Elegí una modalidad: remoto, híbrido o presencial.')).toBeVisible();
    await sinViolaciones(page, 'Onboarding paso 3 con errores');
    await page.getByRole('button', { name: 'Remoto', exact: true }).click();
    await page.getByPlaceholder('Ej: Buenos Aires, Argentina').fill('Córdoba, Argentina');
    await continuar.click();

    await expect(page.getByRole('heading', { name: '¿Cuál es tu nivel de experiencia?' })).toBeVisible();
    await sinViolaciones(page, 'Onboarding paso 4 (nivel)');
    await continuar.click();

    await expect(page.getByRole('heading', { name: 'Revisá tus datos' })).toBeVisible();
    await sinViolaciones(page, 'Onboarding paso 5 (resumen)');
    await page.getByRole('button', { name: 'Confirmar y terminar' }).click();
    await expect(page.getByRole('heading', { name: 'Tu perfil quedó listo' })).toBeVisible();
    await sinViolaciones(page, 'Onboarding: perfil listo');
    await page.getByRole('button', { name: 'Ir a Mis postulaciones' }).click();
    await cerrarSesion(page);

    // Administrador: listado y detalle (con una plantilla aplicada).
    await iniciarSesionPorUI(page, cuentaAdministrador());
    await expect(page).toHaveURL(/\/candidatos$/);
    await page.getByLabel('Buscar candidatos').fill('Camila Ejemplo');
    await expect(page.getByRole('link').filter({ hasText: 'Camila Ejemplo' }).first()).toBeVisible();
    await sinViolaciones(page, 'Candidatos');
    await page.getByRole('link').filter({ hasText: 'Camila Ejemplo' }).first().click();
    await expect(page.getByRole('heading', { name: 'Camila Ejemplo', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Falta un dato' }).click();
    await sinViolaciones(page, 'Detalle del candidato con una plantilla');
  });
});
