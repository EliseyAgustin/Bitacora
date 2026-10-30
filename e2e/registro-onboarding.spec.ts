import { expect, test } from '@playwright/test';
import { conApiDe, esMobile, irA, registrarPorUI } from './ui';
import { MARCA } from '../src/lib/marca';

// Cuenta nueva, sin la sesión guardada de la cuenta compartida.
test.use({ storageState: { cookies: [], origins: [] } });

const ESTADOS = ['Por aplicar', 'Aplicado', 'En proceso', 'Entrevista', 'Oferta', 'Rechazado'];

test('onboarding de 5 pasos: valida cada paso, no pierde lo escrito, resume, confirma y guarda', async ({ page }, testInfo) => {
  const cuenta = await registrarPorUI(page);
  const continuar = page.getByRole('button', { name: 'Continuar' });
  const elegidas = page.getByRole('list', { name: 'Tecnologías elegidas' });

  // --- Paso 1: el rol es obligatorio ---
  await expect(page.getByText('Paso 1 de 5')).toBeVisible();
  await continuar.click();
  await expect(page.getByText('Escribí tu nombre.')).toBeVisible();
  await expect(page.getByText('Escribí el rol que buscás, por ejemplo Frontend Developer.')).toBeVisible();
  // El aviso de privacidad se ve desde el primer paso, junto al nombre.
  await expect(
    page.getByText(`Tu nombre y tu perfil de búsqueda (rol, tecnologías, modalidad, ubicación y nivel) los puede ver el equipo de ${MARCA.nombre}. Tus ofertas y postulaciones son solo tuyas.`)
  ).toBeVisible();
  await expect(page.getByText('Paso 1 de 5')).toBeVisible();
  await page.getByLabel('¿Cómo te llamás?').fill('Ana Gómez');
  await expect(page.getByText('Escribí tu nombre.')).toHaveCount(0);
  await page.getByLabel('Rol que buscás').fill('QA Automation Engineer');
  await expect(page.getByText('Escribí el rol que buscás')).toHaveCount(0);

  // En mobile un segundo tap rápido en "Continuar" no debe saltear ni superponer pasos.
  if (esMobile(testInfo)) await continuar.dblclick();
  else await continuar.click();
  await expect(page.getByText('Paso 2 de 5')).toBeVisible();
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: '¿Qué tecnologías te interesan?' })).toBeVisible();

  // --- Paso 2: al menos una tecnología; las elegidas se ven como lista con opción de quitar ---
  await continuar.click();
  await expect(page.getByText('Elegí o escribí al menos una tecnología.')).toBeVisible();
  await expect(page.getByText('Paso 2 de 5')).toBeVisible();

  await page.getByRole('button', { name: 'React', exact: true }).click();
  await page.getByRole('button', { name: 'SQL', exact: true }).click();
  await expect(elegidas.getByRole('listitem')).toHaveCount(2);

  // "sql" ya está (como "SQL"): no se duplica aunque cambien las mayúsculas, y se avisa.
  await page.getByLabel('Otra tecnología').fill('sql');
  await page.getByRole('button', { name: 'Agregar' }).click();
  await expect(page.getByText('«sql» ya está en tu lista.')).toBeVisible();
  await expect(elegidas.getByRole('listitem')).toHaveCount(2);

  // Quitar una de la lista.
  await page.getByRole('button', { name: 'Quitar SQL' }).click();
  await expect(elegidas.getByRole('listitem')).toHaveCount(1);

  // Lo escrito y no agregado ("sql") no se pierde al tocar Continuar: se suma solo.
  await page.getByLabel('Otra tecnología').fill('sql');
  await expect(page.getByText(/la sumamos al tocar «Continuar»/)).toBeVisible();
  await continuar.click();

  // --- Paso 3: modalidad y ubicación obligatorias, con el mensaje junto al campo ---
  await expect(page.getByText('Paso 3 de 5')).toBeVisible();
  await continuar.click();
  await expect(page.getByText('Elegí una modalidad: remoto, híbrido o presencial.')).toBeVisible();
  await expect(page.getByText('Escribí tu ciudad o país, por ejemplo Buenos Aires, Argentina.')).toBeVisible();
  await page.getByRole('button', { name: 'Remoto', exact: true }).click();
  await page.getByPlaceholder('Ej: Buenos Aires, Argentina').fill('   ');
  await continuar.click();
  await expect(page.getByText('Escribí tu ciudad o país')).toBeVisible();
  await page.getByPlaceholder('Ej: Buenos Aires, Argentina').fill('Córdoba, Argentina');
  await continuar.click();

  // --- Paso 4: nivel de experiencia (opcional) ---
  await expect(page.getByText('Paso 4 de 5')).toBeVisible();
  await expect(page.getByRole('heading', { name: '¿Cuál es tu nivel de experiencia?' })).toBeVisible();
  await expect(page.getByText(/seniority/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'Semi Senior' }).click();
  await continuar.click();

  // --- Paso 5: resumen editable y aclaración de dónde se guardan ---
  await expect(page.getByText('Paso 5 de 5')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Revisá tus datos' })).toBeVisible();
  await expect(page.getByText('Podés cambiarlos cuando quieras en Mi perfil de búsqueda.')).toBeVisible();
  await expect(page.getByLabel('Tu nombre')).toHaveValue('Ana Gómez');
  await expect(page.getByLabel('Rol que buscás')).toHaveValue('QA Automation Engineer');
  await expect(elegidas.getByRole('listitem')).toHaveCount(2);
  await expect(elegidas).toContainText('React');
  await expect(elegidas).toContainText('sql');

  // Edita en el resumen: saca React y deja "Cypress" escrito sin apretar Agregar (se suma al confirmar).
  await page.getByRole('button', { name: 'Quitar React' }).click();
  await page.getByLabel('Otra tecnología').fill('Cypress');
  await page.getByRole('button', { name: 'Confirmar y terminar' }).click();

  // --- Confirmación ---
  await expect(page.getByRole('heading', { name: 'Tu perfil quedó listo' })).toBeVisible();
  await expect(page.getByText('Te dejamos un mensaje de bienvenida en Mensajes.')).toBeVisible();
  await page.getByRole('button', { name: 'Ir a Mis postulaciones' }).click();

  // Mis postulaciones vacío: las 6 columnas, todas sin tarjetas.
  await expect(page).toHaveURL(/\/mis-postulaciones$/);
  for (const estado of ESTADOS) {
    await expect(page.getByRole('heading', { name: estado, level: 3, exact: true })).toBeVisible();
  }
  await expect(page.getByText('Sin tarjetas')).toHaveCount(6);

  // Mi perfil de búsqueda refleja exactamente lo confirmado.
  await irA(page, 'Mi perfil de búsqueda');
  for (const dato of ['sql', 'Cypress', 'Remoto', 'Córdoba, Argentina']) {
    await expect(page.getByText(dato, { exact: true })).toBeVisible();
  }
  await expect(page.getByText('React', { exact: true })).toHaveCount(0);

  const api = await conApiDe(cuenta);
  const { data: criterios } = await api.sb.from('criterios_scoring').select('nombre, peso').order('nombre');
  expect(criterios).toEqual([
    { nombre: 'Modalidad: Remoto', peso: 10 },
    { nombre: 'Stack: Cypress', peso: 15 },
    { nombre: 'Stack: sql', peso: 15 },
    { nombre: 'Ubicación: Córdoba, Argentina', peso: 5 },
  ]);

  const { data: perfil } = await api.sb
    .from('perfil_usuario')
    .select('nombre, rol_buscado, stack_interes, seniority, modalidad_preferida, onboarding_completado, dias_inactividad_recordatorio')
    .single();
  expect(perfil).toEqual({
    nombre: 'Ana Gómez',
    rol_buscado: 'QA Automation Engineer',
    stack_interes: ['sql', 'Cypress'],
    seniority: 'semi_senior',
    modalidad_preferida: 'remoto',
    onboarding_completado: true,
    dias_inactividad_recordatorio: 7,
  });
});

test('"Atrás" conserva lo cargado y el resumen no deja terminar con un dato obligatorio vacío', async ({ page }) => {
  await registrarPorUI(page);
  const continuar = page.getByRole('button', { name: 'Continuar' });

  await page.getByLabel('¿Cómo te llamás?').fill('Luis Pérez');
  await page.getByLabel('Rol que buscás').fill('Data Analyst');
  await continuar.click();
  await page.getByRole('button', { name: 'Python', exact: true }).click();
  await page.getByRole('button', { name: 'Atrás' }).click();
  await expect(page.getByLabel('Rol que buscás')).toHaveValue('Data Analyst');
  await continuar.click();
  await expect(page.getByRole('list', { name: 'Tecnologías elegidas' })).toContainText('Python');
  await continuar.click();
  await page.getByRole('button', { name: 'Híbrido', exact: true }).click();
  await page.getByPlaceholder('Ej: Buenos Aires, Argentina').fill('Rosario');
  await continuar.click();
  await continuar.click();

  // En el resumen se vacía la lista y el error aparece junto al campo, sin guardar nada.
  await expect(page.getByText('Paso 5 de 5')).toBeVisible();
  await page.getByRole('button', { name: 'Quitar Python' }).click();
  await page.getByRole('button', { name: 'Confirmar y terminar' }).click();
  await expect(page.getByText('Elegí o escribí al menos una tecnología.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tu perfil quedó listo' })).toHaveCount(0);
});
