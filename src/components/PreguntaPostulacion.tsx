import { useCallback, useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { mensajeDeError } from '@/lib/errores';
import { almacenLocal } from '@/lib/actividad';
import { EVENTO_PREFERENCIAS, leerPreferencia } from '@/lib/preferencias';
import {
  posponerPendiente,
  resolverPendiente,
  siguientePregunta,
  ESPERA_MINIMA_MS,
  type PendienteDeConfirmar,
} from '@/lib/pendientes';
import { actualizarEstadoPostulacion, crearPostulacion, listarPostulacionesDeOfertas } from '@/services/postulaciones';

export const EVENTO_PENDIENTE = 'laburin:pendiente';
const POSPONER_MS = 24 * 60 * 60 * 1000;

// La aplicación no ve lo que pasa en el sitio de la empresa. Si la persona abrió el enlace de una oferta, al volver se le pregunta
// si llegó a postularse: con «Sí» queda en Aplicado, con «Todavía no» se le vuelve a preguntar mañana.
export function PreguntaPostulacion() {
  const { user } = useAuth();
  const userId = user?.id;
  const [pregunta, setPregunta] = useState<PendienteDeConfirmar | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revisar = useCallback(() => {
    if (!userId) return;
    // Si la persona apagó la pregunta en Mi cuenta, no se muestra.
    setPregunta(leerPreferencia(userId, 'preguntaPostulacion', almacenLocal()) ? siguientePregunta(userId, Date.now(), almacenLocal()) : null);
  }, [userId]);

  useEffect(() => {
    revisar();
    // Se revisa al volver a la pestaña (lo habitual: la persona estuvo en el otro sitio) y poco después de abrir el enlace.
    const temporizador = window.setInterval(revisar, ESPERA_MINIMA_MS);
    window.addEventListener('focus', revisar);
    document.addEventListener('visibilitychange', revisar);
    window.addEventListener(EVENTO_PENDIENTE, revisar);
    window.addEventListener(EVENTO_PREFERENCIAS, revisar);
    return () => {
      window.clearInterval(temporizador);
      window.removeEventListener('focus', revisar);
      document.removeEventListener('visibilitychange', revisar);
      window.removeEventListener(EVENTO_PENDIENTE, revisar);
      window.removeEventListener(EVENTO_PREFERENCIAS, revisar);
    };
  }, [revisar]);

  if (!userId || !pregunta) return null;

  async function confirmar(p: PendienteDeConfirmar) {
    setTrabajando(true);
    setError(null);
    try {
      const [existente] = await listarPostulacionesDeOfertas([p.ofertaId]);
      const postulacion = existente ?? (await crearPostulacion(p.ofertaId));
      await actualizarEstadoPostulacion(postulacion.id, 'aplicado', postulacion.fecha_postulacion);
      resolverPendiente(userId!, p.ofertaId, almacenLocal());
      setPregunta(null);
      revisar();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar la postulación. Probá de nuevo.'));
    } finally {
      setTrabajando(false);
    }
  }

  function despues(p: PendienteDeConfirmar) {
    posponerPendiente(userId!, p.ofertaId, Date.now() + POSPONER_MS, almacenLocal());
    setPregunta(null);
    revisar();
  }

  return (
    <div
      role="region"
      aria-label="Confirmar postulación"
      className="relative z-[60] shrink-0 bg-etapa-aplicado-fondo text-etapa-aplicado-tinta shadow-md px-4 md:px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      <Send className="w-5 h-5 shrink-0" aria-hidden="true" />
      <p className="flex-1 min-w-[14rem] text-base">
        <strong className="font-bold">¿Ya te postulaste a {pregunta.rol}?</strong> Abriste la oferta de {pregunta.empresa}. Si lo
        hiciste, la dejamos en Aplicado.
        {error && <span className="block text-sm font-semibold mt-1">{error}</span>}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => confirmar(pregunta)}
          disabled={trabajando}
          className="min-h-11 px-5 rounded-lg bg-cta text-on-cta text-sm font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {trabajando ? 'Guardando…' : 'Sí, ya apliqué'}
        </button>
        <button
          type="button"
          onClick={() => despues(pregunta)}
          disabled={trabajando}
          className="min-h-11 px-5 rounded-lg border border-current text-sm font-semibold hover:bg-black/5 disabled:opacity-50 cursor-pointer"
        >
          Todavía no
        </button>
      </div>
    </div>
  );
}
