import { expect, test } from './fixtures';

test('cambiar un peso recalcula el score de las ofertas y agregar un criterio lo suma', async ({ page, api }) => {
  await api.sembrarOfertas([
    { empresa: 'Acme Labs', rol: 'Frontend Developer', stack_tecnologico: ['React'], puntaje_scoring: 25 },
    { empresa: 'Beta SA', rol: 'Backend Developer', stack_tecnologico: ['Docker'], puntaje_scoring: 10 },
  ]);
  const scoreDe = async (rol: string) => {
    const { data } = await api.sb.from('ofertas').select('puntaje_scoring').eq('rol', rol).single();
    return Number(data?.puntaje_scoring);
  };

  await page.goto('/mi-perfil');

  // --- Cambiar el peso de React: 15 -> 30 ---
  const pesoReact = page.getByRole('spinbutton', { name: 'Peso de React' });
  await expect(pesoReact).toHaveValue('15');
  await pesoReact.fill('30');
  await pesoReact.press('Tab');
  await expect.poll(() => scoreDe('Frontend Developer')).toBe(40); // 30 (React) + 10 (remoto)
  expect(await scoreDe('Backend Developer')).toBe(10);

  await page.goto('/ofertas');
  // La tarjeta lee el puntaje como «40 puntos» (el «puntos» es solo para lectores de pantalla).
  const tarjetaFrontend = page.getByRole('heading', { name: 'Frontend Developer', level: 3 });
  await expect(tarjetaFrontend).toBeVisible();
  await expect(page.getByText('40 puntos', { exact: true })).toBeVisible();

  // --- Agregar un criterio nuevo: Docker = 20 ---
  await page.goto('/mi-perfil');
  // El peso inicial de una tecnología nueva es el mismo que le pone el Onboarding.
  await expect(page.getByLabel('Peso de la nueva tecnología')).toHaveValue('15');
  await page.getByPlaceholder('Ej: React, Python, SQL').fill('Docker');
  await page.getByPlaceholder('Peso').fill('20');
  await page.getByRole('button', { name: 'Agregar tecnología' }).click();
  await expect(page.getByText('Docker', { exact: true })).toBeVisible();
  await expect.poll(() => scoreDe('Backend Developer')).toBe(30); // 20 (Docker) + 10 (remoto)

  // Un duplicado casi idéntico ("docker " en minúscula y con espacio) no crea otro criterio.
  await page.getByPlaceholder('Ej: React, Python, SQL').fill('  docker ');
  await page.getByRole('button', { name: 'Agregar tecnología' }).click();
  await expect(page.getByText('Ya tenés un criterio para "docker".')).toBeVisible();
  const { count } = await api.sb
    .from('criterios_scoring')
    .select('id', { count: 'exact', head: true })
    .ilike('valor_comparacion', 'docker');
  expect(count).toBe(1);

  await page.goto('/ofertas');
  await expect(page.getByText('30 puntos', { exact: true })).toBeVisible();
  await expect(page.getByText('40 puntos', { exact: true })).toBeVisible();
});
