// Datos de la cuenta DEMO: el recorrido de alguien que usa Laburin hace unas ocho semanas, todo ficticio.
// Es una función pura (sin red): la usa docs/scripts/demo-datos.mjs para cargarlos y src/lib/demoDataset.test.ts
// para comprobar que son coherentes con el motor de scoring, los recordatorios y las métricas de la aplicación.
//
// Todo se expresa en "hace N días" respecto de `ahora`, así cada vez que se carga queda con historia reciente.
// Las postulaciones y las ofertas se relacionan por posición (índice) dentro de las listas.
const DIA_MS = 24 * 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;

export const NOMBRE_DEMO = 'Camila Ejemplo';
const DIAS_INACTIVIDAD = 7;

const PERFIL = {
  nombre: NOMBRE_DEMO,
  rol_buscado: 'Frontend Developer',
  stack_interes: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
  modalidad_preferida: 'remoto',
  ubicacion: 'Buenos Aires, Argentina',
  seniority: 'semi_senior',
  onboarding_completado: true,
  dias_inactividad_recordatorio: DIAS_INACTIVIDAD,
};

// Mismos pesos que el Onboarding (tecnología 15, modalidad 10, ubicación 5) y un criterio apagado, para mostrar el interruptor.
function criterios() {
  const base = { activo: true, rango_min: null, rango_max: null };
  return [
    ...PERFIL.stack_interes.map((t) => ({
      ...base, nombre: `Stack: ${t}`, peso: 15, tipo_coincidencia: 'contiene', campo_objetivo: 'stack_tecnologico', valor_comparacion: t,
    })),
    { ...base, nombre: 'Modalidad: Remoto', peso: 10, tipo_coincidencia: 'exacto', campo_objetivo: 'modalidad', valor_comparacion: 'remoto' },
    { ...base, nombre: `Ubicación: ${PERFIL.ubicacion}`, peso: 5, tipo_coincidencia: 'contiene', campo_objetivo: 'ubicacion', valor_comparacion: PERFIL.ubicacion },
    { ...base, activo: false, nombre: 'Stack: Angular', peso: 5, tipo_coincidencia: 'contiene', campo_objetivo: 'stack_tecnologico', valor_comparacion: 'Angular' },
  ];
}

// Misma lógica que calcularScoring (src/services/scoring.ts): la suma de los pesos de los criterios activos que coinciden.
export function puntajeDe(oferta, listaCriterios) {
  return listaCriterios
    .filter((c) => c.activo)
    .filter((c) => {
      const valor = oferta[c.campo_objetivo];
      const buscado = String(c.valor_comparacion ?? '').toLowerCase();
      if (c.tipo_coincidencia === 'contiene') {
        return Array.isArray(valor) ? valor.some((v) => String(v).toLowerCase().includes(buscado)) : typeof valor === 'string' && valor.toLowerCase().includes(buscado);
      }
      return typeof valor === 'string' && valor.toLowerCase() === buscado;
    })
    .reduce((total, c) => total + c.peso, 0);
}

// [empresa, rol, ubicación, modalidad, tecnologías, fuente, creada hace N días]
// Las 15 primeras son las ofertas de las postulaciones, en el mismo orden; la oferta se cargó antes que la postulación.
const OFERTAS = [
  ['Nubia Labs', 'Frontend Developer', 'Buenos Aires, Argentina', 'remoto', ['React', 'TypeScript', 'Node.js'], 'Remotive', 3],
  ['Orbita Soft', 'React Developer', 'LATAM', 'remoto', ['React', 'TypeScript'], 'Remotive', 5],
  ['Plano Digital', 'Full Stack Developer', 'Córdoba, Argentina', 'hibrido', ['React', 'Node.js', 'PostgreSQL'], 'Carga manual', 2],
  ['Kappa Systems', 'Frontend Engineer', 'Buenos Aires, Argentina', 'remoto', ['React', 'TypeScript', 'PostgreSQL', 'Node.js'], 'Remotive', 22],
  ['Lumen Tech', 'TypeScript Developer', 'Worldwide', 'remoto', ['TypeScript', 'Node.js'], 'Remotive', 17],
  ['Andes Software', 'UI Engineer', 'Buenos Aires, Argentina', 'hibrido', ['React', 'TypeScript', 'Node.js'], 'Carga manual', 6],
  ['Pampa Cloud', 'Full Stack Developer', 'LATAM', 'remoto', ['React', 'Node.js', 'PostgreSQL'], 'Remotive', 27],
  ['Costa Digital', 'Backend Developer', 'Bogotá, Colombia', 'remoto', ['Node.js', 'PostgreSQL'], 'Arbeitnow', 31],
  ['Quimera Apps', 'Frontend Developer', 'Madrid, España', 'hibrido', ['React', 'TypeScript'], 'Arbeitnow', 13],
  ['Trama Data', 'Software Engineer', 'Buenos Aires, Argentina', 'hibrido', ['TypeScript', 'Node.js', 'PostgreSQL'], 'Carga manual', 36],
  ['Faro Cloud', 'React Engineer', 'Worldwide', 'remoto', ['React', 'TypeScript', 'Node.js'], 'Remotive', 19],
  ['Vertice IT', 'Full Stack Engineer', 'Buenos Aires, Argentina', 'remoto', ['React', 'TypeScript', 'Node.js', 'PostgreSQL'], 'Remotive', 46],
  ['Brisa Labs', 'Frontend Developer', 'Berlín, Alemania', 'presencial', ['React', 'Angular'], 'Arbeitnow', 41],
  ['Tilo Software', 'Backend Developer', 'Córdoba, Argentina', 'presencial', ['Java', 'PostgreSQL'], 'Carga manual', 29],
  ['Ceibo Tech', 'QA Automation Engineer', 'Buenos Aires, Argentina', 'hibrido', ['Cypress', 'TypeScript'], 'Remotive', 56],
  // Ofertas sin postulación: llegaron con las importaciones de las últimas semanas.
  ['Mercado Norte', 'Frontend Developer', 'Buenos Aires, Argentina', 'remoto', ['React', 'TypeScript'], 'Arbeitnow', 1],
  ['Nubia Labs', 'Backend Developer', 'Worldwide', 'remoto', ['Node.js', 'PostgreSQL'], 'RemoteOK', 2],
  ['Orbita Soft', 'DevOps Engineer', 'LATAM', 'remoto', ['AWS', 'Docker'], 'Remotive', 4],
  ['Plano Digital', 'Data Analyst', 'Rosario, Argentina', 'hibrido', ['SQL', 'Power BI'], 'Carga manual', 6],
  ['Lumen Tech', 'Full Stack Developer', 'Buenos Aires, Argentina', 'remoto', ['React', 'Node.js', 'PostgreSQL', 'TypeScript'], 'Remotive', 3],
  ['Kappa Systems', 'QA Automation', 'Madrid, España', 'presencial', ['Selenium', 'Cypress'], 'Arbeitnow', 5],
  ['Andes Software', 'React Developer', 'México', 'remoto', ['React'], 'RemoteOK', 8],
  ['Pampa Cloud', 'Node.js Developer', 'Buenos Aires, Argentina', 'remoto', ['Node.js', 'TypeScript'], 'Arbeitnow', 9],
  ['Costa Digital', 'Frontend Engineer', 'Worldwide', 'remoto', ['React', 'TypeScript', 'Node.js'], 'Remotive', 10],
  ['Quimera Apps', 'Backend Developer', 'Berlín, Alemania', 'hibrido', ['Java', 'Spring'], 'Arbeitnow', 11],
  ['Trama Data', 'Data Engineer', 'Córdoba, Argentina', 'remoto', ['Python', 'PostgreSQL'], 'Carga manual', 12],
  ['Faro Cloud', 'Full Stack Developer', 'LATAM', 'remoto', ['React', 'Node.js'], 'Arbeitnow', 13],
  ['Vertice IT', 'Software Engineer', 'Buenos Aires, Argentina', 'hibrido', ['TypeScript', 'PostgreSQL'], 'Remotive', 15],
  ['Brisa Labs', 'UI Engineer', 'Barcelona, España', 'hibrido', ['React', 'TypeScript'], 'Arbeitnow', 18],
  ['Tilo Software', 'Frontend Developer', 'Buenos Aires, Argentina', 'remoto', ['React', 'TypeScript', 'Node.js', 'PostgreSQL'], 'Carga manual', 23],
  ['Ceibo Tech', 'Backend Developer', 'Worldwide', 'remoto', ['Node.js', 'PostgreSQL', 'TypeScript'], 'RemoteOK', 25],
  ['Mercado Norte', 'Mobile Developer', 'Bogotá, Colombia', 'remoto', ['React Native', 'TypeScript'], 'Arbeitnow', 28],
  ['Nubia Labs', 'SRE', 'Worldwide', 'remoto', ['Go', 'Kubernetes'], 'Remotive', 33],
  ['Orbita Soft', 'Frontend Developer', 'Córdoba, Argentina', 'presencial', ['React', 'TypeScript'], 'Carga manual', 38],
  ['Plano Digital', 'Backend Developer', 'LATAM', 'remoto', ['Node.js', 'PostgreSQL'], 'RemoteOK', 44],
  ['Lumen Tech', 'Full Stack Developer', 'Madrid, España', 'remoto', ['React', 'Node.js', 'PostgreSQL'], 'Arbeitnow', 52],
];

const R0 = [];
const R_APLICADO = ['aplicado'];
const R_PROCESO = ['aplicado', 'en_proceso'];
const R_ENTREVISTA = ['aplicado', 'en_proceso', 'entrevista'];

// Una por oferta de las 15 primeras. `creada` y `aplicada` son "hace N días"; en cada interacción, [días, tipo, notas].
// Cada postulación abierta termina con actividad de los últimos 7 días, salvo dos que muestran el aviso de seguimiento.
const POSTULACIONES = [
  { estado: 'por_aplicar', recorrido: R0, creada: 2, aplicada: null, interacciones: [] },
  { estado: 'por_aplicar', recorrido: R0, creada: 4, aplicada: null, interacciones: [] },
  { estado: 'por_aplicar', recorrido: R0, creada: 1, aplicada: null, interacciones: [] },
  {
    estado: 'aplicado', recorrido: R_APLICADO, creada: 21, aplicada: 20,
    interacciones: [[20, 'mail', 'Envié mi CV y la carta de presentación.'], [3, 'nota', 'Reenvié el CV con el portfolio actualizado.']],
  },
  // Sin novedades hace 15 días: tiene el aviso de seguimiento activo.
  { estado: 'aplicado', recorrido: R_APLICADO, creada: 16, aplicada: 15, interacciones: [[15, 'mail', 'Postulación enviada por el portal de la empresa.']] },
  { estado: 'aplicado', recorrido: R_APLICADO, creada: 5, aplicada: 4, interacciones: [[4, 'mail', 'Mandé el CV por mail a RRHH.']] },
  // Tuvo un aviso de seguimiento que ya resolvió (escribió para consultar novedades).
  {
    estado: 'aplicado', recorrido: R_APLICADO, creada: 26, aplicada: 25,
    interacciones: [[25, 'mail', 'Postulación enviada.'], [18, 'llamada', 'Llamada breve con RRHH: quedaron en avisar.'], [6, 'nota', 'Les escribí para consultar novedades.']],
  },
  // En proceso, pero sin novedades hace 9 días: segundo aviso de seguimiento activo.
  {
    estado: 'en_proceso', recorrido: R_PROCESO, creada: 30, aplicada: 29,
    interacciones: [[29, 'mail', 'Postulación enviada.'], [22, 'llamada', 'Llamada con RRHH para conocernos.'], [9, 'mail', 'Me enviaron una prueba técnica para resolver.']],
  },
  {
    estado: 'en_proceso', recorrido: R_PROCESO, creada: 12, aplicada: 11,
    interacciones: [[11, 'mail', 'Postulación enviada.'], [2, 'llamada', 'Primera charla con RRHH: me cuentan los próximos pasos.']],
  },
  {
    estado: 'entrevista', recorrido: R_ENTREVISTA, creada: 35, aplicada: 34,
    interacciones: [[33, 'mail', 'Respondieron mi postulación.'], [27, 'llamada', 'Llamada de presentación.'], [20, 'entrevista', 'Entrevista técnica con el equipo de desarrollo.'], [5, 'nota', 'Esperando la devolución del equipo.']],
  },
  {
    estado: 'entrevista', recorrido: R_ENTREVISTA, creada: 18, aplicada: 17,
    interacciones: [[16, 'mail', 'Me escribieron para coordinar una charla.'], [6, 'entrevista', 'Entrevista técnica por videollamada.'], [1, 'nota', 'Me pidieron referencias laborales.']],
  },
  {
    estado: 'oferta', recorrido: [...R_ENTREVISTA, 'oferta'], creada: 45, aplicada: 44,
    interacciones: [
      [43, 'mail', 'Me contactaron por mi postulación.'], [38, 'llamada', 'Llamada con RRHH.'], [30, 'entrevista', 'Primera entrevista.'],
      [24, 'entrevista', 'Entrevista final con la dirección.'], [8, 'mail', 'Recibí la propuesta formal por mail.'], [3, 'nota', 'Estoy evaluando las condiciones.'],
    ],
  },
  {
    estado: 'rechazado', recorrido: ['aplicado', 'en_proceso', 'rechazado'], creada: 40, aplicada: 39,
    interacciones: [[38, 'mail', 'Postulación enviada.'], [31, 'llamada', 'Llamada con RRHH.'], [28, 'mail', 'Decidieron avanzar con otro perfil.']],
  },
  {
    estado: 'rechazado', recorrido: ['aplicado', 'rechazado'], creada: 28, aplicada: 27,
    interacciones: [[27, 'mail', 'Postulación enviada.'], [21, 'mail', 'Agradecieron mi interés pero no continúan con mi perfil.']],
  },
  {
    estado: 'rechazado', recorrido: [...R_ENTREVISTA, 'rechazado'], creada: 55, aplicada: 54,
    interacciones: [[53, 'mail', 'Respondieron mi postulación.'], [44, 'entrevista', 'Entrevista técnica.'], [40, 'mail', 'Me avisaron que cubrieron la vacante.']],
  },
];

// [postulación, estado, días de inactividad, generado hace N días, resuelto hace N días]
const RECORDATORIOS = [
  [4, 'activo', 15, 0, null],
  [7, 'activo', 9, 0, null],
  [6, 'resuelto', 8, 10, 6],
  [9, 'resuelto', 8, 12, 10],
];

// Mensajes del administrador: los textos de tres plantillas de src/lib/plantillasMensaje.ts (un test vigila que coincidan).
// [texto, hace N días, leído]. Queda uno sin leer para que el menú muestre el contador.
const MENSAJES = [
  ['Hola Camila, tu perfil quedó registrado y vamos a tener en cuenta tu solicitud. Gracias por sumarte a Laburin.', 21, true],
  ['Hola Camila, gracias por completar tu perfil. Ya tenemos todo lo que necesitábamos y vamos a tener en cuenta tu solicitud.', 9, true],
  ['Hola Camila, revisamos tu perfil y las tecnologías cargadas son pocas. Si manejás otras, sumalas en Mi perfil de búsqueda para que tu solicitud quede más completa.', 1, false],
];

// Enlaces de ejemplo (example.com está reservado para esto: no lleva a ningún sitio real). Algunas ofertas cargadas a mano no
// tienen enlace, para mostrar también ese caso.
const sinAcentos = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const slug = (texto) => sinAcentos(texto).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function descripcionDe({ empresa, rol, ubicacion, modalidad, stack }) {
  const lugar = modalidad === 'remoto' ? 'de forma remota' : modalidad === 'hibrido' ? 'en modalidad híbrida' : 'de forma presencial';
  return [
    `${empresa} busca ${rol} para sumarse a su equipo ${lugar} (${ubicacion}).`,
    `Vas a trabajar con ${stack.join(', ')} en proyectos de producto, junto a diseño y negocio.`,
    '• Experiencia comprobable en el stack\n• Ganas de aprender y de trabajar en equipo\n• Buen nivel de comunicación escrita',
    'Esta es una oferta de ejemplo, escrita para la demostración de Laburin.',
  ].join('\n\n');
}

export function construirDataset(ahora) {
  const hace = (dias, horas = 0) => new Date(ahora.getTime() - dias * DIA_MS - horas * HORA_MS).toISOString();
  const soloFecha = (dias) => hace(dias).slice(0, 10);
  const lista = criterios();

  const ofertas = OFERTAS.map(([empresa, rol, ubicacion, modalidad, stack, fuente, dias], i) => {
    const oferta = {
      empresa,
      rol,
      ubicacion,
      modalidad,
      stack_tecnologico: stack,
      fuente,
      fecha_publicacion: fuente === 'Carga manual' ? null : soloFecha(dias),
      url: fuente === 'Carga manual' && i % 2 === 0 ? null : `https://example.com/empleos/${slug(`${empresa} ${rol}`)}-${i + 1}`,
      descripcion: descripcionDe({ empresa, rol, ubicacion, modalidad, stack }),
      created_at: hace(dias, (i * 5) % 20),
    };
    return { ...oferta, puntaje_scoring: puntajeDe(oferta, lista) };
  });

  const postulaciones = POSTULACIONES.map((p, i) => ({
    oferta: i,
    estado: p.estado,
    recorrido: p.recorrido,
    created_at: hace(p.creada),
    fecha_postulacion: p.aplicada === null ? null : soloFecha(p.aplicada),
    interacciones: p.interacciones.map(([dias, tipo, notas]) => ({ tipo, notas, fecha: hace(dias, 3) })),
  }));

  const recordatorios = RECORDATORIOS.map(([postulacion, estado, dias, generado, resuelto]) => ({
    postulacion,
    estado,
    dias_inactividad: dias,
    fecha_generado: hace(generado, generado === 0 ? 2 : 0),
    fecha_resuelto: resuelto === null ? null : hace(resuelto),
  }));

  const mensajes = MENSAJES.map(([texto, dias, leido]) => ({
    texto,
    created_at: hace(dias),
    leido,
  }));

  return {
    perfil: { ...PERFIL, registrado_el: hace(62) },
    criterios: lista,
    ofertas,
    postulaciones,
    recordatorios,
    mensajes,
  };
}
