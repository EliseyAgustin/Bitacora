import type { Modalidad } from '@/types/oferta';

const LARGO_MAXIMO_URL = 2000;

// El enlace de una oferta lo trae una fuente externa o lo escribe la persona: solo se abre si es http o https.
// Nada de javascript:, data:, enlaces con usuario y clave ni rutas sin protocolo. Devuelve la dirección normalizada.
export function urlSegura(valor: string | null | undefined): string | null {
  const limpio = valor?.trim();
  if (!limpio || limpio.length > LARGO_MAXIMO_URL) return null;
  if (!/^https?:\/\//i.test(limpio)) return null;

  let url: URL;
  try {
    url = new URL(limpio);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password || !url.hostname) return null;
  return url.href;
}

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodificarEntidades(texto: string): string {
  return texto.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (entidad, cuerpo: string) => {
    if (cuerpo[0] === '#') {
      const codigo = cuerpo[1].toLowerCase() === 'x' ? parseInt(cuerpo.slice(2), 16) : parseInt(cuerpo.slice(1), 10);
      return codigo > 0 && codigo <= 0x10ffff ? String.fromCodePoint(codigo) : entidad;
    }
    return ENTIDADES[cuerpo.toLowerCase()] ?? entidad;
  });
}

// La descripción de una oferta viene como HTML de un tercero. Se guarda y se muestra como texto plano:
// se quitan las etiquetas (con el contenido de scripts y estilos) y las entidades quedan como texto, nunca como código.
export function textoPlano(html: string | null | undefined, maximo: number): string {
  if (!html) return '';

  const sinEtiquetas = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|h[1-6]|ul|ol|tr|table|section|article)\s*>/gi, '\n\n')
    .replace(/<\/?[a-zA-Z!][^>]*>/g, '');

  const texto = decodificarEntidades(sinEtiquetas)
    .replace(/[ \t\r\f\v]+/g, ' ')
    .split('\n')
    .map((linea) => linea.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return texto.length > maximo ? `${texto.slice(0, maximo).trimEnd()}…` : texto;
}

// Filtro "Tipo de lugar de trabajo" de la búsqueda de empleos de LinkedIn: 1 presencial, 2 remoto, 3 híbrido.
const FILTRO_LINKEDIN: Record<Modalidad, string> = { presencial: '1', remoto: '2', hibrido: '3' };

// LinkedIn no ofrece una API pública para buscar ofertas: lo que se puede hacer, sin raspar nada,
// es abrir su buscador ya filtrado con los datos del perfil de búsqueda.
export function urlBusquedaLinkedIn(perfil: {
  rol: string | null | undefined;
  ubicacion: string | null | undefined;
  modalidad: Modalidad | null | undefined;
}): string {
  const params = new URLSearchParams();
  if (perfil.rol?.trim()) params.set('keywords', perfil.rol.trim());
  if (perfil.ubicacion?.trim()) params.set('location', perfil.ubicacion.trim());
  if (perfil.modalidad) params.set('f_WT', FILTRO_LINKEDIN[perfil.modalidad]);

  const consulta = params.toString();
  return `https://www.linkedin.com/jobs/search/${consulta ? `?${consulta}` : ''}`;
}
