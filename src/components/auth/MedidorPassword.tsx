import { calcularFortalezaPassword, type NivelFortalezaPassword } from '@/lib/passwordStrength';
import { cn } from '@/lib/utils';

const ESTILO_NIVEL: Record<NivelFortalezaPassword, { label: string; barra: string; texto: string; barras: number }> = {
  baja: { label: 'Débil', barra: 'bg-error', texto: 'text-error', barras: 1 },
  media: { label: 'Media', barra: 'bg-warning', texto: 'text-warning', barras: 2 },
  fuerte: { label: 'Fuerte', barra: 'bg-success', texto: 'text-success', barras: 3 },
};

// Medidor de fortaleza compartido por Registro, "Nueva contraseña" y Mi cuenta.
export function MedidorPassword({ password, sobreCampo = false }: { password: string; sobreCampo?: boolean }) {
  const fortaleza = calcularFortalezaPassword(password);
  if (!fortaleza) return null;
  const estilo = ESTILO_NIVEL[fortaleza.nivel];

  if (sobreCampo) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="pub-barras" data-n={estilo.barras} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span className="text-[0.9375rem] font-semibold">Contraseña {estilo.label.toLowerCase()}</span>
        {fortaleza.nivel === 'baja' && (
          <span className="text-[0.9375rem]">Para reforzarla, hacela más larga y sumá mayúsculas, números o símbolos.</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn('h-1.5 flex-1 rounded-full transition-colors', i < estilo.barras ? estilo.barra : 'bg-surface-container-high')}
          />
        ))}
      </div>
      <span className={cn('text-xs font-medium', estilo.texto)}>Contraseña {estilo.label.toLowerCase()}</span>
      {fortaleza.nivel === 'baja' && (
        <span className="text-xs text-on-surface-variant">Para reforzarla, hacela más larga y sumá mayúsculas, números o símbolos.</span>
      )}
    </div>
  );
}
