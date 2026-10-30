import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { X, Eye, EyeOff, Download, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRol } from '@/hooks/useRol';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AvisoPrivacidad } from '@/components/AvisoPrivacidad';
import { supabase } from '@/lib/supabase';
import { almacenLocal } from '@/lib/actividad';
import { traducirErrorAuth } from '@/lib/authErrores';
import { mensajeDeError } from '@/lib/errores';
import { formatearFecha } from '@/lib/etiquetas';
import { nombreDeArchivo } from '@/lib/misDatos';
import { EVENTO_PREFERENCIAS, guardarPreferencia, leerPreferencia, type Preferencias } from '@/lib/preferencias';
import { validarConfirmacion, validarPasswordNueva } from '@/lib/validacionAuth';
import { cn } from '@/lib/utils';
import { MedidorPassword } from '@/components/auth/MedidorPassword';
import { borrarMisOfertas, cerrarSesionEnTodosLados, reunirMisDatos } from '@/services/miCuenta';
import { MARCA } from '@/lib/marca';

function iniciales(nombre: string, email: string): string {
  const base = nombre.trim() || email;
  const partes = base.trim().split(/\s+/);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

const CAMPO =
  'w-full bg-surface border border-outline-variant rounded-lg px-3 min-h-11 text-base text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all';
const BOTON_PRIMARIO =
  'self-start bg-cta text-on-cta text-sm font-semibold px-5 min-h-11 rounded-lg shadow-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer';
const BOTON_SECUNDARIO =
  'self-start inline-flex items-center gap-2 bg-surface text-on-surface text-sm font-semibold px-5 min-h-11 rounded-lg border border-outline hover:bg-surface-container-low transition-colors disabled:opacity-50 cursor-pointer';

function Seccion({ id, titulo, descripcion, children }: { id: string; titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 pt-6 border-t border-outline-variant first:pt-0 first:border-t-0">
      <div>
        <h3 id={id} className="text-lg font-heading font-bold text-on-surface">
          {titulo}
        </h3>
        {descripcion && <p className="text-sm text-on-surface-variant mt-0.5">{descripcion}</p>}
      </div>
      {children}
    </section>
  );
}

// Interruptor con su texto: un clic en cualquier parte de la fila lo cambia.
function FilaInterruptor({ titulo, detalle, activo, onCambiar }: { titulo: string; detalle: string; activo: boolean; onCambiar: (valor: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-base font-semibold text-on-surface">{titulo}</p>
        <p className="text-sm text-on-surface-variant">{detalle}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        aria-label={titulo}
        onClick={() => onCambiar(!activo)}
        className="shrink-0 w-11 h-11 -my-2 flex items-center justify-center cursor-pointer focus:outline-none group"
      >
        <span
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-surface',
            activo ? 'bg-primary' : 'bg-surface-container-highest border border-outline'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-sm transition-transform',
              activo ? 'translate-x-5 bg-on-primary' : 'bg-on-surface-variant'
            )}
          />
        </span>
      </button>
    </div>
  );
}

interface CuentaModalProps {
  onClose: () => void;
}

export function CuentaModal({ onClose }: CuentaModalProps) {
  const { user } = useAuth();
  const { rol } = useRol();
  const esCandidato = rol === 'candidato';
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

  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  const [cerrandoTodo, setCerrandoTodo] = useState(false);
  const [errorSesiones, setErrorSesiones] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<Preferencias>(() => ({
    avisoActividad: user ? leerPreferencia(user.id, 'avisoActividad', almacenLocal()) : true,
    preguntaPostulacion: user ? leerPreferencia(user.id, 'preguntaPostulacion', almacenLocal()) : true,
  }));

  const [descargando, setDescargando] = useState(false);
  const [descargaOk, setDescargaOk] = useState(false);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [textoBorrado, setTextoBorrado] = useState('');
  const [borrando, setBorrando] = useState(false);
  const [borradoOk, setBorradoOk] = useState(false);

  const dialogoRef = useRef<HTMLDivElement>(null);

  // Escape cierra, y el foco entra al diálogo al abrirlo.
  useEffect(() => {
    dialogoRef.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [onClose]);

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

  async function handleCerrarEnTodos() {
    setCerrandoTodo(true);
    setErrorSesiones(null);
    try {
      await cerrarSesionEnTodosLados();
    } catch (err) {
      setErrorSesiones(traducirErrorAuth(err, 'nueva-password').mensaje);
      setCerrandoTodo(false);
    }
  }

  function cambiarPreferencia(nombrePref: keyof Preferencias, valor: boolean) {
    if (!user) return;
    guardarPreferencia(user.id, nombrePref, valor, almacenLocal());
    setPrefs((p) => ({ ...p, [nombrePref]: valor }));
    window.dispatchEvent(new Event(EVENTO_PREFERENCIAS));
  }

  async function handleDescargar() {
    if (!user) return;
    setDescargando(true);
    setErrorDatos(null);
    setDescargaOk(false);
    try {
      const exportacion = await reunirMisDatos(user);
      const blob = new Blob([JSON.stringify(exportacion, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombreDeArchivo(new Date());
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      setDescargaOk(true);
    } catch (err) {
      setErrorDatos(mensajeDeError(err, 'No se pudieron reunir tus datos. Probá de nuevo en un momento.'));
    } finally {
      setDescargando(false);
    }
  }

  async function handleBorrar() {
    if (!user) return;
    setBorrando(true);
    setErrorDatos(null);
    try {
      await borrarMisOfertas(user.id);
      setBorradoOk(true);
      setConfirmandoBorrado(false);
      setTextoBorrado('');
    } catch (err) {
      setErrorDatos(mensajeDeError(err, 'No se pudieron borrar tus ofertas. Probá de nuevo en un momento.'));
    } finally {
      setBorrando(false);
    }
  }

  const miembroDesde = user?.created_at ? formatearFecha(user.created_at) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.4)]">
      <div
        ref={dialogoRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-cuenta"
        className="w-full max-w-[34rem] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg flex flex-col max-h-[90vh] focus:outline-none"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 id="titulo-cuenta" className="text-xl font-heading font-bold text-on-surface">
            Mi cuenta
          </h2>
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
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 shrink-0 rounded-full bg-cta text-on-cta flex items-center justify-center text-xl font-bold">
              {iniciales(nombre, email)}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-on-surface truncate">{nombreGuardado.trim() || 'Sin nombre'}</p>
              <p className="text-sm text-on-surface-variant truncate">{email}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-container text-on-primary-container font-semibold px-2.5 py-0.5">
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  {esCandidato ? 'Candidato' : 'Administrador'}
                </span>
                {miembroDesde && <span>Desde el {miembroDesde}</span>}
              </p>
            </div>
          </div>

          <Seccion id="cuenta-datos" titulo="Tus datos">
            <form onSubmit={handleGuardarNombre} noValidate className="flex flex-col gap-3">
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
                  className={CAMPO}
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
              <button type="submit" disabled={guardandoNombre || nombre.trim() === nombreGuardado.trim()} className={BOTON_PRIMARIO}>
                {guardandoNombre ? 'Guardando…' : 'Guardar nombre'}
              </button>
            </form>
          </Seccion>

          <Seccion id="cuenta-seguridad" titulo="Seguridad" descripcion="Cambiá tu contraseña o cerrá tu sesión en los dispositivos donde la dejaste abierta.">
            <form onSubmit={handleCambiarPassword} noValidate className="flex flex-col gap-3">
              <p className="text-base font-semibold text-on-surface">Cambiar contraseña</p>
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
                    className={cn(CAMPO, 'pl-3 pr-11')}
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
                  className={CAMPO}
                />
              </label>
              {errorPassword && <p className="text-sm text-error">{errorPassword}</p>}
              {okPassword && <p className="text-sm text-success">Contraseña actualizada.</p>}
              <button type="submit" disabled={cambiandoPassword || !passwordNueva || !passwordConfirmar} className={BOTON_PRIMARIO}>
                {cambiandoPassword ? 'Guardando…' : 'Cambiar contraseña'}
              </button>
            </form>

            <div className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface p-4">
              <p className="text-base font-semibold text-on-surface">Sesiones abiertas</p>
              <p className="text-sm text-on-surface-variant">
                Si usaste {MARCA.nombre} en una computadora ajena o perdiste un dispositivo, cerrá la sesión en todos lados. Vas a tener que volver a
                ingresar también acá.
              </p>
              {!confirmandoSalida ? (
                <button type="button" onClick={() => setConfirmandoSalida(true)} className={BOTON_SECUNDARIO}>
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Cerrar sesión en todos los dispositivos
                </button>
              ) : (
                <div role="group" aria-label="Confirmar cierre de sesiones" className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={handleCerrarEnTodos} disabled={cerrandoTodo} className={BOTON_PRIMARIO}>
                    {cerrandoTodo ? 'Cerrando…' : 'Sí, cerrar todas'}
                  </button>
                  <button type="button" onClick={() => setConfirmandoSalida(false)} disabled={cerrandoTodo} className={BOTON_SECUNDARIO}>
                    Cancelar
                  </button>
                </div>
              )}
              {errorSesiones && <p className="text-sm text-error">{errorSesiones}</p>}
            </div>
          </Seccion>

          <Seccion id="cuenta-preferencias" titulo="Preferencias" descripcion="Se guardan en este navegador.">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-on-surface">Tema</p>
                <p className="text-sm text-on-surface-variant">Modo claro u oscuro.</p>
              </div>
              <ThemeToggle />
            </div>
            {esCandidato && (
              <>
                <FilaInterruptor
                  titulo="Aviso de ritmo de búsqueda"
                  detalle="Te avisa, con buena onda, si pasaron varios días sin novedades o si una semana fue más tranquila."
                  activo={prefs.avisoActividad}
                  onCambiar={(v) => cambiarPreferencia('avisoActividad', v)}
                />
                <FilaInterruptor
                  titulo="Preguntarme si me postulé"
                  detalle="Al volver de una oferta, te pregunta si llegaste a postularte."
                  activo={prefs.preguntaPostulacion}
                  onCambiar={(v) => cambiarPreferencia('preguntaPostulacion', v)}
                />
              </>
            )}
          </Seccion>

          {esCandidato && (
            <Seccion id="cuenta-mis-datos" titulo={`Tus datos en ${MARCA.nombre}`} descripcion="Tus ofertas y postulaciones son solo tuyas: acá las llevás o las borrás.">
              <div className="flex flex-col gap-2">
                <button type="button" onClick={handleDescargar} disabled={descargando} className={BOTON_SECUNDARIO}>
                  <Download className="w-4 h-4" aria-hidden="true" />
                  {descargando ? 'Reuniendo tus datos…' : 'Descargar mis datos'}
                </button>
                <p className="text-sm text-on-surface-variant">
                  Un archivo con tu perfil, criterios, ofertas, postulaciones, novedades, historial y mensajes. Se arma en tu navegador.
                </p>
                {descargaOk && <p role="status" className="text-sm text-success">Listo: se descargó el archivo.</p>}
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-error bg-surface p-4">
                <p className="text-base font-semibold text-on-surface">Borrar mis ofertas y postulaciones</p>
                <p className="text-sm text-on-surface-variant">
                  Elimina todas tus ofertas y, con ellas, tus postulaciones, novedades y avisos. Tu cuenta y tu perfil de búsqueda se
                  conservan. No se puede deshacer.
                </p>
                {!confirmandoBorrado ? (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmandoBorrado(true);
                      setBorradoOk(false);
                    }}
                    className={cn(BOTON_SECUNDARIO, 'text-error border-error')}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    Borrar mis ofertas y postulaciones
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
                      Para confirmar, escribí BORRAR
                      <input
                        type="text"
                        value={textoBorrado}
                        onChange={(e) => setTextoBorrado(e.target.value)}
                        autoComplete="off"
                        className={CAMPO}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleBorrar}
                        disabled={borrando || textoBorrado.trim().toUpperCase() !== 'BORRAR'}
                        className="self-start bg-error text-on-error text-sm font-semibold px-5 min-h-11 rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer"
                      >
                        {borrando ? 'Borrando…' : 'Borrar definitivamente'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmandoBorrado(false);
                          setTextoBorrado('');
                        }}
                        disabled={borrando}
                        className={BOTON_SECUNDARIO}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                {borradoOk && <p role="status" className="text-sm text-success">Listo: borramos tus ofertas y postulaciones.</p>}
              </div>
              {errorDatos && <p role="alert" className="text-sm text-error">{errorDatos}</p>}
            </Seccion>
          )}
        </div>
      </div>
    </div>
  );
}
