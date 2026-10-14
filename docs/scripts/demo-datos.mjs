// Datos de demostración (ficticios) para la presentación, sin pasar por la interfaz.
//
//   npm run demo:datos     crea 3 candidatos de ejemplo (Camila, Tomás y Lucía Ejemplo)
//   npm run demo:borrar    borra los datos que creó (perfiles, ofertas, criterios y mensajes)
//   node docs/scripts/demo-datos.mjs --probar    crea y borra enseguida (para comprobar que el script anda)
//
// Qué se crea:
//  - 3 cuentas por el registro público de Supabase (clave anon, sin service role key), con perfil de búsqueda completo.
//    Cada una recibe sola el mensaje de bienvenida (lo manda el trigger de la base). El administrador las ve en Candidatos.
//  - Camila Ejemplo, además, es la cuenta "de demostración" del lado del candidato: 12 ofertas con puntaje, postulaciones
//    en distintos estados, interacciones y un recordatorio. Entrás con DEMO_EMAIL y DEMO_PASSWORD (ver abajo).
//
// Variables (en .env y .env.e2e, que no se versionan): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY y, para la cuenta de
// Camila, DEMO_EMAIL y DEMO_PASSWORD (un email que vos controles y una contraseña de al menos 8 caracteres).
// Las contraseñas de Tomás y Lucía se generan al azar y quedan en .demo-cuentas.json (ignorado por git) solo para poder
// borrar sus datos después. Los usuarios de Auth no se pueden borrar sin una service role key: quedan, sin datos.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();
dotenv.config({ path: '.env.e2e' });

const ARCHIVO = path.resolve(import.meta.dirname, '../../.demo-cuentas.json');
const args = process.argv.slice(2);
const MODO = args.includes('--borrar') ? 'borrar' : args.includes('--probar') ? 'probar' : 'crear';

const { VITE_SUPABASE_URL: URL_SB, VITE_SUPABASE_ANON_KEY: ANON } = process.env;
if (!URL_SB || !ANON) throw new Error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env.');
const cliente = () => createClient(URL_SB, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

const azar = () => Math.floor(1000 + Math.random() * 8999);
const leerCuentas = () => (fs.existsSync(ARCHIVO) ? JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')) : []);

// Mismos pesos que el Onboarding: tecnología 15, modalidad 10, ubicación 5.
function criteriosDe(userId, p) {
  const base = { user_id: userId, activo: true, rango_min: null, rango_max: null };
  return [
    ...p.techs.map((t) => ({ ...base, nombre: `Stack: ${t}`, peso: 15, tipo_coincidencia: 'contiene', campo_objetivo: 'stack_tecnologico', valor_comparacion: t })),
    { ...base, nombre: `Modalidad: ${p.modalidadEtiqueta}`, peso: 10, tipo_coincidencia: 'exacto', campo_objetivo: 'modalidad', valor_comparacion: p.modalidad },
    { ...base, nombre: `Ubicación: ${p.ubicacion}`, peso: 5, tipo_coincidencia: 'contiene', campo_objetivo: 'ubicacion', valor_comparacion: p.ubicacion },
  ];
}

const PERFILES = [
  { nombre: 'Camila Ejemplo', rol: 'Frontend Developer', techs: ['React', 'TypeScript', 'Node.js'], modalidad: 'remoto', modalidadEtiqueta: 'Remoto', ubicacion: 'Buenos Aires, Argentina', nivel: 'semi_senior', principal: true },
  { nombre: 'Tomás Ejemplo', rol: 'Data Analyst', techs: ['SQL', 'Python'], modalidad: 'hibrido', modalidadEtiqueta: 'Híbrido', ubicacion: 'Rosario, Argentina', nivel: 'junior' },
  { nombre: 'Lucía Ejemplo', rol: 'QA Automation', techs: ['Selenium', 'Docker'], modalidad: 'remoto', modalidadEtiqueta: 'Remoto', ubicacion: 'Córdoba, Argentina', nivel: 'senior' },
];

const EMPRESAS = ['Mercado Norte', 'Nubia Labs', 'Orbita Soft', 'Plano Digital', 'Kappa Systems', 'Lumen Tech', 'Andes Software', 'Pampa Cloud'];
const ROLES = [
  ['Frontend Developer', ['React', 'TypeScript']],
  ['Full Stack Developer', ['React', 'Node.js']],
  ['Backend Developer', ['Node.js', 'PostgreSQL']],
  ['QA Automation Engineer', ['Selenium', 'Cypress']],
  ['Data Analyst', ['SQL', 'Power BI']],
  ['DevOps Engineer', ['AWS', 'Docker']],
];

function puntaje(oferta) {
  const stack = oferta.stack_tecnologico.map((s) => s.toLowerCase());
  let total = 0;
  for (const tech of ['react', 'typescript', 'node.js']) if (stack.some((s) => s.includes(tech))) total += 15;
  if (oferta.modalidad === 'remoto') total += 10;
  if ((oferta.ubicacion ?? '').toLowerCase().includes('buenos aires, argentina')) total += 5;
  return total;
}

async function registrar(email, password) {
  const sb = cliente();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error || !data.user || !data.session) {
    throw new Error(`No se pudo registrar ${email}: ${error?.message ?? 'sin sesión (¿el proyecto pide confirmar el email?)'}`);
  }
  return { sb, userId: data.user.id };
}

async function crearPerfil({ sb, userId }, p) {
  const { error } = await sb.from('perfil_usuario').insert({
    user_id: userId,
    nombre: p.nombre,
    rol_buscado: p.rol,
    stack_interes: p.techs,
    modalidad_preferida: p.modalidad,
    ubicacion: p.ubicacion,
    seniority: p.nivel,
    onboarding_completado: true,
  });
  if (error) throw error;
  const { error: errorCriterios } = await sb.from('criterios_scoring').insert(criteriosDe(userId, p));
  if (errorCriterios) throw errorCriterios;
}

async function cargarActividad({ sb, userId }) {
  const ahora = Date.now();
  const filas = Array.from({ length: 12 }, (_, i) => {
    const [rol, stack] = ROLES[i % ROLES.length];
    const oferta = {
      user_id: userId,
      empresa: EMPRESAS[(i * 3) % EMPRESAS.length],
      rol,
      ubicacion: ['Buenos Aires, Argentina', 'Worldwide', 'LATAM', 'Córdoba, Argentina'][i % 4],
      modalidad: i % 4 === 3 ? 'hibrido' : 'remoto',
      stack_tecnologico: stack,
      fuente: ['Remotive', 'Arbeitnow', 'Carga manual'][i % 3],
      created_at: new Date(ahora - i * 3600000).toISOString(),
    };
    return { ...oferta, puntaje_scoring: puntaje(oferta) };
  });
  const { error } = await sb.from('ofertas').insert(filas);
  if (error) throw error;

  const { data: ofertas } = await sb.from('ofertas').select('id').order('created_at', { ascending: false }).limit(6);
  const estados = ['por_aplicar', 'aplicado', 'aplicado', 'en_proceso', 'entrevista', 'rechazado'];
  const hoy = new Date().toISOString().slice(0, 10);
  const ids = [];
  for (let i = 0; i < estados.length; i++) {
    const { data, error: e } = await sb
      .from('postulaciones')
      .insert({ oferta_id: ofertas[i].id, estado: estados[i], fecha_postulacion: estados[i] === 'por_aplicar' ? null : hoy })
      .select('id')
      .single();
    if (e) throw e;
    ids.push(data.id);
  }
  await sb.from('interacciones').insert([
    { postulacion_id: ids[4], tipo: 'mail', notas: 'Me escribieron para coordinar una charla.' },
    { postulacion_id: ids[4], tipo: 'entrevista', notas: 'Entrevista técnica el jueves a las 15.' },
  ]);
  // Una postulación abierta hace 10 días sin novedades: genera el recordatorio al abrir Mis postulaciones.
  await sb.from('postulaciones').update({ created_at: new Date(ahora - 10 * 86400000).toISOString() }).eq('id', ids[1]);
}

async function borrarDatos(sb, userId) {
  for (const tabla of ['ofertas', 'criterios_scoring', 'perfil_usuario']) await sb.from(tabla).delete().eq('user_id', userId);
  await sb.from('mensajes').delete().eq('destinatario_id', userId);
}

async function borrarTodo(cuentas) {
  for (const c of cuentas) {
    try {
      const sb = cliente();
      const { data, error } = await sb.auth.signInWithPassword({ email: c.email, password: c.password });
      if (error || !data.user) throw new Error(error?.message ?? 'sin sesión');
      await borrarDatos(sb, data.user.id);
      console.log(`  datos borrados: ${c.nombre}`);
    } catch (e) {
      console.warn(`  no se pudo limpiar a ${c.nombre}: ${e.message}`);
    }
  }
  fs.rmSync(ARCHIVO, { force: true });
}

if (MODO === 'borrar') {
  const cuentas = leerCuentas();
  console.log(cuentas.length ? 'Borrando los datos de demostración…' : 'No hay datos de demostración registrados (.demo-cuentas.json).');
  await borrarTodo(cuentas);
  process.exit(0);
}

if (leerCuentas().length && MODO === 'crear') {
  console.log('Ya hay datos de demostración. Corré antes: npm run demo:borrar');
  process.exit(1);
}

const creadas = [];
const emailDemo = process.env.DEMO_EMAIL;
const passwordDemo = process.env.DEMO_PASSWORD;
if (MODO === 'crear' && (!emailDemo || !passwordDemo)) {
  throw new Error('Faltan DEMO_EMAIL y DEMO_PASSWORD (para la cuenta de Camila Ejemplo). Definilos en .env.e2e.');
}

try {
  for (const p of PERFILES) {
    // Camila usa la cuenta que elegís vos; las otras, cuentas inventadas con contraseña al azar.
    const cuenta = p.principal && MODO === 'crear'
      ? { email: emailDemo, password: passwordDemo }
      : { email: `demo.laburin.${p.nombre.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${azar()}${azar()}@gmail.com`, password: `${crypto.randomBytes(9).toString('base64url')}-Lb9!` };
    const sesion = await registrar(cuenta.email, cuenta.password);
    creadas.push({ nombre: p.nombre, email: cuenta.email, password: p.principal && MODO === 'crear' ? null : cuenta.password, sb: sesion.sb, userId: sesion.userId });
    await crearPerfil(sesion, p);
    if (p.principal) await cargarActividad(sesion);
    console.log(`  creado: ${p.nombre}${p.principal ? ' (con ofertas, postulaciones y un recordatorio)' : ''}`);
  }
  if (MODO === 'crear') {
    // Se guardan solo las credenciales de las cuentas con contraseña al azar (para poder borrarlas); la de Camila es la tuya.
    const guardar = creadas.map((c) => ({ nombre: c.nombre, email: c.email, password: c.password ?? passwordDemo }));
    fs.writeFileSync(ARCHIVO, JSON.stringify(guardar, null, 2));
    console.log('\nListo. Entrá como administrador y mirá Candidatos: aparecen las tres cuentas "Ejemplo".');
    console.log(`Para ver el lado del candidato, iniciá sesión con DEMO_EMAIL (${emailDemo}).`);
    console.log('Para borrar todo después: npm run demo:borrar');
  } else {
    console.log('\nPrueba terminada: se borran los datos creados…');
    for (const c of creadas) await borrarDatos(c.sb, c.userId);
    console.log('Listo (los usuarios de Auth quedan, sin datos).');
  }
} catch (e) {
  console.error('ERROR:', e.message);
  for (const c of creadas) await borrarDatos(c.sb, c.userId).catch(() => undefined);
  process.exitCode = 1;
}
