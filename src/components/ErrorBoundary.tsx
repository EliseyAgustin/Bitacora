import { Component, type ErrorInfo, type ReactNode } from 'react';

// Última red de seguridad: si una pantalla falla al dibujarse (o no se pudo bajar su código), en lugar de dejar la
// pantalla en blanco se muestra un mensaje en español con una salida clara.
interface Estado {
  fallo: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { fallo: false };

  static getDerivedStateFromError(): Estado {
    return { fallo: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de interfaz:', error, info.componentStack);
  }

  render() {
    if (!this.state.fallo) return this.props.children;

    return (
      <div role="alert" className="min-h-screen flex items-center justify-center bg-surface p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">Algo salió mal</h1>
          <p className="text-muted-foreground">
            No pudimos mostrar esta pantalla. Tus datos están a salvo: recargá la página y volvé a intentar.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="pub-btn pub-btn-enlace"
          >
            Recargar la página
          </button>
        </div>
      </div>
    );
  }
}
