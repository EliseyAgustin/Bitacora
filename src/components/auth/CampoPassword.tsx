import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { scrollFieldIntoView } from '@/lib/utils';

interface CampoPasswordProps {
  etiqueta: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  error?: string | null;
  idError: string;
  // Sobre el campo de color de la página pública: etiqueta clara, caja blanca y el error en una chapa legible.
  sobreCampo?: boolean;
}

// Input de contraseña con botón mostrar/ocultar. El mensaje de error va debajo, junto al campo.
export function CampoPassword({ etiqueta, value, onChange, autoComplete, error, idError, sobreCampo = false }: CampoPasswordProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  if (sobreCampo) {
    return (
      <div className="pub-campo">
        <label htmlFor={id} className="pub-etiqueta">
          {etiqueta}
        </label>
        <div className="pub-control">
          <input
            id={id}
            type={visible ? 'text' : 'password'}
            maxLength={128}
            autoComplete={autoComplete}
            value={value}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? idError : undefined}
            onChange={(e) => onChange(e.target.value)}
            onFocus={scrollFieldIntoView}
            className="pub-input"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="pub-mostrar"
          >
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {error && (
          <p id={idError} role="alert" className="pub-aviso">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5 text-sm text-on-surface-variant">
        {etiqueta}
        <div className="relative">
          <input
            type={visible ? 'text' : 'password'}
            maxLength={128}
            autoComplete={autoComplete}
            value={value}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? idError : undefined}
            onChange={(e) => onChange(e.target.value)}
            onFocus={scrollFieldIntoView}
            className="w-full bg-surface border border-outline-variant rounded-lg pl-3 pr-11 py-2 text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all aria-invalid:border-error"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          >
            {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </label>
      {error && (
        <p id={idError} role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
