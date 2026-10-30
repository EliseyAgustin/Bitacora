# Especificación de Requerimientos (SRS) — Laburin

**PPS:** Plataforma Web de Búsqueda y Seguimiento Laboral Automatizada con Motor de Scoring
**Universidad:** Universidad Nacional del Oeste — Escuela de Ciencias Tecnológicas
**Carrera:** Tecnicatura Universitaria en Tecnologías Web
**Cuatrimestre:** Segundo Cuatrimestre 2026
**Autor:** Agustín Elisey — **Docente:** Viviana Esterkin
**Semana:** 1 — Relevamiento y Especificación de Requerimientos
**Estado:** Borrador para revisión

---

## 1. Contexto y objetivo de este documento

Laburin evoluciona un antecedente funcional real: [`jobbot-v5.gs`](../legacy/jobbot-v5.gs), un script en Google Apps Script que Agustín usa para su propia búsqueda laboral. El v5.0 busca ofertas en 7 fuentes, las puntúa con un motor de scoring hardcodeado y manda un mail diario con un link a una planilla de Google Sheets. No tiene modelo relacional, no permite editar reglas sin tocar código, y no hace seguimiento del ciclo de vida de una postulación después de que aparece en la planilla.

Este documento formaliza las reglas de negocio reales extraídas del v5.0 y las traduce a los requerimientos funcionales de Laburin, dentro del alcance ya aprobado en la propuesta de PPS.

## 2. Glosario de entidades

| Entidad | Definición |
|---|---|
| **Oferta** | Un puesto de trabajo encontrado por el motor de búsqueda en alguna de las 7 fuentes. Tiene un score calculado, es efímera (vence a las 72hs, igual que en v5.0) y no requiere acción del usuario hasta que decide trackearla. |
| **Postulación** | Una Oferta que el usuario decidió seguir. Vive en el Tablero Kanban con un estado (Por aplicar → Aplicado → En proceso → Entrevista → Oferta / Rechazado) y tiene su propia Ficha. **No existía en el v5.0** — es la capa nueva que agrega Laburin. |
| **Interacción** | Un evento registrado dentro de la Ficha de una Postulación: llamado, entrevista, mail enviado, nota. |
| **Criterio de Scoring** | Un parámetro configurable del motor de puntuación (stack, modalidad, ubicación). Editable desde la UI sin tocar código. |
| **Regla fija de Scoring** | Componente del cálculo de puntaje heredado tal cual del v5.0 (recencia, seniority, exclusiones, idioma, salario) que **no** se expone como configuración de usuario en esta PPS. |
| **Perfil** | El registro de usuario (Supabase Auth) al que pertenecen sus Ofertas, Postulaciones y configuración de scoring. |

## 3. Análisis del antecedente (script v5.0)

### 3.1 Resumen funcional

El v5.0 corre una vez al día (trigger 8 AM), consulta 7 fuentes en paralelo, categoriza y filtra los resultados, calcula un score por oferta, escribe todo en una Google Sheet con codificación de colores y manda un resumen HTML por mail. Si encuentra menos de 10 ofertas, agrega links de búsqueda manual como fallback. Tiene manejo de timeout (280s) con guardado parcial en caché para no perder resultados si se corta a mitad de camino.

### 3.2 Fuentes de datos

| # | Fuente | Tipo | Auth | Notas de fragilidad |
|---|---|---|---|---|
| 1 | LinkedIn Guest API | Parseo de HTML de un endpoint público (`jobs-guest/.../seeMoreJobPostings`) | No | La más frágil: no es JSON, se parsea con regex sobre `<li>`. Cualquier cambio de markup de LinkedIn la rompe. Debe aislarse para que su falla no tumbe las demás fuentes. |
| 2 | Indeed Argentina | RSS/XML estándar | No | Estable, formato RSS documentado. |
| 3 | GetOnBrd | REST JSON | No | Nativo LATAM, filtra por país. |
| 4 | Vacantes Digitales | REST JSON | No | LATAM tech. |
| 5 | Himalayas | REST JSON | No | Remote jobs, filtra `locationRestrictions`. |
| 6 | Remotive | REST JSON | No | Remote jobs, excluye ofertas "USA only" / "UK only" / etc. |
| 7 | RemoteOK | REST JSON | No | Remote jobs global, mismo filtro de exclusión geográfica. |

### 3.3 Reglas de categorización

Cada oferta se clasifica en una de 4 categorías por matching de keywords en título (y a veces descripción): `QA`, `DATA_ENTRY`, `ADMIN`, `DATA_ANALYST`. Si no matchea ninguna, se descarta (`categorize()` devuelve `null`). Estas categorías están hardcodeadas y ligadas al perfil personal de Agustín (QA / Data Entry / Admin / Data Analyst Jr).

### 3.4 Reglas de filtrado

- **Exclusión dura**: título contiene keywords de seniority alto (`senior`, `lead`, `manager`, `+5 años`, etc.) → se descarta.
- **Soft-exclude**: keywords como `mid-senior`, `ssr`, `+3 años`, `kubernetes` → no se descarta, pero resta puntos.
- **Vencimiento**: ofertas con más de 72hs (`MAX_AGE_HOURS`) se descartan.
- **Deduplicación**: por clave `título+empresa` normalizada y por link (sin query params).
- **Mínimo/máximo**: si quedan menos de 10 ofertas después de filtrar, se agregan 15 links de búsqueda manual como fallback; el resultado se trunca a 60 ofertas máximo.

### 3.5 Motor de scoring (fórmula completa del v5.0)

Score base 50, clamp final a [0, 100]. Componentes:

| Componente | Efecto |
|---|---|
| Boost keywords (junior, sql, remoto, part-time, argentina, etc.) | +2 c/u |
| Categoría | QA +12, Data Analyst +10, Data Entry +8, Admin +5 |
| Ubicación | Zona Oeste/Castelar +25, Buenos Aires +15, Argentina +12, otro país LATAM +8, mención "LATAM" +10 |
| Modalidad | Remoto +10, Híbrido +5, Presencial sin ser zona oeste −5 |
| Part-time / freelance / por hora | +8 |
| Stack técnico | SQL+QA/test/dato +8, Snowflake +8, validación de datos +8, Excel/Sheets +4, Selenium/Cypress +5, e-commerce +5 |
| Seniority | Junior/Jr +12, Trainee/Pasante +10, sin marca de seniority +3 |
| Recencia | <3h +20, <6h +15, <12h +10, <24h +6, <36h +2, más viejo −5 |
| Idioma español (tildes/ñ/¿¡) | +5 |
| Salario en USD | +8 |
| No remunerado / ad honorem | −15 |
| Soft-exclude keywords | −4 c/u |
| Stack no deseado (kubernetes, terraform, ML, etc.) | −5 c/u |

### 3.6 Limitaciones identificadas (motivan el diseño de Laburin)

1. Todo hardcodeado en `CONFIG` — cambiar una keyword o un peso requiere editar y redeployar el script.
2. Perfil de categorías fijo a una sola persona (Agustín) — no hay concepto de multi-usuario.
3. Sin persistencia relacional: cada corrida sobreescribe la planilla del día, no hay histórico ni relación entre "la misma oferta vista dos días distintos".
4. Sin seguimiento posterior: una vez que la oferta aparece en el mail, el script no sabe si el usuario aplicó, fue rechazado, etc.
5. Salida pasiva (mail + planilla): no hay tablero interactivo ni alertas activas por inactividad.

## 4. Requerimientos funcionales por módulo

### 4.1 Módulo Ofertas y Scoring

- **RF-01**: El sistema debe consultar las 7 fuentes del v5.0 (LinkedIn, Indeed AR, GetOnBrd, Vacantes Digitales, Himalayas, Remotive, RemoteOK) de forma automatizada y periódica.
- **RF-02**: Cada fuente debe ejecutarse de forma aislada (try/catch por fuente) para que la falla de una — especialmente LinkedIn, la más frágil — no impida procesar las demás.
- **RF-03**: El sistema debe categorizar cada oferta encontrada usando las reglas de keywords del v5.0 (§3.3).
- **RF-04**: El sistema debe filtrar duplicados (por título+empresa y por link) y ofertas con más de 72hs de antigüedad.
- **RF-05**: El sistema debe calcular un score 0–100 por oferta combinando los 3 criterios configurables por el usuario (§4.3) con las reglas fijas heredadas del v5.0 (§3.5, excepto ubicación/modalidad/stack que pasan a ser configurables).
- **RF-06**: El usuario debe poder dar de alta una oferta manualmente o importarla (import básico) además de las encontradas automáticamente.
- **RF-07**: El usuario debe poder ver el listado de Ofertas ordenado por score.

### 4.2 Módulo Tablero & Ficha

- **RF-08**: El usuario debe poder convertir una Oferta en Postulación (pasa a vivir en el tablero).
- **RF-09**: El tablero debe mostrar las Postulaciones organizadas en columnas por estado: *Por aplicar, Aplicado, En proceso, Entrevista, Oferta, Rechazado*.
- **RF-10**: El usuario debe poder mover una Postulación entre estados con drag-and-drop.
- **RF-11**: Cada Postulación debe tener una Ficha con historial de Interacciones (llamados, entrevistas, notas, mails) con fecha.

### 4.3 Módulo de Configuración

- **RF-12**: El usuario debe poder editar, sin tocar código, los pesos y reglas de 3 criterios de scoring: **stack** (tecnologías/keywords), **modalidad** (remoto/híbrido/presencial) y **ubicación** (zonas/países con su bonus).
- **RF-13**: Las demás reglas del motor heredadas del v5.0 (recencia, seniority, exclusiones duras/soft, idioma, salario) quedan fijas en el motor — no se exponen en esta UI de configuración (ver §7 para la justificación de este recorte de alcance).
- **RF-14**: El usuario debe poder configurar el umbral de días de inactividad ($N$) que dispara un recordatorio (equivalente configurable de lo que en v5.0 era una constante).

### 4.4 Módulo de Notificaciones

- **RF-15**: El sistema debe generar un recordatorio cuando una Postulación lleva más de $N$ días sin una Interacción nueva registrada (N configurable, RF-14).
- **RF-16**: El sistema debe poder notificar por email (vía Supabase Edge Functions / SMTP), continuando el patrón de "resumen diario por mail" que ya tenía el v5.0.

### 4.5 Módulo Analytics

- **RF-17**: El sistema debe mostrar un panel con indicadores operativos: tasa de respuesta, cantidad de postulaciones activas por estado, tiempo promedio en cada etapa del Kanban.

## 5. Requerimientos no funcionales

- **RNF-01 (Resiliencia por fuente)**: La falla de una fuente de datos (en especial LinkedIn, que depende de parseo de HTML no oficial) no debe interrumpir el resto del pipeline de búsqueda, replicando el patrón `try/catch` por fuente del v5.0.
- **RNF-02 (Modelo preparado para multi-usuario, sin construir la función)**: Todas las tablas relacionadas a datos de usuario (Ofertas, Postulaciones, configuración de scoring, Interacciones) deben incluir `user_id` desde el diseño inicial del esquema, con Row Level Security (RLS) de Supabase activado por tabla. **Esto es una decisión de modelo de datos, no un requerimiento funcional de esta PPS**: no se construyen pantallas de registro público ni onboarding genérico durante estas 16 semanas; el sistema se usa y evalúa con el perfil de Agustín. Ver §7.3.
- **RNF-03 (Autenticación)**: Acceso a la aplicación vía Supabase Auth (ya definido en el stack de la propuesta).
- **RNF-04 (Persistencia relacional)**: Reemplazo de la planilla de Google Sheets por PostgreSQL gestionado (Supabase), con relación real entre Oferta y Postulación (una Postulación referencia la Oferta de la que se originó).
- **RNF-05 (Ejecución periódica)**: La búsqueda automatizada en las 7 fuentes corre en un job programado (Supabase Edge Function + cron), no bajo demanda del usuario en cada carga de página.

## 6. Tabla de decisión: qué se porta, qué se configura, qué se fija

| Regla del v5.0 | En Laburin |
|---|---|
| 7 fuentes de búsqueda | Se portan las 7, automatizadas vía Edge Function + cron |
| Categorías QA/Data Entry/Admin/Data Analyst | Se portan como taxonomía fija (no editable en esta PPS) |
| Exclusión dura / soft-exclude por keyword | Se porta como regla fija del motor |
| Boost keywords genéricas | Se porta como regla fija del motor |
| Peso por categoría | Se porta como regla fija del motor |
| **Ubicación** (zona oeste, Argentina, LATAM) | **Configurable por el usuario** (RF-12) |
| **Modalidad** (remoto/híbrido/presencial) | **Configurable por el usuario** (RF-12) |
| **Stack técnico** (SQL, Selenium, etc.) | **Configurable por el usuario** (RF-12) |
| Seniority (junior/trainee) | Se porta como regla fija del motor |
| Recencia | Se porta como regla fija del motor |
| Idioma español | Se porta como regla fija del motor |
| Salario en USD | Se porta como regla fija del motor |
| Vencimiento 72hs | Se porta como regla fija del motor |
| Umbral de inactividad ($N$ días) | **Configurable por el usuario** (RF-14) — en v5.0 no existía este concepto, es nuevo de Laburin |
| Salida: planilla + mail diario | Se reemplaza por Tablero interactivo + Analytics; el mail se conserva como notificación (RF-16) |
| Seguimiento post-hallazgo de la oferta | **No existía en v5.0** — es el módulo completamente nuevo de Postulaciones/Tablero/Ficha |

## 7. Decisiones de alcance de esta semana (y su relación con la propuesta aprobada)

### 7.1 Automatización completa de las 7 fuentes

El cronograma de la propuesta (Semana 4) menciona "carga manual e importación básica" para el Módulo de Ofertas. Se decidió ampliar esto a la automatización completa de las 7 fuentes del v5.0 vía Edge Function con cron, porque es el corazón del valor del antecedente funcional y el "motor de scoring configurable" (Objetivo General) pierde sentido si las ofertas hay que cargarlas a mano. La carga manual/import básico (RF-06) se mantiene como *complemento*, no como reemplazo. **Nota para seguimiento con la cátedra**: esto amplía el detalle literal de la Semana 4 del cronograma original; el objetivo general y el alcance (§3 de la propuesta) siguen cumpliéndose sin cambios.

### 7.2 Scoring configurable acotado a 3 criterios

Fiel al Objetivo Específico 1 de la propuesta ("stack, modalidad, ubicación"), solo esos 3 criterios son editables desde la UI. El resto de las ~10 dimensiones del scoring del v5.0 (seniority, recencia, exclusiones, idioma, salario) se portan como reglas fijas del motor, sin exponerse a configuración. Esto mantiene el alcance dentro de lo ya aprobado y evita sobre-construir una UI de configuración genérica no pedida.

### 7.3 Multi-usuario: modelo preparado, funcionalidad no construida

El esquema de base de datos se diseña con `user_id` y RLS desde el Modelado (Semana 2), de forma que agregar registro público más adelante sea una extensión y no una migración. Pero durante esta PPS **no se construyen** pantallas de registro público, onboarding genérico, ni gestión de categorías por usuario arbitrario — el sistema se sigue evaluando con el perfil único de Agustín, en línea con el alcance ya aprobado por la cátedra.

## 8. Fuera de alcance (reafirmado de la propuesta, §3.2)

- Bolsa de empleo pública para terceros o redes sociales profesionales.
- Portales para publicación directa de empresas o gestión de RRHH/contratos.
- Automatización de envío masivo/autónomo de currículums (aplicaciones automáticas externas).
- Registro público y onboarding multi-usuario como funcionalidad construida en esta PPS (ver §7.3 — el modelo de datos queda preparado, la función no).

## 9. Próximos pasos

Semana 2 (Modelado): diseñar el DER sobre las entidades de §2 — `usuarios`, `ofertas`, `postulaciones`, `interacciones`, `criterios_scoring` — con las relaciones y RLS descriptas en RNF-02 y §7.3, e implementarlo en Supabase.

## 10. Ampliaciones posteriores: rediseño de la interfaz (octubre de 2026)

Después de la demostración del 29/10/2026 la docente pidió una interfaz más clara y motivadora. Los cambios se hicieron **solo sobre la interfaz**: no tocan el motor de scoring, la lógica de recordatorios, las reglas de acceso (RLS) ni el esquema de la base. Los requerimientos de esta sección son nuevos y no estaban en la especificación original.

### 10.1 Requerimientos funcionales

- **RF-18 (Estados explicados)**: cada columna del tablero debe indicar con una frase qué significa (por ejemplo, «Por aplicar»: las guardaste, todavía no te postulaste) y distinguirse por un color de etapa propio, que se repite en la ficha, el embudo y las tarjetas.
- **RF-19 (Confirmar la postulación)**: al abrir el enlace de una oferta para postularse en el sitio de origen, el sistema debe recordarlo y, al volver, preguntar «¿Ya te postulaste?»: con «Sí, ya apliqué» la postulación queda en *Aplicado*; con «Todavía no» no se guarda nada y se vuelve a preguntar al día siguiente. Laburín no puede saber lo que ocurre en el sitio de la empresa: la pregunta evita que la persona tenga que acordarse de marcarla.
- **RF-20 (Aviso de actividad)**: el sistema debe avisar con buen tono, dentro de la aplicación, en solo dos casos: cuando pasan 10 días sin actividad y cuando una semana tuvo la mitad o menos de movimientos que la anterior, siempre que la anterior haya tenido al menos 4 (con menos no hay base para comparar). Un *movimiento* es una postulación creada, una interacción registrada o un cambio de estado real. No hay felicitaciones ni indicador en el menú. El aviso se calcula en el navegador con datos que ya existen, solo al abrir Mis postulaciones y Mi progreso; se puede cerrar (reaparece a los 3 días) y se puede apagar. La docente lo propuso y dejó a criterio del autor qué parte conservar: se evaluó y se dejó la versión intermedia (Sección 5.17 de la Memoria). No hay notificación por email (RF-16 sigue fuera del alcance).
- **RF-21 (Mi progreso legible)**: cada indicador de RF-17 debe tener un nombre que diga qué mide, una ayuda que lo explique y su tendencia contra la semana anterior (las fórmulas no cambian).
- **RF-22 (Mi cuenta completa)**: la persona debe poder cambiar su nombre y su contraseña, cerrar sesión en todos los dispositivos, elegir el tema, apagar los avisos de RF-19 y RF-20, **descargar todos sus datos** en un archivo y **borrar sus ofertas y postulaciones** con una confirmación explícita.
- **RF-23 (Mensajes de la demo coherentes)**: los mensajes de la cuenta de demostración deben fecharse después del mensaje de bienvenida y no repetirlo.

### 10.2 Requerimientos no funcionales

- **RNF-06 (Identidad visual única)**: la aplicación, el Login, el Registro, las pantallas de recuperación de contraseña y el mail de recuperación comparten una paleta (azul, naranja, salvia, azul noche y el amarillo del botón principal), una sola tipografía servida desde la propia aplicación y la mascota como elemento de marca. Cada pantalla abre con un capítulo de color.
- **RNF-07 (Accesibilidad)**: contraste AA en modo claro y oscuro, foco visible, uso completo con teclado, objetivos táctiles de al menos 44 px, nada de texto menor a 14 px y ninguna animación con «reducir movimiento» activado (verificado con pruebas automáticas de axe-core, de ancho de pantalla y de movimiento).
- **RNF-08 (Seguridad de la presentación)**: la tipografía y los recursos se sirven desde el mismo origen, sin fuentes ni imágenes externas, para no ampliar la política de contenido (`vercel.json`); la plantilla del mail no usa imágenes externas.

### 10.3 Límites declarados

Las preferencias de avisos y la pregunta pendiente de RF-19 se guardan en el navegador de cada persona (no se sincronizan entre dispositivos, porque guardarlas en la cuenta exigiría una tabla nueva); el mail de recuperación depende de la plantilla pegada en el panel de Supabase; y el mail no lleva la mascota, porque los clientes de correo bloquean las imágenes externas.
