import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Topo } from '@/components/publica/Topo';
import { mensajeDeError } from '@/lib/errores';
import { formatearFechaHora } from '@/lib/etiquetas';
import { contarNoLeidos, tituloDelMensaje, type Mensaje } from '@/lib/mensajes';
import { RUTAS } from '@/lib/rutas';
import { cn } from '@/lib/utils';
import { MARCA } from '@/lib/marca';
import {
  borrarMensaje,
  listarMisMensajes,
  marcarMensajeLeido,
  marcarTodosLosMensajesLeidos,
} from '@/services/mensajes';

export function Mensajes() {
  const [mensajes, setMensajes] = useState<Mensaje[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    listarMisMensajes()
      .then((data) => !cancelado && setMensajes(data))
      .catch((err) => {
        if (cancelado) return;
        setError(mensajeDeError(err, 'No se pudieron cargar tus mensajes.'));
        setMensajes([]);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const noLeidos = contarNoLeidos(mensajes ?? []);

  async function ejecutar(accion: () => Promise<void>, alTerminar: (anteriores: Mensaje[]) => Mensaje[], textoError: string) {
    setTrabajando(true);
    setError(null);
    try {
      await accion();
      setMensajes((anteriores) => alTerminar(anteriores ?? []));
    } catch (err) {
      setError(mensajeDeError(err, textoError));
    } finally {
      setTrabajando(false);
    }
  }

  const marcarLeido = (m: Mensaje) =>
    ejecutar(
      () => marcarMensajeLeido(m.id),
      (ms) => ms.map((x) => (x.id === m.id ? { ...x, leido: true } : x)),
      'No se pudo marcar el mensaje como leído.'
    );

  const marcarTodos = () =>
    ejecutar(
      marcarTodosLosMensajesLeidos,
      (ms) => ms.map((x) => ({ ...x, leido: true })),
      'No se pudieron marcar los mensajes como leídos.'
    );

  function borrar(m: Mensaje) {
    if (!window.confirm('¿Borrar este mensaje? No se puede deshacer.')) return;
    return ejecutar(
      () => borrarMensaje(m.id),
      (ms) => ms.filter((x) => x.id !== m.id),
      'No se pudo borrar el mensaje.'
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-margin min-h-full">
      <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-6">
        <PageHeader
          title="Mensajes"
          help={`Avisos del equipo de ${MARCA.nombre} sobre tu perfil. Los que todavía no leíste están resaltados.`}
          action={
            noLeidos > 0 ? (
              <button
                type="button"
                onClick={marcarTodos}
                disabled={trabajando}
                className="bg-surface-container-high text-on-surface text-sm font-semibold px-4 min-h-11 rounded-lg border border-outline-variant hover:bg-surface-variant transition-all disabled:opacity-50 cursor-pointer"
              >
                Marcar todos como leídos
              </button>
            ) : undefined
          }
        />

        {error && (
          <div role="alert" className="p-4 bg-error-container text-on-error-container rounded-lg text-sm">
            {error}
          </div>
        )}

        {mensajes === null && <div className="text-center text-on-surface-variant text-sm py-16">Cargando mensajes…</div>}

        {mensajes !== null && mensajes.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center text-center py-16 gap-2">
            <Topo className="w-44" />
            <p className="text-lg font-semibold text-on-surface">Todavía no tenés mensajes.</p>
            <p className="text-base text-on-surface-variant">Cuando el equipo de {MARCA.nombre} te escriba, lo vas a ver acá.</p>
            <Link
              to={RUTAS.postulaciones}
              className="mt-3 bg-cta text-on-cta text-sm font-semibold px-5 min-h-11 inline-flex items-center rounded-lg shadow-sm hover:opacity-90 transition-all"
            >
              Ir a Mis postulaciones
            </Link>
          </div>
        )}

        {mensajes !== null && mensajes.length > 0 && (
          <ul className="flex flex-col gap-3">
            {mensajes.map((m) => (
              <li
                key={m.id}
                data-estado={m.leido ? 'leido' : 'no-leido'}
                className={cn(
                  'entrada rounded-xl border p-5 border-l-4',
                  m.leido ? 'bg-surface-container-lowest border-outline-variant' : 'bg-primary-container/40 border-primary'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-heading font-bold text-on-surface">{tituloDelMensaje(m)}</h2>
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    {!m.leido && (
                      <span className="bg-cta text-on-cta font-semibold px-2.5 py-0.5 rounded-full">Nuevo</span>
                    )}
                    {formatearFechaHora(m.created_at)}
                  </div>
                </div>
                <p className="text-base text-on-surface mt-2 whitespace-pre-wrap max-w-prose">{m.texto}</p>
                <div className="flex flex-wrap gap-4 mt-3">
                  {!m.leido && (
                    <button
                      type="button"
                      onClick={() => marcarLeido(m)}
                      disabled={trabajando}
                      className="min-h-11 text-sm font-semibold text-primary hover:underline underline-offset-2 disabled:opacity-50 cursor-pointer"
                    >
                      Marcar como leído
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => borrar(m)}
                    disabled={trabajando}
                    className="min-h-11 text-sm font-semibold text-on-surface-variant hover:text-error disabled:opacity-50 cursor-pointer"
                  >
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
