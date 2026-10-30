// Recaptura de TODAS las pantallas de la documentación, con datos ficticios.
//
// - Los candidatos son cuentas de prueba creadas por el flujo de registro de la app, con nombres ficticios
//   ("Camila Ejemplo", "Tomás Ejemplo", "Lucía Ejemplo") y emails inventados (demo.laburin.NNNN@gmail.com).
//   El email y la contraseña se generan al azar en cada corrida; no hay credenciales en este archivo.
// - La pantalla del administrador usa la cuenta de administrador de pruebas (E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
//   de .env.e2e, que no se versiona). Su email no se muestra en ninguna captura, y el listado de Candidatos se
//   filtra por "Ejemplo" para que solo aparezcan las cuentas ficticias de esta corrida.
// - Las fuentes de ofertas y el envío de mails de recuperación se interceptan (no sale ningún mail ni se consultan sitios).
// - Al terminar se borran los datos de las cuentas ficticias (los usuarios de Auth quedan).
//
// Requisitos: la app corriendo (npm run dev, por defecto en http://localhost:3000; otra URL con BASE_URL),
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env y las variables E2E_ADMIN_* en .env.e2e.
// Uso: npm run docs:capturas
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import MARCA from '../../src/lib/marca.json' with { type: 'json' };

dotenv.config();
dotenv.config({ path: '.env.e2e' });

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = path.join(import.meta.dirname, 'capturas');
fs.mkdirSync(OUT, { recursive: true });

if (!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD) {
  throw new Error('Faltan E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD en .env.e2e (hacen falta para capturar la pantalla del administrador).');
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const unico = () => Math.floor(1000 + Math.random() * 8999);
const nuevaCuenta = () => ({
  email: `demo.laburin.${unico()}.${unico()}@gmail.com`,
  password: `${crypto.randomBytes(9).toString('base64url')}-Lb9!`,
});

const EMPRESAS = ['Mercado Norte', 'Nubia Labs', 'Orbita Soft', 'Plano Digital', 'Kappa Systems', 'Lumen Tech', 'Andes Software', 'Pampa Cloud', 'Tango Data', 'Delta Soft', 'Horizonte IT', 'Quimera Apps'];
const ROLES = [
  ['Frontend Developer', ['React', 'TypeScript']],
  ['Full Stack Developer', ['React', 'Node.js']],
  ['Backend Developer', ['Node.js', 'PostgreSQL']],
  ['QA Automation Engineer', ['Selenium', 'Cypress']],
  ['Data Analyst', ['SQL', 'Power BI']],
  ['DevOps Engineer', ['AWS', 'Docker']],
  ['Mobile Developer', ['React Native', 'TypeScript']],
  ['Analista Funcional', ['Jira', 'SQL']],
];
const UBICACIONES = ['Buenos Aires, Argentina', 'Córdoba, Argentina', 'LATAM', 'Worldwide', 'Rosario, Argentina'];
const FUENTES = ['Remotive', 'Arbeitnow', 'RemoteOK', 'Carga manual'];

// Mismos pesos que el Onboarding: tecnología 15, remoto 10, ubicación 5.
function puntaje(oferta) {
  const stack = oferta.stack_tecnologico.map((s) => s.toLowerCase());
  let total = 0;
  for (const tech of ['react', 'typescript', 'node.js']) if (stack.some((s) => s.includes(tech))) total += 15;
  if (oferta.modalidad === 'remoto') total += 10;
  if ((oferta.ubicacion ?? '').toLowerCase().includes('buenos aires, argentina')) total += 5;
  return total;
}

const browser = await chromium.launch();
const cuentas = []; // para la limpieza final
const nuevoSb = () => createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const shot = async (page, name, opciones = {}) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png`, ...opciones });
  console.log('capturado:', name);
};

async function contexto(opciones = {}) {
  return browser.newContext({ viewport: { width: 1600, height: 900 }, ...opciones });
}

async function registrar(page, cuenta) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '¿No tenés cuenta? Registrate' }).click();
  await page.getByLabel('Email').fill(cuenta.email);
  await page.getByLabel(/^Contraseña/).fill(cuenta.password);
  await page.getByRole('button', { name: 'Registrarme' }).click();
  await page.waitForURL(/\/onboarding/);
}

async function completarPerfil(page, p, { capturar = false } = {}) {
  const continuar = page.getByRole('button', { name: 'Continuar' });
  await page.getByLabel('¿Cómo te llamás?').fill(p.nombre);
  await page.getByLabel('Rol que buscás').fill(p.rol);
  if (capturar) await shot(page, '03a-onboarding-rol', { clip: { x: 340, y: 60, width: 920, height: 780 } });
  await continuar.click();
  for (const tech of p.techs) await page.getByRole('button', { name: tech, exact: true }).click();
  if (capturar) {
    await page.getByLabel('Otra tecnología').fill('Cypress');
    await shot(page, '03b-onboarding-stack', { clip: { x: 340, y: 60, width: 920, height: 780 } });
    await page.getByLabel('Otra tecnología').fill(''); // la tecnología de ejemplo no queda en el perfil
  }
  await continuar.click();
  await page.getByRole('button', { name: p.modalidad, exact: true }).click();
  await page.getByPlaceholder('Ej: Buenos Aires, Argentina').fill(p.ubicacion);
  await continuar.click();
  await page.getByRole('button', { name: p.nivel, exact: true }).click();
  await continuar.click();
  if (capturar) await shot(page, '03c-onboarding-resumen', { fullPage: true, clip: { x: 540, y: 10, width: 520, height: 1064 } });
  await page.getByRole('button', { name: 'Confirmar y terminar' }).click();
  await page.getByRole('heading', { name: 'Tu perfil quedó listo' }).waitFor();
  if (capturar) await shot(page, '03d-onboarding-listo', { clip: { x: 340, y: 160, width: 920, height: 520 } });
}

async function sembrarOfertas(sb, userId) {
  const base = Date.now() - 6 * 60 * 60 * 1000;
  const filas = Array.from({ length: 34 }, (_, i) => {
    const [rol, stack] = ROLES[i % ROLES.length];
    const oferta = {
      user_id: userId,
      empresa: EMPRESAS[(i * 5) % EMPRESAS.length],
      rol,
      ubicacion: UBICACIONES[(i * 3) % UBICACIONES.length],
      modalidad: i % 4 === 3 ? 'hibrido' : 'remoto',
      stack_tecnologico: stack,
      fuente: FUENTES[i % FUENTES.length],
      fecha_publicacion: new Date(base - i * 86400000).toISOString().slice(0, 10),
      // example.com está reservado para ejemplos: no lleva a ningún sitio real.
      url: `https://example.com/empleos/oferta-${i + 1}`,
      descripcion: `${EMPRESAS[(i * 5) % EMPRESAS.length]} busca ${rol} para sumarse a su equipo.\n\nVas a trabajar con ${stack.join(', ')} en proyectos de producto, junto a diseño y negocio.\n\n• Experiencia comprobable en el stack\n• Ganas de aprender y de trabajar en equipo\n• Buen nivel de comunicación escrita\n\nEsta es una oferta de ejemplo, escrita para la documentación de ${MARCA.nombre}.`,
      created_at: new Date(base - i * 60000).toISOString(),
    };
    return { ...oferta, puntaje_scoring: puntaje(oferta) };
  });
  const { error } = await sb.from('ofertas').insert(filas);
  if (error) throw error;
}

try {
  const p = {
    camila: { nombre: 'Camila Ejemplo', rol: 'Frontend Developer', techs: ['React', 'TypeScript', 'Node.js'], modalidad: 'Remoto', ubicacion: 'Buenos Aires, Argentina', nivel: 'Semi Senior' },
    tomas: { nombre: 'Tomás Ejemplo', rol: 'Data Analyst', techs: ['SQL', 'Python'], modalidad: 'Híbrido', ubicacion: 'Rosario, Argentina', nivel: 'Junior' },
    lucia: { nombre: 'Lucía Ejemplo', rol: 'QA Automation', techs: ['Selenium', 'Docker'], modalidad: 'Remoto', ubicacion: 'Córdoba, Argentina', nivel: 'Senior' },
  };

  // ============ Camila (la cuenta principal de las capturas) ============
  const camila = nuevaCuenta();
  cuentas.push(camila);
  const ctx = await contexto();
  const page = await ctx.newPage();

  // Login con errores de validación (sin ningún dato escrito de una cuenta real).
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill('camila.ejemplo.correo.com');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await shot(page, '01-login-errores');

  // Recuperar contraseña con el mail interceptado: se ve el mensaje neutro y no se envía nada.
  await page.route('**/auth/v1/recover*', (route) =>
    route.fulfill({ status: route.request().method() === 'OPTIONS' ? 204 : 200, headers: CORS, json: {} })
  );
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await page.getByRole('button', { name: 'Enviar enlace' }).waitFor(); // la ruta cambia antes de que se pinte la pantalla nueva
  await page.getByLabel('Email').fill('camila.ejemplo@correo.com');
  await shot(page, '02b-recuperar-contrasena');
  await page.getByRole('button', { name: 'Enviar enlace' }).click();
  await page.getByText(/Si el email existe/).waitFor();
  await shot(page, '02c-recuperar-enviado');
  await page.unroute('**/auth/v1/recover*');

  // Registro, con el medidor de fortaleza.
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '¿No tenés cuenta? Registrate' }).click();
  // En la captura se muestra un email genérico; el registro real usa el de la cuenta de prueba.
  await page.getByLabel('Email').fill('camila.ejemplo@correo.com');
  await page.getByLabel(/^Contraseña/).fill(camila.password);
  // El botón de datos de ejemplo solo existe al correr en modo desarrollo: no se muestra en la documentación.
  await page.getByRole('button', { name: /datos de ejemplo/ }).evaluate((el) => el.remove()).catch(() => undefined);
  await shot(page, '02-registro', { clip: { x: 240, y: 0, width: 1120, height: 900 } });
  await page.getByLabel('Email').fill(camila.email);
  await page.getByRole('button', { name: 'Registrarme' }).click();
  await page.waitForURL(/\/onboarding/);

  await completarPerfil(page, p.camila, { capturar: true });

  // Ofertas: primero vacío (guía), después con ofertas cargadas.
  await page.getByRole('button', { name: 'Ver ofertas' }).click();
  await page.waitForURL(/\/ofertas$/);
  await page.getByText('Todavía no hay ofertas cargadas.').waitFor();
  await shot(page, '04f-ofertas-vacio');

  // Pantalla de nueva contraseña (con una sesión abierta se puede ver el formulario sin pasar por el mail).
  await page.goto(`${BASE}/nueva-contrasena`, { waitUntil: 'networkidle' });
  await page.getByLabel('Contraseña nueva').fill('Una-clave9');
  await shot(page, '02d-nueva-contrasena');
  await page.goto(`${BASE}/ofertas`, { waitUntil: 'networkidle' });

  const sb = nuevoSb();
  const { data: sesion, error: loginError } = await sb.auth.signInWithPassword(camila);
  if (loginError) throw loginError;
  const userId = sesion.user.id;
  camila.userId = userId;
  await sembrarOfertas(sb, userId);

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { level: 3 }).first().waitFor();
  await shot(page, '04a-ofertas');

  // Detalle de una oferta: el puntaje explicado, la descripción y el enlace para postularse.
  await page.getByRole('button', { name: /^Ver detalle de/ }).first().click();
  await page.getByRole('dialog').waitFor();
  await shot(page, '04g-oferta-detalle');
  await page.keyboard.press('Escape');

  await page.getByRole('navigation', { name: 'Paginación de ofertas' }).scrollIntoViewIfNeeded();
  await shot(page, '04c-ofertas-paginacion');

  // Sin resultados: el filtro "CABA" no coincide con nada y el mensaje sugiere aflojarlo.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByLabel('Ubicación').fill('CABA');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await page.getByText('Ninguna oferta coincide con los filtros aplicados.').waitFor();
  await shot(page, '04e-ofertas-sin-resultados');
  await page.getByRole('button', { name: 'Quitar todos los filtros' }).click();
  await page.getByRole('heading', { level: 3 }).first().waitFor();

  // Importación (fuentes interceptadas, con empresas ficticias).
  await page.route('https://remotive.com/api/remote-jobs*', (route) =>
    route.fulfill({
      status: 200,
      headers: CORS,
      json: {
        jobs: [
          { title: 'React Engineer', company_name: 'Estrella Digital', candidate_required_location: 'Argentina', tags: ['React'], publication_date: '2026-10-07T10:00:00' },
          { title: 'Backend Developer', company_name: 'Faro Systems', candidate_required_location: 'Worldwide', tags: ['Go'], publication_date: '2026-10-07T10:00:00' },
        ],
      },
    })
  );
  await page.route('https://www.arbeitnow.com/api/job-board-api*', (route) =>
    route.fulfill({ status: 200, headers: CORS, json: { data: [{ title: 'QA Analyst', company_name: 'Brújula Soft', location: 'Berlin', remote: true, tags: ['Selenium'], created_at: 1790000000 }] } })
  );
  // RemoteOK devuelve un arreglo cuyo primer elemento es el aviso legal.
  await page.route('https://remoteok.com/api*', (route) => route.fulfill({ status: 200, headers: CORS, json: [{ legal: 'API Terms of Service' }] }));
  await page.getByRole('button', { name: 'Importar ofertas remotas' }).click();
  await page.getByText(/ofertas nuevas importadas/).waitFor();
  await shot(page, '04b-ofertas-import');

  // Postulaciones en distintos estados, con interacciones y un recordatorio (10 días sin novedades).
  const { data: ofertas } = await sb.from('ofertas').select('id, rol').order('created_at', { ascending: false }).limit(12);
  const estados = ['por_aplicar', 'por_aplicar', 'aplicado', 'aplicado', 'en_proceso', 'entrevista', 'oferta', 'rechazado'];
  const hoy = new Date().toISOString().slice(0, 10);
  const creadas = [];
  for (let i = 0; i < estados.length; i++) {
    const { data, error } = await sb
      .from('postulaciones')
      .insert({ oferta_id: ofertas[i].id, estado: estados[i], fecha_postulacion: estados[i] === 'por_aplicar' ? null : hoy })
      .select('id')
      .single();
    if (error) throw error;
    creadas.push(data.id);
  }
  await sb.from('interacciones').insert([
    { postulacion_id: creadas[5], tipo: 'mail', notas: 'Recibí el mail de la empresa para coordinar una charla.' },
    { postulacion_id: creadas[5], tipo: 'llamada', notas: 'Llamada de 20 minutos con el equipo de selección.' },
    { postulacion_id: creadas[5], tipo: 'entrevista', notas: 'Entrevista técnica el jueves a las 15.' },
  ]);
  await sb.from('postulaciones').update({ created_at: new Date(Date.now() - 10 * 86400000).toISOString() }).eq('id', creadas[2]);

  await page.goto(`${BASE}/mis-postulaciones`, { waitUntil: 'networkidle' });
  await page.getByText(/Sin novedades hace/).first().waitFor();
  await shot(page, '05-tablero');

  await page.getByRole('heading', { level: 4 }).filter({ hasText: ofertas[5].rol }).first().click();
  await page.getByText('Línea de tiempo de interacciones').waitFor();
  await shot(page, '06-ficha');

  // Mi perfil de búsqueda y avisos de seguimiento.
  await page.goto(`${BASE}/mi-perfil`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: '¿Qué estoy buscando?' }).waitFor();
  await shot(page, '07-perfil');
  await page.getByRole('heading', { name: 'Avisos de seguimiento' }).scrollIntoViewIfNeeded();
  await shot(page, '07b-avisos');

  // Mi progreso.
  await page.goto(`${BASE}/mi-progreso`, { waitUntil: 'networkidle' });
  await page.getByText('Calculando métricas…').waitFor({ state: 'detached' });
  await shot(page, '08-progreso');

  // Mi cuenta (nombre, aviso de privacidad, contraseña y tema).
  await page.getByRole('button', { name: 'Mi cuenta' }).click();
  await page.getByText(`los puede ver el equipo de ${MARCA.nombre}`).waitFor();
  // El email de la cuenta de prueba se reemplaza por uno genérico solo en lo que se ve en la captura.
  await page.evaluate((real) => {
    const generico = 'camila.ejemplo@correo.com';
    for (const el of document.querySelectorAll('[role=dialog] p')) if (el.textContent === real) el.textContent = generico;
    const campo = document.querySelector('[role=dialog] input[type=email]');
    if (campo) campo.value = generico;
  }, camila.email);
  await shot(page, '10-mi-cuenta');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

  // Mobile: tablero y menú.
  const movil = await contexto({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
  const pm = await movil.newPage();
  await pm.goto(`${BASE}/mis-postulaciones`, { waitUntil: 'networkidle' });
  await pm.getByText(/Sin novedades hace/).first().waitFor();
  await shot(pm, '05b-tablero-mobile');

  // ============ Otros candidatos ficticios (para que Candidatos tenga contenido) ============
  for (const perfil of [p.tomas, p.lucia]) {
    const cuenta = nuevaCuenta();
    cuentas.push(cuenta);
    const c = await contexto();
    const pg = await c.newPage();
    await registrar(pg, cuenta);
    await completarPerfil(pg, perfil);
    await c.close();
  }

  // ============ Administrador ============
  const admin = await contexto();
  const pa = await admin.newPage();
  await pa.goto(BASE, { waitUntil: 'networkidle' });
  await pa.getByLabel('Email').fill(process.env.E2E_ADMIN_EMAIL);
  await pa.getByLabel(/^Contraseña/).fill(process.env.E2E_ADMIN_PASSWORD);
  await pa.getByRole('button', { name: 'Ingresar' }).click();
  await pa.waitForURL(/\/candidatos$/);
  // Solo las cuentas ficticias de esta corrida: el buscador muestra únicamente quienes se apellidan "Ejemplo".
  await pa.getByLabel('Buscar candidatos').fill('Ejemplo');
  await pa.getByText(/^\d+ candidatos$/).waitFor();
  // La cuenta DEMO y sus candidatos viejos tambien se llaman "Ejemplo": en la captura quedan solo las registradas hoy.
  await pa.evaluate(() => {
    const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const tarjetas = [...document.querySelectorAll('ul.grid > li')];
    for (const li of tarjetas) if (!li.textContent.includes(`Registrado el ${hoy}`)) li.remove();
    const cuenta = [...document.querySelectorAll('p')].find((el) => /^\d+ candidatos?$/.test(el.textContent.trim()));
    if (cuenta) cuenta.textContent = `${document.querySelectorAll('ul.grid > li').length} candidatos`;
  });
  await shot(pa, '12-candidatos');

  await pa.getByRole('link').filter({ hasText: 'Camila Ejemplo' }).click();
  await pa.getByRole('heading', { name: 'Camila Ejemplo', level: 1 }).waitFor();
  await pa.getByRole('button', { name: 'Falta un dato' }).click();
  const textoPlantilla = await pa.getByLabel('Mensaje', { exact: true }).inputValue();
  await pa.getByLabel('Mensaje', { exact: true }).fill(textoPlantilla.replace('[indicá cuál]', 'tu disponibilidad horaria'));
  await pa.getByRole('button', { name: 'Enviar mensaje' }).click();
  await pa.getByText('Mensaje enviado.').waitFor();
  await pa.setViewportSize({ width: 1600, height: 1250 }); // más alto para que entre también el historial de enviados
  await shot(pa, '13-candidato-detalle');

  // ============ Camila ve el mensaje ============
  await page.goto(`${BASE}/mensajes`, { waitUntil: 'networkidle' });
  await page.getByText('Hola Camila').waitFor();
  await shot(page, '11-mensajes');
  await pm.goto(`${BASE}/mensajes`, { waitUntil: 'networkidle' });
  await pm.getByText('Hola Camila').waitFor();
  await shot(pm, '11b-mensajes-mobile');

  // Página "No encontramos esa página" (con la sesión de Camila, el botón lleva a su inicio).
  await page.goto(`${BASE}/ruta-que-no-existe`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'No encontramos esa página' }).waitFor();
  await shot(page, '14-no-encontrada', { clip: { x: 440, y: 230, width: 720, height: 420 } });

  await browser.close();
} finally {
  // Limpieza: se borran los datos de las cuentas ficticias (cada una con su propia sesión, respetando RLS).
  for (const cuenta of cuentas) {
    try {
      const sb = nuevoSb();
      const { data } = await sb.auth.signInWithPassword(cuenta);
      if (!data?.user) continue;
      for (const tabla of ['ofertas', 'criterios_scoring', 'perfil_usuario']) await sb.from(tabla).delete().eq('user_id', data.user.id);
      await sb.from('mensajes').delete().eq('destinatario_id', data.user.id);
    } catch {
      // Si una limpieza falla, la próxima corrida del teardown de los tests la repite para las cuentas conocidas.
    }
  }
  await browser.close().catch(() => undefined);
  console.log('Listo. Cuentas ficticias usadas:', cuentas.length, '(datos borrados)');
}
