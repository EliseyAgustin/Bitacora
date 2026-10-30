import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { Building2, Check, Clock, MapPin, Minus } from 'lucide-react';
import { AvisoActividadVista } from '@/components/AvisoActividad';
import { useConteo } from '@/hooks/useConteo';
import { mensajeDeActividad } from '@/lib/actividad';
import { ETAPA_CLASES } from '@/lib/etapas';
import { cn } from '@/lib/utils';
import { EMBUDO_EJEMPLO, ETAPAS_EJEMPLO, ETIQUETAS_STACK_EJEMPLO, OFERTA_EJEMPLO, calcularEjemploPuntaje, conversionesDelEmbudo } from '@/lib/capitulos';

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

// Los mismos colores de la tarjeta de oferta de la aplicación para cada banda de puntaje.
const BANDA_CLASES = {
  alto: 'bg-success-container text-on-success-container border-success',
  medio: 'bg-warning-container text-on-warning-container border-warning',
  bajo: 'bg-error-container text-on-error-container border-error',
} as const;

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
              <div className="min-w-0">
                <h3 className="pub-ui-titulo">{OFERTA_EJEMPLO.rol}</h3>
                <p className="pub-ui-sub flex items-center gap-2">
                  <Building2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {OFERTA_EJEMPLO.empresa}
                </p>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant list-none p-0">
                  <li className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {OFERTA_EJEMPLO.ubicacion}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                    Remoto
                  </li>
                </ul>
              </div>
              <div
                className={cn('pub-puntaje', BANDA_CLASES[ejemplo.banda])}
                data-banda={ejemplo.banda}
                role="img"
                aria-label={`Puntaje ${ejemplo.puntaje}`}
              >
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
                  <span className={cn('flex items-center gap-2', f.coincide ? 'si' : 'no')}>
                    {f.coincide ? <Check className="w-4 h-4 shrink-0 text-success" aria-hidden="true" /> : <Minus className="w-4 h-4 shrink-0" aria-hidden="true" />}
                    {f.nombre}
                  </span>
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
                <span key={e.nombre} data-on={i <= indice} style={i <= indice ? { backgroundColor: `var(--color-etapa-${e.estado.replace('_', '-')})` } : undefined} />
              ))}
            </div>
            <div key={cambio} className={cambio > 0 ? 'pub-cambio' : undefined}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  <span aria-hidden="true" className={cn('w-2.5 h-2.5 rounded-full', ETAPA_CLASES[etapa.estado].punto)} />
                  {etapa.nombre}
                </h3>
                <span className={cn('num px-2.5 py-0.5 rounded-full text-sm font-bold', ETAPA_CLASES[etapa.estado].chip)}>1</span>
              </div>
              <p className="pub-explicacion">{etapa.explicacion}</p>
              <div className="mt-4 rounded-md border border-outline-variant border-t-4 border-t-warning p-4 bg-surface">
                <p className="text-base font-medium leading-tight">Full Stack Developer</p>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-on-surface-variant">
                  <Building2 className="w-4 h-4" aria-hidden="true" />
                  Plano Digital
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant">
                    <span aria-hidden="true" className="w-2 h-2 rounded-full bg-primary" />
                    Puntaje: 55
                  </span>
                  {indice > 0 && (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant bg-surface-container px-2 py-1 rounded-sm">
                      <Clock className="w-4 h-4" aria-hidden="true" />
                      2026-10-25
                    </span>
                  )}
                </div>
              </div>
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
          <AvisoActividadVista
            estado="bajo-ritmo"
            mensaje={mensajeDeActividad({ estado: 'bajo-ritmo', esta: 2, anterior: 7, diasSinActividad: 3 })!}
            accion={{ texto: 'Ver Mis postulaciones' }}
            anunciar={false}
          />
          <div data-ui style={{ marginTop: 20 }}>
            <h3 className="pub-ui-titulo">Embudo de postulaciones</h3>
            <p className="pub-ui-sub">Postulaciones que llegaron al menos a cada etapa</p>
            <ul className="pub-barras-embudo" aria-label="Embudo de postulaciones de ejemplo">
              {EMBUDO_EJEMPLO.map((e) => (
                <li key={e.etapa}>
                  <span>{e.etapa}</span>
                  <i
                    style={
                      {
                        '--w': `${Math.max(4, Math.round((e.cantidad / maximo) * 100))}%`,
                        backgroundColor: `var(--color-etapa-${e.estado.replace('_', '-')})`,
                      } as CSSProperties
                    }
                  />
                  <b>{e.cantidad}</b>
                </li>
              ))}
            </ul>
            <p className="pub-nota">
              Conversión desde la etapa anterior: {conversionesDelEmbudo().map((c) => `${c.etapa} ${c.porcentaje}%`).join(' · ')}
            </p>
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
