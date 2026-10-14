import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, LockKeyhole, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { CampoPassword } from '@/components/auth/CampoPassword';
import { ChecklistPassword } from '@/components/auth/ChecklistPassword';
import { EncabezadoAuth } from '@/components/auth/EncabezadoAuth';
import { MedidorPassword } from '@/components/auth/MedidorPassword';
import { PasosRecuperacion } from '@/components/auth/PasosRecuperacion';
import { traducirErrorAuth, type ErrorAuthTraducido } from '@/lib/authErrores';
import { RUTAS } from '@/lib/rutas';
import { validarConfirmacion, validarPasswordNueva } from '@/lib/validacionAuth';

// Si el enlace del mail venció o ya se usó, Supabase vuelve a esta ruta con el motivo en la URL (query o hash).
function enlaceConError(): boolean {
  const params = new URLSearchParams(window.location.search + '&' + window.location.hash.replace(/^#/, ''));
  return params.has('error') || params.has('error_code') || params.has('error_description');
}

export function NuevaPassword() {
  const navigate = useNavigate();
  const { session, loading, cambiarPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errorPassword, setErrorPassword] = useState<string | null>(null);
  const [errorConfirmacion, setErrorConfirmacion] = useState<string | null>(null);
  const [errorServicio, setErrorServicio] = useState<ErrorAuthTraducido | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorServicio(null);

    const ePassword = validarPasswordNueva(password);
    const eConfirmacion = ePassword ? null : validarConfirmacion(password, confirmacion);
    setErrorPassword(ePassword);
    setErrorConfirmacion(eConfirmacion);
    if (ePassword || eConfirmacion) return;

    setGuardando(true);
    const { error } = await cambiarPassword(password);
    setGuardando(false);

    if (error) {
      setErrorServicio(error);
      return;
    }
    setListo(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 text-primary animate-spin" aria-label="Verificando el enlace…" />
      </div>
    );
  }

  // Sin sesión de recuperación no hay a quién cambiarle la contraseña: el enlace venció, ya se usó o se abrió a mano.
  if (!session || enlaceConError()) {
    return (
      <AuthLayout compacto>
        <PasosRecuperacion actual={3} />
        <EncabezadoAuth icono={TriangleAlert} titulo="No pudimos validar el enlace" tono="alerta">
          <p role="alert">{traducirErrorAuth({ code: 'otp_expired' }, 'nueva-password').mensaje}</p>
        </EncabezadoAuth>
        <div className="flex flex-col gap-3">
          <Link
            to="/recuperar"
            className="h-11 bg-primary text-on-primary text-sm font-medium px-6 rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center"
          >
            Pedir un enlace nuevo
          </Link>
          <Link to="/" className="text-center text-sm text-on-surface-variant hover:text-primary transition-colors">
            Volver a iniciar sesión
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (listo) {
    return (
      <AuthLayout compacto>
        <EncabezadoAuth icono={CheckCircle2} titulo="Tu contraseña quedó actualizada" tono="exito">
          <p role="status">Listo, ya podés usar tu nueva contraseña la próxima vez que inicies sesión.</p>
        </EncabezadoAuth>
        <button
          type="button"
          onClick={() => navigate(RUTAS.postulaciones, { replace: true })}
          className="h-11 bg-primary text-on-primary text-sm font-medium px-6 rounded-lg shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
        >
          Continuar
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout compacto>
      <PasosRecuperacion actual={3} />
      <EncabezadoAuth icono={LockKeyhole} titulo="Elegí tu contraseña nueva">
        <p>Escribila dos veces para asegurarte de que no hay errores.</p>
      </EncabezadoAuth>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <CampoPassword
          etiqueta="Contraseña nueva"
          value={password}
          onChange={(v) => {
            setPassword(v);
            setErrorPassword(null);
          }}
          autoComplete="new-password"
          error={errorPassword}
          idError="error-password-nueva"
        />
        <MedidorPassword password={password} />
        <ChecklistPassword password={password} />
        <CampoPassword
          etiqueta="Repetí la contraseña"
          value={confirmacion}
          onChange={(v) => {
            setConfirmacion(v);
            setErrorConfirmacion(null);
          }}
          autoComplete="new-password"
          error={errorConfirmacion}
          idError="error-password-confirmacion"
        />

        {errorServicio && (
          <p role="alert" className="text-sm text-error">
            {errorServicio.mensaje}
          </p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="h-11 bg-primary text-on-primary text-sm font-medium px-6 rounded-lg shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          {guardando ? 'Guardando…' : 'Guardar contraseña nueva'}
        </button>
      </form>
    </AuthLayout>
  );
}
