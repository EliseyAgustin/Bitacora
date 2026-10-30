import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mensajeDeError } from '@/lib/errores';
import { RUTAS } from '@/lib/rutas';
import { agregarTag } from '@/lib/tags';
import { completarOnboarding, omitirOnboarding } from '@/services/onboarding';
import { useOnboarding } from '@/hooks/useOnboarding';
import type { Modalidad } from '@/types/oferta';
import type { Seniority } from '@/types/perfilUsuario';
import { MarcoCampo, type CampoColor } from '@/components/publica/MarcoCampo';
import { RolStep } from './steps/RolStep';
import { StackStep } from './steps/StackStep';
import { ModalidadStep } from './steps/ModalidadStep';
import { NivelExperienciaStep } from './steps/NivelExperienciaStep';
import { ResumenStep } from './steps/ResumenStep';
import { validarPasoOnboarding, type ErroresOnboarding } from './validacion';

const TOTAL_STEPS = 5;

// Cada paso tiene su color de fondo, el mismo lenguaje de capítulos que la página de inicio.
const CAMPO_POR_PASO: Record<number, CampoColor> = { 1: 1, 2: 2, 3: 3, 4: 2, 5: 4 };

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { refresh } = useOnboarding();

  const [step, setStep] = useState(1);
  const [nombre, setNombre] = useState('');
  const [rolBuscado, setRolBuscado] = useState('');
  const [stackInteres, setStackInteres] = useState<string[]>([]);
  const [stackDraft, setStackDraft] = useState('');
  const [modalidad, setModalidad] = useState<Modalidad | null>(null);
  const [ubicacion, setUbicacion] = useState('');
  const [nivel, setNivel] = useState<Seniority | null>(null);
  const [errores, setErrores] = useState<ErroresOnboarding>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminado, setTerminado] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Un segundo tap rápido en "Continuar"/"Atrás" (frecuente en mobile) podía disparar otro cambio
  // de paso antes de que el anterior terminara de renderizar, dejando dos pasos superpuestos.
  useEffect(() => {
    setIsTransitioning(false);
  }, [step]);

  function limpiarError(campo: keyof ErroresOnboarding) {
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  // Lo escrito en "Otra tecnología" y no agregado se suma solo al avanzar: antes se perdía en silencio.
  function confirmarPendiente(): string[] {
    const tecnologias = agregarTag(stackInteres, stackDraft);
    setStackInteres(tecnologias);
    setStackDraft('');
    return tecnologias;
  }

  function validar(paso: number, tecnologias: string[]): boolean {
    const resultado = validarPasoOnboarding(paso, { nombre, rol: rolBuscado, tecnologias, modalidad, ubicacion });
    setErrores(resultado);
    return Object.keys(resultado).length === 0;
  }

  function continuar() {
    if (isTransitioning) return;
    const tecnologias = step === 2 ? confirmarPendiente() : stackInteres;
    if (!validar(step, tecnologias)) return;
    setIsTransitioning(true);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }

  function atras() {
    if (isTransitioning) return;
    setErrores({});
    setIsTransitioning(true);
    setStep((s) => Math.max(1, s - 1));
  }

  async function finish() {
    const tecnologias = confirmarPendiente();
    if (!validar(5, tecnologias)) return;

    setSaving(true);
    setError(null);
    try {
      await completarOnboarding({
        nombre: nombre.trim(),
        rol_buscado: rolBuscado.trim(),
        stack_interes: tecnologias,
        modalidad_preferida: modalidad,
        ubicacion: ubicacion.trim(),
        seniority: nivel,
      });
      // No se refresca el estado de onboarding acá: eso desmontaría esta pantalla antes de mostrar la confirmación.
      setTerminado(true);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar tu perfil.'));
    } finally {
      setSaving(false);
    }
  }

  function irA(ruta: string) {
    navigate(ruta, { replace: true });
    void refresh();
  }

  async function skip() {
    setSaving(true);
    setError(null);
    try {
      await omitirOnboarding();
      await refresh();
      navigate(RUTAS.postulaciones, { replace: true });
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo omitir la configuración inicial.'));
      setSaving(false);
    }
  }

  if (terminado) {
    return (
      <MarcoCampo campo={2}>
        <div className="flex flex-col items-center text-center gap-4">
          <h1 className="text-3xl font-heading font-bold text-on-surface">Tu perfil quedó listo</h1>
          <p className="text-sm text-on-surface-variant">
            Ya ordenamos las ofertas según lo que buscás. Podés cambiar estos datos cuando quieras en Mi perfil de
            búsqueda.
          </p>
          <p className="text-sm text-on-surface-variant">Te dejamos un mensaje de bienvenida en Mensajes.</p>
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center pt-2">
            <button
              type="button"
              onClick={() => irA(RUTAS.ofertas)}
              className="bg-cta text-on-cta text-sm font-medium px-6 py-2.5 rounded-lg shadow-sm hover:opacity-90 transition-all cursor-pointer"
            >
              Ver ofertas
            </button>
            <button
              type="button"
              onClick={() => irA(RUTAS.postulaciones)}
              className="bg-surface-container-high text-on-surface text-sm font-medium px-6 py-2.5 rounded-lg border border-outline-variant hover:bg-surface-variant transition-all cursor-pointer"
            >
              Ir a Mis postulaciones
            </button>
          </div>
        </div>
      </MarcoCampo>
    );
  }

  return (
    <MarcoCampo campo={CAMPO_POR_PASO[step] ?? 1} amplio>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-semibold text-on-surface-variant">
            <span>
              Paso {step} de {TOTAL_STEPS}
            </span>
            <button
              type="button"
              onClick={skip}
              disabled={saving}
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
            >
              Omitir por ahora
            </button>
          </div>
          <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {step === 1 && (
          <RolStep
            nombre={nombre}
            onNombreChange={(v) => {
              setNombre(v);
              limpiarError('nombre');
            }}
            errorNombre={errores.nombre}
            value={rolBuscado}
            onChange={(v) => {
              setRolBuscado(v);
              limpiarError('rol');
            }}
            error={errores.rol}
          />
        )}
        {step === 2 && (
          <StackStep
            value={stackInteres}
            onChange={(v) => {
              setStackInteres(v);
              limpiarError('tecnologias');
            }}
            draft={stackDraft}
            onDraftChange={(v) => {
              setStackDraft(v);
              limpiarError('tecnologias');
            }}
            error={errores.tecnologias}
          />
        )}
        {step === 3 && (
          <ModalidadStep
            modalidad={modalidad}
            onModalidadChange={(v) => {
              setModalidad(v);
              limpiarError('modalidad');
            }}
            ubicacion={ubicacion}
            onUbicacionChange={(v) => {
              setUbicacion(v);
              limpiarError('ubicacion');
            }}
            errorModalidad={errores.modalidad}
            errorUbicacion={errores.ubicacion}
          />
        )}
        {step === 4 && <NivelExperienciaStep value={nivel} onChange={setNivel} />}
        {step === 5 && (
          <ResumenStep
            nombre={nombre}
            onNombreChange={(v) => {
              setNombre(v);
              limpiarError('nombre');
            }}
            rol={rolBuscado}
            onRolChange={(v) => {
              setRolBuscado(v);
              limpiarError('rol');
            }}
            tecnologias={stackInteres}
            onTecnologiasChange={(v) => {
              setStackInteres(v);
              limpiarError('tecnologias');
            }}
            tecnologiaDraft={stackDraft}
            onTecnologiaDraftChange={setStackDraft}
            modalidad={modalidad}
            onModalidadChange={(v) => {
              setModalidad(v);
              limpiarError('modalidad');
            }}
            ubicacion={ubicacion}
            onUbicacionChange={(v) => {
              setUbicacion(v);
              limpiarError('ubicacion');
            }}
            nivel={nivel}
            onNivelChange={setNivel}
            errores={errores}
          />
        )}

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={atras}
            disabled={step === 1 || saving || isTransitioning}
            className="px-4 py-2 rounded-lg text-on-surface-variant text-sm font-medium hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-0"
          >
            Atrás
          </button>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={continuar}
              disabled={isTransitioning}
              className="bg-cta text-on-cta text-sm font-medium px-6 py-2.5 rounded-lg shadow-sm hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={saving}
              className="bg-cta text-on-cta text-sm font-medium px-6 py-2.5 rounded-lg shadow-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Guardando…' : 'Confirmar y terminar'}
            </button>
          )}
        </div>
      </div>
    </MarcoCampo>
  );
}
