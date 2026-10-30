import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { agregarTag, contieneTag, normalizarTag, quitarTag } from '@/lib/tags';
import { cn, scrollFieldIntoView } from '@/lib/utils';
import { ErrorCampo } from './ErrorCampo';

export const STACK_SUGERIDO = [
  'React',
  'Angular',
  'Vue',
  'Node.js',
  'TypeScript',
  'Python',
  'Java',
  'SQL',
  'AWS',
  'Docker',
  'Selenium',
  'PostgreSQL',
];

interface TecnologiasEditorProps {
  value: string[];
  onChange: (value: string[]) => void;
  // El texto escrito y todavía no agregado vive en el padre: al tocar "Continuar" se agrega solo.
  draft: string;
  onDraftChange: (value: string) => void;
  error?: string | null;
  idError: string;
  mostrarSugeridas?: boolean;
}

export function TecnologiasEditor({
  value,
  onChange,
  draft,
  onDraftChange,
  error,
  idError,
  mostrarSugeridas = true,
}: TecnologiasEditorProps) {
  const [aviso, setAviso] = useState<string | null>(null);

  function alternar(tech: string) {
    onChange(contieneTag(value, tech) ? quitarTag(value, tech) : agregarTag(value, tech));
  }

  function agregarEscrita() {
    const nueva = normalizarTag(draft);
    if (!nueva) {
      setAviso('Escribí una tecnología antes de apretar «Agregar».');
      return;
    }
    if (contieneTag(value, nueva)) {
      setAviso(`«${nueva}» ya está en tu lista.`);
      onDraftChange('');
      return;
    }
    setAviso(null);
    onChange(agregarTag(value, nueva));
    onDraftChange('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarEscrita();
    }
  }

  const pendiente = normalizarTag(draft);

  return (
    <div className="flex flex-col gap-4">
      {mostrarSugeridas && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tecnologías sugeridas">
          {STACK_SUGERIDO.map((tech) => {
            const active = contieneTag(value, tech);
            return (
              <button
                key={tech}
                type="button"
                aria-pressed={active}
                onClick={() => alternar(tech)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer',
                  active
                    ? 'bg-cta text-on-cta border-primary'
                    : 'bg-surface text-on-surface-variant border-outline-variant hover:border-primary'
                )}
              >
                {tech}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          maxLength={50}
          value={draft}
          aria-label="Otra tecnología"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? idError : undefined}
          onChange={(e) => {
            onDraftChange(e.target.value);
            setAviso(null);
          }}
          onFocus={scrollFieldIntoView}
          onKeyDown={handleKeyDown}
          placeholder="Otra tecnología…"
          className="flex-1 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
        />
        <button
          type="button"
          onClick={agregarEscrita}
          className="px-4 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          Agregar
        </button>
      </div>
      {aviso && (
        <p role="status" className="text-sm text-on-surface-variant -mt-2">
          {aviso}
        </p>
      )}
      {pendiente && !aviso && !contieneTag(value, pendiente) && (
        <p className="text-sm text-on-surface-variant -mt-2">
          Apretá «Agregar» (o Enter) para sumar «{pendiente}». Si no lo hacés, la sumamos al tocar «Continuar».
        </p>
      )}

      <ErrorCampo id={idError} mensaje={error} />

      <div>
        <h4 className="text-sm font-semibold text-on-surface mb-2">Tus tecnologías ({value.length})</h4>
        {value.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Todavía no elegiste ninguna.</p>
        ) : (
          <ul aria-label="Tecnologías elegidas" className="flex flex-wrap gap-2">
            {value.map((tech) => (
              <li
                key={tech}
                className="inline-flex items-center gap-1 bg-primary-container text-on-primary-container text-sm font-medium pl-3 pr-1 py-1 rounded-md"
              >
                {tech}
                <button
                  type="button"
                  onClick={() => onChange(quitarTag(value, tech))}
                  aria-label={`Quitar ${tech}`}
                  className="p-2 -m-0.5 rounded hover:text-error cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
