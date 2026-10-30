# Bitácora

![Mis postulaciones (tablero Kanban) de Bitácora](docs/scripts/capturas/05-tablero.png)

**Identidad visual:** la aplicación comparte con el Login y el Registro la misma paleta (azul, naranja, salvia y azul noche, con el amarillo del botón principal). Cada pantalla abre con un capítulo de color de borde a borde, con la mascota asomando de su pozo, y el menú marca la pantalla activa con el color de su capítulo. Una sola tipografía (Figtree, servida desde la propia aplicación), modo claro y modo oscuro (grafito, sin azul), y todo se apaga con «reducir movimiento».

Plataforma web para organizar y hacer seguimiento de una búsqueda laboral, con un motor de scoring configurable que puntúa cada oferta según las preferencias de cada usuario. Es el proyecto de la Práctica Profesional Supervisada de la Tecnicatura Universitaria en Tecnologías Web (Universidad Nacional del Oeste).

**Deploy:** https://laburin.vercel.app

## Qué hace

Para quien busca trabajo (candidato):

- **Ofertas:** carga manual o importación desde Remotive, Arbeitnow y RemoteOK (con deduplicación). Un clic en la tarjeta abre el detalle: puntaje explicado, descripción y enlace para postularse en el sitio de origen. Botón "Buscar en LinkedIn" con los datos del perfil (LinkedIn no tiene API pública de búsqueda). Al abrir el enlace de una oferta, Bitácora pregunta al volver si llegaste a postularte («¿Ya te postulaste?») y, si respondés que sí, la deja en Aplicado. Listado paginado con filtros por fuente, ubicación (con sugerencias de las ubicaciones cargadas) y puntaje mínimo (el control llega hasta el máximo posible con el perfil de cada usuario), y borrado masivo. Si un filtro no devuelve nada, el mensaje sugiere aflojarlo y hay un botón para quitarlos todos.
- **Mis postulaciones (tablero Kanban):** seis estados, cada columna con su color y una frase que explica qué significa ("Por aplicar": las guardaste, todavía no te postulaste; "Aplicado": ya te postulaste), con arrastrar y soltar en escritorio y un selector "Mover a..." en mobile. Guarda el historial de cambios de estado.
- **Aviso de actividad:** una tarjeta amable, con la mascota, arriba de Mis postulaciones y de Mi progreso, en solo dos casos: «¿Retomamos?» cuando pasan 10 días sin actividad, y «Esta semana fue más tranquila» cuando la semana tuvo la mitad o menos de movimientos que la anterior, siempre que la anterior haya tenido al menos 4 (con menos, la comparación no es confiable). No hay felicitaciones ni punto en el menú. Se calcula en el navegador, solo al abrir esas dos pantallas, con datos que ya existen; se puede cerrar (vuelve a los 3 días) y se puede apagar en Mi cuenta.
- **Ficha de postulación:** línea de tiempo de interacciones (mail, llamada, entrevista, nota).
- **Mi perfil de búsqueda:** tres bloques en el orden en que se usan: "¿Qué estoy buscando?" (modalidad y ubicación), "Mis tecnologías y cuánto pesan" y "Avisos de seguimiento" (el umbral de inactividad). Al cambiar un criterio se recalcula el puntaje de todas las ofertas. Pesos iniciales: 15 por tecnología, 10 por modalidad y 5 por ubicación.
- **Recordatorios por inactividad:** aviso cuando una postulación abierta lleva N días sin novedades; N lo elige cada usuario (de 1 a 90, 7 por defecto). Es solo un aviso: no se borra nada.
- **Mi progreso (métricas):** siete tarjetas con nombres claros («Postulaciones en curso», «Postulaciones con respuesta», «Ofertas guardadas», «Qué tanto encajan tus ofertas», «Postulaciones con movimiento», «Días hasta tu primera entrevista», «Postulaciones sin novedades»), cada una con una ayuda (ⓘ) que explica qué mide y su tendencia contra la semana anterior, más el embudo (con los colores de etapa), la distribución de puntajes, las interacciones por semana y las ofertas por fuente.
- **Mensajes:** avisos del equipo de Bitácora, con contador de no leídos en el menú, "Marcar como leído" y "Borrar". Al completar el perfil se recibe un mensaje de bienvenida automático.
- **Cuenta:** registro con validación y errores siempre en español, configuración inicial guiada en 5 pasos (con resumen editable), tarjeta "Primeros pasos", recuperación de contraseña por email (pantalla dividida con los tres pasos a la vista, y un mail con la misma identidad visual) y "Mi cuenta": nombre, contraseña de al menos 8 caracteres, cierre de sesión en todos los dispositivos, tema claro/oscuro, preferencias de avisos, **descarga de todos tus datos** en un archivo y **borrado de tus ofertas y postulaciones** (escribiendo BORRAR para confirmar).

Para el equipo de Bitácora (rol administrador, ampliación acordada con la docente el 08/10/2026):

- **Candidatos:** listado con buscador de las personas que completaron su perfil de búsqueda, y un detalle con el botón "Enviar mensaje" y el historial de lo enviado. El administrador ve solo el nombre y el perfil de búsqueda (rol, tecnologías, modalidad, ubicación y nivel): nunca las ofertas, postulaciones, interacciones, recordatorios ni el email de nadie. Al iniciar sesión cae directo en Candidatos, y una persona que no es administradora no puede entrar a esa pantalla ni por URL.

Las URLs anteriores (`/tablero`, `/analytics`, `/configuracion`) redirigen a `/mis-postulaciones`, `/mi-progreso` y `/mi-perfil`. Los datos de cada usuario quedan aislados con RLS; la sección de seguridad de la Memoria Técnica describe el modelo de acceso y el aviso de privacidad que ve cada persona.

## Nombre de la marca

El nombre de la aplicación y la frase que dice qué hace viven en un solo archivo, [`src/lib/marca.json`](src/lib/marca.json). La aplicación, los tests y los scripts de documentación (`docs/scripts`) lo leen de ahí: un test falla si alguien escribe el nombre a mano en el código. Para cambiarlo: editar ese archivo, correr `npm run docs:plantillas` (regenera el mail de recuperación) y `npm run docs:generar` (los documentos). El nombre del repositorio, el dominio y todo lo de Supabase **no** dependen de este archivo.

## Stack

React 19 · TypeScript 5.8 · Vite 6 · Tailwind CSS 4 · React Router 7 · Recharts · Supabase (Auth, PostgreSQL y RLS) · Vercel · Vitest 4 · Playwright 1.63

## Correr localmente

Requisitos: Node.js y un proyecto de Supabase propio. Se probó únicamente con Node.js 25; las dependencias declaran como mínimo Node.js 22.

1. `npm install`
2. Crear un archivo `.env` en la raíz (no se versiona) con dos variables, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, con los valores de Project Settings → API del proyecto de Supabase. Se usa solo la clave pública (anon): los datos los protege RLS, y nunca hay que poner una service role key.
3. Aplicar las migraciones (ver la sección siguiente).
4. `npm run dev` y abrir http://localhost:3000

Si el proyecto de Supabase exige confirmar el email al registrarse, hay que confirmar la cuenta antes de poder ingresar (o desactivar esa opción en Authentication → Providers → Email).

### Recuperación de contraseña (configuración en Supabase)

La pantalla "¿Olvidaste tu contraseña?" envía el enlace con `resetPasswordForEmail`. Para que funcione hay que configurar en el panel de Supabase:

- **Authentication → URL Configuration:** la *Site URL* (la URL de producción) y, en *Redirect URLs*, la ruta `/nueva-contrasena` de cada entorno (por ejemplo `https://TU-DOMINIO/**` y `http://localhost:3000/**`). Si la URL no está en la lista, Supabase rechaza el pedido.
- **Authentication → Email Templates → Reset Password:** conviene traducir el asunto y el cuerpo, conservando `{{ .ConfirmationURL }}`.
- **Correo:** el servicio por defecto de Supabase solo envía a miembros de la organización del proyecto, con un tope de 2 mensajes por hora y una espera de 60 segundos por usuario, y no es para producción. Para personas reales hace falta un SMTP propio (Authentication → SMTP Settings).

## Base de datos

El esquema está en [`supabase/migrations/`](supabase/migrations/): tablas, políticas RLS, perfil de usuario, recordatorios, historial de estados, el umbral de inactividad y, desde la ampliación del 08/10/2026, roles, la vista `candidatos`, los mensajes y el trigger de bienvenida. Hay que aplicar los archivos **en orden de nombre** (es el orden cronológico) en un proyecto de Supabase propio, por ejemplo pegándolos de a uno en el SQL Editor.

El rol de administrador **no se puede obtener desde la aplicación**: se asigna a mano, en el SQL Editor, a una cuenta ya registrada:

```sql
insert into public.roles_usuario (user_id, rol)
select id, 'administrador' from auth.users where email = 'EMAIL_DE_LA_CUENTA'
on conflict (user_id) do update set rol = 'administrador';
```

## Tests

| Comando | Qué corre |
|---|---|
| `npm run test` | **Vitest:** 393 tests unitarios (39 archivos) de la lógica pura: scoring, recordatorios, el aviso de actividad y sus umbrales, las tendencias de Mi progreso, la pregunta de postulación, la exportación de datos y las preferencias, métricas, paginación y lotes, importación, tags, utilidades, validaciones y errores de autenticación, validaciones del onboarding, roles, candidatos, mensajes y plantillas, ubicaciones, requisitos de contraseña, la plantilla del mail de recuperación y las cabeceras de seguridad de `vercel.json`. No toca la base. |
| `npm run test:e2e` | **Playwright** (Chromium) en desktop (1280x800) y mobile (375x812): 196 tests en total. Son 2 de preparación de sesión, 103 en desktop y 91 en mobile. De los de desktop, 13 son las pruebas adversariales de seguridad contra la base, que hablan directo con la API (sin navegador) y por eso corren una sola vez. Además hay pruebas de inyección de código (XSS), de accesibilidad (axe-core, WCAG A y AA, en tema claro y oscuro), de que ninguna pantalla se salga del ancho de un celular, de movimiento reducido, de legibilidad de Mi perfil de búsqueda (sin texto menor a 14 px) y de la identidad visual de cada pantalla. El test del teclado virtual solo corre en mobile. |

Para los E2E: `npx playwright install chromium` y crear un archivo `.env.e2e` (no se versiona) con las variables que lista [`e2e/README.md`](e2e/README.md). Corren contra la base configurada en `.env`, **crean cuentas de prueba** por el flujo de registro de la app y **borran sus datos al terminar** (los usuarios de Auth quedan). Las pruebas de roles y mensajes necesitan además una cuenta de administrador de pruebas (`E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD`), registrada desde la app y con el rol asignado una sola vez con el SQL de arriba; los tests solo inician sesión con ella. Conviene usar un proyecto de desarrollo, no uno con datos reales. Más detalle y zonas ciegas en [`e2e/README.md`](e2e/README.md).

## Documentación

- `Bitacora-Memoria-Tecnica.docx` y `Bitacora-Manual-de-Usuario.docx` (en la raíz del repo), con una versión en PDF de cada uno (`.pdf`, en la misma carpeta). El documento de referencia es el `.docx`: el PDF se genera sin Word, con el mismo contenido y un diseño aproximado (por ejemplo, el índice no lleva números de página).
- [`docs/guia-supabase.md`](docs/guia-supabase.md): lo que hay que configurar en el panel de Supabase (correo propio, direcciones permitidas, plantilla del mail; la plantilla está en [`docs/plantillas-email/`](docs/plantillas-email/) y hay que pegarla de nuevo en el panel cada vez que cambia). [`docs/guia-demo.md`](docs/guia-demo.md): guion de la demostración; `npm run demo:datos` arma la cuenta DEMO (el recorrido de alguien que usa la app hace ocho semanas, con todos los casos de uso) y dos candidatos más, y `npm run demo:borrar` los borra. Se puede correr las veces que haga falta: reinicia la cuenta DEMO con fechas actuales.
- [`docs/srs.md`](docs/srs.md): especificación de requerimientos. [`legacy/jobbot-v5.gs`](legacy/jobbot-v5.gs): el script que fue el antecedente funcional.
- Para regenerar los documentos: `npm run docs:generar` (los dos `.docx`) y `npm run docs:pdf` (los dos PDF). `npm run docs:capturas` rehace todas las capturas con cuentas de prueba de nombres ficticios (con la app corriendo y las variables `E2E_ADMIN_*` en `.env.e2e`), y `npm run docs:der` rehace el diagrama entidad-relación. Scripts y capturas en [`docs/scripts/`](docs/scripts/).

## Estructura

```
src/
  components/   UI reutilizable y de layout (AppLayout, Sidebar, Topbar, auth/, publica/ con la página de inicio y los marcos de acceso)
  features/     flujos multi-paso con estado propio (onboarding)
  pages/        una vista por ruta (Login, Recuperar y Nueva contraseña, Offers, Tablero, Settings,
                Analytics, Mensajes, Candidatos, CandidatoDetalle, Onboarding)
  hooks/        useAuth, useRol, useOnboarding, useTheme, useMensajesNoLeidos, useActividad
  services/     única capa que habla con Supabase, un archivo por entidad
  lib/          utilidades puras y el cliente de Supabase
  types/        interfaces TypeScript compartidas
supabase/migrations/   esquema, RLS, roles y mensajes
e2e/                   suite de Playwright
docs/                  SRS y scripts de generación de los documentos
```

## Alcance y limitaciones

El foco de esta entrega es el motor de scoring configurable y el seguimiento de cada postulación, más la ampliación acordada con la docente el 08/10/2026 (rol de administrador, Candidatos y Mensajes). **Quedan fuera del alcance de esta entrega:** la notificación por email (el aviso de actividad es solo dentro de la aplicación), la importación periódica automática (hoy la importación se dispara a mano con un botón), cinco de las siete fuentes del antecedente (solo están Remotive y Arbeitnow), la categorización de rol y las reglas fijas de scoring del script anterior: el puntaje depende solo de los criterios que configura cada usuario. Además: el rol de administrador se asigna por SQL (no hay pantalla para gestionarlo), los mensajes son de una sola vía y sin actualización en vivo, la recuperación de contraseña depende del correo configurado en Supabase, la pregunta «¿Ya te postulaste?» y las preferencias de avisos se guardan en el navegador de cada persona (no se sincronizan entre dispositivos), el recálculo de scores es lento con más de mil ofertas y la interfaz no se probó en un celular real ni en navegadores distintos de Chromium. El detalle y la comparación punto por punto con la especificación están en las Secciones 9 y 10 de la Memoria Técnica.

## Autor

Agustín Elisey. Docente: Viviana Esterkin. Práctica Profesional Supervisada, Tecnicatura Universitaria en Tecnologías Web, Universidad Nacional del Oeste. Segundo cuatrimestre de 2026.
