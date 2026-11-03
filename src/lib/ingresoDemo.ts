// Ingreso directo a la cuenta DEMO por enlace: https://<dominio>/#demo=<código>
// El código es el email y la contraseña de la cuenta DEMO (Camila Ejemplo, datos ficticios) en base64url.
// Va después del «#», que el navegador no envía a ningún servidor. Sin ese parámetro, el ingreso es el de siempre.
// Para anular un enlace ya entregado alcanza con cambiar la contraseña de la cuenta DEMO.
const PARAMETRO = 'demo';

export interface CredencialesDemo {
  email: string;
  password: string;
}

function aBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function desdeBase64Url(codigo: string): string {
  const base64 = codigo.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)));
}

export function codificarIngresoDemo({ email, password }: CredencialesDemo): string {
  return `${PARAMETRO}=${aBase64Url(JSON.stringify({ email, password }))}`;
}

// Devuelve las credenciales si el hash trae un código válido; en cualquier otro caso, null (nunca lanza).
export function leerIngresoDemo(hash: string): CredencialesDemo | null {
  const codigo = new URLSearchParams(hash.replace(/^#/, '')).get(PARAMETRO);
  if (!codigo) return null;
  try {
    const { email, password } = JSON.parse(desdeBase64Url(codigo)) as Partial<CredencialesDemo>;
    return typeof email === 'string' && email && typeof password === 'string' && password ? { email, password } : null;
  } catch {
    return null;
  }
}
