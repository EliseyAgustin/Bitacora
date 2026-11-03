import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { traducirErrorAuth, type ErrorAuthTraducido } from '@/lib/authErrores';
import { leerIngresoDemo } from '@/lib/ingresoDemo';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: ErrorAuthTraducido | null }>;
  signUp: (email: string, password: string) => Promise<{ error: ErrorAuthTraducido | null; hasSession: boolean }>;
  signOut: () => Promise<void>;
  enviarEnlaceRecuperacion: (email: string) => Promise<{ error: ErrorAuthTraducido | null }>;
  cambiarPassword: (password: string) => Promise<{ error: ErrorAuthTraducido | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Todo error de Supabase Auth sale de acá ya traducido: la interfaz nunca ve un mensaje en inglés.
// Un `throw` (por ejemplo, sin red) también se traduce.
async function traduciendo<T extends { error: unknown }>(
  llamada: () => Promise<T>,
  contexto: Parameters<typeof traducirErrorAuth>[1]
): Promise<Omit<T, 'error'> & { error: ErrorAuthTraducido | null }> {
  try {
    const { error, ...resto } = await llamada();
    return { ...resto, error: error ? traducirErrorAuth(error, contexto) : null };
  } catch (err) {
    return { error: traducirErrorAuth(err, contexto) } as Omit<T, 'error'> & { error: ErrorAuthTraducido };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Enlace de ingreso directo a la cuenta DEMO (#demo=…): se saca el código de la barra y se inicia sesión antes de leerla.
    const demo = leerIngresoDemo(window.location.hash);
    if (demo) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    const ingreso = demo
      ? supabase.auth.signInWithPassword(demo).catch(() => undefined)
      : Promise.resolve();

    ingreso.then(() => supabase.auth.getSession()).then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await traduciendo(
      () => supabase.auth.signInWithPassword({ email: email.trim(), password }),
      'ingreso'
    );
    return { error };
  }

  async function signUp(email: string, password: string) {
    const resultado = await traduciendo(() => supabase.auth.signUp({ email: email.trim(), password }), 'registro');
    if (resultado.error) return { error: resultado.error, hasSession: false };

    // Con la confirmación por mail activada, Supabase no devuelve error si el email ya existe (para no revelarlo):
    // responde un usuario sin identidades. Se lo trata igual que "ya registrado".
    const data = (resultado as { data?: { user: User | null; session: Session | null } }).data;
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { error: traducirErrorAuth({ code: 'user_already_exists' }, 'registro'), hasSession: false };
    }
    return { error: null, hasSession: Boolean(data?.session) };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function enviarEnlaceRecuperacion(email: string) {
    const { error } = await traduciendo(
      () =>
        supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/nueva-contrasena`,
        }),
      'recuperar'
    );
    return { error };
  }

  async function cambiarPassword(password: string) {
    const { error } = await traduciendo(() => supabase.auth.updateUser({ password }), 'nueva-password');
    return { error };
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signIn,
        signUp,
        signOut,
        enviarEnlaceRecuperacion,
        cambiarPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
