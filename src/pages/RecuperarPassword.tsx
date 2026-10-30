import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { KeyRound, MailCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { EncabezadoAuth } from '@/components/auth/EncabezadoAuth';
import type { ErrorAuthTraducido } from '@/lib/authErrores';
import { validarEmail } from '@/lib/validacionAuth';
import { scrollFieldIntoView } from '@/lib/utils';

// El servicio de correo permite un envío por minuto para el mismo email: se espera lo mismo antes de reenviar.
const SEGUNDOS_ENTRE_ENVIOS = 60;

export function RecuperarPassword() {
  const { enviarEnlaceRecuperacion } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState((location.state as { email?: string } | null)?.email ?? '');
  const [errorEmail, setErrorEmail] = useState<string | null>(null);
  const [errorServicio, setErrorServicio] = useState<ErrorAuthTraducido | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const id = window.setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [espera]);

  async function enviar() {
    setErrorServicio(null);
    setEnviando(true);
    const { error } = await enviarEnlaceRecuperacion(email);
    setEnviando(false);

    if (error) {
      setErrorServicio(error);
      return;
    }
    // Mensaje neutro: es el mismo exista o no una cuenta con ese email.
    setEnviado(true);
    setEspera(SEGUNDOS_ENTRE_ENVIOS);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const error = validarEmail(email);
    setErrorEmail(error);
    if (error) return;
    void enviar();
  }

  function usarOtroEmail() {
    setEnviado(false);
    setErrorServicio(null);
    setErrorEmail(null);
  }

  return (
    <AuthLayout
      compacto
      pasos={enviado ? 2 : 1}
      frase={enviado ? 'Revisá tu correo: ya salió el enlace.' : 'Te mandamos un enlace y volvés a entrar.'}
    >

      {!enviado ? (
        <>
          <EncabezadoAuth icono={KeyRound} titulo="¿Olvidaste tu contraseña?">
            <p>No pasa nada. Escribí el email con el que te registraste y te enviamos un enlace para elegir una nueva.</p>
          </EncabezadoAuth>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="flex flex-col gap-1.5 text-sm text-on-surface-variant">
                Email
                <input
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={email}
                  aria-invalid={Boolean(errorEmail)}
                  aria-describedby={errorEmail ? 'error-email' : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorEmail(null);
                  }}
                  onFocus={scrollFieldIntoView}
                  className="w-full h-11 bg-surface border border-outline-variant rounded-lg px-3 text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all aria-invalid:border-error"
                />
              </label>
              {errorEmail && (
                <p id="error-email" role="alert" className="text-sm text-error">
                  {errorEmail}
                </p>
              )}
            </div>

            {errorServicio && (
              <p role="alert" className="text-sm text-error">
                {errorServicio.mensaje}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="h-11 bg-cta text-on-cta text-sm font-medium px-6 rounded-lg shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {enviando ? 'Enviando…' : 'Enviar enlace'}
            </button>

            <Link to="/" className="text-center text-sm text-on-surface-variant hover:text-primary transition-colors">
              Volver a iniciar sesión
            </Link>
          </form>
        </>
      ) : (
        <>
          <EncabezadoAuth icono={MailCheck} titulo="Revisá tu correo" tono="exito">
            <p role="status">Si el email existe, te enviamos un enlace para cambiar tu contraseña.</p>
            <p>
              Lo pedimos para
              <strong className="block text-on-surface break-words">{email.trim()}</strong>
            </p>
          </EncabezadoAuth>

          <ul className="text-xs text-on-surface-variant bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 flex flex-col gap-1.5 list-disc pl-8">
            <li>Puede tardar unos minutos en llegar.</li>
            <li>Si no lo ves, mirá también la carpeta de spam o correo no deseado.</li>
            <li>El enlace vence al rato y solo se puede usar una vez.</li>
          </ul>

          {errorServicio && (
            <p role="alert" className="text-sm text-error">
              {errorServicio.mensaje}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={enviando || espera > 0}
              className="h-11 bg-cta text-on-cta text-sm font-medium px-6 rounded-lg shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {enviando ? 'Enviando…' : espera > 0 ? `Podés pedir otro enlace en ${espera} s` : 'Reenviar enlace'}
            </button>
            <button
              type="button"
              onClick={usarOtroEmail}
              className="h-11 text-sm font-medium text-on-surface-variant hover:text-primary border border-outline-variant rounded-lg transition-colors cursor-pointer"
            >
              Usar otro email
            </button>
            <Link to="/" className="text-center text-sm text-on-surface-variant hover:text-primary transition-colors">
              Volver a iniciar sesión
            </Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
