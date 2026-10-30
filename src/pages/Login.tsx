import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { CampoPassword } from '@/components/auth/CampoPassword';
import { ChecklistPassword } from '@/components/auth/ChecklistPassword';
import { TEXTO_PRIVACIDAD } from '@/components/AvisoPrivacidad';
import { PaginaPublica } from '@/components/publica/PaginaPublica';
import { MedidorPassword } from '@/components/auth/MedidorPassword';
import { generarDatosEjemplo } from '@/lib/datosEjemplo';
import { rutaInicialPorRol } from '@/lib/rol';
import { obtenerMiRol } from '@/services/roles';
import type { ErrorAuthTraducido } from '@/lib/authErrores';
import { validarEmail, validarPasswordIngreso, validarPasswordNueva } from '@/lib/validacionAuth';
import { scrollFieldIntoView } from '@/lib/utils';

interface ErroresCampos {
  email?: string;
  password?: string;
}

const CLASE_LINK = 'font-medium underline underline-offset-2 hover:opacity-80 cursor-pointer';

export function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<ErroresCampos>({});
  const [errorServicio, setErrorServicio] = useState<ErrorAuthTraducido | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorServicio(null);
    setInfo(null);

    // La validación nativa del navegador está apagada (noValidate): se valida acá, con mensajes propios.
    const erroresNuevos: ErroresCampos = {
      email: validarEmail(email) ?? undefined,
      password: (mode === 'login' ? validarPasswordIngreso(password) : validarPasswordNueva(password)) ?? undefined,
    };
    setErrores(erroresNuevos);
    if (erroresNuevos.email) {
      emailRef.current?.focus();
      return;
    }
    if (erroresNuevos.password) return;

    setLoading(true);

    if (mode === 'login') {
      const { error: signInError } = await signIn(email, password);
      setLoading(false);

      if (signInError) {
        setErrorServicio(signInError);
        return;
      }

      // El administrador cae en Candidatos; cualquier otra persona, en Mis postulaciones.
      const rol = await obtenerMiRol().catch(() => 'candidato' as const);
      navigate(rutaInicialPorRol(rol), { replace: true });
      return;
    }

    const { error: signUpError, hasSession } = await signUp(email, password);
    setLoading(false);

    if (signUpError) {
      setErrorServicio(signUpError);
      return;
    }

    if (hasSession) {
      navigate('/onboarding', { replace: true });
      return;
    }

    setInfo('Cuenta creada. Ya podés iniciar sesión.');
    setMode('login');
  }

  function cambiarModo(nuevo: 'login' | 'signup') {
    setMode(nuevo);
    setErrores({});
    setErrorServicio(null);
    setInfo(null);
  }

  function handleCompletarConEjemplo() {
    const datos = generarDatosEjemplo(new Date());
    setEmail(datos.email);
    setPassword(datos.password);
    setErrores({});
    setErrorServicio(null);
    setInfo(`Datos de ejemplo cargados. Contraseña: ${datos.password}`);
  }

  // "Ese email ya tiene una cuenta. Podés iniciar sesión o recuperar tu contraseña." con las dos acciones como enlaces.
  function mensajeServicio(error: ErrorAuthTraducido): ReactNode {
    if (error.codigo !== 'email_registrado') return error.mensaje;
    return (
      <>
        Ese email ya tiene una cuenta. Podés{' '}
        <button type="button" onClick={() => cambiarModo('login')} className={CLASE_LINK}>
          iniciar sesión
        </button>{' '}
        o{' '}
        <Link to="/recuperar" state={{ email }} className={CLASE_LINK}>
          recuperar tu contraseña
        </Link>
        .
      </>
    );
  }

  const idEmail = useId();

  return (
    <PaginaPublica modo={mode === 'login' ? 'login' : 'registro'} onCrearCuenta={() => cambiarModo('signup')}>
      <h2>{mode === 'login' ? 'Ingresá a tu cuenta' : 'Creá tu cuenta'}</h2>
      <p className="pub-lead">{mode === 'login' ? 'Iniciá sesión para ver tus postulaciones.' : 'Creá tu cuenta para empezar.'}</p>

      <form onSubmit={handleSubmit} noValidate className="pub-form">
        <div className="pub-campo">
          <label htmlFor={idEmail} className="pub-etiqueta">
            Email
          </label>
          <input
            id={idEmail}
            ref={emailRef}
            type="email"
            maxLength={254}
            autoComplete="email"
            placeholder="tu@email.com"
            value={email}
            aria-invalid={Boolean(errores.email)}
            aria-describedby={errores.email ? 'error-email' : undefined}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={scrollFieldIntoView}
            className="pub-input"
          />
          {errores.email && (
            <p id="error-email" role="alert" className="pub-aviso">
              {errores.email}
            </p>
          )}
        </div>

        <CampoPassword
          sobreCampo
          etiqueta="Contraseña"
          value={password}
          onChange={setPassword}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          error={errores.password}
          idError="error-password"
        />

        {mode === 'login' && (
          <Link to="/recuperar" state={{ email }} className="pub-enlace self-start -mt-2">
            ¿Olvidaste tu contraseña?
          </Link>
        )}

        {mode === 'signup' && (
          <>
            <MedidorPassword password={password} sobreCampo />
            <ChecklistPassword password={password} sobreCampo />
            <p className="pub-privacidad">{TEXTO_PRIVACIDAD}</p>
          </>
        )}

        {import.meta.env.DEV && mode === 'signup' && (
          <button type="button" onClick={handleCompletarConEjemplo} className="pub-enlace-btn">
            Completar con datos de ejemplo (solo desarrollo)
          </button>
        )}

        {errorServicio && (
          <p role="alert" className="pub-aviso">
            {mensajeServicio(errorServicio)}
          </p>
        )}
        {info && <p className="pub-info">{info}</p>}

        <button type="submit" disabled={loading} className="pub-btn">
          {loading ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Registrarme'}
        </button>

        <button type="button" onClick={() => cambiarModo(mode === 'login' ? 'signup' : 'login')} className="pub-enlace-btn">
          {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
        </button>
      </form>
    </PaginaPublica>
  );
}
