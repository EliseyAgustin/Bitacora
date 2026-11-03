/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { OnboardingProvider } from './hooks/useOnboarding';
import { RolProvider } from './hooks/useRol';
import { SoloPara } from './components/SoloPara';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import { RecuperarPassword } from './pages/RecuperarPassword';
import { NuevaPassword } from './pages/NuevaPassword';
import { NoEncontrada } from './pages/NoEncontrada';
import { REDIRECCIONES_LEGACY, RUTAS } from './lib/rutas';

// Las pantallas de la sesión se bajan al entrar en ellas: el primer ingreso (login) carga mucho menos código.
const Onboarding = lazy(() => import('./pages/Onboarding').then((m) => ({ default: m.Onboarding })));
const Tablero = lazy(() => import('./pages/Tablero').then((m) => ({ default: m.Tablero })));
const Offers = lazy(() => import('./pages/Offers').then((m) => ({ default: m.Offers })));
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const Mensajes = lazy(() => import('./pages/Mensajes').then((m) => ({ default: m.Mensajes })));
const Candidatos = lazy(() => import('./pages/Candidatos').then((m) => ({ default: m.Candidatos })));
const CandidatoDetalle = lazy(() => import('./pages/CandidatoDetalle').then((m) => ({ default: m.CandidatoDetalle })));

export default function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <RolProvider>
        <OnboardingProvider>
          <BrowserRouter>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-surface">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" aria-label="Cargando…" />
                </div>
              }
            >
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/recuperar" element={<RecuperarPassword />} />
              <Route path="/nueva-contrasena" element={<NuevaPassword />} />

              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                {/* Pantallas personales del candidato. */}
                <Route element={<SoloPara rol="candidato" />}>
                  <Route path={RUTAS.postulaciones} element={<Tablero />} />
                  <Route path={RUTAS.ofertas} element={<Offers />} />
                  <Route path={RUTAS.progreso} element={<Analytics />} />
                  <Route path={RUTAS.perfil} element={<Settings />} />
                  <Route path={RUTAS.mensajes} element={<Mensajes />} />
                </Route>

                {/* Pantallas del administrador: un candidato que las abre por URL vuelve a su inicio. */}
                <Route element={<SoloPara rol="administrador" />}>
                  <Route path={RUTAS.candidatos} element={<Candidatos />} />
                  <Route path={`${RUTAS.candidatos}/:id`} element={<CandidatoDetalle />} />
                </Route>
              </Route>

              {/* URLs anteriores: siguen llevando a la pantalla correcta (enlaces guardados, marcadores). */}
              {Object.entries(REDIRECCIONES_LEGACY).map(([desde, hacia]) => (
                <Route key={desde} path={desde} element={<Navigate to={hacia} replace />} />
              ))}

              {/* Dirección que no existe */}
              <Route path="*" element={<NoEncontrada />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </OnboardingProvider>
        </RolProvider>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
