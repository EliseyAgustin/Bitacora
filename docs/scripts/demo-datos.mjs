// Datos de demostración (ficticios) para la presentación, sin pasar por la interfaz.
//
//   npm run demo:datos     crea (o reinicia) la cuenta DEMO y suma dos candidatos más (Tomás y Lucía Ejemplo)
//   npm run demo:borrar    borra los datos que creó (perfiles, ofertas, criterios y mensajes)
//   node docs/scripts/demo-datos.mjs --probar    crea y borra enseguida (para comprobar que el script anda)
//
// Qué se crea:
//  - La cuenta DEMO (Camila Ejemplo): el recorrido de alguien que usa Laburin hace ocho semanas. 36 ofertas con puntaje,
//    15 postulaciones en los seis estados con su historial, interacciones de los cuatro tipos, dos avisos de seguimiento
//    activos y dos resueltos, un criterio de scoring apagado y tres mensajes del administrador (uno sin leer).
//    Los datos están definidos en docs/scripts/demo-dataset.mjs y un test los compara con el motor real de la aplicación.
//    Es repetible: si la cuenta ya existe, se reinicia (borra su actividad y la vuelve a cargar con fechas actuales).
//    Entrás con DEMO_EMAIL y DEMO_PASSWORD (ver abajo).
//  - Tomás y Lucía Ejemplo: dos candidatos con perfil completo y sin actividad, para ver en Candidatos del administrador.
//  - Cada cuenta nueva recibe sola el mensaje de bienvenida (lo manda el trigger de la base).
//  - Los mensajes de la cuenta DEMO los envía la cuenta de administrador de pruebas (E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD).
//    Sin ellas, todo lo demás se carga igual y los mensajes se omiten.
//
// Todo se hace con la clave anon y el inicio de sesión de cada cuenta (sin service role key).
// Variables (en .env y .env.e2e, que no se versionan): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, DEMO_EMAIL y DEMO_PASSWORD
// (un email que vos controles y una contraseña de al menos 8 caracteres).
// Las contraseñas de Tomás y Lucía se generan al azar y quedan en .demo-cuentas.json (ignorado por git) solo para poder
// borrar sus datos después. Los usuarios de Auth no se pueden borrar sin una service role key: quedan, sin datos.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { construirDataset, fecharDespuesDeLaBienvenida } from './demo-dataset.mjs';

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
  { principal: true },
  { nombre: 'Tomás Ejemplo', rol: 'Data Analyst', techs: ['SQL', 'Python'], modalidad: 'hibrido', modalidadEtiqueta: 'Híbrido', ubicacion: 'Rosario, Argentina', nivel: 'junior' },
  { nombre: 'Lucía Ejemplo', rol: 'QA Automation', techs: ['Selenium', 'Docker'], modalidad: 'remoto', modalidadEtiqueta: 'Remoto', ubicacion: 'Córdoba, Argentina', nivel: 'senior' },
];

const claveOferta = (o) => [o.empresa, o.rol, o.fuente ?? ''].map((x) => x.trim().toLowerCase()).join('|');

// Si la cuenta ya existe se inicia sesión (y se reinicia); si no, se registra.
async function abrirCuenta(email, password) {
  const sb = cliente();
  const { data: ingreso } = await sb.auth.signInWithPassword({ email, password });
  if (ingreso?.user) return { sb, userId: ingreso.user.id, existia: true };

  const { data, error } = await sb.auth.signUp({ email, password });
  if (error || !data.user || !data.session) {
    throw new Error(`No se pudo registrar ${email}: ${error?.message ?? 'sin sesión (¿el proyecto pide confirmar el email?)'}`);
  }
  return { sb, userId: data.user.id, existia: false };
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

const comprobar = (error, que) => {
  if (error) throw new Error(`${que}: ${error.message}`);
};

// Borra la actividad de la cuenta (las postulaciones, interacciones, avisos e historial se van con las ofertas).
// Se conserva el mensaje de bienvenida: lo escribe el trigger al registrarse y no se puede volver a crear.
async function borrarActividad(sb, userId) {
  comprobar((await sb.from('ofertas').delete().eq('user_id', userId)).error, 'borrar ofertas');
  comprobar((await sb.from('criterios_scoring').delete().eq('user_id', userId)).error, 'borrar criterios');
  comprobar((await sb.from('mensajes').delete().eq('destinatario_id', userId).eq('tipo', 'admin')).error, 'borrar mensajes');
}

// Carga la cuenta DEMO completa. Todo lo que se escribe pasa por las reglas de acceso de cada tabla, como en la aplicación.
async function cargarCuentaDemo({ sb, userId }, dataset) {
  await borrarActividad(sb, userId);

  const { perfil, criterios, ofertas, postulaciones, recordatorios } = dataset;
  const { registrado_el: registradoEl, ...datosPerfil } = perfil;
  const { data: existente } = await sb.from('perfil_usuario').select('user_id').eq('user_id', userId).maybeSingle();
  comprobar(
    (existente
      ? await sb.from('perfil_usuario').update(datosPerfil).eq('user_id', userId)
      : await sb.from('perfil_usuario').insert({ user_id: userId, ...datosPerfil })
    ).error,
    'guardar el perfil'
  );
  // "Registrado el" (lo que ve el administrador): si la base no deja cambiarlo, queda la fecha real.
  await sb.from('perfil_usuario').update({ created_at: registradoEl }).eq('user_id', userId);

  comprobar((await sb.from('criterios_scoring').insert(criterios.map((c) => ({ ...c, user_id: userId })))).error, 'cargar criterios');

  const { data: ofertasCreadas, error: errorOfertas } = await sb
    .from('ofertas')
    .insert(ofertas.map((o) => ({ ...o, user_id: userId })))
    .select('id, empresa, rol, fuente');
  comprobar(errorOfertas, 'cargar ofertas');
  const idDeOferta = new Map(ofertasCreadas.map((o) => [claveOferta(o), o.id]));

  // Cada postulación se crea como "por aplicar" y recorre sus estados uno a uno: así el trigger de la base arma el historial
  // que usa el embudo de Mi progreso.
  const idsPostulacion = [];
  for (const p of postulaciones) {
    const o = ofertas[p.oferta];
    const { data, error } = await sb
      .from('postulaciones')
      .insert({ oferta_id: idDeOferta.get(claveOferta(o)), estado: 'por_aplicar', created_at: p.created_at })
      .select('id')
      .single();
    comprobar(error, 'crear una postulación');
    for (const estado of p.recorrido) comprobar((await sb.from('postulaciones').update({ estado }).eq('id', data.id)).error, `mover a ${estado}`);
    if (p.fecha_postulacion) comprobar((await sb.from('postulaciones').update({ fecha_postulacion: p.fecha_postulacion }).eq('id', data.id)).error, 'fecha de postulación');
    idsPostulacion.push(data.id);
  }

  const interacciones = postulaciones.flatMap((p, i) => p.interacciones.map((x) => ({ ...x, postulacion_id: idsPostulacion[i] })));
  comprobar((await sb.from('interacciones').insert(interacciones)).error, 'cargar interacciones');

  const avisos = recordatorios.map(({ postulacion, ...r }) => ({ ...r, postulacion_id: idsPostulacion[postulacion] }));
  comprobar((await sb.from('recordatorios').insert(avisos)).error, 'cargar avisos de seguimiento');

  return { ofertas: ofertas.length, postulaciones: postulaciones.length, interacciones: interacciones.length, avisos: avisos.length };
}

// Los mensajes del administrador los envía la cuenta de administrador de pruebas; después la cuenta DEMO marca como leídos los que corresponde.
async function enviarMensajesDemo({ sb, userId }, mensajes) {
  const { E2E_ADMIN_EMAIL: email, E2E_ADMIN_PASSWORD: password } = process.env;
  if (!email || !password) return 'omitidos (faltan E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD en .env.e2e)';

  const admin = cliente();
  const { data: sesion, error: errorSesion } = await admin.auth.signInWithPassword({ email, password });
  if (errorSesion || !sesion.user) return `omitidos (no se pudo iniciar sesión como administrador: ${errorSesion?.message ?? 'sin sesión'})`;

  // La bienvenida (la manda la base al registrarse) tiene su fecha real: los mensajes del equipo van después.
  const { data: bienvenida } = await sb.from('mensajes').select('created_at').eq('destinatario_id', userId).eq('tipo', 'bienvenida').maybeSingle();
  if (bienvenida) mensajes = fecharDespuesDeLaBienvenida(mensajes, new Date(bienvenida.created_at).getTime(), Date.now());

  const { data, error } = await admin
    .from('mensajes')
    .insert(mensajes.map((m) => ({ remitente_id: sesion.user.id, destinatario_id: userId, tipo: 'admin', texto: m.texto, created_at: m.created_at })))
    .select('id, texto');
  if (error) return `omitidos (${error.message})`;

  const leidos = data.filter((m) => mensajes.find((x) => x.texto === m.texto)?.leido).map((m) => m.id);
  if (leidos.length) comprobar((await sb.from('mensajes').update({ leido: true }).in('id', leidos)).error, 'marcar mensajes como leídos');
  return `${data.length} enviados (${data.length - leidos.length} sin leer)`;
}

async function borrarDatos(sb, userId) {
  for (const tabla of ['ofertas', 'criterios_scoring', 'perfil_usuario']) await sb.from(tabla).delete().eq('user_id', userId);
  await sb.from('mensajes').delete().eq('destinatario_id', userId).eq('tipo', 'admin');
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

const emailDemo = process.env.DEMO_EMAIL;
const passwordDemo = process.env.DEMO_PASSWORD;
if (MODO === 'crear' && (!emailDemo || !passwordDemo)) {
  throw new Error('Faltan DEMO_EMAIL y DEMO_PASSWORD (para la cuenta DEMO). Definilos en .env.e2e.');
}

const previas = leerCuentas();
const creadas = [];
const dataset = construirDataset(new Date());

try {
  for (const p of PERFILES) {
    const nombre = p.principal ? dataset.perfil.nombre : p.nombre;

    // Tomás y Lucía se crean una sola vez; si ya están registrados en .demo-cuentas.json se dejan como están.
    if (!p.principal && MODO === 'crear' && previas.some((c) => c.nombre === nombre)) {
      console.log(`  ya existe: ${nombre}`);
      continue;
    }

    // La cuenta DEMO usa la que elegís vos; las otras, cuentas inventadas con contraseña al azar.
    const cuenta = p.principal && MODO === 'crear'
      ? { email: emailDemo, password: passwordDemo }
      : { email: `demo.laburin.${nombre.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${azar()}${azar()}@gmail.com`, password: `${crypto.randomBytes(9).toString('base64url')}-Lb9!` };
    const sesion = await abrirCuenta(cuenta.email, cuenta.password);
    creadas.push({ nombre, email: cuenta.email, password: cuenta.password, sb: sesion.sb, userId: sesion.userId });

    if (p.principal) {
      const resumen = await cargarCuentaDemo(sesion, dataset);
      const mensajes = await enviarMensajesDemo(sesion, dataset.mensajes);
      console.log(`  ${sesion.existia ? 'reiniciada' : 'creada'}: ${nombre} (cuenta DEMO)`);
      console.log(`    ${resumen.ofertas} ofertas, ${resumen.postulaciones} postulaciones, ${resumen.interacciones} interacciones, ${resumen.avisos} avisos de seguimiento`);
      console.log(`    mensajes del administrador: ${mensajes}`);
    } else {
      await crearPerfil(sesion, p);
      console.log(`  creado: ${nombre}`);
    }
  }

  if (MODO === 'crear') {
    // Se guardan las credenciales de las cuentas con contraseña al azar (para poder borrarlas) y la de la cuenta DEMO.
    const nuevas = creadas.map((c) => ({ nombre: c.nombre, email: c.email, password: c.password }));
    const conservadas = previas.filter((c) => !nuevas.some((n) => n.nombre === c.nombre));
    fs.writeFileSync(ARCHIVO, JSON.stringify([...conservadas, ...nuevas], null, 2));
    console.log('\nListo. Entrá como administrador y mirá Candidatos: aparecen las tres cuentas "Ejemplo".');
    console.log(`Para ver el lado del candidato, iniciá sesión con DEMO_EMAIL (${emailDemo}).`);
    console.log('Para reiniciar la cuenta DEMO con fechas actuales: npm run demo:datos. Para borrar todo: npm run demo:borrar');
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
