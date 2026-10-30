import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  LabelList,
} from 'recharts';
import { Activity, BellRing, Briefcase, Gauge, Hourglass, Info, Inbox, Minus, Target, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { AvisoActividad } from '@/components/AvisoActividad';
import { PageHeader } from '@/components/PageHeader';
import { mensajeDeError } from '@/lib/errores';
import { useTheme } from '@/hooks/useTheme';
import { calcularTendencias, tendenciaDe, textoDeTendencia, type Tendencia } from '@/lib/tendencias';
import { cn } from '@/lib/utils';
import { calcularMetricas, cargarDatosMetricas } from '@/services/metricas';
import { ESTADO_POSTULACION_LABEL } from '@/services/postulaciones';

const CHART_COLORS = {
  light: {
    grid: '#d9e0d9',
    axisText: '#46504a',
    tooltipBg: '#101418',
    tooltipText: '#ffffff',
    primary: '#1e4fd8',
    series: { mail: '#1e4fd8', llamada: '#0d9488', entrevista: '#d97706', nota: '#7c3aed' },
    bandas: { alto: '#16a34a', medio: '#d97706', bajo: '#dc2626', sinScore: '#9aa3b8' },
  },
  dark: {
    grid: '#363a42',
    axisText: '#b3b9b4',
    tooltipBg: '#2a2d33',
    tooltipText: '#eceee9',
    primary: '#7da2ff',
    series: { mail: '#7da2ff', llamada: '#5eead4', entrevista: '#fbbf24', nota: '#c4b5fd' },
    bandas: { alto: '#4ade80', medio: '#fbbf24', bajo: '#f87171', sinScore: '#6b7594' },
  },
};

const porcentaje = (valor: number | null) => (valor === null ? '—' : `${Math.round(valor * 100)}%`);

// Más es mejor en todas las tarjetas con tendencia: subir va en verde y bajar en un tono cálido. El color nunca va solo: lleva flecha y texto.
const TONO_TENDENCIA = {
  sube: { clase: 'text-etapa-oferta-tinta', Icono: TrendingUp },
  baja: { clase: 'text-etapa-en-proceso-tinta', Icono: TrendingDown },
  igual: { clase: 'text-on-surface-variant', Icono: Minus },
} as const;

function KpiCard({
  id,
  label,
  ayuda,
  icon: Icon,
  value,
  detail,
  tendencia,
}: {
  id: string;
  label: string;
  ayuda: string;
  icon: LucideIcon;
  value: string;
  detail: string;
  tendencia?: Tendencia | null;
}) {
  const [abierta, setAbierta] = useState(false);
  const tono = tendencia ? TONO_TENDENCIA[tendencia.sentido] : null;

  return (
    <div className="entrada bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-on-surface leading-snug">{label}</h3>
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          aria-controls={`ayuda-${id}`}
          aria-label={`Qué mide «${label}»`}
          className="shrink-0 -mt-2 -mr-2 w-11 h-11 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low cursor-pointer"
        >
          <Info className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      <p id={`ayuda-${id}`} hidden={!abierta} className="mb-2 rounded-lg bg-surface-container-low p-3 text-sm text-on-surface">
        {ayuda}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <Icon className="w-6 h-6 text-primary shrink-0" aria-hidden="true" />
        <span className="num text-4xl font-bold text-on-surface leading-none">{value}</span>
      </div>
      <p className="text-sm text-on-surface-variant mt-2">{detail}</p>
      {tendencia && tono && (
        <p className={cn('mt-2 flex items-center gap-1.5 text-sm font-semibold', tono.clase)}>
          <tono.Icono className="w-4 h-4 shrink-0" aria-hidden="true" />
          {textoDeTendencia(tendencia)}
        </p>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  badge,
  className,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: { text: string; title: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col h-72 md:h-100 ${className ?? ''}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-heading font-semibold text-on-surface">{title}</h3>
          <p className="text-sm text-on-surface-variant">{subtitle}</p>
        </div>
        {badge && (
          <span
            title={badge.title}
            className="shrink-0 bg-tertiary-container text-on-tertiary-container text-xs font-semibold px-2.5 py-1 rounded-full cursor-help"
          >
            {badge.text}
          </span>
        )}
      </div>
      <div className="flex-1 w-full h-full min-h-0">{children}</div>
    </div>
  );
}

function SinDatos({ mensaje }: { mensaje: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-outline-variant">
      <Inbox className="w-10 h-10" />
      <p className="text-sm text-on-surface-variant text-center">{mensaje}</p>
    </div>
  );
}

type Metricas = ReturnType<typeof calcularMetricas>;

export function Analytics() {
  const { theme } = useTheme();
  const colors = CHART_COLORS[theme];
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [tendencias, setTendencias] = useState<ReturnType<typeof calcularTendencias> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advertencias, setAdvertencias] = useState<string[]>([]);

  useEffect(() => {
    let cancelado = false;
    cargarDatosMetricas()
      .then(({ datos, tendencias, advertencias }) => {
        if (cancelado) return;
        const ahora = new Date();
        setMetricas(calcularMetricas(datos, ahora));
        setTendencias(calcularTendencias(tendencias, ahora));
        setAdvertencias(advertencias);
      })
      .catch((err) => {
        if (!cancelado) setError(mensajeDeError(err, 'No se pudieron cargar las métricas.'));
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const tooltipProps = {
    contentStyle: { backgroundColor: colors.tooltipBg, borderRadius: '8px', color: colors.tooltipText, border: 'none', fontSize: 14 },
    itemStyle: { color: colors.tooltipText },
    labelStyle: { color: colors.tooltipText },
    cursor: { fill: 'rgba(128,128,128,0.1)' },
  };
  const axisTick = { fontSize: 14, fill: colors.axisText };

  return (
    <div className="flex-1 overflow-y-auto p-margin h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader title="Mi progreso" help="Cómo te está yendo en tu búsqueda: ofertas, postulaciones y respuestas. Tocá la «i» de cada tarjeta para ver qué mide." />
        <AvisoActividad donde="progreso" />

        {error && <div className="p-4 bg-error-container text-on-error-container rounded-lg text-sm">{error}</div>}
        {advertencias.map((advertencia) => (
          <div key={advertencia} className="p-4 bg-tertiary-container text-on-tertiary-container rounded-lg text-sm">
            {advertencia}
          </div>
        ))}
        {!metricas && !error && (
          <div className="text-center text-on-surface-variant text-sm py-16">Calculando métricas…</div>
        )}

        {metricas && <Contenido metricas={metricas} tendencias={tendencias} colors={colors} tooltipProps={tooltipProps} axisTick={axisTick} />}
      </div>
    </div>
  );
}

function Contenido({
  metricas: m,
  tendencias,
  colors,
  tooltipProps,
  axisTick,
}: {
  metricas: Metricas;
  tendencias: ReturnType<typeof calcularTendencias> | null;
  colors: (typeof CHART_COLORS)['light'];
  tooltipProps: object;
  axisTick: object;
}) {
  const totalPostulaciones = Object.values(m.postulaciones.porEstado).reduce((a, b) => a + b, 0);

  // Cada barra lleva el color de su etapa, el mismo del tablero: se reconoce a simple vista.
  const embudoData = m.embudo.etapas.map((e) => ({
    name: ESTADO_POSTULACION_LABEL[e.estado],
    value: e.alcanzadas,
    color: `var(--color-etapa-${e.estado.replace('_', '-')})`,
  }));
  const bandas = m.score.bandas;
  const bandasData = bandas && [
    { name: 'Alto', value: bandas.alto, color: colors.bandas.alto },
    { name: 'Medio', value: bandas.medio, color: colors.bandas.medio },
    { name: 'Bajo', value: bandas.bajo, color: colors.bandas.bajo },
    { name: 'Sin puntaje', value: bandas.sinScore, color: colors.bandas.sinScore },
  ];
  const semanasData = m.semanas.map((s) => ({
    semana: s.inicio.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' }),
    Mail: s.mail,
    Llamada: s.llamada,
    Entrevista: s.entrevista,
    Nota: s.nota,
  }));
  const hayInteracciones = m.semanas.some((s) => s.mail + s.llamada + s.entrevista + s.nota > 0);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          id="en-curso"
          label="Postulaciones en curso"
          ayuda="Las que siguen abiertas: todas menos las que terminaron en oferta o rechazo. La tendencia cuenta las postulaciones nuevas de esta semana contra la anterior."
          icon={Briefcase}
          value={String(m.postulaciones.activas)}
          detail={`de ${totalPostulaciones} postulaciones en total`}
          tendencia={tendencias?.enCurso}
        />
        <KpiCard
          id="respuestas"
          label="Postulaciones con respuesta"
          ayuda="De las que enviaste, cuántas ya tuvieron respuesta, incluidos los rechazos. La tendencia cuenta las respuestas nuevas de esta semana, según el historial de estados."
          icon={Target}
          value={porcentaje(m.tasaRespuesta.tasa)}
          detail={
            m.tasaRespuesta.aplicadas === 0
              ? 'Todavía no aplicaste a ninguna'
              : `${m.tasaRespuesta.respondidas} de ${m.tasaRespuesta.aplicadas} postulaciones ya enviadas`
          }
          tendencia={tendencias?.respuestas}
        />
        <KpiCard
          id="ofertas"
          label="Ofertas guardadas"
          ayuda="Todas las ofertas que cargaste o importaste. La tendencia compara los últimos 7 días con los 7 anteriores."
          icon={Inbox}
          value={String(m.ofertas.total)}
          detail={`${m.ofertas.ultimos7} en los últimos 7 días`}
          tendencia={tendenciaDe(m.ofertas.ultimos7, m.ofertas.previos7)}
        />
        <KpiCard
          id="encaje"
          label="Qué tanto encajan tus ofertas"
          ayuda="El promedio de los puntajes, contra el máximo que podría sumar una oferta con tu perfil. La tendencia compara las ofertas de esta semana con las anteriores."
          icon={Gauge}
          value={m.score.promedio === null ? '—' : m.score.promedio.toFixed(1)}
          detail={
            m.score.promedioPct === null
              ? 'Sin criterios activos para comparar'
              : `${porcentaje(m.score.promedioPct)} del máximo posible (${m.score.maximo} puntos)`
          }
          tendencia={tendencias?.encaje}
        />
        <KpiCard
          id="movimiento"
          label="Postulaciones con movimiento"
          ayuda="Cuántas de tus postulaciones abiertas tuvieron una novedad esta semana: un mail, una llamada, una entrevista o una nota. La tendencia las compara con la semana anterior."
          icon={Activity}
          value={porcentaje(m.actividad.porcentaje)}
          detail={
            m.actividad.activas === 0
              ? 'No hay postulaciones activas'
              : `${m.actividad.conActividad} de ${m.actividad.activas} activas con novedad en 7 días`
          }
          tendencia={tendencias?.movimiento}
        />
        <KpiCard
          id="entrevista"
          label="Días hasta tu primera entrevista"
          ayuda="Cuánto tarda, en promedio, una entrevista desde que te postulás. Se calcula solo donde hay fecha de postulación y una entrevista registrada."
          icon={Hourglass}
          value={m.diasHastaEntrevista.promedio === null ? '—' : `${m.diasHastaEntrevista.promedio.toFixed(1)} días`}
          detail={
            m.diasHastaEntrevista.n === 0
              ? 'Sin datos: requiere fecha de postulación y una interacción de tipo entrevista'
              : `Sobre ${m.diasHastaEntrevista.n} postulación${m.diasHastaEntrevista.n === 1 ? '' : 'es'}`
          }
        />
        <KpiCard
          id="sin-novedades"
          label="Postulaciones sin novedades"
          ayuda="Las que llevan más días sin movimiento que el límite que configuraste en Mi perfil de búsqueda. Es solo un aviso: no se borra nada."
          icon={BellRing}
          value={String(m.recordatorios.activos)}
          detail={`${m.recordatorios.resueltos} resuelto${m.recordatorios.resueltos === 1 ? '' : 's'}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          className="lg:col-span-2"
          title="Embudo de postulaciones"
          subtitle="Postulaciones que llegaron al menos a cada etapa"
          badge={{
            text: 'Estimación',
            title:
              'Se infiere del estado actual y del historial de cambios. Las postulaciones anteriores al registro de historial solo tienen su estado actual, por eso pueden subestimar etapas intermedias.',
          }}
        >
          {totalPostulaciones === 0 ? (
            <SinDatos mensaje="Todavía no hay postulaciones." />
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={embudoData} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.grid} />
                    <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={axisTick} axisLine={false} tickLine={false} width={100} />
                    <Tooltip {...tooltipProps} />
                    <Bar dataKey="value" name="Postulaciones" fill={colors.primary} radius={[0, 4, 4, 0]} barSize={24}>
                      {embudoData.map((e) => (
                        <Cell key={e.name} fill={e.color} />
                      ))}
                      <LabelList dataKey="value" position="right" fill={colors.axisText} fontSize={14} fontWeight={600} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-on-surface-variant mt-2">
                Conversión desde la etapa anterior:{' '}
                {m.embudo.etapas
                  .slice(1)
                  .map((e) => `${ESTADO_POSTULACION_LABEL[e.estado]} ${porcentaje(e.conversionDesdeAnterior)}`)
                  .join(' · ')}
                {m.embudo.rechazadas > 0 && ` · ${m.embudo.rechazadas} rechazada${m.embudo.rechazadas === 1 ? '' : 's'} (fuera del camino)`}
              </p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Distribución de puntajes" subtitle="Franjas sobre el máximo posible: Alto ≥75% · Medio 50–75% · Bajo <50%">
          {bandasData === null ? (
            <SinDatos mensaje="No hay criterios activos. Activá al menos uno en Mi perfil de búsqueda para ver las franjas." />
          ) : m.ofertas.total === 0 ? (
            <SinDatos mensaje="Todavía no cargaste ofertas." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bandasData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 13, fill: colors.axisText }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipProps} />
                <Bar dataKey="value" name="Ofertas" radius={[4, 4, 0, 0]} barSize={32}>
                  {bandasData.map((franja) => (
                    <Cell key={franja.name} fill={franja.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          className="lg:col-span-2"
          title="Interacciones por semana"
          subtitle="Ventanas de 7 días, últimas 8 semanas (fecha de inicio de cada ventana)"
        >
          {!hayInteracciones ? (
            <SinDatos mensaje="Todavía no registraste interacciones en las últimas 8 semanas." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={semanasData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis dataKey="semana" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipProps} labelFormatter={(semana) => `Semana desde ${semana}`} />
                <Legend wrapperStyle={{ fontSize: 14, color: colors.axisText }} />
                <Bar dataKey="Mail" stackId="a" fill={colors.series.mail} />
                <Bar dataKey="Llamada" stackId="a" fill={colors.series.llamada} />
                <Bar dataKey="Entrevista" stackId="a" fill={colors.series.entrevista} />
                <Bar dataKey="Nota" stackId="a" fill={colors.series.nota} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Ofertas por fuente" subtitle="Dónde salen las ofertas cargadas">
          {m.ofertas.total === 0 ? (
            <SinDatos mensaje="Todavía no cargaste ofertas." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.fuentes} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis dataKey="fuente" tick={{ fontSize: 13, fill: colors.axisText }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipProps} />
                <Bar dataKey="cantidad" name="Ofertas" fill={colors.primary} radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </>
  );
}
