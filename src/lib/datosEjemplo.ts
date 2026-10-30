import { MARCA } from '@/lib/marca';

// Solo para desarrollo (ver Login.tsx). Supabase rechaza dominios sin MX como example.com; si tu proyecto rechaza este, cambialo acá.
const DOMINIO_EMAIL_EJEMPLO = 'gmail.com';
const PASSWORD_EJEMPLO = `${MARCA.nombre}-Prueba-2026`;

export function generarDatosEjemplo(ahora: Date) {
  return {
    email: `laburin.prueba.${ahora.getTime()}@${DOMINIO_EMAIL_EJEMPLO}`,
    password: PASSWORD_EJEMPLO,
  };
}
