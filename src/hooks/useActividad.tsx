import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRol } from '@/hooks/useRol';
import {
  almacenLocal,
  avisoCerrado,
  cerrarAviso,
  debeFelicitar,
  esAvisable,
  estadoDeActividad,
  mensajeDeActividad,
  movimientosDe,
  type EstadoAvisable,
  type MensajeActividad,
  type ResultadoActividad,
} from '@/lib/actividad';
import { almacenDeSesion } from '@/lib/visitas';
import { listarTodasLasInteracciones } from '@/services/interacciones';
import { listarHistorialEstados, listarPostulaciones } from '@/services/postulaciones';

interface ActividadContexto {
  resultado: ResultadoActividad | null;
  // Solo hay aviso si el estado lo tiene y la persona no lo cerró hace poco.
  aviso: { estado: EstadoAvisable; mensaje: MensajeActividad } | null;
  // Postulaciones guardadas todavía sin postular: sirve para proponer «ver las que tenés por aplicar».
  porAplicar: number;
  cerrar: () => void;
  // Para el punto discreto del menú: solo cuando el aviso invita a retomar (no con la felicitación).
  invitaARetomar: boolean;
}

const Contexto = createContext<ActividadContexto>({ resultado: null, aviso: null, porAplicar: 0, cerrar: () => undefined, invitaARetomar: false });

// Calcula el ritmo de la búsqueda con las postulaciones, interacciones e historial de la persona (los tres ya se leen en otras
// pantallas). Se actualiza al cambiar de pantalla. Si algo falla, simplemente no hay aviso: nunca bloquea nada.
export function ActividadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { rol } = useRol();
  const { pathname } = useLocation();
  const [resultado, setResultado] = useState<ResultadoActividad | null>(null);
  const [porAplicar, setPorAplicar] = useState(0);
  const [cierres, setCierres] = useState(0);
  const [felicitacionVisible, setFelicitacionVisible] = useState(false);
  const userId = user?.id;
  const esCandidato = rol === 'candidato';

  useEffect(() => {
    if (!userId || !esCandidato) return;
    let cancelado = false;
    Promise.all([listarPostulaciones(), listarTodasLasInteracciones(), listarHistorialEstados()])
      .then(([postulaciones, interacciones, historial]) => {
        if (cancelado) return;
        setResultado(estadoDeActividad(movimientosDe({ postulaciones, interacciones, historial }), new Date()));
        setPorAplicar(postulaciones.filter((p) => p.estado === 'por_aplicar').length);
      })
      .catch(() => {
        if (!cancelado) setResultado(null);
      });
    return () => {
      cancelado = true;
    };
  }, [userId, esCandidato, pathname]);

  // «Vas muy bien» es solo una felicitación: aparece una vez por semana (ver debeFelicitar).
  useEffect(() => {
    if (!userId || resultado?.estado !== 'vas-bien') {
      setFelicitacionVisible(false);
      return;
    }
    setFelicitacionVisible(debeFelicitar(userId, new Date(), almacenLocal(), almacenDeSesion()));
  }, [userId, resultado?.estado]);

  const cerrar = useCallback(() => {
    if (!userId || !resultado || !esAvisable(resultado.estado)) return;
    cerrarAviso(userId, resultado.estado, new Date(), almacenLocal());
    setFelicitacionVisible(false);
    setCierres((c) => c + 1);
  }, [userId, resultado]);

  const valor = useMemo<ActividadContexto>(() => {
    const estado = resultado?.estado;
    const mensaje = resultado ? mensajeDeActividad(resultado) : null;
    let aviso: ActividadContexto['aviso'] = null;

    if (userId && resultado && estado && esAvisable(estado) && mensaje) {
      const cerrado = estado === 'vas-bien' ? !felicitacionVisible : avisoCerrado(userId, estado, new Date(), almacenLocal());
      if (!cerrado) aviso = { estado, mensaje };
    }

    return { resultado, aviso, porAplicar, cerrar, invitaARetomar: aviso !== null && aviso.estado !== 'vas-bien' };
    // «cierres» fuerza a recalcular después de cerrar el aviso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado, porAplicar, cerrar, userId, felicitacionVisible, cierres]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useActividad(): ActividadContexto {
  return useContext(Contexto);
}
