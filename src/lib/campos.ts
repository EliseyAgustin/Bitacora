// Qué campo de color de la paleta abre cada pantalla (1 azul, 2 naranja, 3 salvia). Se alternan para que dos pantallas
// vecinas del menú no se vean iguales y cada una se reconozca por su color.
export type CampoBanda = 1 | 2 | 3;

const POR_RUTA: Record<string, CampoBanda> = {
  '/ofertas': 1,
  '/mis-postulaciones': 2,
  '/mi-progreso': 3,
  '/mi-perfil': 1,
  '/mensajes': 2,
  '/candidatos': 3,
};

export function campoDeRuta(pathname: string): CampoBanda {
  return POR_RUTA[pathname.replace(/\/+$/, '')] ?? 1;
}
