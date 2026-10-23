# Suite E2E (Playwright)

Navegador real (Chromium) contra la app levantada con Vite y la base real de Supabase.
`npm run test` sigue siendo solo Vitest; esto se corre con `npm run test:e2e`.

## Puesta en marcha

1. `npm install` y `npx playwright install chromium`.
2. Crear un archivo `.env.e2e` en la raíz con `E2E_EMAIL`, `E2E_EMAIL_MOBILE` y `E2E_PASSWORD` (los emails de dos cuentas
   de prueba y una contraseña de al menos 8 caracteres; no se commitea: `.env.e2e` está en `.gitignore`).
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` se leen de `.env`.
3. Para las pruebas de roles y mensajes, agregar también a `.env.e2e` `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD`: una cuenta de
   administrador de pruebas, registrada desde la app y con el rol asignado **una sola vez** por SQL (el comando está
   en el README principal, sección "Base de datos"). Los tests solo inician sesión con ella: nunca la modifican.
4. `npm run test:e2e` (todo) o `npx playwright test --project=desktop registro` (una spec).

La primera vez, `auth.setup.ts` crea las dos cuentas compartidas por el **flujo de registro de la app**.
No se usa ninguna service role key: la siembra y la limpieza usan el cliente de Supabase autenticado como el
usuario de prueba, así que respetan RLS igual que un usuario real.

## Proyectos

| Proyecto | Viewport | Notas |
|---|---|---|
| `desktop` | 1280x800 | Drag-and-drop nativo real. Incluye las pruebas de seguridad (`seguridad-*`), que no usan navegador |
| `mobile` | 375x812, touch | Selector "Mover a...", barra de selección, menú lateral, `mobile-teclado` |

Corren en serie (un solo worker): comparten la base y una cuenta por proyecto. `mobile-teclado.spec.ts` se excluye
del proyecto desktop en `playwright.config.ts` (el teclado virtual solo existe en mobile), en vez de figurar como
"salteado" en cada corrida; las especs `seguridad-*` se excluyen de mobile porque hablan directo con la API y una
sola corrida alcanza.

Corrida completa de referencia: **128 tests** (2 sesiones de preparación, 69 en desktop —13 de seguridad contra la base— y 57 en mobile),
todos en verde.

## Especificaciones

| Spec | Qué cubre |
|---|---|
| `registro-onboarding` | Configuración inicial de 5 pasos: validaciones, texto sin agregar, duplicados, resumen editable, confirmación |
| `acceso-y-recuperacion` | Login y registro (validación y errores en español), recuperar y cambiar contraseña (con el envío de mails interceptado) |
| `navegacion` | Nombres de las secciones, ayuda por pantalla, redirecciones de las URLs anteriores |
| `filtros-y-perfil` | Filtros de Ofertas (ubicación, puntaje mínimo según el perfil, sin resultados) y aviso de perfil vacío |
| `recorrido-usuario-nuevo` | Registro con errores a propósito, perfil, "Primeros pasos", importar, postularse, recordatorio, salir, recuperar y volver a entrar |
| `mensajes-administrador` | Candidato y administrador: bienvenida, listado, envío, plantillas, no leído, marcado como leído, acceso por rol y página "No encontramos esa página" |
| `seguridad-roles-mensajes` | Pruebas adversariales contra la base real (13): candidato contra candidato, escalada de rol, vista `candidatos`, mensajes, administrador, sin sesión |
| `oferta-detalle` | Panel de detalle de una oferta: puntaje explicado, descripción, enlace de origen (otra pestaña, sin acceso a Laburin), foco y Escape, guardar la postulación, agregar un enlace, búsqueda en LinkedIn, importación con enlaces de las tres fuentes y enlaces o descripciones maliciosos |
| `seguridad-xss` | Código malicioso en nombre, rol, ubicación, tecnologías, mensajes y ofertas importadas: todo se ve como texto y nada se ejecuta |
| `accesibilidad` | axe-core (WCAG A y AA) en todas las pantallas y modales, en tema claro y oscuro |
| `responsive-pantallas` | Ninguna pantalla se sale del ancho de un celular (320 y 375 px) |
| `oferta-ciclo-de-vida`, `tablero-carrera`, `import-filtros-borrado`, `import-real`, `paginacion-mas-de-1000`, `configuracion-scoring`, `umbral-inactividad`, `cuenta-y-sesion`, `mobile-teclado` | Las del pase anterior: ciclo de la oferta, Tablero, importación, paginación, scoring, recordatorios, sesión y teclado |

## Datos de prueba

- Cada test que usa la cuenta compartida arranca con la cuenta reseteada (`api.resetear()`): perfil completo,
  umbral por defecto y criterios base (React 15, remoto 10), sin ofertas.
- Las specs que cambian la contraseña, cierran sesión o prueban roles y mensajes usan cuentas propias, creadas por el
  registro de la app o por la API pública de Auth; el candidato de cada test se crea en la corrida.
- Al terminar (`global-teardown.ts`) se borran **todos los datos** de las cuentas compartidas y temporales
  (ofertas, postulaciones, interacciones, criterios, perfil y mensajes recibidos). Los usuarios de Auth huérfanos
  se dejan: borrarlos requeriría una service role key. Los mensajes que envía el administrador se borran junto con
  los de su destinatario, porque cada persona puede borrar los que recibe.
- Remotive y Arbeitnow se interceptan con `page.route` para que el import sea determinista;
  `import-real.spec.ts` es el smoke contra los servicios reales y se saltea de forma explícita si ninguno responde.
- El envío de mails de recuperación de contraseña también se intercepta: ningún test depende de que llegue un mail
  real ni consume el cupo del servicio de correo.

## Zonas ciegas (lo que esta suite NO verifica)

Ver la lista actualizada en la Memoria Técnica (Sección 7). Resumen:

- **Teclado virtual real:** `mobile-teclado.spec.ts` solo simula su efecto (viewport reducido).
- **Touch real / gestos:** el drag táctil no existe en la app (se usa el selector), y Playwright emula el touch.
- **Otros motores y dispositivos:** solo Chromium. No hay WebKit/Safari/iOS ni hardware real.
- **Autoscroll durante el drag:** en desktop se desplaza el tablero antes de arrastrar; el autoscroll por
  proximidad al borde que hace el navegador al arrastrar no se verifica.
- **Fuentes externas reales:** salvo el smoke, dependen de mocks.
- **Correo real:** la recuperación de contraseña se prueba hasta el pedido a Supabase; que el mail llegue y que el
  enlace abra la pantalla de nueva contraseña depende del correo configurado y se verifica a mano.
