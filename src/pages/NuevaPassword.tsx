import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { CampoPassword } from '@/components/auth/CampoPassword';
import { ChecklistPassword } from '@/components/auth/ChecklistPassword';
import { EncabezadoAuth } from '@/components/auth/EncabezadoAuth';
import { MedidorPassword } from '@/components/auth/MedidorPassword';
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
      <AuthLayout pasos={3} frase="Este enlace ya no sirve, pero se arregla rápido.">
        <EncabezadoAuth titulo="No pudimos validar el enlace">
          <p role="alert">{traducirErrorAuth({ code: 'otp_expired' }, 'nueva-password').mensaje}</p>
        </EncabezadoAuth>
        <div className="pub-form">
          <Link
            to="/recuperar"
            className="pub-btn pub-btn-enlace"
          >
            Pedir un enlace nuevo
          </Link>
          <Link to="/" className="pub-enlace">
            Volver a iniciar sesión
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (listo) {
    return (
      <AuthLayout campo={2} frase="Listo: tu cuenta está otra vez a tu nombre.">
        <EncabezadoAuth titulo="Tu contraseña quedó actualizada">
          <p role="status">Listo, ya podés usar tu nueva contraseña la próxima vez que inicies sesión.</p>
        </EncabezadoAuth>
        <button
          type="button"
          onClick={() => navigate(RUTAS.postulaciones, { replace: true })}
          className="pub-btn"
        >
          Continuar
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout pasos={3} frase="Último paso: elegí una clave que solo sepas vos.">
      <EncabezadoAuth titulo="Elegí tu contraseña nueva">
        <p>Escribila dos veces para asegurarte de que no hay errores.</p>
      </EncabezadoAuth>

      <form onSubmit={handleSubmit} noValidate className="pub-form">
        <CampoPassword
          sobreCampo
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
        <MedidorPassword password={password} sobreCampo />
        <ChecklistPassword password={password} sobreCampo />
        <CampoPassword
          sobreCampo
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
          <p role="alert" className="pub-aviso">
            {errorServicio.mensaje}
          </p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="pub-btn"
        >
          {guardando ? 'Guardando…' : 'Guardar contraseña nueva'}
        </button>
      </form>
    </AuthLayout>
  );
}
