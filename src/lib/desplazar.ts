// Desplazamiento lento y suave hacia una sección de la página. El CSS no deja elegir la duración de «scroll-behavior: smooth»,
// que en un salto largo se siente brusco: acá la duración depende de la distancia y arranca y frena con suavidad.
export const DURACION_MINIMA_MS = 900;
export const DURACION_MAXIMA_MS = 2200;

// Curva de arranque y frenado suaves: 0 → 0, 0.5 → 0.5, 1 → 1.
export function suavizado(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function duracionPara(distanciaPx: number): number {
  const ms = 700 + Math.abs(distanciaPx) * 0.6;
  return Math.round(Math.min(DURACION_MAXIMA_MS, Math.max(DURACION_MINIMA_MS, ms)));
}

export function desplazarA(elemento: HTMLElement): void {
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const origen = window.scrollY;
  const destino = origen + elemento.getBoundingClientRect().top;

  const terminar = () => {
    // El foco acompaña al desplazamiento, para quien navega con teclado o lector de pantalla.
    elemento.focus({ preventScroll: true });
  };

  if (reducido || Math.abs(destino - origen) < 2) {
    window.scrollTo(0, destino);
    terminar();
    return;
  }

  const duracion = duracionPara(destino - origen);
  const inicio = performance.now();
  const paso = (ahora: number) => {
    const t = (ahora - inicio) / duracion;
    window.scrollTo(0, origen + (destino - origen) * suavizado(t));
    if (t < 1) requestAnimationFrame(paso);
    else terminar();
  };
  requestAnimationFrame(paso);
}
