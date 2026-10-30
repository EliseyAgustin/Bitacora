import { useState, type FormEvent } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AvisoPrivacidad } from '@/components/AvisoPrivacidad';
import { supabase } from '@/lib/supabase';
import { traducirErrorAuth } from '@/lib/authErrores';
import { validarConfirmacion, validarPasswordNueva } from '@/lib/validacionAuth';
import { MedidorPassword } from '@/components/auth/MedidorPassword';

function iniciales(nombre: string, email: string): string {
  const base = nombre.trim() || email;
  const partes = base.trim().split(/\s+/);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

interface CuentaModalProps {
  onClose: () => void;
}

export function CuentaModal({ onClose }: CuentaModalProps) {
  const { user } = useAuth();
  const email = user?.email ?? '';
  const nombreGuardado = (user?.user_metadata?.full_name as string | undefined) ?? '';

  const [nombre, setNombre] = useState(nombreGuardado);
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [okNombre, setOkNombre] = useState(false);

  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);
  const [okPassword, setOkPassword] = useState(false);

  async function handleGuardarNombre(e: FormEvent) {
    e.preventDefault();
    setErrorNombre(null);
    setOkNombre(false);
    setGuardandoNombre(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: nombre.trim() } });
      if (error) throw error;
      // También en el perfil de búsqueda, que es lo que ve el equipo de Laburin (null si se borra el nombre).
      const { error: errorPerfil } = await supabase
        .from('perfil_usuario')
        .upsert({ user_id: user!.id, nombre: nombre.trim() || null }, { onConflict: 'user_id' });
      if (errorPerfil) throw errorPerfil;
      setOkNombre(true);
    } catch (err) {
      setErrorNombre(traducirErrorAuth(err, 'nueva-password').mensaje);
    } finally {
      setGuardandoNombre(false);
    }
  }

  async function handleCambiarPassword(e: FormEvent) {
    e.preventDefault();
    setErrorPassword(null);
    setOkPassword(false);

    const errorValidacion = validarPasswordNueva(passwordNueva) ?? validarConfirmacion(passwordNueva, passwordConfirmar);
    if (errorValidacion) {
      setErrorPassword(errorValidacion);
      return;
    }

    setCambiandoPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordNueva });
      if (error) throw error;
      setOkPassword(true);
      setPasswordNueva('');
      setPasswordConfirmar('');
    } catch (err) {
      setErrorPassword(traducirErrorAuth(err, 'nueva-password').mensaje);
    } finally {
      setCambiandoPassword(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.4)]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-cuenta"
        className="w-full max-w-112 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 id="titulo-cuenta" className="text-xl font-heading font-bold text-on-surface">Mi cuenta</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-11 h-11 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center text-xl font-bold">
              {iniciales(nombre, email)}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-on-surface truncate">{nombre.trim() || 'Sin nombre'}</p>
              <p className="text-sm text-on-surface-variant truncate">{email}</p>
            </div>
          </div>

          <form onSubmit={handleGuardarNombre} noValidate className="flex flex-col gap-3 pt-4 border-t border-outline-variant">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
              Nombre para mostrar
              <input
                type="text"
                maxLength={100}
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setOkNombre(false);
                }}
                placeholder="Ej: Agustín Elisey"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 min-h-11 text-base text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
              Email
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-surface-container-high border border-outline-variant rounded-lg px-3 min-h-11 text-base text-on-surface-variant cursor-not-allowed"
              />
            </label>
            <AvisoPrivacidad />
            {errorNombre && <p className="text-sm text-error">{errorNombre}</p>}
            {okNombre && <p className="text-sm text-success">Nombre guardado.</p>}
            <button
              type="submit"
              disabled={guardandoNombre || nombre.trim() === nombreGuardado.trim()}
              className="self-start bg-primary text-on-primary text-sm font-semibold px-5 min-h-11 rounded-lg shadow-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
            >
              {guardandoNombre ? 'Guardando…' : 'Guardar nombre'}
            </button>
          </form>

          <form onSubmit={handleCambiarPassword} noValidate className="flex flex-col gap-3 pt-4 border-t border-outline-variant">
            <p className="text-sm font-medium text-on-surface">Cambiar contraseña</p>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
              Nueva contraseña
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  maxLength={128}
                  autoComplete="new-password"
                  value={passwordNueva}
                  onChange={(e) => {
                    setPasswordNueva(e.target.value);
                    setOkPassword(false);
                  }}
                  className="w-full bg-surface border border-outline-variant rounded-lg pl-3 pr-11 min-h-11 text-base text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </label>

            <MedidorPassword password={passwordNueva} />

            <label className="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
              Confirmar nueva contraseña
              <input
                type={showPassword ? 'text' : 'password'}
                maxLength={128}
                autoComplete="new-password"
                value={passwordConfirmar}
                onChange={(e) => {
                  setPasswordConfirmar(e.target.value);
                  setOkPassword(false);
                }}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 min-h-11 text-base text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </label>
            {errorPassword && <p className="text-sm text-error">{errorPassword}</p>}
            {okPassword && <p className="text-sm text-success">Contraseña actualizada.</p>}
            <button
              type="submit"
              disabled={cambiandoPassword || !passwordNueva || !passwordConfirmar}
              className="self-start bg-primary text-on-primary text-sm font-semibold px-5 min-h-11 rounded-lg shadow-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
            >
              {cambiandoPassword ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </form>

          <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
            <p className="text-sm text-on-surface">Tema</p>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
