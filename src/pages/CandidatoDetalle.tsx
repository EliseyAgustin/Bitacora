import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { nombreParaMostrar, type Candidato } from '@/lib/candidatos';
import { mensajeDeError } from '@/lib/errores';
import { MODALIDAD_ETIQUETA, NIVEL_EXPERIENCIA_ETIQUETA, formatearFecha, formatearFechaHora } from '@/lib/etiquetas';
import { MENSAJE_MAX, validarMensaje, type Mensaje } from '@/lib/mensajes';
import { armarMensaje, hayCamposSinCompletar, PLANTILLAS_MENSAJE, primerCampoPendiente, type PlantillaMensaje } from '@/lib/plantillasMensaje';
import { RUTAS } from '@/lib/rutas';
import { scrollFieldIntoView } from '@/lib/utils';
import { obtenerCandidato } from '@/services/candidatos';
import { enviarMensaje, listarMensajesEnviadosA } from '@/services/mensajes';

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-on-surface-variant">{etiqueta}</dt>
      <dd className="text-base text-on-surface mt-0.5">{children}</dd>
    </div>
  );
}

export function CandidatoDetalle() {
  const { id = '' } = useParams();
  const [candidato, setCandidato] = useState<Candidato | null | undefined>(undefined);
  const [enviados, setEnviados] = useState<Mensaje[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [texto, setTexto] = useState('');
  const [errorTexto, setErrorTexto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmacion, setConfirmacion] = useState(false);
  // Texto que había antes de aplicar una plantilla, para poder deshacerlo.
  const [textoAnterior, setTextoAnterior] = useState<string | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelado = false;
    setCandidato(undefined);
    Promise.all([obtenerCandidato(id), listarMensajesEnviadosA(id)])
      .then(([c, m]) => {
        if (cancelado) return;
        setCandidato(c);
        setEnviados(m);
      })
      .catch((err) => {
        if (cancelado) return;
        setError(mensajeDeError(err, 'No se pudo cargar al candidato.'));
        setCandidato(null);
      });
    return () => {
      cancelado = true;
    };
  }, [id]);

  async function handleEnviar(e: FormEvent) {
    e.preventDefault();
    setConfirmacion(false);
    setError(null);

    const invalido = validarMensaje(texto) ?? (hayCamposSinCompletar(texto) ? 'Completá lo que está entre corchetes antes de enviar el mensaje.' : null);
    setErrorTexto(invalido);
    if (invalido) return;

    setEnviando(true);
    try {
      await enviarMensaje(id, texto);
      setTexto('');
      setTextoAnterior(null);
      setConfirmacion(true);
      setEnviados(await listarMensajesEnviadosA(id));
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo enviar el mensaje. Probá de nuevo en un momento.'));
    } finally {
      setEnviando(false);
    }
  }

  function aplicarPlantilla(plantilla: PlantillaMensaje) {
    if (!candidato) return;
    const nuevo = armarMensaje(plantilla, candidato.nombre);
    setTextoAnterior(texto.trim() && texto !== nuevo ? texto : null);
    setTexto(nuevo);
    setErrorTexto(null);
    setConfirmacion(false);
    // Si la plantilla deja un dato por completar, queda seleccionado para escribir encima.
    const pendiente = primerCampoPendiente(nuevo);
    requestAnimationFrame(() => {
      const area = areaRef.current;
      if (!area) return;
      area.focus();
      if (pendiente) area.setSelectionRange(pendiente.inicio, pendiente.fin);
    });
  }

  function deshacerPlantilla() {
    if (textoAnterior === null) return;
    setTexto(textoAnterior);
    setTextoAnterior(null);
    setErrorTexto(null);
  }

  const volver = (
    <Link to={RUTAS.candidatos} className="inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-primary hover:underline underline-offset-2">
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      Volver a Candidatos
    </Link>
  );

  if (candidato === undefined) {
    return <div className="flex-1 p-margin text-center text-on-surface-variant text-sm py-16">Cargando candidato…</div>;
  }

  if (candidato === null) {
    return (
      <div className="flex-1 overflow-y-auto p-margin">
        <div className="max-w-3xl mx-auto flex flex-col gap-4 items-start">
          {volver}
          {error && <div className="p-4 bg-error-container text-on-error-container rounded-lg text-sm w-full">{error}</div>}
          <p className="text-sm text-on-surface-variant">
            No encontramos a esta persona, o todavía no armó su perfil de búsqueda.
          </p>
        </div>
      </div>
    );
  }

  const nombre = nombreParaMostrar(candidato);

  return (
    <div className="flex-1 overflow-y-auto p-margin min-h-full">
      <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-6">
        {volver}
        <PageHeader title={nombre} help={`${candidato.rol_buscado} · Registrado el ${formatearFecha(candidato.registrado_el)}`} />

        <section aria-labelledby="perfil-titulo" className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
          <h2 id="perfil-titulo" className="text-xl font-heading font-bold text-on-surface mb-4">
            Perfil de búsqueda
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Dato etiqueta="Rol que busca">{candidato.rol_buscado}</Dato>
            <Dato etiqueta="Nivel de experiencia">
              {candidato.seniority ? NIVEL_EXPERIENCIA_ETIQUETA[candidato.seniority] : 'Sin indicar'}
            </Dato>
            <Dato etiqueta="Modalidad">
              {candidato.modalidad_preferida ? MODALIDAD_ETIQUETA[candidato.modalidad_preferida] : 'Sin indicar'}
            </Dato>
            <Dato etiqueta="Ubicación">{candidato.ubicacion || 'Sin indicar'}</Dato>
            <div className="sm:col-span-2">
              <dt className="text-sm font-semibold text-on-surface-variant">Tecnologías</dt>
              <dd className="mt-1">
                {candidato.stack_interes.length === 0 ? (
                  <span className="text-base text-on-surface">Sin indicar</span>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {candidato.stack_interes.map((t) => (
                      <li key={t} className="bg-primary-container text-on-primary-container text-sm font-semibold px-3 py-1 rounded-md">
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="mensaje-titulo" className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
          <h2 id="mensaje-titulo" className="text-xl font-heading font-bold text-on-surface">
            Enviar mensaje
          </h2>
          <p className="text-base text-on-surface-variant mt-1 mb-4">
            {nombre} lo va a ver en su sección Mensajes, por ejemplo para pedirle un dato que falta.
          </p>

          <form onSubmit={handleEnviar} noValidate className="flex flex-col gap-3">
            <div role="group" aria-labelledby="plantillas-titulo" className="flex flex-col gap-2">
              <p id="plantillas-titulo" className="text-sm text-on-surface-variant">
                Usar una plantilla <span className="text-sm">(después podés editarla)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {PLANTILLAS_MENSAJE.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.descripcion}
                    onClick={() => aplicarPlantilla(p)}
                    className="min-h-11 px-4 rounded-full border border-outline-variant bg-surface text-on-surface text-sm font-semibold hover:border-primary hover:text-primary transition-colors cursor-pointer"
                  >
                    {p.titulo}
                  </button>
                ))}
              </div>
              {textoAnterior !== null && (
                <p role="status" className="text-sm text-on-surface-variant">
                  Plantilla aplicada.{' '}
                  <button type="button" onClick={deshacerPlantilla} className="font-medium text-primary underline underline-offset-2 cursor-pointer">
                    Deshacer
                  </button>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              {/* Etiqueta asociada por id (no envolviendo el campo): así su nombre accesible es siempre "Mensaje", tenga o no texto. */}
              <label htmlFor="texto-mensaje" className="text-sm font-semibold text-on-surface-variant">
                Mensaje
              </label>
              <textarea
                id="texto-mensaje"
                ref={areaRef}
                value={texto}
                rows={5}
                aria-invalid={Boolean(errorTexto)}
                aria-describedby={errorTexto ? 'error-mensaje' : undefined}
                onChange={(e) => {
                  setTexto(e.target.value);
                  setErrorTexto(null);
                  setConfirmacion(false);
                  setTextoAnterior(null);
                }}
                onFocus={scrollFieldIntoView}
                placeholder="Ej: Hola, nos falta tu ubicación exacta para tener en cuenta tu solicitud."
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-base text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all aria-invalid:border-error"
              />
            </div>
            <div className="flex justify-between gap-3 text-sm text-on-surface-variant">
              <span>
                {texto.trim().length} / {MENSAJE_MAX}
              </span>
            </div>
            {errorTexto && (
              <p id="error-mensaje" role="alert" className="text-sm text-error">
                {errorTexto}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-error">
                {error}
              </p>
            )}
            {confirmacion && (
              <p role="status" className="text-sm text-success">
                Mensaje enviado.
              </p>
            )}
            <button
              type="submit"
              disabled={enviando}
              className="self-start bg-primary text-on-primary text-sm font-semibold px-6 min-h-11 rounded-lg shadow-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
            >
              {enviando ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </form>
        </section>

        <section aria-labelledby="enviados-titulo" className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
          <h2 id="enviados-titulo" className="text-xl font-heading font-bold text-on-surface mb-3">
            Mensajes enviados
          </h2>
          {enviados.length === 0 ? (
            <p className="text-base text-on-surface-variant">Todavía no le escribiste a esta persona.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {enviados.map((m) => (
                <li key={m.id} className="border border-outline-variant rounded-lg p-4">
                  <p className="text-base text-on-surface whitespace-pre-wrap">{m.texto}</p>
                  <p className="text-sm text-on-surface-variant mt-2">
                    {formatearFechaHora(m.created_at)} · {m.leido ? 'Leído' : 'Sin leer'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
