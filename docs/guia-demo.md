# Guion de la demostración (5 a 7 minutos)

Un recorrido pensado para mostrarle Laburin a la docente de principio a fin, con lo que conviene decir en cada paso y qué debería verse. Los datos de ejemplo son ficticios.

## Antes de empezar (10 minutos antes)
- [ ] **Producción al día:** https://laburin.vercel.app abre y el último commit está desplegado.
- [ ] **Supabase configurado** según [`guia-supabase.md`](guia-supabase.md): sobre todo el correo propio, para que la recuperación de contraseña funcione con el email de quien la pruebe.
- [ ] **Datos de ejemplo:** `npm run demo:datos` crea tres candidatos ficticios (Camila, Tomás y Lucía Ejemplo) y deja a Camila con ofertas, postulaciones y un recordatorio. Necesita `DEMO_EMAIL` y `DEMO_PASSWORD` en `.env.e2e`. Al terminar: `npm run demo:borrar`.
- [ ] **Dos ventanas listas:** una con la cuenta de candidato (Camila) y otra con la de administrador, ya con la sesión iniciada. Una más en un celular o en el modo móvil del navegador.
- [ ] **Plan B si falla internet:** el [Manual de Usuario](../Laburin-Manual-de-Usuario.pdf) y las capturas de [`docs/scripts/capturas/`](scripts/capturas/).

## El recorrido

### 1. El problema (30 s)
> "Buscar trabajo suele terminar en pestañas sueltas y planillas. Laburin junta las ofertas en un lugar, calcula qué tan bien encaja cada una con tu perfil y te ayuda a seguir cada postulación. Además hay un lado de administración que recibe lo que cargan quienes se registran y puede escribirles."

### 2. Una persona nueva se registra (1 min)
- Pantalla de registro → escribir un email **sin arroba** y una contraseña corta → mostrar los **errores en español junto a cada campo**. Elegir una contraseña fuerte y ver el medidor.
- **Configuración inicial en 5 pasos** (de a una pregunta, con "Continuar"): nombre y rol, tecnologías (la lista con ✕; escribir "sql" sin apretar Agregar y ver que no se pierde), modalidad y ubicación, nivel y **resumen editable**.
- Señalar el **aviso de privacidad** del primer paso y la frase del resumen: *"Podés cambiarlos cuando quieras en Mi perfil de búsqueda"*. Terminar: "Tu perfil quedó listo".

### 3. Ofertas y puntaje (1 min 30 s)
- **Ofertas**: la línea de ayuda bajo el título y la tarjeta **Primeros pasos**. *Importar ofertas remotas*.
- Cada oferta trae un **puntaje** según el perfil. Filtrar: **Ubicación** (las sugerencias son las que existen en las ofertas) y **Puntaje mínimo** (el control llega hasta el máximo posible del perfil). Probar un filtro que no devuelve nada y mostrar el mensaje que sugiere aflojarlo.
- **Postularme** en una oferta.

### 4. Seguimiento (1 min)
- **Mis postulaciones**: las seis columnas. Arrastrar una tarjeta (en el celular, el selector "Mover a…").
- Abrir la **ficha**: la línea de tiempo de interacciones. Mostrar el **recordatorio** "Sin novedades hace N días" y aclarar: *"es solo un aviso, no se borra nada"*.
- **Mi perfil de búsqueda**: cambiar el peso de una tecnología y volver a Ofertas: los puntajes se recalcularon solos. Mostrar los **Avisos de seguimiento** (los días del recordatorio).
- **Mi progreso**: el embudo y las métricas.

### 5. El lado del administrador (1 min 30 s)
- En la otra ventana: iniciar sesión como administrador → **cae directo en Candidatos**. Buscar por nombre, rol o tecnología.
- Abrir un candidato: ve **solo su perfil de búsqueda** (nunca ofertas, postulaciones ni email).
- **Enviar mensaje** con una plantilla (por ejemplo "Falta un dato", completando lo que está entre corchetes).
- Volver al candidato: el menú muestra el **contador de mensajes sin leer**. Abrir **Mensajes**, leer la bienvenida y el mensaje nuevo, **marcar como leído**.

### 6. Si hay tiempo
- **¿Olvidaste tu contraseña?**: los tres pasos, el mail en español que llega de verdad y la pantalla de nueva contraseña.
- La aplicación en el **celular**: se acomoda sin recortes ni scroll lateral.
- Un candidato **no puede entrar a Candidatos ni escribiendo la dirección**.

## Preguntas que pueden surgir
| Pregunta | Respuesta corta |
|---|---|
| ¿Cómo se hace administrador alguien? | No se puede desde la aplicación: se asigna a mano en la base de datos, a una cuenta que ya existe. |
| ¿Qué ve exactamente el administrador? | Nombre, rol buscado, tecnologías, modalidad, ubicación y nivel. Nada de ofertas, postulaciones, interacciones, recordatorios ni email. Lo garantiza la base de datos, no solo la pantalla. |
| ¿Es segura? | Cada persona solo accede a lo suyo (reglas de acceso por fila en la base), el rol no se puede escalar, hay cabeceras de seguridad y una política de contenido, y se probó con ataques simulados: 13 pruebas contra la base real, más pruebas de inyección de código y de accesibilidad. |
| ¿Qué pasa si alguien olvida su contraseña? | Pide un enlace por email, con un mensaje neutro que no revela si la cuenta existe; el enlace se usa una sola vez. |
| ¿Qué quedó afuera? | Está declarado en la Memoria (Sección 9): importación periódica automática, más fuentes de ofertas, notificaciones por email, y que el candidato responda los mensajes. |
| ¿Cómo se probó? | Pruebas unitarias, y de punta a punta en escritorio y celular contra la base real, sin service role key. |
