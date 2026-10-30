import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { useConteo } from '@/hooks/useConteo';
import { EMBUDO_EJEMPLO, ETAPAS_EJEMPLO, ETIQUETAS_STACK_EJEMPLO, OFERTA_EJEMPLO, calcularEjemploPuntaje } from '@/lib/capitulos';

// Aparece al llegar a la pantalla (una sola vez). Sin IntersectionObserver o con "reducir movimiento" se ve desde el principio.
export function Aparece({
  como: Etiqueta = 'div',
  orden = 0,
  className,
  children,
}: {
  como?: ElementType;
  orden?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [listo, setListo] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;
    if (listo || !el) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setListo(true);
          observador.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, [listo]);

  return (
    <Etiqueta ref={ref} data-listo={listo} style={{ '--i': orden } as CSSProperties} className={`pub-aparece ${className ?? ''}`}>
      {children}
    </Etiqueta>
  );
}

// Capítulo 2: el puntaje de una oferta de ejemplo, que cambia con las tecnologías que marca la persona.
export function CapituloPuntaje() {
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set(['React', 'TypeScript']));
  const ejemplo = calcularEjemploPuntaje(marcadas);
  const mostrado = useConteo(ejemplo.puntaje);

  function alternar(tecnologia: string) {
    setMarcadas((actuales) => {
      const siguientes = new Set(actuales);
      if (siguientes.has(tecnologia)) siguientes.delete(tecnologia);
      else siguientes.add(tecnologia);
      return siguientes;
    });
  }

  return (
    <section id="puntaje" aria-labelledby="titulo-puntaje" className="pub-capitulo pub-f2">
      <div className="pub-grid">
        <div className="pub-izq">
          <Aparece como="h2">
            <span id="titulo-puntaje">Mirá cuánto encaja cada oferta con vos</span>
          </Aparece>
          <Aparece como="p" orden={1}>
            Marcá tus tecnologías y mirá cómo cambia el puntaje de esta oferta de ejemplo.
          </Aparece>
        </div>
        <Aparece className="pub-der" orden={2}>
          <div data-ui>
            <div className="pub-ui-arriba">
              <div>
                <h3 className="pub-ui-titulo">{OFERTA_EJEMPLO.rol}</h3>
                <p className="pub-ui-sub">
                  {OFERTA_EJEMPLO.empresa} · Remoto · {OFERTA_EJEMPLO.ubicacion}
                </p>
              </div>
              <div className="pub-puntaje" data-banda={ejemplo.banda} role="img" aria-label={`Puntaje ${ejemplo.puntaje}`}>
                {mostrado}
              </div>
            </div>
            <p className="pub-ui-rotulo" id="rotulo-tecnologias">
              Tus tecnologías
            </p>
            <div className="pub-chips" role="group" aria-labelledby="rotulo-tecnologias">
              {ETIQUETAS_STACK_EJEMPLO.map((t) => (
                <button key={t} type="button" className="pub-chip" aria-pressed={marcadas.has(t)} onClick={() => alternar(t)}>
                  {t}
                </button>
              ))}
            </div>
            <ul className="pub-criterios" aria-live="polite">
              {ejemplo.filas.map((f) => (
                <li key={f.nombre}>
                  <span className={f.coincide ? 'si' : 'no'}>{f.nombre}</span>
                  <span className={f.coincide ? 'si num' : 'no'}>{f.coincide ? `Coincide · suma ${f.peso}` : 'No coincide'}</span>
                </li>
              ))}
            </ul>
            <p className="pub-nota">Máximo posible con tu perfil: {ejemplo.maximo} puntos.</p>
          </div>
        </Aparece>
      </div>
    </section>
  );
}

// Capítulo 3: las etapas de una postulación, con un deslizador (también se maneja con las flechas del teclado).
export function CapituloEtapas() {
  const [indice, setIndice] = useState(0);
  const etapa = ETAPAS_EJEMPLO[indice];
  const [cambio, setCambio] = useState(0);

  function elegir(nuevo: number) {
    setIndice(nuevo);
    setCambio((c) => c + 1);
  }

  return (
    <section id="como-funciona" aria-labelledby="titulo-etapas" className="pub-capitulo pub-f3">
      <div className="pub-grid">
        <div className="pub-izq">
          <Aparece como="h2">
            <span id="titulo-etapas">{etapa.clausula}</span>
          </Aparece>
          <Aparece como="p" orden={1}>
            Cada postulación avanza por etapas. Arrastrá para ver qué significa cada una.
          </Aparece>
        </div>
        <Aparece className="pub-der" orden={2}>
          <div data-ui>
            <div className="pub-etapas" aria-hidden="true">
              {ETAPAS_EJEMPLO.map((e, i) => (
                <span key={e.nombre} data-on={i <= indice} />
              ))}
            </div>
            <div key={cambio} className={cambio > 0 ? 'pub-cambio' : undefined}>
              <h3 className="pub-ui-titulo">Full Stack Developer</h3>
              <p className="pub-ui-sub">Plano Digital · Remoto</p>
              <p style={{ marginTop: 16 }}>
                <span className="pub-pill">{etapa.nombre}</span>
              </p>
              <p className="pub-explicacion">{etapa.explicacion}</p>
            </div>
          </div>
        </Aparece>
        <Aparece className="pub-deslizador" orden={3}>
          <div className="pub-rango" style={{ '--p': `${(indice / (ETAPAS_EJEMPLO.length - 1)) * 100}%` } as CSSProperties}>
            <div className="pub-riel" />
            <div className="pub-relleno" />
            <input
              type="range"
              min={0}
              max={ETAPAS_EJEMPLO.length - 1}
              step={1}
              value={indice}
              onChange={(e) => elegir(Number(e.target.value))}
              aria-label="Etapa de la postulación"
              aria-valuetext={etapa.nombre}
            />
          </div>
          <div className="pub-paradas">
            {ETAPAS_EJEMPLO.map((e, i) => (
              <button key={e.nombre} type="button" onClick={() => elegir(i)} aria-current={i === indice}>
                {e.nombre}
              </button>
            ))}
          </div>
        </Aparece>
      </div>
    </section>
  );
}

// Capítulo 4: el aviso de actividad, el embudo y el cierre con el nombre a todo el ancho.
export function CapituloAviso({ onCrearCuenta }: { onCrearCuenta: () => void }) {
  const maximo = EMBUDO_EJEMPLO[0].cantidad;

  return (
    <section aria-labelledby="titulo-aviso" className="pub-capitulo pub-f4">
      <div className="pub-grid">
        <div className="pub-izq">
          <Aparece como="h2">
            <span id="titulo-aviso">Si bajás el ritmo, el topo te avisa</span>
          </Aparece>
          <Aparece como="p" orden={1}>
            Cuando pasan días sin novedades, Laburin te lo cuenta con buena onda y te lleva a donde retomar.
          </Aparece>
        </div>
        <Aparece className="pub-der" orden={2}>
          <div data-ui className="pub-aviso-ui">
            <h3 className="pub-ui-titulo">Bajó tu ritmo</h3>
            <p>Esta semana hiciste 2 movimientos y la anterior 7. ¿Retomamos con las postulaciones que están por vencer?</p>
            <span className="pub-btn" aria-hidden="true">
              Ver mis postulaciones
            </span>
          </div>
          <div data-ui style={{ marginTop: 20 }}>
            <h3 className="pub-ui-titulo">Tu progreso</h3>
            <p className="pub-ui-sub">Postulaciones que llegaron al menos a cada etapa</p>
            <ul className="pub-barras-embudo" aria-label="Embudo de postulaciones de ejemplo">
              {EMBUDO_EJEMPLO.map((e) => (
                <li key={e.etapa}>
                  <span>{e.etapa}</span>
                  <i style={{ '--w': `${Math.max(4, Math.round((e.cantidad / maximo) * 100))}%` } as CSSProperties} />
                  <b>{e.cantidad}</b>
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className="pub-btn pub-cta" onClick={onCrearCuenta}>
            Crear mi cuenta
          </button>
        </Aparece>
        <nav className="pub-pie" aria-label="Pie">
          <a href="#puntaje">Tu puntaje</a>
          <a href="#como-funciona">Cómo funciona</a>
          <span>Hecho en Argentina para quienes buscan laburo</span>
        </nav>
        <p className="pub-nombre" aria-hidden="true">
          Laburin
        </p>
      </div>
    </section>
  );
}
