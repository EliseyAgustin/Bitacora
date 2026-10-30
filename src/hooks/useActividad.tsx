import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRol } from '@/hooks/useRol';
import {
  almacenLocal,
  avisoVisible,
  cerrarAviso,
  estadoDeActividad,
  movimientosDe,
  type EstadoAvisable,
  type MensajeActividad,
  type ResultadoActividad,
} from '@/lib/actividad';
import { EVENTO_PREFERENCIAS, leerPreferencia } from '@/lib/preferencias';
import { listarTodasLasInteracciones } from '@/services/interacciones';
import { listarHistorialEstados, listarPostulaciones } from '@/services/postulaciones';

// El aviso de actividad de la persona. Solo lo usan las dos pantallas que lo muestran (Mis postulaciones y Mi progreso): los datos
// se leen cuando una de ellas se abre, no en cada cambio de pantalla. Si la persona lo apagó en Mi cuenta no se lee nada. Si algo
// falla, simplemente no hay aviso: nunca bloquea la pantalla.
export function useAvisoActividad(): { aviso: { estado: EstadoAvisable; mensaje: MensajeActividad } | null; cerrar: () => void } {
  const { user } = useAuth();
  const { rol } = useRol();
  const userId = user?.id;
  const esCandidato = rol === 'candidato';

  const [resultado, setResultado] = useState<ResultadoActividad | null>(null);
  // Cambia al cerrar el aviso o al tocar las preferencias, para volver a decidir qué mostrar.
  const [version, setVersion] = useState(0);
  const [activado, setActivado] = useState(() => (userId ? leerPreferencia(userId, 'avisoActividad', almacenLocal()) : true));

  useEffect(() => {
    if (!userId) return;
    const alCambiar = () => {
      setActivado(leerPreferencia(userId, 'avisoActividad', almacenLocal()));
      setVersion((v) => v + 1);
    };
    alCambiar();
    window.addEventListener(EVENTO_PREFERENCIAS, alCambiar);
    return () => window.removeEventListener(EVENTO_PREFERENCIAS, alCambiar);
  }, [userId]);

  useEffect(() => {
    if (!userId || !esCandidato || !activado) {
      setResultado(null);
      return;
    }
    let cancelado = false;
    Promise.all([listarPostulaciones(), listarTodasLasInteracciones(), listarHistorialEstados()])
      .then(([postulaciones, interacciones, historial]) => {
        if (!cancelado) setResultado(estadoDeActividad(movimientosDe({ postulaciones, interacciones, historial }), new Date()));
      })
      .catch(() => {
        if (!cancelado) setResultado(null);
      });
    return () => {
      cancelado = true;
    };
  }, [userId, esCandidato, activado]);

  const cerrar = useCallback(() => {
    if (!userId || !resultado || (resultado.estado !== 'bajo-ritmo' && resultado.estado !== 'sin-actividad')) return;
    cerrarAviso(userId, resultado.estado, new Date(), almacenLocal());
    setVersion((v) => v + 1);
  }, [userId, resultado]);

  // «version» fuerza a recalcular después de cerrar el aviso (lo cerrado se lee del navegador).
  void version;
  const aviso = userId && activado ? avisoVisible(resultado, userId, new Date(), almacenLocal()) : null;
  return { aviso, cerrar };
}
