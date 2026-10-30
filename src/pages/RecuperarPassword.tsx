import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
      pasos={enviado ? 2 : 1}
      frase={enviado ? 'Revisá tu correo: ya salió el enlace.' : 'Te mandamos un enlace y volvés a entrar.'}
    >

      {!enviado ? (
        <>
          <EncabezadoAuth titulo="¿Olvidaste tu contraseña?">
            <p>No pasa nada. Escribí el email con el que te registraste y te enviamos un enlace para elegir una nueva.</p>
          </EncabezadoAuth>

          <form onSubmit={handleSubmit} noValidate className="pub-form">
            <div className="pub-campo">
              <label htmlFor="email-recuperar" className="pub-etiqueta">
                Email
              </label>
              <input
                id="email-recuperar"
                type="email"
                maxLength={254}
                autoComplete="email"
                placeholder="tu@email.com"
                value={email}
                aria-invalid={Boolean(errorEmail)}
                aria-describedby={errorEmail ? 'error-email' : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorEmail(null);
                }}
                onFocus={scrollFieldIntoView}
                className="pub-input"
              />
              {errorEmail && (
                <p id="error-email" role="alert" className="pub-aviso">
                  {errorEmail}
                </p>
              )}
            </div>

            {errorServicio && (
              <p role="alert" className="pub-aviso">
                {errorServicio.mensaje}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="pub-btn"
            >
              {enviando ? 'Enviando…' : 'Enviar enlace'}
            </button>

            <Link to="/" className="pub-enlace">
              Volver a iniciar sesión
            </Link>
          </form>
        </>
      ) : (
        <>
          <EncabezadoAuth titulo="Revisá tu correo">
            <p role="status">Si el email existe, te enviamos un enlace para cambiar tu contraseña.</p>
            <p>
              Lo pedimos para
              <strong className="pub-correo">{email.trim()}</strong>
            </p>
          </EncabezadoAuth>

          <ul className="pub-notas">
            <li>Puede tardar unos minutos en llegar.</li>
            <li>Si no lo ves, mirá también la carpeta de spam o correo no deseado.</li>
            <li>El enlace vence al rato y solo se puede usar una vez.</li>
          </ul>

          {errorServicio && (
            <p role="alert" className="pub-aviso">
              {errorServicio.mensaje}
            </p>
          )}

          <div className="pub-form">
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={enviando || espera > 0}
              className="pub-btn"
            >
              {enviando ? 'Enviando…' : espera > 0 ? `Podés pedir otro enlace en ${espera} s` : 'Reenviar enlace'}
            </button>
            <button
              type="button"
              onClick={usarOtroEmail}
              className="pub-enlace-btn"
            >
              Usar otro email
            </button>
            <Link to="/" className="pub-enlace">
              Volver a iniciar sesión
            </Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
