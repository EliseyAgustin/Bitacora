// Arma el enlace de ingreso directo a la cuenta DEMO (ver src/lib/ingresoDemo.ts).
//   npm run demo:enlace                        usa https://bitacora-empleo.vercel.app (el enlace cae en Mis postulaciones: el login no redirige si ya hay sesión)
//   npm run demo:enlace -- http://localhost:5173
// Lee DEMO_EMAIL y DEMO_PASSWORD de .env.e2e. Para anular los enlaces ya entregados, cambiá la contraseña de la cuenta DEMO.
import dotenv from 'dotenv';

dotenv.config({ path: '.env.e2e' });

const { DEMO_EMAIL: email, DEMO_PASSWORD: password } = process.env;
if (!email || !password) throw new Error('Faltan DEMO_EMAIL / DEMO_PASSWORD en .env.e2e.');

const base = (process.argv[2] ?? 'https://bitacora-empleo.vercel.app').replace(/\/+$/, '');
const codigo = Buffer.from(JSON.stringify({ email, password }), 'utf8').toString('base64url');
console.log(`${base}/mis-postulaciones#demo=${codigo}`);
