import type { User } from '@supabase/supabase-js';
import { leerEnLotes } from '@/lib/lotes';
import { armarExportacion, type DatosParaExportar } from '@/lib/misDatos';
import { supabase } from '@/lib/supabase';
import { listarCriterios } from '@/services/criteriosScoring';
import { listarTodasLasInteracciones } from '@/services/interacciones';
import { listarMisMensajes } from '@/services/mensajes';
import { listarHistorialEstados, listarPostulaciones } from '@/services/postulaciones';

// Todo lo de la persona, leído con sus propios permisos: es lo mismo que ya puede ver en las pantallas.
export async function reunirMisDatos(user: User): Promise<ReturnType<typeof armarExportacion>> {
  const [perfil, criterios, ofertas, postulaciones, interacciones, historial, mensajes] = await Promise.all([
    supabase.from('perfil_usuario').select('*').maybeSingle().then(({ data, error }) => {
      if (error) throw error;
      return data as Record<string, unknown> | null;
    }),
    listarCriterios(),
    leerEnLotes<Record<string, unknown>>((desde, hasta) => supabase.from('ofertas').select('*').order('id').range(desde, hasta)),
    listarPostulaciones(),
    listarTodasLasInteracciones(),
    listarHistorialEstados(),
    listarMisMensajes(),
  ]);

  const datos: DatosParaExportar = {
    usuario: {
      email: user.email ?? '',
      nombre: (user.user_metadata?.full_name as string | undefined) ?? '',
      creado: user.created_at,
    },
    perfil,
    criterios: criterios as unknown as Record<string, unknown>[],
    ofertas,
    postulaciones: postulaciones as unknown as Record<string, unknown>[],
    interacciones: interacciones as unknown as Record<string, unknown>[],
    historial: historial as unknown as Record<string, unknown>[],
    mensajes: mensajes as unknown as Record<string, unknown>[],
  };
  return armarExportacion(datos, new Date());
}

// Borra las ofertas de la persona; sus postulaciones, interacciones, historial y avisos se van con ellas.
// No toca la cuenta, el perfil de búsqueda ni los criterios.
export async function borrarMisOfertas(userId: string): Promise<void> {
  const { error } = await supabase.from('ofertas').delete().eq('user_id', userId);
  if (error) throw error;
}

// Cierra la sesión en todos los dispositivos (también en este).
export async function cerrarSesionEnTodosLados(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) throw error;
}
