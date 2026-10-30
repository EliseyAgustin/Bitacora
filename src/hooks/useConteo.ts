import { useEffect, useRef, useState } from 'react';

// Anima un número de su valor anterior al nuevo (para el puntaje). Con "reducir movimiento" cambia de golpe.
export function useConteo(objetivo: number, duracionMs = 450): number {
  const [valor, setValor] = useState(objetivo);
  const desde = useRef(objetivo);

  useEffect(() => {
    const quiereMenosMovimiento = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (quiereMenosMovimiento || desde.current === objetivo) {
      desde.current = objetivo;
      setValor(objetivo);
      return;
    }

    const inicio = performance.now();
    const origen = desde.current;
    let cuadro = 0;
    const paso = (ahora: number) => {
      const k = Math.min(1, (ahora - inicio) / duracionMs);
      const suave = 1 - Math.pow(1 - k, 3);
      const actual = Math.round(origen + (objetivo - origen) * suave);
      desde.current = actual;
      setValor(actual);
      if (k < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [objetivo, duracionMs]);

  return valor;
}
