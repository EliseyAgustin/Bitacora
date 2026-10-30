import { MARCA } from '@/lib/marca';

export interface PlantillaMensaje {
  id: string;
  titulo: string;
  // Para qué sirve, se muestra como ayuda al elegirla.
  descripcion: string;
  // El texto sin el saludo: se completa con "Hola <primer nombre>, " (ver armarMensaje).
  cuerpo: string;
}

// Mensajes de uso frecuente del administrador. Lo que va entre corchetes es un dato que hay que completar a mano antes de enviar.
// Se evita el género de la persona ("registrado/a"): el nombre no lo dice y el saludo tiene que servir para cualquiera.
export const PLANTILLAS_MENSAJE: PlantillaMensaje[] = [
  {
    id: 'solicitud-recibida',
    titulo: 'Solicitud recibida',
    descripcion: 'Confirma que el perfil quedó registrado.',
    cuerpo: `tu perfil quedó registrado y vamos a tener en cuenta tu solicitud. Gracias por sumarte a ${MARCA.nombre}.`,
  },
  {
    id: 'falta-un-dato',
    titulo: 'Falta un dato',
    descripcion: 'Pide un dato puntual del perfil (hay que completar el cuál).',
    cuerpo:
      'para tener en cuenta tu solicitud nos falta un dato de tu perfil: [indicá cuál]. Podés completarlo cuando quieras en Mi perfil de búsqueda.',
  },
  {
    id: 'pedir-ubicacion',
    titulo: 'Pedir la ubicación',
    descripcion: 'Pide la ciudad y el país.',
    cuerpo:
      '¿podés indicarnos tu ciudad y tu país? Con ese dato podemos tener mejor en cuenta tu solicitud. Lo cambiás cuando quieras en Mi perfil de búsqueda.',
  },
  {
    id: 'sumar-tecnologias',
    titulo: 'Sumar tecnologías',
    descripcion: 'Sugiere ampliar las tecnologías del perfil.',
    cuerpo:
      'revisamos tu perfil y las tecnologías cargadas son pocas. Si manejás otras, sumalas en Mi perfil de búsqueda para que tu solicitud quede más completa.',
  },
  {
    id: 'datos-completos',
    titulo: 'Datos completos',
    descripcion: 'Cierra el pedido de datos con un agradecimiento.',
    cuerpo: 'gracias por completar tu perfil. Ya tenemos todo lo que necesitábamos y vamos a tener en cuenta tu solicitud.',
  },
];

// "Camila Ejemplo" -> "Camila". Sin nombre (o con el texto "Sin nombre" de la pantalla) devuelve vacío.
export function primerNombre(nombre: string | null | undefined): string {
  const limpio = nombre?.trim() ?? '';
  if (!limpio || /^sin nombre$/i.test(limpio)) return '';
  return limpio.split(/\s+/)[0];
}

export function armarMensaje(plantilla: PlantillaMensaje, nombre: string | null | undefined): string {
  const saludo = primerNombre(nombre);
  return `Hola${saludo ? ` ${saludo}` : ''}, ${plantilla.cuerpo}`;
}

const CAMPO_PENDIENTE = /\[[^[\]\n]+\]/;

// Un texto con algo entre corchetes ([indicá cuál]) todavía tiene un dato por completar.
export function hayCamposSinCompletar(texto: string): boolean {
  return CAMPO_PENDIENTE.test(texto);
}

// Posición del primer campo pendiente, para seleccionarlo y que se pueda escribir encima.
export function primerCampoPendiente(texto: string): { inicio: number; fin: number } | null {
  const coincidencia = CAMPO_PENDIENTE.exec(texto);
  return coincidencia ? { inicio: coincidencia.index, fin: coincidencia.index + coincidencia[0].length } : null;
}
