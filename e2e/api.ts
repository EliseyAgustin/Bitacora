import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Cuenta } from './cuentas';

// Cliente autenticado COMO el usuario de prueba: respeta RLS igual que un usuario real. Sin service role key.
export interface Api {
  sb: SupabaseClient;
  userId: string;
  resetear: () => Promise<void>;
  borrarTodo: () => Promise<void>;
  sembrarOfertas: (filas: OfertaFila[]) => Promise<void>;
  contarOfertas: () => Promise<number>;
  crearPostulacionDe: (ofertaId: string) => Promise<string>;
}

export interface OfertaFila {
  empresa: string;
  rol: string;
  ubicacion?: string | null;
  modalidad?: 'remoto' | 'hibrido' | 'presencial' | null;
  stack_tecnologico?: string[];
  fuente?: string | null;
  url?: string | null;
  descripcion?: string | null;
  puntaje_scoring?: number | null;
  created_at?: string;
}

export const CRITERIOS_BASE = [
  { nombre: 'Stack: React', campo_objetivo: 'stack_tecnologico', valor_comparacion: 'React', peso: 15 },
  { nombre: 'Modalidad: remoto', campo_objetivo: 'modalidad', valor_comparacion: 'remoto', peso: 10 },
] as const;

export async function crearApi({ email, password }: Cuenta): Promise<Api> {
  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env');

  const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`No se pudo iniciar sesión como ${email}: ${error?.message}`);
  const userId = data.user.id;

  const api: Api = {
    sb,
    userId,

    // Borrar ofertas arrastra postulaciones, interacciones, historial y recordatorios (ON DELETE CASCADE).
    async borrarTodo() {
      for (const tabla of ['ofertas', 'criterios_scoring', 'perfil_usuario']) {
        const { error: e } = await sb.from(tabla).delete().eq('user_id', userId);
        if (e) throw new Error(`No se pudo limpiar ${tabla}: ${e.message}`);
      }
      // Los mensajes recibidos (bienvenida y los del administrador) los puede borrar su destinatario.
      const { error: em } = await sb.from('mensajes').delete().eq('destinatario_id', userId);
      if (em) throw new Error(`No se pudo limpiar mensajes: ${em.message}`);
    },

    // Estado conocido: onboarding completo, umbral por defecto, criterios base y ninguna oferta.
    async resetear() {
      await api.borrarTodo();
      const { error: pe } = await sb
        .from('perfil_usuario')
        .insert({ user_id: userId, onboarding_completado: true });
      if (pe) throw new Error(`No se pudo crear el perfil: ${pe.message}`);

      const { error: ce } = await sb
        .from('criterios_scoring')
        .insert(CRITERIOS_BASE.map((c) => ({ ...c, user_id: userId, tipo_coincidencia: c.campo_objetivo === 'modalidad' ? 'exacto' : 'contiene' })));
      if (ce) throw new Error(`No se pudieron crear los criterios base: ${ce.message}`);
    },

    async sembrarOfertas(filas) {
      for (let i = 0; i < filas.length; i += 500) {
        const lote = filas.slice(i, i + 500).map((f) => ({
          modalidad: 'remoto',
          stack_tecnologico: [],
          fuente: 'Carga manual',
          puntaje_scoring: 0,
          ...f,
          user_id: userId,
        }));
        const { error: e } = await sb.from('ofertas').insert(lote);
        if (e) throw new Error(`No se pudieron sembrar ofertas: ${e.message}`);
      }
    },

    async contarOfertas() {
      const { count, error: e } = await sb.from('ofertas').select('id', { count: 'exact', head: true });
      if (e) throw new Error(e.message);
      return count ?? 0;
    },

    async crearPostulacionDe(ofertaId) {
      const { data: p, error: e } = await sb.from('postulaciones').insert({ oferta_id: ofertaId }).select('id').single();
      if (e) throw new Error(`No se pudo crear la postulación: ${e.message}`);
      return p.id as string;
    },
  };

  return api;
}
