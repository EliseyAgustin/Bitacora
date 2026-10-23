import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  ImageRun, LevelFormat, TableOfContents, PageBreak, BorderStyle,
} from 'docx';
import fs from 'node:fs';
import path from 'node:path';

// Rutas relativas a este archivo: se puede correr desde cualquier carpeta (npm run docs:generar).
// Las capturas se hacen con cuentas de prueba de nombres ficticios (npm run docs:capturas): no hay datos reales.
const AQUI = import.meta.dirname;
const RAIZ = path.resolve(AQUI, '../..');
const SHOTS = path.join(AQUI, 'capturas');
const img = (name) => fs.readFileSync(path.join(SHOTS, name));

// --- helpers ---
const h1 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } });
const h2 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 140 } });
const p = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, ...opts })],
  spacing: { after: 160 },
});
const bullet = (text) => new Paragraph({
  children: [new TextRun(text)],
  numbering: { reference: 'bullets', level: 0 },
  spacing: { after: 80 },
});
const numberedStep = (text) => new Paragraph({
  children: [new TextRun(text)],
  numbering: { reference: 'pasos', level: 0 },
  spacing: { after: 80 },
});

function figure(name, { width, height, caption }) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 80 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
      children: [new ImageRun({ type: 'png', data: img(name), transformation: { width, height } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
      children: [new TextRun({ text: caption, italics: true, size: 18, color: '555555' })],
    }),
  ];
}

const DESKTOP = { width: 600, height: 337 };      // capturas de 1600x900
const CENTRADA = { width: 330, height: 282 };     // recortes del onboarding (920x780)
const LISTO = { width: 380, height: 215 };        // recorte de la confirmación (920x520)
const MOBILE = { width: 230, height: 498 };       // 375x812

const doc = new Document({
  features: { updateFields: true },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
      {
        reference: 'pasos',
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    children: [
      // Portada
      new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Laburin', bold: true, size: 72, color: '1E4FD8' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 2000 }, children: [new TextRun({ text: 'Manual de Usuario', size: 36, color: '333333' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Organizá tu búsqueda laboral en un solo lugar', italics: true, size: 24, color: '666666' })] }),
      new Paragraph({ children: [new PageBreak()] }),

      // Indice
      new Paragraph({ text: 'Índice', heading: HeadingLevel.HEADING_1 }),
      new TableOfContents('Índice', { hyperlink: true, headingStyleRange: '1-2' }),
      new Paragraph({ children: [new PageBreak()] }),

      // 1. Qué es Laburin
      h1('1. Qué es Laburin'),
      p('Laburin es una aplicación web pensada para organizar tu búsqueda laboral en un solo lugar. En vez de tener las ofertas que te interesan dispersas en pestañas del navegador, planillas sueltas o notas, Laburin te permite guardar cada oferta, hacerle seguimiento a tu postulación paso a paso, y calcular automáticamente qué tan bien encaja cada oferta con lo que buscás.'),
      p('Con Laburin podés:'),
      bullet('Guardar ofertas de trabajo que encontraste vos, o importar automáticamente ofertas publicadas en portales de empleo remoto.'),
      bullet('Ver de un vistazo qué tan afín es cada oferta a tu perfil, gracias a un puntaje que vos mismo podés ajustar.'),
      bullet('Seguir el estado de cada postulación en un tablero visual, desde "Por aplicar" hasta "Oferta" o "Rechazado".'),
      bullet('Registrar cada contacto con la empresa (mails, llamados, entrevistas) para no perder el hilo.'),
      bullet('Recibir un recordatorio cuando una postulación lleva mucho tiempo sin novedades. Es solo un aviso: no se borra nada.'),
      bullet('Ver cómo te va en toda tu búsqueda: cuántas postulaciones activas tenés, cómo avanzan y qué fuentes te traen mejores ofertas.'),
      bullet('Recibir mensajes del equipo de Laburin, por ejemplo cuando falta algún dato de tu perfil.'),
      p('Las pantallas principales son: Ofertas, Mis postulaciones, Mi progreso, Mi perfil de búsqueda y Mensajes. Cada una tiene, debajo del título, una línea que explica qué se hace ahí.'),

      h2('Ver Laburin con datos de ejemplo'),
      p('Si querés conocer la aplicación antes de cargar tus propios datos, el equipo de Laburin puede darte una cuenta de demostración. Es la de alguien que usa Laburin hace unas ocho semanas, con todo ya cargado: ofertas con distintos puntajes, postulaciones en todas las columnas del tablero, interacciones, dos recordatorios de «Sin novedades», un mensaje del equipo sin leer y los gráficos de Mi progreso completos. Los datos son ficticios. Nada de lo que hagas ahí afecta a otras cuentas.'),

      // 2. Registro, inicio de sesión y contraseña
      h1('2. Registro, inicio de sesión y contraseña'),
      p('Para usar Laburin necesitás una cuenta. Podés crear una con tu email y una contraseña.'),
      h2('Crear una cuenta'),
      p('En la pantalla de inicio, hacé clic en "¿No tenés cuenta? Registrate". Completá tu email y elegí una contraseña de al menos 8 caracteres.'),
      p('Mientras escribís la contraseña, vas a ver un indicador que te muestra qué tan segura es (débil, media o fuerte). Usar una contraseña fuerte, con mayúsculas, números y algún símbolo, ayuda a proteger tu cuenta. Podés tocar el ícono del ojo, al lado del campo, para mostrarla u ocultarla mientras la escribís.'),
      ...figure('02-registro.png', { width: 560, height: 450, caption: 'Pantalla de registro, con el indicador de fortaleza de la contraseña.' }),
      h2('Si algo está mal, te lo decimos en español'),
      p('Laburin revisa lo que escribís antes de enviarlo y te avisa junto al campo qué corregir: por ejemplo, "Escribí un email válido, por ejemplo nombre@correo.com" si falta la arroba, o "Escribí tu contraseña." si la dejaste vacía.'),
      p('Si el email y la contraseña no coinciden, el mensaje es "El email y la contraseña no coinciden. Revisalos o recuperá tu contraseña." Por seguridad, no te decimos cuál de los dos datos es el incorrecto. Si intentás registrarte con un email que ya tiene cuenta, te lo avisamos y te ofrecemos iniciar sesión o recuperar tu contraseña.'),
      ...figure('01-login-errores.png', { ...DESKTOP, caption: 'Los errores se explican junto a cada campo, siempre en español.' }),
      h2('Iniciar sesión'),
      p('Si ya tenés cuenta, ingresá tu email y contraseña y hacé clic en "Ingresar". Laburin recuerda tu sesión, así que no vas a tener que volver a loguearte cada vez que abras la aplicación en el mismo dispositivo.'),
      h2('Olvidé mi contraseña'),
      p('En la pantalla de inicio, tocá "¿Olvidaste tu contraseña?". Son tres pasos y la pantalla te muestra en cuál estás: pedí el enlace, revisá tu correo y elegí tu contraseña.'),
      p('Paso 1: escribí el email con el que te registraste y apretá "Enviar enlace". Si ya lo habías escrito en el inicio de sesión, aparece cargado.'),
      ...figure('02b-recuperar-contrasena.png', { ...DESKTOP, caption: 'Paso 1: pedir el enlace con tu email.' }),
      p('Paso 2: aparece "Revisá tu correo", con el mensaje "Si el email existe, te enviamos un enlace para cambiar tu contraseña" (es el mismo exista o no una cuenta con ese email) y el email al que lo pediste. Puede tardar unos minutos y, si no lo ves, mirá la carpeta de spam. El enlace vence al rato y solo se puede usar una vez. Podés pedir otro recién pasado un minuto (el botón muestra cuánto falta), o tocar "Usar otro email" si te equivocaste de dirección.'),
      ...figure('02c-recuperar-enviado.png', { ...DESKTOP, caption: 'Paso 2: revisá tu correo. Se puede reenviar pasado un minuto o probar con otro email.' }),
      p('Paso 3: el botón del mail te trae a Laburin para elegir tu contraseña nueva, escrita dos veces. Mientras la escribís, una lista de requisitos se va tildando: al menos 8 caracteres (obligatorio) y, como recomendación, mayúsculas y minúsculas, un número y un símbolo. Debajo está el mismo indicador de fortaleza que en el registro. Al guardar ves "Tu contraseña quedó actualizada" y seguís usando la aplicación.'),
      ...figure('02d-nueva-contrasena.png', { ...DESKTOP, caption: 'Paso 3: contraseña nueva, con los requisitos que se tildan en vivo.' }),
      p('Si el enlace venció o ya se usó, la pantalla te lo explica ("No pudimos validar el enlace") y te deja pedir uno nuevo.'),
      h2('Si la dirección no existe'),
      p('Si abrís una dirección que no existe (un enlace viejo o un error al escribirla), Laburin muestra "No encontramos esa página" y un botón que te lleva al inicio: a iniciar sesión si no tenías la sesión abierta, o a tu pantalla principal si la tenías.'),
      ...figure('14-no-encontrada.png', { width: 360, height: 210, caption: 'Página que se muestra cuando la dirección no existe.' }),

      // 3. Primeros pasos: configuración inicial
      h1('3. Configuración inicial de tu perfil'),
      p('La primera vez que entrás a Laburin, antes de ver tus ofertas, te hacemos algunas preguntas cortas sobre tu búsqueda, de a una por vez y con el botón "Continuar". Esto sirve para calcular, desde el primer momento, qué tan afín es cada oferta a lo que estás buscando. Arriba de cada paso ves en cuál estás ("Paso 2 de 5").'),
      numberedStep('Tu nombre y el rol que buscás (por ejemplo, "QA Automation" o "Frontend Developer"). Junto al nombre ves un aviso de qué datos puede ver el equipo de Laburin (ver la sección 11).'),
      numberedStep('Tecnologías: elegí las que te interesen, o escribí otras. Las que elegís se muestran en una lista, "Tus tecnologías", y cada una se quita con la ✕. Si escribiste una tecnología y te olvidaste de apretar "Agregar", la sumamos sola cuando tocás "Continuar". "SQL" y "sql" cuentan como la misma.'),
      numberedStep('Modalidad y ubicación: remoto, híbrido o presencial, y en qué ciudad o país buscás.'),
      numberedStep('Nivel de experiencia: junior, semi senior o senior. Este paso es opcional.'),
      numberedStep('Revisá tus datos: un resumen de todo lo que cargaste, que podés corregir ahí mismo antes de terminar.'),
      p('En cada paso, si falta un dato obligatorio, el mensaje aparece junto al campo (por ejemplo, "Elegí o escribí al menos una tecnología.") y no podés avanzar hasta completarlo.'),
      ...figure('03a-onboarding-rol.png', { ...CENTRADA, caption: 'Paso 1: tu nombre, el rol que buscás y el aviso de privacidad.' }),
      ...figure('03b-onboarding-stack.png', { ...CENTRADA, caption: 'Paso 2: tecnologías elegidas, con opción de quitar cada una.' }),
      ...figure('03c-onboarding-resumen.png', { width: 250, height: 512, caption: 'Paso 5: resumen editable. Dice dónde se guardan tus datos: podés cambiarlos cuando quieras en Mi perfil de búsqueda.' }),
      p('Al terminar ves una pantalla de confirmación, "Tu perfil quedó listo", y recibís un mensaje de bienvenida en la sección Mensajes. Cada respuesta se convierte en un criterio de afinidad: Laburin le suma puntos a las ofertas que mencionan tu rol, tus tecnologías, tu modalidad y tu ubicación. Más adelante, en Mi perfil de búsqueda, podés ajustar, agregar o quitar estos criterios cuando quieras.'),
      ...figure('03d-onboarding-listo.png', { ...LISTO, caption: 'Confirmación al terminar la configuración inicial.' }),
      p('Si no querés completar la configuración en este momento, podés tocar "Omitir por ahora". En ese caso Laburin te recuerda, en Ofertas y en "Primeros pasos", que todavía no armaste tu perfil de búsqueda, y podés completarlo cuando quieras desde Mi perfil de búsqueda.'),

      // 4. Ofertas
      h1('4. Ofertas'),
      p('La sección "Ofertas" es donde ves todas las ofertas de trabajo que guardaste, con su puntaje calculado automáticamente según tu perfil de búsqueda.'),
      h2('Primeros pasos'),
      p('Mientras no tengas ninguna postulación, arriba de Ofertas y de Mis postulaciones ves una tarjeta "Primeros pasos" con cuatro pasos: revisá tu perfil de búsqueda, importá o cargá ofertas, postulate a una y seguí su avance en Mis postulaciones. Cada paso tiene un enlace que te lleva ahí. Si todavía no armaste tu perfil, ese paso aparece destacado como "Pendiente". Podés cerrar la tarjeta con la ✕ y Laburin recuerda que la cerraste.'),
      p('Si todavía no hay ofertas cargadas, la pantalla te lo dice y te ofrece dos botones: importar ofertas remotas o cargar una a mano.'),
      ...figure('04f-ofertas-vacio.png', { ...DESKTOP, caption: 'Sin ofertas cargadas: la pantalla explica qué hacer y ofrece los botones para empezar.' }),
      ...figure('04a-ofertas.png', { ...DESKTOP, caption: 'Listado de ofertas, con "Primeros pasos", los filtros y el puntaje de cada oferta.' }),
      h2('Ver y filtrar ofertas'),
      p('Cada oferta se muestra en una tarjeta con la empresa, el puesto, la modalidad, las tecnologías mencionadas y, en un círculo de color, el puntaje: cuanto más alto, mejor encaja con tu perfil.'),
      p('Arriba de la lista podés filtrar por fuente (de dónde salió la oferta), por ubicación y por puntaje mínimo. Los filtros se aplican sobre todas tus ofertas, no solo sobre las que ves en pantalla.'),
      bullet('Fuente: de dónde salió la oferta (un portal de empleo o una carga manual).'),
      bullet('Ubicación (ciudad o país): escribí una ciudad o un país. Muchas ofertas remotas figuran solo por país o como "Remoto" o "Worldwide", así que una ciudad puede no devolver nada. Al escribir, el campo te sugiere las ubicaciones que existen en tus ofertas.'),
      bullet('Puntaje mínimo: muestra solo las ofertas con ese puntaje o más. El control llega hasta el máximo posible con tu perfil (la suma de los pesos de tus criterios activos), y debajo se lee, por ejemplo, "Máximo posible con tu perfil: 60 puntos".'),
      p('Los filtros se aplican con el botón "Aplicar", abajo a la derecha de la tarjeta (en el celular, a todo el ancho). Mientras haya un filtro aplicado aparece también "Quitar filtros". Si los filtros no devuelven ninguna oferta, el mensaje te sugiere aflojar alguno y el botón "Quitar todos los filtros" los limpia de una vez.'),
      ...figure('04e-ofertas-sin-resultados.png', { ...DESKTOP, caption: 'Un filtro que no coincide con nada: el mensaje sugiere aflojarlo y hay un botón para quitarlos todos.' }),
      h2('Moverte entre páginas'),
      p('Las ofertas se muestran de a 30 por página. Al final de la lista vas a ver cuántas ofertas tenés en total (con los filtros que estés usando) y en qué página estás, por ejemplo "37 ofertas · Página 1 de 2", junto con los botones "Anterior" y "Siguiente".'),
      ...figure('04c-ofertas-paginacion.png', { ...DESKTOP, caption: 'Al final del listado: el total de ofertas, la página actual y los botones para cambiar de página.' }),
      h2('Importar ofertas automáticamente'),
      p('Tocando "Importar ofertas remotas", Laburin busca ofertas nuevas publicadas en portales de empleo remoto y las agrega a tu lista, calculando el puntaje de cada una según tu perfil. Si una oferta ya la tenías cargada, no se duplica: te avisamos cuántas se importaron y cuántas se omitieron por estar repetidas.'),
      ...figure('04b-ofertas-import.png', { ...DESKTOP, caption: 'Resultado de una importación: cuántas ofertas nuevas entraron.' }),
      h2('Cargar una oferta manualmente'),
      p('Si encontraste una oferta por tu cuenta (en LinkedIn, en la web de una empresa, por referencia de alguien), podés cargarla vos mismo con "Nueva oferta", completando empresa, puesto, modalidad, ubicación y tecnologías.'),
      h2('Editar o borrar una oferta'),
      p('Desde la tarjeta de cada oferta podés editarla (ícono de lápiz) o borrarla (ícono de tacho) individualmente.'),
      p('Si querés borrar varias a la vez, marcá las casillas de las ofertas que querés eliminar y usá "Eliminar seleccionadas" en la barra que aparece arriba de la lista. La casilla "Seleccionar esta página" marca las ofertas que estás viendo; si tenés más de una página, aparece además el enlace "Seleccionar las N ofertas que coinciden", que marca todas las que cumplen los filtros, estén en la página que estén. El botón "Eliminar seleccionadas" siempre te dice cuántas vas a borrar, y antes de hacerlo Laburin te pide confirmación.'),
      h2('Postularte'),
      p('Cuando encontrás una oferta a la que querés postularte, tocá "Postularme". Esto la mueve a Mis postulaciones, en la columna "Por aplicar", para que empieces a hacerle seguimiento.'),

      // 5. Mis postulaciones
      h1('5. Mis postulaciones'),
      p('"Mis postulaciones" es el tablero donde seguís el estado de cada postulación, desde que decidís postularte hasta que termina el proceso.'),
      ...figure('05-tablero.png', { ...DESKTOP, caption: 'Mis postulaciones en computadora, con las seis columnas del proceso y un recordatorio en una tarjeta.' }),
      p('Tiene seis columnas: Por aplicar, Aplicado, En proceso, Entrevista, Oferta y Rechazado. Cada postulación es una tarjeta que vas moviendo de columna a medida que avanza el proceso. Si todavía no tenés ninguna, la pantalla te lo dice y un botón te lleva a Ofertas.'),
      h2('En computadora'),
      p('Podés arrastrar la tarjeta de una columna a otra con el mouse: hacé clic, mantené presionado y soltá en la columna que corresponda.'),
      h2('En el celular'),
      p('Como arrastrar con el dedo en una pantalla chica puede ser poco preciso, en el celular cada tarjeta tiene un selector "Mover a...": elegís la columna de destino en la lista, y listo.'),
      ...figure('05b-tablero-mobile.png', { ...MOBILE, caption: 'En el celular, un selector reemplaza al arrastre para cambiar de columna.' }),
      p('Laburin guarda el historial de cada cambio de estado, así que siempre queda registro de cuándo pasó cada postulación de una etapa a otra.'),

      // 6. Ficha de Postulación
      h1('6. Ficha de postulación'),
      p('Si tocás una tarjeta de Mis postulaciones, se abre la ficha de esa postulación, con todos los detalles de la oferta y una línea de tiempo con cada contacto que tuviste con la empresa.'),
      ...figure('06-ficha.png', { ...DESKTOP, caption: 'Ficha de una postulación, con la línea de tiempo de interacciones registradas.' }),
      h2('Agregar una interacción'),
      p('Cada vez que tengas novedades (te mandaron un mail, te llamaron, tuviste una entrevista), podés registrarlo como una interacción: elegís el tipo, la fecha, y podés agregar una nota con el detalle. Esto te sirve para no perder el hilo de en qué quedó cada proceso, sobre todo cuando tenés varias postulaciones activas al mismo tiempo.'),
      h2('Borrar una interacción'),
      p('Si cargaste una interacción por error, podés borrarla desde la misma línea de tiempo.'),

      // 7. Mi perfil de búsqueda
      h1('7. Mi perfil de búsqueda'),
      p('En "Mi perfil de búsqueda" está todo lo que le dice a Laburin qué buscás. Con estos datos calculamos el puntaje de cada oferta, y los cambios se guardan solos. La pantalla tiene tres bloques, en el orden en que se usan.'),
      ...figure('07-perfil.png', { ...DESKTOP, caption: 'Mi perfil de búsqueda: "¿Qué estoy buscando?" y "Mis tecnologías y cuánto pesan".' }),
      h2('¿Qué estoy buscando?'),
      p('Acá elegís cómo y dónde querés trabajar: la modalidad (remoto, híbrido o presencial) y la ubicación. Las ofertas que coinciden suman puntos. Una aclaración: con ofertas remotas, la ubicación casi nunca suma puntos, porque muchas dicen "Worldwide" o solo un país.'),
      h2('Mis tecnologías y cuánto pesan'),
      p('Las tecnologías que te interesan. Cada una tiene un peso, que es la cantidad de puntos que suma cuando una oferta la menciona: cuanto más peso, más arriba aparecen las ofertas con esa tecnología. Si el trabajo remoto es innegociable para vos, dale más peso a la modalidad que a una tecnología secundaria. Podés agregar tecnologías nuevas, cambiarles el peso, desactivarlas sin borrarlas o eliminarlas.'),
      p('El peso inicial es 15 puntos por tecnología, 10 por modalidad y 5 por ubicación, y es el mismo si cargaste el dato en la configuración inicial o lo agregás después acá.'),
      h2('Avisos de seguimiento'),
      p('En la tarjeta "Recordatorio por falta de novedades" elegís después de cuántos días sin novedades querés que Laburin te avise sobre una postulación. Por defecto son 7 días, y podés poner cualquier número entero entre 1 y 90. El texto lo aclara: solo te mostramos un recordatorio en Mis postulaciones; no se borra nada.'),
      ...figure('07b-avisos.png', { ...DESKTOP, caption: 'Avisos de seguimiento: el umbral de días y la aclaración de que solo es un recordatorio.' }),
      p('Escribí el número y salí del campo (o apretá Enter): el valor se guarda solo y se mantiene aunque cierres la sesión. Si ponés un valor que no corresponde, por ejemplo 0 o 100, Laburin te avisa y vuelve al último valor válido.'),
      p('El cambio vale hacia adelante: los avisos que ya tenías no desaparecen ni se recalculan. Si bajás el umbral, las postulaciones que ya llevan más días que el nuevo valor van a mostrar su aviso la próxima vez que abras Mis postulaciones; si lo subís, los avisos que ya estaban siguen hasta que los resuelvas.'),
      h2('Qué pasa con las ofertas que ya tenías cargadas'),
      p('Cada vez que agregás, editás, desactivás o borrás un criterio, Laburin recalcula automáticamente el puntaje de todas las ofertas que ya tenías guardadas: no hace falta que hagas nada más. Si entrás a Ofertas después de cambiar un criterio, vas a ver los puntajes actualizados.'),

      // 8. Mi cuenta
      h1('8. Mi cuenta'),
      p('Además del perfil de búsqueda, tenés una sección aparte para los datos de tu propia cuenta: tu nombre, tu contraseña y el tema de la aplicación. Para acceder, tocá "Mi cuenta" en el menú lateral, arriba de "Cerrar Sesión".'),
      ...figure('10-mi-cuenta.png', { ...DESKTOP, caption: 'Ventana de "Mi cuenta": nombre, email, aviso de privacidad, cambio de contraseña y tema.' }),
      p('Ahí podés:'),
      bullet('Cambiar tu nombre para mostrar (se usa junto con tus iniciales, que aparecen como tu avatar). El equipo de Laburin lo ve junto a tu perfil de búsqueda.'),
      bullet('Ver el email con el que te registraste (no se puede editar desde acá).'),
      bullet('Cambiar tu contraseña (al menos 8 caracteres), con el mismo indicador de fortaleza que viste al registrarte.'),
      bullet('Elegir el tema claro u oscuro de toda la aplicación.'),

      // 9. Mensajes
      h1('9. Mensajes'),
      p('En "Mensajes" aparecen los avisos del equipo de Laburin sobre tu perfil. El primero es el de bienvenida, que recibís al terminar la configuración inicial: "Tu perfil quedó registrado y vamos a tener en cuenta tu solicitud." Más adelante el equipo puede escribirte, por ejemplo, para pedirte un dato que falta.'),
      ...figure('11-mensajes.png', { ...DESKTOP, caption: 'Mensajes: los que todavía no leíste están resaltados y el menú muestra cuántos son.' }),
      p('En el menú lateral, "Mensajes" muestra un número cuando tenés mensajes sin leer. Los no leídos están resaltados y marcados como "Nuevo". En cada mensaje podés:'),
      bullet('"Marcar como leído": el mensaje deja de estar resaltado y baja el número del menú. Con "Marcar todos como leídos" lo hacés de una vez.'),
      bullet('"Borrar": el mensaje desaparece de tu bandeja. Pedimos confirmación antes de borrar y no se puede deshacer.'),
      p('Si todavía no tenés mensajes, la pantalla lo dice y te lleva a Mis postulaciones. En el celular se ve igual, en una sola columna.'),
      ...figure('11b-mensajes-mobile.png', { ...MOBILE, caption: 'Mensajes en el celular.' }),

      // 10. Recordatorios por inactividad
      h1('10. Recordatorios por inactividad'),
      p('Cuando una postulación lleva varios días sin ninguna novedad, sin que hayas registrado una interacción ni cambiado su estado, Laburin te lo marca con un recordatorio, para que no se te pase hacer un seguimiento. Es solo un aviso: no se borra ni se cambia nada de la postulación.'),
      p('Vos elegís después de cuántos días se avisa: es el aviso de seguimiento que ajustás en Mi perfil de búsqueda (por defecto, 7 días; ver la sección 7). Si lo cambiás, el nuevo plazo se aplica de ahí en adelante y los avisos que ya tenías no se modifican.'),
      p('Vas a ver el recordatorio en Mis postulaciones, en la tarjeta de la postulación correspondiente ("Sin novedades hace N días", como se ve en la imagen de la sección 5), y también arriba de la ficha, con la aclaración de que es solo un recordatorio. Alcanza con registrar una interacción nueva, mover la tarjeta de estado o tocar "Marcar como resuelto" para que el recordatorio se resuelva.'),

      // 11. Mi progreso
      h1('11. Mi progreso'),
      p('La sección "Mi progreso" te muestra cómo viene tu búsqueda laboral: cuántas postulaciones tenés activas, cómo se reparten entre las etapas del proceso, cuál es tu puntaje promedio y qué fuentes te traen mejores ofertas. Te sirve para tomar una foto rápida sin tener que repasar oferta por oferta.'),
      ...figure('08-progreso.png', { ...DESKTOP, caption: 'Mi progreso, con el resumen general de la búsqueda.' }),

      // 12. Privacidad
      h1('12. Tu privacidad'),
      p('Estos son los datos que puede ver el equipo de Laburin, y los que no:'),
      bullet('Lo ve el equipo: tu nombre y tu perfil de búsqueda (rol, tecnologías, modalidad, ubicación y nivel de experiencia).'),
      bullet('No lo ve nadie más que vos: tus ofertas, tus postulaciones, tus interacciones, tus recordatorios, tu historial y tu email.'),
      p('Verás este aviso en el primer paso de la configuración inicial, en el resumen final y en Mi cuenta: "Tu nombre y tu perfil de búsqueda (rol, tecnologías, modalidad, ubicación y nivel) los puede ver el equipo de Laburin. Tus ofertas y postulaciones son solo tuyas."'),
      p('Los mensajes que recibís son solo tuyos: nadie más los puede leer, y vos podés borrarlos cuando quieras.'),

      // 13. Para el equipo de Laburin
      h1('13. Para el equipo de Laburin: Candidatos'),
      p('Esta sección es solo para quienes administran Laburin y no la ve ninguna otra persona. El rol de administrador no se puede pedir ni obtener desde la aplicación: lo asigna una persona del equipo directamente en la base de datos.'),
      p('Al iniciar sesión, el administrador entra directo a "Candidatos", y su menú solo tiene esa sección (más "Mi cuenta" y "Cerrar Sesión"). Una persona que no es administradora no puede entrar a esa pantalla, ni siquiera escribiendo la dirección a mano: la aplicación la devuelve a su inicio, y la base de datos tampoco le devolvería ningún dato.'),
      h2('Ver a los candidatos'),
      p('La pantalla lista a las personas que se registraron y completaron su perfil de búsqueda. Quienes omitieron la configuración inicial no aparecen, para no mostrar filas vacías. Cada tarjeta muestra el nombre, el rol que busca, la ubicación, la modalidad, el nivel, las tecnologías y la fecha de registro. El buscador filtra por nombre, rol, tecnología o ubicación, sin importar mayúsculas ni tildes.'),
      ...figure('12-candidatos.png', { ...DESKTOP, caption: 'Candidatos: listado con buscador (los nombres de la captura son ficticios).' }),
      h2('Enviar un mensaje'),
      p('Al tocar una tarjeta se abre el detalle del candidato, con su perfil de búsqueda completo y el formulario "Enviar mensaje" (de 1 a 1000 caracteres; la pantalla avisa si el mensaje está vacío o es demasiado largo). Debajo, "Mensajes enviados" muestra el historial de lo que le escribiste a esa persona, con la indicación "Leído" o "Sin leer".'),
      ...figure('13-candidato-detalle.png', { width: 600, height: 469, caption: 'Detalle de un candidato: perfil de búsqueda y envío de un mensaje.' }),
      h2('Plantillas de mensaje'),
      p('Arriba del cuadro de texto hay cinco plantillas para los mensajes más comunes: "Solicitud recibida", "Falta un dato", "Pedir la ubicación", "Sumar tecnologías" y "Datos completos". Al tocar una, el mensaje se escribe solo, saludando a la persona por su primer nombre, y podés editarlo antes de enviarlo. Si ya habías escrito algo, aparece "Deshacer" para recuperarlo.'),
      p('Algunas plantillas dejan un dato entre corchetes para que lo completes (por ejemplo, "[indicá cuál]"): queda seleccionado para escribir encima. Mientras haya corchetes sin completar, Laburin no deja enviar el mensaje y te lo avisa, para que nunca salga con un dato sin reemplazar.'),
      h2('Qué no ve el administrador'),
      p('El administrador no ve las ofertas, postulaciones, interacciones, recordatorios ni criterios de los candidatos, ni su email, ni los mensajes que otros recibieron. Esto no depende de la pantalla: lo garantizan los permisos de la base de datos, y se verificó con pruebas de seguridad automáticas.'),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(path.join(RAIZ, 'Laburin-Manual-de-Usuario.docx'), buf);
  console.log('Generado: Laburin-Manual-de-Usuario.docx', buf.length, 'bytes');
});
