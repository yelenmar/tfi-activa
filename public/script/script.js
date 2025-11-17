// Script unificado con Firebase Firestore v11 modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, deleteDoc, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Silenciar logs informativos en producción (mantiene warnings y errores)
const SILENCE_INFO_LOGS = false; // ✅ Logs activados para debugging
if (SILENCE_INFO_LOGS && typeof console !== 'undefined') {
  console.info = () => {};
  console.log = () => {};
}

// ==============================
// Firebase: init + helpers
// ==============================
let app = null;
let db = null;

const detectarFirebaseConfig = () => {
  // 1) Global window
  if (window && window.FIREBASE_CONFIG) return window.FIREBASE_CONFIG;
  // 2) Meta tag <meta name="firebase-config" content='{...}'>
  const meta = document.querySelector('meta[name="firebase-config"]');
  if (meta) {
    try { return JSON.parse(meta.getAttribute('content')); } catch {}
  }
  // 3) LocalStorage (opcional para dev)
  try {
    const raw = localStorage.getItem('FIREBASE_CONFIG');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

try {
  const firebaseConfig = detectarFirebaseConfig();
  if (firebaseConfig) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase inicializado');
  } else {
    console.warn('⚠️ Firebase config no encontrada. Define window.FIREBASE_CONFIG o un <meta name="firebase-config">');
  }
} catch (e) {
  console.error('❌ Error inicializando Firebase:', e);
}

// Wrappers seguros
const saveToFirestore = async (col, data, id) => {
  if (!db) throw new Error('Firestore no inicializado');
  // Normalizar ID: evitar crear documentos nuevos por accidentales valores vacíos/"undefined"/"null"
  const idNorm = typeof id === 'string' ? id.trim() : id;
  const idValido = idNorm && idNorm !== 'undefined' && idNorm !== 'null';
  if (idValido) {
    // Usar merge para actualizar solo los campos provistos y no sobreescribir
    // accidentalmente otros campos existentes en el documento.
    await setDoc(doc(db, col, idNorm), { ...data, id: idNorm }, { merge: true });
    return idNorm;
  } else {
    const ref = await addDoc(collection(db, col), data);
    return ref.id;
  }
};

const getFromFirestore = async (col, id) => {
  if (!db) throw new Error('Firestore no inicializado');
  if (id) {
    const snap = await getDoc(doc(db, col, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } else {
    const snaps = await getDocs(collection(db, col));
    const items = [];
    snaps.forEach(d => items.push({ id: d.id, ...d.data() }));
    return items;
  }
};

// Consulta por campo (usa where). Operador por defecto '=='
const getFromFirestoreWhere = async (col, field, op, value) => {
  if (!db) throw new Error('Firestore no inicializado');
  const q = query(collection(db, col), where(field, op || '==', value));
  const snaps = await getDocs(q);
  const items = [];
  snaps.forEach(d => items.push({ id: d.id, ...d.data() }));
  return items;
};

// Obtener múltiples documentos por ID en paralelo
const getManyFromFirestore = async (col, ids = []) => {
  if (!db) throw new Error('Firestore no inicializado');
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const proms = ids.map(i => getDoc(doc(db, col, i)));
  const snaps = await Promise.all(proms);
  return snaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() }));
};

const deleteFromFirestore = async (col, id) => {
  if (!db) throw new Error('Firestore no inicializado');
  await deleteDoc(doc(db, col, id));
};

// ==============================
// EmailJS: configuración unificada
// ==============================
// Configuración actualizada con cuenta de EmailJS "Activa"
// Service ID: service_qfr7y9j
// Template ID OTP: template_p7ka3kx (One-Time Password)
// Template ID Recordatorio: template_jnca4xh (Recordatorios de eventos)
const EMAILJS_CONFIG = {
  PUBLIC_KEY: '-dIDVhLNDyn8jILqB',       // Nueva Public Key provista
  SERVICE_ID: 'service_qfr7y9j',         // Nuevo servicio "Activa"
  TEMPLATE_ID: 'template_p7ka3kx',       // Nuevo template OTP
  TEMPLATE_ID_RECORDATORIO: 'template_jnca4xh',  // Template para recordatorios de eventos
  TEMPLATE_ID_CODIGO: 'template_codigo'  // Template unificado para códigos (recuperación y verificación)
};

// Exponer configuración para chequeos en funciones de notificación
try { window.EMAILJS_CONFIG = EMAILJS_CONFIG; } catch {}


// Utilidad: Probar envío de email con EmailJS (sin depender de creación de eventos)
// Uso desde consola: await probarEmailNotificacion('tu_correo@example.com')
async function probarEmailNotificacion(destEmail) {
  try {
    await loadEmailJS();
    const email = destEmail || (typeof prompt === 'function' ? prompt('Email destino para prueba de notificación:') : '');
    if (!email || !String(email).includes('@')) {
      console.warn('⚠️ Email inválido para prueba');
      return;
    }

    const ahora = new Date();
    const yyyy = ahora.getFullYear();
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    const dd = String(ahora.getDate()).padStart(2, '0');
    const fechaISO = `${yyyy}-${mm}-${dd}`;

    const templateParams = {
      to_email: email,
      to_name: 'Usuario de Prueba',
      user_name: 'Usuario de Prueba',
      subject: 'Prueba de notificación de nuevo evento',
      message: 'Este es un envío de prueba para verificar EmailJS en Activa.',
      event_name: 'Evento de prueba',
      event_date: fechaISO,
      event_time: '12:00',
      event_location: 'Virtual',
      event_description: 'Envío de prueba para diagnosticar el pipeline de correo.'
    };

    console.log('🧪 Enviando email de prueba a', email);
    const res = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID_RECORDATORIO,
      templateParams
    );
    console.log('✅ EmailJS prueba enviado correctamente:', res);
  } catch (err) {
    const status = err?.status;
    const text = err?.text || '';
    console.error('❌ Error prueba EmailJS:', err);
    if (status === 426 || status === 402 || String(text).toLowerCase().includes('quota')) {
      console.warn('⚠️ Indicio de cuota agotada de EmailJS (426/402/quota).');
    }
  }
}
try { window.probarEmailNotificacion = probarEmailNotificacion; } catch {}


const getLocalFavoritosSet = (userId) => {
  try {
    const raw = localStorage.getItem(`fav_local_${userId}`);
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) return new Set(arr);
  } catch (e) {
    console.warn('No se pudo leer favoritos locales:', e);
  }
  return new Set();
};

const setLocalFavoritosSet = (userId, setVals) => {
  try {
    const arr = Array.isArray(setVals) ? setVals : Array.from(setVals);
    localStorage.setItem(`fav_local_${userId}`, JSON.stringify(arr));
  } catch (e) {
    console.warn('No se pudo guardar favoritos locales:', e);
  }
};

// ==============================
// Sistema de Administrador
// ==============================
// Lista de correos con permisos de administrador (permite variantes por posible tipado)
const ADMIN_EMAILS = [
  'activaapp.oficial@gmail.com',
  'activapp.oficial@gmail.com'
];

// Normaliza emails para comparación robusta
// - lower-case y trim
// - si es gmail: remueve puntos en la parte local y ignora '+alias'
const normalizarEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  const e = email.trim().toLowerCase();
  const [local, domain] = e.split('@');
  if (!domain) return e;
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const sinMas = local.split('+')[0];
    const sinPuntos = sinMas.replace(/\./g, '');
    return `${sinPuntos}@gmail.com`;
  }
  return `${local}@${domain}`;
};

// Verificar si el usuario actual es administrador
const esAdministrador = async () => {
  try {
    const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
    if (!userId) return false;

    const adminNorms = ADMIN_EMAILS.map(normalizarEmail);

    // 1) Intentar por documento en 'usuarios'
    const usuario = await getFromFirestore('usuarios', userId);
    let emailCandidato = '';
    if (usuario) {
      // Preferir 'email'; si no, usar 'destino' si parece correo
      if (usuario.email && typeof usuario.email === 'string') {
        emailCandidato = usuario.email;
      } else if (usuario.destino && typeof usuario.destino === 'string' && /@/.test(usuario.destino)) {
        emailCandidato = usuario.destino;
      }
    }
    const norm = normalizarEmail(emailCandidato);
    if (norm && adminNorms.includes(norm)) return true;

    // 2) Fallback: comparar por userId contra versión saneada del email admin
    //    (coincide con el esquema usado para IDs: reemplazar @, +, espacios, guiones y puntos por '_')
    const sanitizeId = (e) => e.replace(/[@\s\+\-\.]/g, '_');
    for (const adminRaw of ADMIN_EMAILS) {
      if (sanitizeId(adminRaw) === userId) return true;
      // También probar con el normalizado gmail (sin puntos)
      if (sanitizeId(normalizarEmail(adminRaw)) === userId) return true;
    }

    return false;
  } catch (error) {
    console.error('Error verificando administrador:', error);
    return false;
  }
};

// ==============================
// Funciones centralizadas de fecha/hora (formato argentino)
// ==============================
const pad2 = (n) => String(n).padStart(2, '0');

// Formatear fecha a formato argentino (DD/MM/YYYY) aceptando múltiples tipos
// Acepta: "YYYY-MM-DD" | Date | Firestore Timestamp | número epoch (ms o s) | string fecha
const formatearFechaArgentina = (valor) => {
  if (valor === undefined || valor === null || valor === '') return '';

  // 1) ISO string YYYY-MM-DD
  if (typeof valor === 'string') {
    const match = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [_, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
  }

  // 2) Firestore Timestamp-like { seconds, nanoseconds }
  if (typeof valor === 'object' && valor && typeof valor.seconds === 'number') {
    const ms = valor.seconds * 1000 + Math.floor((valor.nanoseconds || 0) / 1e6);
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  // 3) Date instancia
  if (valor instanceof Date) {
    if (!isNaN(valor.getTime())) return `${pad2(valor.getDate())}/${pad2(valor.getMonth() + 1)}/${valor.getFullYear()}`;
  }

  // 4) Número epoch (ms o s)
  if (typeof valor === 'number' && isFinite(valor)) {
    // Si es menor a 1e12 probablemente sean segundos; si es mayor, milisegundos
    const ms = valor < 1e12 ? valor * 1000 : valor;
    const d = new Date(ms);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
      return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
    }
    // Si es un número pequeño (por ejemplo fracción), ignoramos y devolvemos vacío para evitar valores raros
    return '';
  }

  // 5) Cualquier otro string: intentar parsear
  if (typeof valor === 'string') {
    try {
      const d = new Date(valor);
      if (!isNaN(d.getTime())) {
        return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
      }
    } catch (e) {}
    // Si no se puede, devolver tal cual para depurar
    return valor;
  }

  return '';
};

// Formatear hora en formato 24hs argentino (HH:mm)
const formatearHoraArgentina = (horaStr) => {
  if (!horaStr) return '';
  const match = horaStr.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    return `${pad2(match[1])}:${pad2(match[2])}`;
  }
  return horaStr;
};

// Crear objeto Date local sin problemas de zona horaria (para comparaciones)
const crearFechaLocal = (fechaISO, horaStr) => {
  if (!fechaISO || !horaStr) return null;
  const [year, month, day] = fechaISO.split('-').map(Number);
  const [hours, minutes] = horaStr.split(':').map(Number);
  if (!year || !month || !day || hours === undefined || minutes === undefined) return null;
  // Crear fecha local sin conversión de zona horaria
  return new Date(year, month - 1, day, hours, minutes);
};

// Control anti-duplicados por combinación (userId, eventoId, tipo)
const fueNotificadaRecientemente = async (userId, eventoId, tipo, ventanaHoras = 24) => {
  try {
    const id = `${userId}_${eventoId}_${tipo}`;
    const ref = doc(db, 'notificaciones_ultima', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const last = snap.data().lastSent || snap.data().fechaEnvio;
    if (!last) return true; // si existe marcador sin fecha, no reenviar por seguridad
    const diff = Date.now() - new Date(last).getTime();
    return diff < ventanaHoras * 3600000;
  } catch (e) {
    console.warn('No se pudo verificar notificación previa (continúo):', e?.message || e);
    return false;
  }
};

// Marcar una notificación como enviada (anti-duplicado)
const marcarNotificacionEnviada = async (userId, eventoId, tipo) => {
  try {
    const id = `${userId}_${eventoId}_${tipo}`;
    await setDoc(doc(db, 'notificaciones_ultima', id), {
      userId,
      eventoId,
      tipo,
      lastSent: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('No se pudo marcar notificación enviada:', e?.message || e);
  }
};

// ==============================
// SISTEMA DE NOTIFICACIONES (Email y WhatsApp)
// ==============================

// Tipos de notificaciones
const TIPO_NOTIF = {
  RECORDATORIO_3DIAS: 'recordatorio_3dias',
  RECORDATORIO_DIA: 'recordatorio_dia',
  EVENTO_DISPONIBLE: 'evento_disponible',
  EVENTO_EDITADO: 'evento_editado',
  EVENTO_CANCELADO: 'evento_cancelado',
  CONFIRMAR_ASISTENCIA: 'confirmar_asistencia',
  CONFIRMACION_RECIBIDA: 'confirmacion_recibida',
  NUEVO_EVENTO: 'nuevo_evento'
};

/**
 * Notificar a todos los usuarios activos (excepto organizador) sobre nuevo evento
 */
async function notificarNuevoEvento(evento, eventoId) {
  // ⚠️ ADVERTENCIA: Esta función se ejecuta en segundo plano después de crear el evento
  // No debe lanzar errores que afecten al flujo principal
  try {
    console.log('🔔 notificarNuevoEvento INICIANDO para evento:', eventoId, evento?.titulo);
    
    // Validación temprana para salir rápido si no hay configuración
    if (!window.EMAILJS_CONFIG || !window.EMAILJS_CONFIG.SERVICE_ID) {
      console.log('⏭️ Notificaciones deshabilitadas (falta configuración EmailJS)');
      return;
    }

    const todosUsuarios = await getFromFirestore('usuarios');
    console.log(`👥 Total usuarios en BD: ${todosUsuarios?.length || 0}`);
    
    if (!todosUsuarios || todosUsuarios.length === 0) {
      console.log('⏭️ No hay usuarios para notificar');
      return;
    }

    // Filtrar usuarios con emails válidos (excepto organizador)
    const usuariosValidos = todosUsuarios.filter(u => {
      if (u.id === evento.organizadorId) return false;
      const email = u.email || u.destino;
      return email && email.includes('@');
    });
    
    console.log(`✉️ Usuarios con email válido (sin organizador): ${usuariosValidos.length}`);

    let notificacionesEnviadas = 0;
    let erroresEnvio = 0;
    let cuotaAgotada = false;

    console.log(`📧 Iniciando envío de notificaciones para: "${evento.titulo}"`);

    for (const usuario of usuariosValidos) {
      try {
        // Si ya detectamos cuota agotada, saltar resto
        if (cuotaAgotada) {
          console.log('⏭️ Cuota EmailJS agotada, omitiendo resto de notificaciones');
          break;
        }

        const email = usuario.email || usuario.destino;
        const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Usuario';
        
        console.log(`📬 Intentando notificar a: ${email} (${nombreCompleto})`);
        
        // Anti-duplicado: ventana 24h
        const duplicada = await fueNotificadaRecientemente(usuario.id, eventoId, TIPO_NOTIF.NUEVO_EVENTO, 24);
        if (duplicada) {
          console.log(`⏭️ ${email} ya fue notificado en las últimas 24h, omitiendo`);
          continue;
        }
        
        await loadEmailJS();
        const templateParams = {
          to_email: email,
          to_name: nombreCompleto,
          user_name: nombreCompleto,
          subject: sinAcentos(`¡Nuevo evento disponible! ${evento.titulo}`),
          message: `Se ha creado un nuevo evento: ${evento.titulo}. Sumate si te interesa.`,
          event_name: evento.titulo || 'Sin título',
          event_date: formatearFechaArgentina(evento.fecha) || 'No especificada',
          event_time: formatearHoraArgentina(evento.hora) || 'No especificada',
          event_location: evento.ubicacion || evento.lugar || 'No especificado',
          event_description: evento.descripcion || 'Sin descripción'
        };
        
        console.log(`📤 Enviando email a ${email}...`);
        
        await emailjs.send(
          EMAILJS_CONFIG.SERVICE_ID,
          EMAILJS_CONFIG.TEMPLATE_ID_RECORDATORIO,
          templateParams
        );
        
        console.log(`✅ Email enviado exitosamente a ${email}`);
        
        await marcarNotificacionEnviada(usuario.id, eventoId, TIPO_NOTIF.NUEVO_EVENTO);
        notificacionesEnviadas++;
        
        // Pequeña pausa entre envíos para no saturar EmailJS
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (errorUsuario) {
        erroresEnvio++;
        console.error(`❌ Error enviando a ${usuario.email || usuario.destino}:`, errorUsuario);
        
        // Detectar cuota agotada (426 o 402)
        if (errorUsuario?.status === 426 || errorUsuario?.status === 402 || 
            (errorUsuario?.text && errorUsuario.text.toLowerCase().includes('quota'))) {
          console.warn('⚠️ Cuota de EmailJS alcanzada. Las notificaciones se reanudarán cuando se renueve la cuota.');
          cuotaAgotada = true;
          break;
        }
        console.warn(`⚠️ No se pudo notificar a ${usuario.id}:`, errorUsuario.message || errorUsuario);
        // Continuar con el siguiente usuario sin interrumpir el proceso
      }
    }
    
    if (cuotaAgotada) {
      console.log(`⚠️ Notificaciones parciales: ${notificacionesEnviadas} enviadas antes de agotar cuota EmailJS`);
    } else {
      console.log(`✅ Notificaciones completadas: ${notificacionesEnviadas} enviadas, ${erroresEnvio} fallos`);
    }
  } catch (error) {
    // Error general: loggear pero no propagar
    console.error('❌ Error general en notificarNuevoEvento (no crítico):', error);
  }
}

/**
 * Enviar email usando EmailJS
 * @param {string} destinatario - Email del destinatario
 * @param {string} asunto - Asunto del email
 * @param {string} mensaje - Contenido del mensaje
 */
async function enviarEmail(destinatario, asunto, mensaje) {
  try {
    // Asegurar que EmailJS esté cargado e inicializado
    if (typeof loadEmailJS === 'function') {
      await loadEmailJS();
    }
    // Usar el template OTP para todas las notificaciones
    // El mensaje se envía en el campo verification_code para que se vea en el cuerpo
    const templateParams = {
      // Enviar múltiples aliases para cubrir distintas configuraciones de plantilla
      to_email: destinatario,
      email: destinatario,
      user_email: destinatario,
      reply_to: destinatario,
      to: destinatario,
      // Contenido
      verification_code: mensaje || '',
      codigo: mensaje || '',
      code: mensaje || '',
      subject: asunto || 'Notificacion',
      app_name: 'Activá'
    };
    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams
    );
    
    console.log('Email enviado exitosamente:', response);
    return true;
  } catch (error) {
    console.error('Error al enviar email:', error);
    return false;
  }
}

/**
 * Enviar mensaje por WhatsApp usando WhatsApp Business API
 * @param {string} numeroTelefono - Número de teléfono con código de país (ej: +541112345678)
 * @param {string} mensaje - Mensaje a enviar
 */
function enviarWhatsApp(numeroTelefono, mensaje) {
  try {
    // Limpiar número (quitar espacios, guiones, etc.)
    const numeroLimpio = numeroTelefono.replace(/[^\d+]/g, '');
    
    // Crear URL de WhatsApp con el mensaje pre-formateado
    const mensajeCodificado = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`;
    
    // Abrir WhatsApp en nueva pestaña (el usuario debe enviar manualmente)
    // Para envío automático necesitarías WhatsApp Business API con credenciales
    window.open(urlWhatsApp, '_blank');
    
    console.log('WhatsApp abierto para:', numeroLimpio);
    return true;
  } catch (error) {
    console.error('Error al abrir WhatsApp:', error);
    return false;
  }
}

/**
 * Guardar notificación en Firestore (registro/historial)
 */
async function registrarNotificacion(userId, tipo, eventoId, mensaje, metadata = {}) {
  try {
    const notifId = `${userId}_${eventoId}_${tipo}_${Date.now()}`;
    const notifRef = doc(db, 'notificaciones', notifId);
    
    // Limpiar metadata: eliminar valores undefined (Firestore no los permite)
    const metadataLimpio = {};
    for (const key in metadata) {
      if (metadata[key] !== undefined && metadata[key] !== null) {
        metadataLimpio[key] = metadata[key];
      }
    }
    
    await setDoc(notifRef, {
      userId,
      tipo,
      eventoId,
      mensaje,
      leida: false,
      fechaCreacion: new Date().toISOString(),
      fechaEnvio: new Date().toISOString(),
      metadata: metadataLimpio
    });
    
    // Actualizar marcador de última notificación para evitar duplicados
    const uniqId = `${userId}_${eventoId}_${tipo}`;
    await setDoc(doc(db, 'notificaciones_ultima', uniqId), {
      userId,
      eventoId,
      tipo,
      lastSent: new Date().toISOString()
    }, { merge: true });
    
    console.log('Notificación registrada:', notifId);
    return true;
  } catch (error) {
    console.error('Error al registrar notificación:', error);
    return false;
  }
}

/**
 * Enviar notificación a un usuario (email o WhatsApp según su preferencia)
 */
async function enviarNotificacion(userId, tipo, eventoId, mensaje, metadata = {}) {
  try {
    // Obtener datos del usuario
    const userRef = doc(db, 'usuarios', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.error('Usuario no encontrado:', userId);
      return false;
    }
    
    const usuario = userSnap.data();
    // ÚNICO CANAL: EMAIL
    const emailCandidato = (usuario.email && typeof usuario.email === 'string' && usuario.email.includes('@'))
      ? usuario.email
      : (usuario.destino && typeof usuario.destino === 'string' && usuario.destino.includes('@'))
        ? usuario.destino
        : '';
    const notificacionesActivas = usuario.notificacionesActivas !== false; // Por defecto true
    
    // Si el usuario desactivó notificaciones, no enviar
    if (!notificacionesActivas) {
      console.log('Usuario tiene notificaciones desactivadas:', userId);
      return false;
    }
    
    // Registrar en Firestore
    await registrarNotificacion(userId, tipo, eventoId, mensaje, metadata);
    
    // Enviar SIEMPRE por EMAIL
    let enviado = false;
    console.log(`📣 [enviarNotificacion] Canal: email | email=${emailCandidato || '-'}`);
    if (emailCandidato) {
      const asunto = `Activá - ${metadata.tituloEvento || 'Notificación'}`;
      console.log(`📧 [enviarNotificacion] Enviando EMAIL a ${emailCandidato} | tipo=${tipo}`);
      enviado = await enviarEmail(emailCandidato, asunto, mensaje);
    } else {
      console.warn(`🚫 [enviarNotificacion] Usuario ${userId} no tiene email válido en 'email' ni en 'destino'.`);
    }
    
    if (enviado) {
      console.log(`✅ [enviarNotificacion] Notificación enviada a ${usuario.nombre || userId} por EMAIL`);
    } else {
      console.warn(`❌ [enviarNotificacion] Falló el envío a ${usuario.nombre || userId}. Ver logs previos.`);
    }
    
    return enviado;
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    return false;
  }
}

/**
 * Notificar a todos los participantes de un evento
 */
async function notificarParticipantes(eventoId, tipo, mensaje, metadata = {}) {
  try {
    // Obtener evento
    const eventoRef = doc(db, 'eventos', eventoId);
    const eventoSnap = await getDoc(eventoRef);
    if (!eventoSnap.exists()) {
      console.error('Evento no encontrado:', eventoId);
      return;
    }

    const evento = eventoSnap.data();
    const participantes = Array.isArray(evento.participantes)
      ? evento.participantes
      : (Array.isArray(evento.usuariosUnidos) ? evento.usuariosUnidos : []);

    if (participantes.length === 0) {
      console.log('No hay participantes para notificar');
      return;
    }

    // Determinar tipo de email para plantilla estilizada
  let tipoEmail = 'dia';
  if (tipo === TIPO_NOTIF.CONFIRMAR_ASISTENCIA) tipoEmail = 'confirmar_asistencia';
  else if (tipo === TIPO_NOTIF.RECORDATORIO_DIA) tipoEmail = 'dia';

    console.log(`📧 Usando plantilla estilizada para ${participantes.length} participantes. Tipo=${tipoEmail}`);

    // Ventana por tipo
    const ventanaHorasPorTipo = (t) => {
      if (t === TIPO_NOTIF.RECORDATORIO_3DIAS) return 30;
      if (t === TIPO_NOTIF.RECORDATORIO_DIA) return 20;
      if (t === TIPO_NOTIF.CONFIRMAR_ASISTENCIA) return 30;
      if (t === TIPO_NOTIF.EVENTO_DISPONIBLE) return 10;
      return 24;
    };

    for (const userId of participantes) {
      try {
        const usuario = await getFromFirestore('usuarios', userId);
        if (!usuario) continue;
        const email = (usuario.email && usuario.email.includes('@')) ? usuario.email : (usuario.destino && usuario.destino.includes('@') ? usuario.destino : '');
        if (!email) continue;
        const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Usuario';
        // No enviar si el evento ya pasó
        const fechaEvt = crearFechaLocal(evento.fecha, evento.hora);
        if (!fechaEvt || fechaEvt.getTime() <= Date.now()) { continue; }
        // Anti-duplicados por tipo
        const duplicada = await fueNotificadaRecientemente(userId, eventoId, tipo, ventanaHorasPorTipo(tipo));
        if (duplicada) { console.log(`⏭️ Ya se envió a ${userId} (día del evento) para ${evento.titulo}`); continue; }
        await enviarEmailRecordatorio(email, evento, tipoEmail, nombreCompleto);
        await marcarNotificacionEnviada(userId, eventoId, tipo);
        await new Promise(r => setTimeout(r, 400));
      } catch (e) {
        console.error(`Error enviando email a participante ${userId}:`, e);
      }
    }
    console.log('Notificaciones enviadas a participantes');
  } catch (error) {
    console.error('Error al notificar participantes:', error);
  }
}

/**
 * Notificar a todos los usuarios activos (excepto participantes)
 */
async function notificarTodosUsuarios(eventoId, mensaje, metadata = {}) {
  try {
    // Obtener evento
    const eventoRef = doc(db, 'eventos', eventoId);
    const eventoSnap = await getDoc(eventoRef);
    if (!eventoSnap.exists()) return;

    const evento = eventoSnap.data();
    const participantes = Array.isArray(evento.participantes)
      ? evento.participantes
      : (Array.isArray(evento.usuariosUnidos) ? evento.usuariosUnidos : []);

    // Obtener todos los usuarios
    const usuariosRef = collection(db, 'usuarios');
    const usuariosSnap = await getDocs(usuariosRef);
    if (usuariosSnap.empty) return;

    // Filtrar usuarios que NO son participantes
    const usuariosNoParticipantes = [];
    usuariosSnap.forEach(doc => {
      if (!participantes.includes(doc.id)) {
        usuariosNoParticipantes.push({ id: doc.id, ...doc.data() });
      }
    });

    if (usuariosNoParticipantes.length === 0) {
      console.log('No hay usuarios para notificar (todos son participantes)');
      return;
    }

    console.log(`Notificando a ${usuariosNoParticipantes.length} usuarios sobre evento disponible (plantilla estilizada)`);

    for (const usuario of usuariosNoParticipantes) {
      try {
        const email = (usuario.email && usuario.email.includes('@')) ? usuario.email : (usuario.destino && usuario.destino.includes('@') ? usuario.destino : '');
        if (!email) continue;
        const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Usuario';
        await enviarEmailRecordatorio(email, evento, 'evento_disponible', nombreCompleto);
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`Error notificando usuario ${usuario.id}:`, e);
      }
    }

    console.log('Notificaciones broadcast enviadas');
  } catch (error) {
    console.error('Error al notificar a todos los usuarios:', error);
  }
}

/**
 * Generar recordatorios diarios automáticos
 * Esta función debe ejecutarse diariamente (idealmente con Cloud Functions)
 */
async function generarRecordatoriosDiarios() {
  try {
    console.log('Generando recordatorios diarios...');
    
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const tresDias = new Date(hoy);
    tresDias.setDate(tresDias.getDate() + 3);
    
    // Obtener todos los eventos
    const eventosRef = collection(db, 'eventos');
    const eventosSnap = await getDocs(eventosRef);
    
    if (eventosSnap.empty) {
      console.log('No hay eventos para procesar');
      return;
    }
    
    for (const docSnap of eventosSnap.docs) {
      const evento = docSnap.data();
      const eventoId = docSnap.id;
      
      // Parsear fecha del evento
      const fechaEvento = crearFechaLocal(evento.fecha, evento.hora);
      if (!fechaEvento) continue;
      
      const fechaEventoSolo = new Date(fechaEvento.getFullYear(), fechaEvento.getMonth(), fechaEvento.getDate());
      
      // === RECORDATORIO 3 DÍAS ANTES (CONFIRMACIÓN) ===
      if (fechaEventoSolo.getTime() === tresDias.getTime()) {
        const mensaje = `🔔 Recordatorio: Confirmá tu asistencia al evento "${evento.titulo}"\n\n` +
          `📅 Fecha: ${formatearFechaArgentina(evento.fecha)}\n` +
          `🕐 Hora: ${formatearHoraArgentina(evento.hora)}\n` +
          `📍 Lugar: ${evento.lugar}\n\n` +
          `Por favor, confirmá si vas a asistir. Si no podés ir, cancelá para liberar tu cupo.`;
        
        await notificarParticipantes(
          eventoId,
          TIPO_NOTIF.CONFIRMAR_ASISTENCIA,
          mensaje,
          { fecha: evento.fecha, hora: evento.hora, lugar: evento.lugar }
        );
      }
      
      // === RECORDATORIO DÍA DEL EVENTO ===
      if (fechaEventoSolo.getTime() === hoy.getTime()) {
        // 1. Recordatorio a participantes
        const mensajeParticipantes = `⏰ ¡Hoy es el evento "${evento.titulo}"!\n\n` +
          `🕐 Hora: ${formatearHoraArgentina(evento.hora)}\n` +
          `📍 Lugar: ${evento.lugar}\n\n` +
          `¡Te esperamos!`;
        
        await notificarParticipantes(
          eventoId,
          TIPO_NOTIF.RECORDATORIO_DIA,
          mensajeParticipantes,
          { fecha: evento.fecha, hora: evento.hora, lugar: evento.lugar }
        );
        
        // 2. Si hay cupos disponibles, notificar a todos los usuarios
        const unidos = Array.isArray(evento.participantes)
          ? evento.participantes.length
          : (Array.isArray(evento.usuariosUnidos) ? evento.usuariosUnidos.length : Number(evento.unidos || 0));
        const maxPersonas = evento.maxPersonas || 0;
        
        if (unidos < maxPersonas) {
          const cuposDisponibles = maxPersonas - unidos;
          const mensajeCupos = `🎉 ¡Cupos disponibles para HOY!\n\n` +
            `📌 Evento: ${evento.titulo}\n` +
            `🕐 Hora: ${formatearHoraArgentina(evento.hora)}\n` +
            `📍 Lugar: ${evento.lugar}\n` +
            `👥 Cupos disponibles: ${cuposDisponibles}\n\n` +
            `¡Sumate ahora!`;
          
          await notificarTodosUsuarios(
            eventoId,
            mensajeCupos,
            { fecha: evento.fecha, hora: evento.hora, lugar: evento.lugar, cuposDisponibles }
          );
        }
      }
    }
    
    console.log('Recordatorios diarios generados exitosamente');
  } catch (error) {
    console.error('Error al generar recordatorios diarios:', error);
  }
}

// ==============================
// FUNCIONES DE NOTIFICACIONES POR EMAIL
// ==============================

// Función para corregir doble codificación UTF-8
const corregirCodificacion = (txt = '') => {
  try {
    let str = String(txt);
    
    // Reemplazos directos de patrones mal codificados más comunes
    str = str.replace(/Ã¡/g, 'á');
    str = str.replace(/Ã©/g, 'é');
    str = str.replace(/Ã­/g, 'í');
    str = str.replace(/Ã³/g, 'ó');
    str = str.replace(/Ãº/g, 'ú');
    str = str.replace(/Ã±/g, 'ñ');
    str = str.replace(/Ã¼/g, 'ü');
    str = str.replace(/Â¡/g, '¡');
    str = str.replace(/Â¿/g, '¿');
    
    // Patrones de triple codificación (más severos)
    str = str.replace(/ÃƒÂ³/g, 'ó');
    str = str.replace(/ÃƒÂ±/g, 'ñ');
    str = str.replace(/ÃƒÂ¡/g, 'á');
    str = str.replace(/ÃƒÂ©/g, 'é');
    str = str.replace(/ÃƒÂ­/g, 'í');
    str = str.replace(/ÃƒÂº/g, 'ú');
    str = str.replace(/Ãƒ/g, 'Ó');
    str = str.replace(/Ã‚/g, '');
    
    return str;
  } catch { 
    return String(txt || ''); 
  }
};

// Sanitizador básico para evitar caracteres raros en algunos clientes de correo
const sinAcentos = (txt = '') => {
  try {
    return String(txt)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar diacríticos
      .replace(/[¡]/g, '!').replace(/[¿]/g, '?');         // puntación invertida
  } catch { return String(txt || ''); }
};

/**
 * Enviar email de recordatorio usando template dedicado
 * @param {string} destinatario - Email del destinatario
 * @param {object} eventoData - Datos del evento
 * @param {string} tipoRecordatorio - Tipo: '24h', '1h', 'confirmacion', 'nuevo_participante'
 */
async function enviarEmailRecordatorio(destinatario, eventoData, tipoRecordatorio, nombreUsuario = '') {
  try {
    console.log(`📧 [enviarEmailRecordatorio] Tipo: ${tipoRecordatorio}, Destinatario: ${destinatario}`);
    
    await loadEmailJS();
    console.log(`📧 [enviarEmailRecordatorio] EmailJS cargado`);
    
    let subject = '';
    let message = '';
    
    switch(tipoRecordatorio) {
      case '24h':
        subject = `Recordatorio: ${eventoData.titulo} es mañana`;
          message = `Te recordamos que mañana tenés el siguiente evento:`;
        break;
      case '1h':
        subject = `¡Comienza en 1 hora! ${eventoData.titulo}`;
          message = `Tu evento comienza en aproximadamente 1 hora. No te lo pierdas:`;
        break;
      case 'dia':
        subject = `¡Hoy es el evento! ${eventoData.titulo}`;
          message = `¡Hoy es el día! Te esperamos en:`;
        break;
      case 'confirmacion':
        subject = `Confirmación: Te uniste a ${eventoData.titulo}`;
          message = `Confirmamos tu participación en el siguiente evento:`;
        break;
      case 'confirmar_asistencia':
        subject = `Confirmá tu asistencia: ${eventoData.titulo}`;
          message = `Por favor confirmá si vas a asistir. Detalles del evento:`;
        break;
      case 'nuevo_participante':
        subject = `Nuevo participante en tu evento: ${eventoData.titulo}`;
          message = `Un nuevo participante se unió a tu evento:`;
        break;
      case 'evento_disponible':
        subject = `¡Cupos disponibles para HOY! ${eventoData.titulo}`;
          message = `Todavía hay lugares para este evento que ocurre HOY:`;
        break;
      default:
        subject = `Notificación sobre ${eventoData.titulo}`;
        message = `¡Hola ${nombreUsuario}! Te enviamos una notificación sobre el siguiente evento:`;
    }
    
    const templateParams = {
      to_name: nombreUsuario,
      to_email: destinatario,
      from_name: 'Activa',
      reply_to: 'activapp.oficial@gmail.com',
      user_name: nombreUsuario,
      subject: sinAcentos(subject),
      message: message,
      event_name: eventoData.titulo || 'Sin título',
      event_date: formatearFechaArgentina(eventoData.fecha) || 'No especificada',
      event_time: formatearHoraArgentina(eventoData.hora) || 'No especificada',
      event_location: eventoData.ubicacion || eventoData.lugar || 'No especificado',
      event_description: eventoData.descripcion || 'Sin descripción'
    };
    
    console.log(`📧 [enviarEmailRecordatorio] Template params:`, templateParams);
    console.log(`📧 [enviarEmailRecordatorio] Destinatario final: ${destinatario}`);
    
    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID_RECORDATORIO,
      templateParams
    );
    
    console.log(`✅ [enviarEmailRecordatorio] Email de recordatorio (${tipoRecordatorio}) enviado a ${destinatario}`, response);
    return true;
  } catch (error) {
    console.error(`❌ [enviarEmailRecordatorio] Error enviando email de recordatorio (${tipoRecordatorio}):`, error);
    return false;
  }
}

/**
 * Enviar confirmación cuando un usuario se une a un evento
 * @param {string} userId - ID del usuario que se une
 * @param {string} eventoId - ID del evento
 */
async function enviarConfirmacionUnion(userId, eventoId) {
  try {
    console.log(`📧 [enviarConfirmacionUnion] Iniciando para userId=${userId}, eventoId=${eventoId}`);
    
    const usuario = await getFromFirestore('usuarios', userId);
    const evento = await getFromFirestore('eventos', eventoId);
    
    console.log(`📧 [enviarConfirmacionUnion] Usuario encontrado:`, usuario ? 'Sí' : 'No');
    console.log(`📧 [enviarConfirmacionUnion] Evento encontrado:`, evento ? 'Sí' : 'No');
    
    if (!usuario || !evento) {
      console.error('❌ [enviarConfirmacionUnion] Usuario o evento no encontrado');
      return false;
    }
    
    // Obtener email del usuario
    const email = usuario.email || usuario.destino;
    console.log(`📧 [enviarConfirmacionUnion] Email detectado: ${email}`);
    
    if (!email || !email.includes('@')) {
      console.log('⚠️ [enviarConfirmacionUnion] Usuario no tiene email válido');
      return false;
    }
    
    const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Usuario';
    console.log(`📧 [enviarConfirmacionUnion] Nombre: ${nombreCompleto}`);
    
    console.log(`📧 [enviarConfirmacionUnion] Llamando a enviarEmailRecordatorio...`);
    await enviarEmailRecordatorio(email, evento, 'confirmacion', nombreCompleto);
    
    // Registrar en historial de notificaciones
    await registrarNotificacion(
      userId,
      TIPO_NOTIF.CONFIRMACION_RECIBIDA,
      eventoId,
      `Confirmación de unión al evento ${evento.titulo}`,
      { tituloEvento: evento.titulo }
    );
    
    console.log(`✅ [enviarConfirmacionUnion] Proceso completado exitosamente`);
    return true;
  } catch (error) {
    console.error('❌ [enviarConfirmacionUnion] Error:', error);
    return false;
  }
}

/**
 * Notificar al organizador cuando alguien se une a su evento
 * @param {string} organizadorId - ID del organizador del evento
 * @param {string} nuevoParticipanteId - ID del usuario que se unió
 * @param {string} eventoId - ID del evento
 */
async function notificarOrganizadorNuevoParticipante(organizadorId, nuevoParticipanteId, eventoId) {
  try {
    const organizador = await getFromFirestore('usuarios', organizadorId);
    const participante = await getFromFirestore('usuarios', nuevoParticipanteId);
    const evento = await getFromFirestore('eventos', eventoId);
    
    if (!organizador || !participante || !evento) {
      console.error('Datos no encontrados para notificar organizador');
      return false;
    }
    
    // Obtener email del organizador
    const emailOrganizador = organizador.email || organizador.destino;
    if (!emailOrganizador || !emailOrganizador.includes('@')) {
      console.log('Organizador no tiene email válido');
      return false;
    }
    
    const nombreOrganizador = `${organizador.nombre || ''} ${organizador.apellido || ''}`.trim() || 'Organizador';
    const nombreParticipante = `${participante.nombre || ''} ${participante.apellido || ''}`.trim() || 'Un usuario';
    
    // Agregar info del nuevo participante al evento
    const eventoConInfo = {
      ...evento,
      descripcion: `${nombreParticipante} se unió a tu evento. Total de participantes: ${(evento.participantes || evento.usuariosUnidos || []).length}`
    };
    
    await enviarEmailRecordatorio(emailOrganizador, eventoConInfo, 'nuevo_participante', nombreOrganizador);
    
    return true;
  } catch (error) {
    console.error('Error notificando al organizador:', error);
    return false;
  }
}

/**
 * Enviar recordatorios 24 horas antes de cada evento
 * Debe ejecutarse diariamente
 */
async function enviarRecordatorios24Horas() {
  try {
    console.log('📧 Procesando recordatorios 24 horas...');
    
    const ahora = new Date();
    const en24Horas = new Date(ahora.getTime() + (24 * 60 * 60 * 1000));
    const fechaBuscada = en24Horas.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Obtener todos los eventos con fecha mañana
    const eventos = await getFromFirestoreWhere('eventos', 'fecha', '==', fechaBuscada);
    
    if (!eventos || eventos.length === 0) {
      console.log('No hay eventos programados para mañana');
      return;
    }
    
    console.log(`Encontrados ${eventos.length} eventos para mañana`);
    
    for (const evento of eventos) {
      const participantes = evento.participantes || evento.usuariosUnidos || [];
      
      if (participantes.length === 0) {
        console.log(`Evento "${evento.titulo}" no tiene participantes`);
        continue;
      }
      
      // Enviar recordatorio a cada participante
      for (const userId of participantes) {
        try {
          const usuario = await getFromFirestore('usuarios', userId);
          if (!usuario) continue;
          
          const email = usuario.email || usuario.destino;
          if (!email || !email.includes('@')) continue;
          
          const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Usuario';
          // Evitar duplicados en la última 30h para recordatorio 24h (ventana amplia para no duplicar)
          const duplicada = await fueNotificadaRecientemente(userId, evento.id, TIPO_NOTIF.RECORDATORIO_DIA, 30);
          if (duplicada) { console.log(`⏭️ Ya se envió 24h a ${userId} para ${evento.titulo}`); continue; }
          
          await enviarEmailRecordatorio(email, evento, '24h', nombreCompleto);
          await marcarNotificacionEnviada(userId, evento.id, TIPO_NOTIF.RECORDATORIO_DIA);
          
          // Pequeña pausa para no saturar EmailJS
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error enviando recordatorio 24h a usuario ${userId}:`, error);
        }
      }
    }
    
    console.log('✅ Recordatorios 24h procesados');
  } catch (error) {
    console.error('❌ Error en enviarRecordatorios24Horas:', error);
  }
}

/**
 * Enviar recordatorios 1 hora antes de cada evento
 * Debe ejecutarse cada hora
 */
async function enviarRecordatorios1Hora() {
  try {
    console.log('📧 Procesando recordatorios 1 hora...');
    
    const ahora = new Date();
    const en1Hora = new Date(ahora.getTime() + (60 * 60 * 1000));
    
    // Obtener todos los eventos
    const eventos = await getFromFirestore('eventos');
    
    if (!eventos || eventos.length === 0) {
      console.log('No hay eventos en la base de datos');
      return;
    }
    
    let eventosProcesados = 0;
    
    for (const evento of eventos) {
      const fechaEvento = crearFechaLocal(evento.fecha, evento.hora);
      if (!fechaEvento) continue;
      
      const diferenciaMs = fechaEvento.getTime() - ahora.getTime();
      const diferenciaHoras = diferenciaMs / (60 * 60 * 1000);
      
      // Si el evento es entre 1 y 1.5 horas (para evitar envíos duplicados)
      if (diferenciaHoras >= 1 && diferenciaHoras <= 1.5) {
        const participantes = evento.participantes || evento.usuariosUnidos || [];
        
        if (participantes.length === 0) continue;
        
        for (const userId of participantes) {
          try {
            const usuario = await getFromFirestore('usuarios', userId);
            if (!usuario) continue;
            
            const email = usuario.email || usuario.destino;
            if (!email || !email.includes('@')) continue;
            
            const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Usuario';
            // Evitar duplicados en la última 2h
            const duplicada = await fueNotificadaRecientemente(userId, evento.id, TIPO_NOTIF.RECORDATORIO_DIA, 2);
            if (duplicada) { console.log(`⏭️ Ya se envió 1h a ${userId} para ${evento.titulo}`); continue; }
            
            await enviarEmailRecordatorio(email, evento, '1h', nombreCompleto);
            await marcarNotificacionEnviada(userId, evento.id, TIPO_NOTIF.RECORDATORIO_DIA);
            
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`Error enviando recordatorio 1h a usuario ${userId}:`, error);
          }
        }
        
        eventosProcesados++;
      }
    }
    
    console.log(`✅ Recordatorios 1h procesados para ${eventosProcesados} eventos`);
  } catch (error) {
    console.error('❌ Error en enviarRecordatorios1Hora:', error);
  }
}

/**
 * Enviar recordatorios 3 DÍAS ANTES del evento (a la hora del evento)
 * Debe ejecutarse cada hora para captar el momento exacto
 * Notifica SOLO a participantes confirmados
 */
async function enviarRecordatorios3Dias() {
  try {
    console.log('📧 Procesando recordatorios 3 días antes...');
    
    const ahora = new Date();
    
    // Calcular fecha de hace 3 días
    const en3Dias = new Date(ahora);
    en3Dias.setDate(en3Dias.getDate() + 3);
    const fechaEn3Dias = en3Dias.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Obtener eventos de dentro de 3 días
    const eventos = await getFromFirestoreWhere('eventos', 'fecha', '==', fechaEn3Dias);
    
    if (!eventos || eventos.length === 0) {
      console.log('No hay eventos programados para dentro de 3 días');
      return 0;
    }
    
    console.log(`Encontrados ${eventos.length} eventos para dentro de 3 días (${fechaEn3Dias})`);
    let notificacionesEnviadas = 0;
    
    for (const evento of eventos) {
      try {
        const participantes = evento.participantes || [];
        if (participantes.length === 0) {
          console.log(`⏭️ Evento "${evento.titulo}" sin participantes`);
          continue;
        }
        
        // Calcular hora exacta del evento (dentro de 3 días)
        const fechaEvento = crearFechaLocal(evento.fecha, evento.hora);
        if (!fechaEvento) {
          console.log(`⏭️ Evento "${evento.titulo}" sin hora válida`);
          continue;
        }
        
        // Calcular diferencia en horas
        const diferencia = fechaEvento.getTime() - ahora.getTime();
        const horasHastaEvento = diferencia / (1000 * 60 * 60);
        
        // Verificar si estamos en la ventana de 72 horas (entre 71.5 y 72.5 horas = ~3 días)
        if (horasHastaEvento < 71.5 || horasHastaEvento > 72.5) {
          continue;
        }
        
        console.log(`🎯 Evento "${evento.titulo}" en exactamente ~3 días (${horasHastaEvento.toFixed(1)}h)`);
        
        // Notificar a participantes
        for (const participanteId of participantes) {
          try {
            const participante = await getFromFirestoreById('usuarios', participanteId);
            if (!participante) continue;
            
            const email = participante.email || participante.destino;
            if (!email || !email.includes('@')) continue;
            
            // Evitar duplicados (ventana de 20 horas)
            const duplicada = await fueNotificadaRecientemente(
              participanteId,
              evento.id,
              TIPO_NOTIF.RECORDATORIO_3DIAS,
              20
            );
            if (duplicada) continue;
            
            const nombreCompleto = `${participante.nombre || ''} ${participante.apellido || ''}`.trim() || 'Usuario';
            
            await loadEmailJS();
            
            const templateParams = {
              to_email: email,
              to_name: nombreCompleto,
              user_name: nombreCompleto,
              subject: sinAcentos(`Recordatorio: ${evento.titulo} en 3 dias`),
              message: `Este es un recordatorio de que estás inscrito/a en el evento "${evento.titulo}" que se realizará dentro de 3 días. ¡Te esperamos!`,
              event_name: evento.titulo || 'Sin título',
              event_date: formatearFechaArgentina(evento.fecha) || 'No especificada',
              event_time: formatearHoraArgentina(evento.hora) || 'No especificada',
              event_location: evento.ubicacion || evento.lugar || 'No especificado',
              event_description: evento.descripcion || 'Sin descripción'
            };
            
            await emailjs.send(
              EMAILJS_CONFIG.SERVICE_ID,
              EMAILJS_CONFIG.TEMPLATE_ID_RECORDATORIO,
              templateParams
            );
            
            await marcarNotificacionEnviada(participanteId, evento.id, TIPO_NOTIF.RECORDATORIO_3DIAS);
            notificacionesEnviadas++;
            console.log(`✅ Recordatorio 3 días enviado a ${email} para ${evento.titulo}`);
            
            // Pausa para no saturar EmailJS
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`Error enviando a ${participanteId}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error procesando evento ${evento.titulo}:`, error);
      }
    }
    
    console.log(`✅ Recordatorios 3 días antes: ${notificacionesEnviadas} enviados`);
    return notificacionesEnviadas;
  } catch (error) {
    console.error('❌ Error en enviarRecordatorios3Dias:', error);
    return 0;
  }
}

/**
 * Notificar cupos disponibles 3 HORAS antes del evento
 * Debe ejecutarse cada hora
 * Solo notifica si quedan lugares disponibles
 */
async function notificarCuposDisponibles3HorasAntes() {
  try {
    console.log('📧 Procesando notificaciones de cupos disponibles (3h antes)...');
    
    const ahora = new Date();
    const hoy = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Obtener todos los eventos de hoy
    const eventosHoy = await getFromFirestoreWhere('eventos', 'fecha', '==', hoy);
    
    if (!eventosHoy || eventosHoy.length === 0) {
      console.log('No hay eventos para hoy');
      return 0;
    }
    
    console.log(`Encontrados ${eventosHoy.length} eventos para hoy`);
    let notificacionesEnviadas = 0;
    
    for (const evento of eventosHoy) {
      try {
        // Calcular hora exacta del evento
        const fechaEvento = crearFechaLocal(evento.fecha, evento.hora);
        if (!fechaEvento) {
          console.log(`⏭️ Evento "${evento.titulo}" sin hora válida`);
          continue;
        }
        
        // Calcular diferencia en milisegundos
        const diferencia = fechaEvento.getTime() - ahora.getTime();
        const horasHastaEvento = diferencia / (1000 * 60 * 60);
        
        // Verificar si está en la ventana de 3 horas (entre 2.9 y 3.1 horas = ventana de 12 min)
        // Ventana estrecha para evitar envíos duplicados en ejecuciones consecutivas del cron
        if (horasHastaEvento < 2.9 || horasHastaEvento > 3.1) {
          continue;
        }
        
        // Verificar si hay cupos disponibles
        const participantes = evento.participantes || [];
        const maxPersonas = evento.maxPersonas || 999;
        const cuposDisponibles = maxPersonas - participantes.length;
        
        if (cuposDisponibles <= 0) {
          console.log(`⏭️ Evento "${evento.titulo}" sin cupos disponibles (${participantes.length}/${maxPersonas})`);
          continue;
        }
        
        console.log(`🎯 Evento "${evento.titulo}" tiene ${cuposDisponibles} cupos disponibles (en ${horasHastaEvento.toFixed(1)}h)`);
        
        // Obtener TODOS los usuarios (no solo participantes)
        const todosUsuarios = await getFromFirestore('usuarios');
        if (!todosUsuarios || todosUsuarios.length === 0) continue;
        
        for (const usuario of todosUsuarios) {
          try {
            // Saltar si ya es participante
            if (participantes.includes(usuario.id)) continue;
            
            const email = usuario.email || usuario.destino;
            if (!email || !email.includes('@')) continue;
            
            // Evitar duplicados (ventana de 4 horas para esta notificación)
            const duplicada = await fueNotificadaRecientemente(
              usuario.id,
              evento.id,
              TIPO_NOTIF.EVENTO_DISPONIBLE,
              4
            );
            if (duplicada) continue;
            
            const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Usuario';
            
            await loadEmailJS();
            
            const templateParams = {
              to_email: email,
              to_name: nombreCompleto,
              user_name: nombreCompleto,
              subject: sinAcentos(`¡Ultimos ${cuposDisponibles} cupos! ${evento.titulo} en 3 horas`),
              message: `¡Atención! El evento "${evento.titulo}" comienza en 3 horas y todavía quedan ${cuposDisponibles} lugares disponibles. ¡No te lo pierdas!`,
              event_name: evento.titulo || 'Sin título',
              event_date: formatearFechaArgentina(evento.fecha) || 'No especificada',
              event_time: formatearHoraArgentina(evento.hora) || 'No especificada',
              event_location: evento.ubicacion || evento.lugar || 'No especificado',
              event_description: evento.descripcion || 'Sin descripción'
            };
            
            await emailjs.send(
              EMAILJS_CONFIG.SERVICE_ID,
              EMAILJS_CONFIG.TEMPLATE_ID_RECORDATORIO,
              templateParams
            );
            
            await marcarNotificacionEnviada(usuario.id, evento.id, TIPO_NOTIF.EVENTO_DISPONIBLE);
            notificacionesEnviadas++;
            console.log(`✅ Notificación de cupos enviada a ${email} para ${evento.titulo}`);
            
            // Pausa para no saturar EmailJS
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`Error enviando a ${usuario.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error procesando evento ${evento.titulo}:`, error);
      }
    }
    
    console.log(`✅ Notificaciones de cupos disponibles: ${notificacionesEnviadas} enviadas`);
    return notificacionesEnviadas;
  } catch (error) {
    console.error('❌ Error en notificarCuposDisponibles3HorasAntes:', error);
    return 0;
  }
}

/**
 * Enviar recordatorios el DÍA DEL EVENTO (por la mañana)
 * Debe ejecutarse cada hora para captar eventos del día
 */
async function enviarRecordatoriosDiaDelEvento() {
  try {
    console.log('📧 Procesando recordatorios del día del evento...');
    
    const ahora = new Date();
    const hoy = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaActual = ahora.getHours();
    
    // Ejecutar a las 04:00 AM preferentemente, pero también permitir en otros horarios
    // si es la primera vez que se ejecuta hoy (para testing y casos donde no se ejecutó a las 4 AM)
    const ejecutarAhora = horaActual === 4 || horaActual >= 8; // 4 AM o después de las 8 AM
    
    if (!ejecutarAhora) {
      console.log(`⏭️ Fuera del horario de envío (04:00 AM o después de 08:00 AM). Hora actual: ${horaActual}:00`);
      return;
    }
    
    // Obtener todos los eventos de hoy
    const eventos = await getFromFirestoreWhere('eventos', 'fecha', '==', hoy);
    
    if (!eventos || eventos.length === 0) {
      console.log('No hay eventos programados para hoy');
      return;
    }
    
    console.log(`Encontrados ${eventos.length} eventos para hoy`);
    
    for (const evento of eventos) {
      const participantes = evento.participantes || evento.usuariosUnidos || [];
      
      if (participantes.length === 0) continue;
      
      // Solo enviar si aún no se envió (verificar si el evento ya pasó)
      const fechaEvento = crearFechaLocal(evento.fecha, evento.hora);
      if (!fechaEvento || fechaEvento.getTime() < ahora.getTime()) {
        continue; // Evento ya pasó
      }
      
      // Enviar recordatorio a cada participante
      for (const userId of participantes) {
        try {
          const usuario = await getFromFirestore('usuarios', userId);
          if (!usuario) continue;
          
          const email = usuario.email || usuario.destino;
          if (!email || !email.includes('@')) continue;
          
          const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Usuario';
          // Evitar duplicados en la última 20h para el día del evento
          const duplicada = await fueNotificadaRecientemente(userId, evento.id, TIPO_NOTIF.RECORDATORIO_DIA, 20);
          if (duplicada) { console.log(`⏭️ Ya se envió DÍA a ${userId} para ${evento.titulo}`); continue; }
          
          await loadEmailJS();
          
          const templateParams = {
            to_email: email,
            to_name: nombreCompleto,
            user_name: nombreCompleto,
            subject: sinAcentos(`¡Hoy es el dia! ${evento.titulo}`),
            message: `Hoy es el día de tu evento. ¡Prepárate y diviértete!`,
            event_name: evento.titulo || 'Sin título',
            event_date: formatearFechaArgentina(evento.fecha) || 'No especificada',
            event_time: formatearHoraArgentina(evento.hora) || 'No especificada',
            event_location: evento.ubicacion || evento.lugar || 'No especificado',
            event_description: evento.descripcion || 'Sin descripción'
          };
          
          await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID_RECORDATORIO,
            templateParams
          );
          
          console.log(`✅ Recordatorio día del evento enviado a ${email}`);
          await marcarNotificacionEnviada(userId, evento.id, TIPO_NOTIF.RECORDATORIO_DIA);
          
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error enviando recordatorio día evento a usuario ${userId}:`, error);
        }
      }
    }
    
    console.log('✅ Recordatorios día del evento procesados');
  } catch (error) {
    console.error('❌ Error en enviarRecordatoriosDiaDelEvento:', error);
  }
}

/**
 * Notificar a TODOS los usuarios sobre eventos con cupos disponibles HOY
 * Ejecutar una vez por día (por la mañana)
 */
async function notificarEventosDisponiblesHoy() {
  try {
    console.log('📧 Notificando eventos con cupos disponibles hoy...');
    
    const ahora = new Date();
    const hoy = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Obtener todos los eventos de hoy
    const eventosHoy = await getFromFirestoreWhere('eventos', 'fecha', '==', hoy);
    
    if (!eventosHoy || eventosHoy.length === 0) {
      console.log('No hay eventos programados para hoy');
      return;
    }
    
    // Filtrar solo eventos con cupos disponibles
    const eventosDisponibles = eventosHoy.filter(evento => {
      const participantes = evento.participantes || evento.usuariosUnidos || [];
      const maxPersonas = Number(evento.maxPersonas || 0);
      return participantes.length < maxPersonas;
    });
    
    if (eventosDisponibles.length === 0) {
      console.log('No hay eventos con cupos disponibles hoy');
      return;
    }
    
    console.log(`${eventosDisponibles.length} eventos con cupos disponibles hoy`);
    
    // Obtener todos los usuarios
    const todosUsuarios = await getFromFirestore('usuarios');
    
    if (!todosUsuarios || todosUsuarios.length === 0) {
      console.log('No hay usuarios en la base de datos');
      return;
    }
    
    // Enviar notificación a cada usuario sobre cada evento disponible
    for (const evento of eventosDisponibles) {
      const participantes = evento.participantes || evento.usuariosUnidos || [];
      const cuposDisponibles = Number(evento.maxPersonas || 0) - participantes.length;
      
      for (const usuario of todosUsuarios) {
        // Saltar si ya está participando o es el organizador
        if (participantes.includes(usuario.id) || usuario.id === evento.organizadorId) {
          continue;
        }
        
        const email = usuario.email || usuario.destino;
        if (!email || !email.includes('@')) continue;
        
        const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Usuario';
        // No notificar si el evento ya pasó
        const fechaEvt = crearFechaLocal(evento.fecha, evento.hora);
        if (!fechaEvt || fechaEvt.getTime() <= Date.now()) { continue; }
        // Evitar duplicado en últimas 10h
        const duplicada = await fueNotificadaRecientemente(usuario.id, evento.id, TIPO_NOTIF.EVENTO_DISPONIBLE, 10);
        if (duplicada) { console.log(`⏭️ Ya se notificó evento_disponible a ${usuario.id} para ${evento.titulo}`); continue; }
        
        try {
          await loadEmailJS();
          
          const templateParams = {
            to_email: email,
            to_name: nombreCompleto,
            user_name: nombreCompleto,
            subject: sinAcentos(`¡Evento HOY con ${cuposDisponibles} lugares disponibles! ${evento.titulo}`),
            message: `Todavía hay ${cuposDisponibles} lugares disponibles para este evento que ocurre HOY. ¡No te lo pierdas!`,
            event_name: evento.titulo || 'Sin título',
            event_date: `Hoy - ${formatearFechaArgentina(evento.fecha)}` || 'Hoy',
            event_time: formatearHoraArgentina(evento.hora) || 'No especificada',
            event_location: evento.ubicacion || evento.lugar || 'No especificado',
            event_description: evento.descripcion || 'Sin descripción'
          };
          
          await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID_RECORDATORIO,
            templateParams
          );
          
          console.log(`✅ Notificación de cupos disponibles enviada a ${email}`);
          await marcarNotificacionEnviada(usuario.id, evento.id, TIPO_NOTIF.EVENTO_DISPONIBLE);
          
          // Pausa más larga para no saturar (muchos envíos)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error notificando cupos a usuario ${usuario.id}:`, error);
        }
      }
    }
    
    console.log('✅ Notificaciones de eventos disponibles procesadas');
  } catch (error) {
    console.error('❌ Error en notificarEventosDisponiblesHoy:', error);
  }
}

/**
 * Notificar a participantes cuando el organizador edita el evento
 * Esta función se llama manualmente cuando se guarda un evento editado
 */
async function notificarEdicionEvento(eventoId, cambiosRealizados = '') {
  try {
    console.log('📧 Notificando edición de evento...');
    
    const evento = await getFromFirestore('eventos', eventoId);
    
    if (!evento) {
      console.error('Evento no encontrado');
      return false;
    }
    
    const participantes = evento.participantes || evento.usuariosUnidos || [];
    
    if (participantes.length === 0) {
      console.log('No hay participantes para notificar');
      return false;
    }
    
    // Enviar notificación a cada participante (con anti-duplicados)
    for (const userId of participantes) {
      try {
        const usuario = await getFromFirestore('usuarios', userId);
        if (!usuario) continue;
        
        const email = usuario.email || usuario.destino;
        if (!email || !email.includes('@')) continue;
        
        // Anti-duplicados: evitar spam pero permitir notificaciones razonables (10 min)
        const duplicada = await fueNotificadaRecientemente(userId, eventoId, TIPO_NOTIF.EVENTO_EDITADO, 0.16);
        if (duplicada) {
          console.log(`⏭️ Ya se notificó edición a ${userId} para ${evento.titulo} (últimos 10 min)`);
          continue;
        }
        
        const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Usuario';
        
        await loadEmailJS();
        
        const mensajeCambios = cambiosRealizados 
          ? `El organizador realizó cambios: ${cambiosRealizados}` 
          : 'El organizador actualizó la información del evento.';
        
        const templateParams = {
          to_email: email,
          to_name: nombreCompleto,
          user_name: nombreCompleto,
          subject: sinAcentos(`Actualizacion: Se edito el evento "${evento.titulo}"`),
          message: `${mensajeCambios} Te compartimos la información actualizada:`,
          event_name: evento.titulo || 'Sin título',
          event_date: formatearFechaArgentina(evento.fecha) || 'No especificada',
          event_time: formatearHoraArgentina(evento.hora) || 'No especificada',
          event_location: evento.ubicacion || evento.lugar || 'No especificado',
          event_description: evento.descripcion || 'Sin descripción'
        };
        
        await emailjs.send(
          EMAILJS_CONFIG.SERVICE_ID,
          EMAILJS_CONFIG.TEMPLATE_ID_RECORDATORIO,
          templateParams
        );
        
        console.log(`✅ Notificación de edición enviada a ${email}`);
        
        // Marcar como enviada
        await marcarNotificacionEnviada(userId, eventoId, TIPO_NOTIF.EVENTO_EDITADO);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error notificando edición a usuario ${userId}:`, error);
      }
    }
    
    console.log('✅ Notificaciones de edición procesadas');
    return true;
  } catch (error) {
    console.error('❌ Error en notificarEdicionEvento:', error);
    return false;
  }
}

/**
 * Iniciar sistema de notificaciones (ejecutar recordatorios)
 * En producción, esto debería ser una Cloud Function con cron job
 */
function iniciarSistemaNotificaciones() {
  // ===== RECORDATORIOS A PARTICIPANTES =====
  // 3 días antes (a la hora del evento, chequeo cada hora)
  enviarRecordatorios3Dias();
  setInterval(enviarRecordatorios3Dias, 60 * 60 * 1000);
  
  // Día del evento (chequeo cada hora, envío sólo a las 04:00 AM)
  enviarRecordatoriosDiaDelEvento();
  setInterval(enviarRecordatoriosDiaDelEvento, 60 * 60 * 1000);

  // ===== NOTIFICACIONES A TODOS LOS USUARIOS =====
  // Cupos disponibles 3 horas antes (chequeo cada hora)
  notificarCuposDisponibles3HorasAntes();
  setInterval(notificarCuposDisponibles3HorasAntes, 60 * 60 * 1000);

  // Log actualizado
  console.log('✅ Sistema de notificaciones completo iniciado:');
  console.log('   - Recordatorios 3 dias antes (a la hora del evento, a participantes)');
  console.log('   - Recordatorios dia del evento (04:00 AM a participantes)');
  console.log('   - Cupos disponibles 3h antes (a todos los usuarios si hay lugares)');
  console.log('   - Notificaciones de edicion (manual al editar)');
}

/**
 * Ejecuta el proceso de cron (para cron-notifications.html)
 * Usa las funciones existentes y escribe logs en consola y en el DOM si existe #log/#status
 */
function _cronAddLog(message, type = 'info') {
  try {
    const logDiv = document.getElementById('log');
    if (logDiv) {
      const entry = document.createElement('div');
      entry.className = `log-entry ${type}`;
      const timestamp = new Date().toLocaleTimeString('es-AR');
      entry.textContent = `[${timestamp}] ${message}`;
      logDiv.appendChild(entry);
      logDiv.scrollTop = logDiv.scrollHeight;
    }
  } catch {}
  const level = type === 'error' ? 'error' : 'log';
  console[level](`${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'} ${message}`);
}

window.ejecutarCronNotificaciones = async function ejecutarCronNotificaciones() {
  try {
    _cronAddLog('🚀 Iniciando proceso de notificaciones automáticas...', 'info');
    _cronAddLog(`📅 Fecha: ${new Date().toLocaleDateString('es-AR')}`, 'info');
    _cronAddLog(`🕐 Hora: ${new Date().toLocaleTimeString('es-AR')}`, 'info');

    const total3Dias = await enviarRecordatorios3Dias();
    const totalCupos = await notificarCuposDisponibles3HorasAntes();
    const totalDia = await enviarRecordatoriosDiaDelEvento();
    const total = (Number(total3Dias) || 0) + (Number(totalCupos) || 0) + (Number(totalDia) || 0);

    _cronAddLog(`🎉 Proceso completado: ${total} emails enviados (3 días: ${total3Dias} | cupos 3h: ${totalCupos} | día: ${totalDia})`, 'success');

    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.innerHTML = `
        <strong>✅ Proceso completado exitosamente</strong><br>
        <small>Total de notificaciones enviadas: ${total}</small><br>
        <small>Recordatorios 3 días antes: ${total3Dias}</small><br>
        <small>Cupos disponibles (3h antes): ${totalCupos}</small><br>
        <small>Recordatorios del día (4 AM): ${totalDia}</small><br>
        <small>Hora de ejecución: ${new Date().toLocaleTimeString('es-AR')}</small>
      `;
    }
  } catch (error) {
    _cronAddLog(`Error en cron: ${error?.message || error}`, 'error');
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.innerHTML = `
        <strong>❌ Error en el proceso</strong><br>
        <small>${error?.message || error}</small>
      `;
    }
  }
};

  // ==============================
  // Sistema de Recuperación de Contraseña
  // ==============================

  // Almacenar códigos de verificación temporalmente (en producción usar Firestore con TTL)
  const codigosRecuperacion = new Map(); // { email: { codigo, expira, intentos } }

  /**
   * Generar código de 6 dígitos aleatorio
   */
  function generarCodigoVerificacion() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Enviar código de recuperación por email
   */
  async function enviarCodigoRecuperacion(email) {
    try {
      // Buscar usuario por email
      const usuarios = await getFromFirestore('usuarios');
      const usuario = usuarios.find(u => (u.email || u.destino || '').toLowerCase() === email.toLowerCase());
    
      if (!usuario) {
        throw new Error('No existe una cuenta con ese correo electrónico');
      }

      // Generar código
      const codigo = generarCodigoVerificacion();
      const expira = Date.now() + (15 * 60 * 1000); // Expira en 15 minutos
    
      // Guardar código temporalmente
      codigosRecuperacion.set(email.toLowerCase(), {
        codigo,
        expira,
        intentos: 0,
        userId: usuario.id
      });

      // Cargar EmailJS
    await loadEmailJS();

    const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Usuario';

    // Enviar email con código de recuperación
    const templateParams = {
      email: email,  // Variable que usa template_p7ka3kx
      subject: 'Codigo de recuperacion de contrasena - Activa',
      message: `Has solicitado recuperar tu contrasena. Tu codigo de recuperacion es: ${codigo}. Este codigo expira en 15 minutos. Si no solicitaste este cambio, ignora este mensaje.`,
      codigo: codigo,
      tipo: 'recuperacion',
      app_name: 'Activa'
    };

    // TEMPORAL: Usar TEMPLATE_ID hasta que se cree template_codigo en EmailJS
    await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID, // template_p7ka3kx (temporal)
      templateParams
    );      console.log(`✅ Código de recuperación enviado a ${email}`);
      return { success: true, message: 'Código enviado exitosamente' };
    } catch (error) {
      console.error('❌ Error enviando código:', error);
      throw error;
    }
  }

/**
 * Verificar código y cambiar contraseña
 */
async function verificarCodigoYCambiarPassword(email, codigo, nuevaPassword) {
  try {
    const emailLower = email.toLowerCase();
    const datoCodigo = codigosRecuperacion.get(emailLower);

    if (!datoCodigo) {
      throw new Error('No se encontró un código de verificación. Solicita uno nuevo.');
    }

    // Verificar expiración
    if (Date.now() > datoCodigo.expira) {
      codigosRecuperacion.delete(emailLower);
      throw new Error('El código ha expirado. Solicita uno nuevo.');
    }

    // Verificar intentos
    if (datoCodigo.intentos >= 5) {
      codigosRecuperacion.delete(emailLower);
      throw new Error('Demasiados intentos fallidos. Solicita un nuevo código.');
    }

    // Verificar código
    if (datoCodigo.codigo !== codigo.trim()) {
      datoCodigo.intentos++;
      throw new Error(`Código incorrecto. Intentos restantes: ${5 - datoCodigo.intentos}`);
    }

    // Código correcto - actualizar contraseña en Firestore
    if (!db) throw new Error('Firestore no inicializado');
    await setDoc(doc(db, 'usuarios', datoCodigo.userId), {
      password: nuevaPassword
    }, { merge: true });

    // Limpiar código usado
    codigosRecuperacion.delete(emailLower);

    console.log(`✅ Contraseña actualizada para ${email}`);
    return { success: true, message: 'Contraseña actualizada exitosamente' };
  } catch (error) {
    console.error('❌ Error verificando código:', error);
    throw error;
  }
}// ==============================
// Helpers DOM
// ==============================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Avatar gris por defecto (data URI SVG)
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='48' fill='%23e6e6e6'/><circle cx='50' cy='38' r='18' fill='%23bdbdbd'/><path d='M20 80c6-14 24-18 30-18s24 4 30 18' fill='%23bdbdbd'/></svg>";

// Auth: guard de páginas protegidas
(() => {
  try {
    const path = (location.pathname || '').toLowerCase();
    const file = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
      const publicPages = ['index.html', 'login.html', 'registro.html', 'recuperar-password.html'];
    const isProtected = !publicPages.includes(file);
    const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');

    // Si es pública y ya hay sesión, redirigir a inicio (login/registro)
    if (!isProtected) {
      if (userId && (file === 'login.html' || file === 'registro.html')) {
        location.replace('inicio.html');
        return;
      }
      // Asegurar que el body no quede oculto por data-protected por error
      if (document && document.body) document.body.removeAttribute('data-protected');
      return;
    }

    // Páginas protegidas: si no hay sesión, ir a login
    if (!userId) {
      // body está oculto por CSS (data-protected)
      location.replace('login.html');
      return;
    }

    // Con sesión: mostrar contenido
    const showBody = () => {
      try {
        document.body && document.body.removeAttribute('data-protected');
      } catch {}
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBody);
    } else {
      showBody();
    }
  } catch (e) {
    console.error('Auth guard error:', e);
    try { document.body && document.body.removeAttribute('data-protected'); } catch {}
  }
})();

// Gestión del menú de 3 puntitos y cerrar sesión
(function setupNavMenu() {
  const menuBtn = document.querySelector('.nav-menu-btn-inline');
  const logoutBtn = document.getElementById('nav-cerrar-sesion');
  
  if (menuBtn && logoutBtn) {
    // Toggle del botón de cerrar sesión al hacer clic en 3 puntitos
    menuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      logoutBtn.classList.toggle('hidden');
    });
    
    // Cerrar el menú si se hace clic fuera
    document.addEventListener('click', (e) => {
      if (!menuBtn.contains(e.target) && !logoutBtn.contains(e.target)) {
        logoutBtn.classList.add('hidden');
      }
    });
    
    // Cerrar sesión
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Limpiar toda la sesión
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUserName');
      localStorage.removeItem('userPhoto');
      localStorage.removeItem('perfilEdad');
      localStorage.removeItem('perfilSexo');
      localStorage.removeItem('perfilDescripcion');
      // Redirigir al login
      window.location.href = 'login.html';
    });
  }
})();

// Cargar EmailJS para envío de códigos por correo
const loadEmailJS = () => {
  return new Promise((resolve, reject) => {
    if (window.emailjs) {
      console.log("📚 EmailJS ya está cargado");
      // Asegurar inicialización aunque ya esté cargado por <script>
      try {
        if (EMAILJS_CONFIG && EMAILJS_CONFIG.PUBLIC_KEY) {
          emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
          console.log("✅ EmailJS inicializado (cargado previamente)");
        }
      } catch (e) {
        console.warn("⚠️ EmailJS ya estaba inicializado o ocurrió un aviso:", e?.message || e);
      }
      resolve();
      return;
    }
    console.log("📥 Descargando librería EmailJS...");
    const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    script.onload = () => {
      try {
        console.log("🔧 Inicializando EmailJS con Public Key:", EMAILJS_CONFIG.PUBLIC_KEY);
        emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
        console.log("✅ EmailJS inicializado correctamente");
        resolve();
      } catch (error) {
        console.error("❌ Error inicializando EmailJS:", error);
        reject(new Error(`Error inicializando EmailJS: ${error.message}`));
      }
    };
    script.onerror = () => {
      reject(new Error('No se pudo cargar la librería de EmailJS'));
    };
    document.head.appendChild(script);
  });
};

// Enviar código por Email usando EmailJS
const enviarCodigoEmail = async (email, codigo) => {
  try {
    await loadEmailJS();
    // Parámetros para el template unificado de códigos
    const params = {
      email: email,  // Variable que usa template_p7ka3kx
      subject: 'Codigo de verificacion - Activa',
      message: `Bienvenido a Activa! Tu codigo de verificacion es: ${codigo}. Ingresa este codigo para completar tu registro.`,
      codigo: codigo,
      tipo: 'verificacion',
      app_name: 'Activa'
    };
    // TEMPORAL: Usar TEMPLATE_ID hasta que se cree template_codigo en EmailJS
    const result = await emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, params);
    return { success: true, result };
  } catch (error) {
    console.error('Error enviando email con EmailJS:', error);
    const msg = error?.message || error?.text || 'Error desconocido';
    return { success: false, error: msg };
  }
};

// Stub seguro para SMS (evita errores si se selecciona Teléfono)
const enviarCodigoSMS = async (telefono, codigo) => {
  console.warn('SMS no implementado. Teléfono recibido:', telefono, 'Código:', codigo);
  return { success: false, error: 'El envío por SMS no está disponible en este momento.' };
};

// Sistema de mensajes (toast)
const mostrarToast = (mensaje, tipo = 'exito') => {
  const anterior = document.getElementById('mensaje-automatico');
  if (anterior) anterior.remove();
  const div = document.createElement('div');
  div.id = 'mensaje-automatico';
  div.textContent = mensaje;
  const base = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    padding: 15px 25px;
    border-radius: 8px;
    color: #fff;
    font-weight: bold;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideUp 0.3s ease-out;
    max-width: 90%;
    text-align: center;
  `;
  div.style.cssText = base + (tipo === 'exito' ? 'background-color:#003918;' : tipo === 'info' ? 'background-color:#7C70D6;' : 'background-color:#dc3545;');
  if (!document.getElementById('mensaje-styles')) {
    const style = document.createElement('style');
    style.id = 'mensaje-styles';
    style.textContent = `
      @keyframes slideUp { from { opacity:0; transform: translateX(-50%) translateY(20px);} to { opacity:1; transform: translateX(-50%) translateY(0);} }
      @keyframes slideDown { from { opacity:1; transform: translateX(-50%) translateY(0);} to { opacity:0; transform: translateX(-50%) translateY(100%);} }
    `;
    document.head.appendChild(style);
  }
  document.body.appendChild(div);
  setTimeout(() => {
    div.style.animation = 'slideDown 0.25s ease-in forwards';
    setTimeout(() => div.remove(), 250);
  }, tipo === 'exito' ? 2200 : 3000);
};

// Reemplazar alert nativo por nuestro toast estilizado
try {
  window.alert = (msg) => {
    const texto = typeof msg === 'string' ? msg : String(msg ?? 'Aviso');
    mostrarToast(texto, 'error');
  };
} catch {}
const mostrarMensajeExito = (msg) => mostrarToast(msg, 'exito');
const mostrarMensajeError = (msg) => mostrarToast(msg, 'error');
const mostrarMensajeInfo = (msg) => mostrarToast(msg, 'info');

// Función helper para actualizar contadores de participantes en todas las instancias del evento
const actualizarContadoresEvento = (eventoId, nuevosUnidos, maxPersonas) => {
  const cards = document.querySelectorAll(`[data-evento-id="${eventoId}"]`);
  cards.forEach(el => {
    const card = el.closest('.inicio-card-evento, .evento-card, .favoritos-card-evento');
    if (!card) return;
    
    const nuevosDisponibles = maxPersonas - nuevosUnidos;
    const personasSpan = card.querySelector('.inicio-detalles-evento span:last-child, .evento-detalles span:last-child, .favoritos-detalles-evento span:last-child');
    
    if (personasSpan) {
      personasSpan.innerHTML = `
        <img src="img/personas.png" alt="Personas" class="icono-evento">
        ${nuevosUnidos}/${maxPersonas} unidos 
        <span class="evento-disponibles-texto">(${nuevosDisponibles} lugares disponibles)</span>
      `;
    }
  });
};

// Función helper para actualizar TODOS los datos visibles de un evento en todas las vistas (inicio, favoritos, historial)
const actualizarTarjetasEventoEnTodasLasVistas = (eventoId, eventoActualizado) => {
  console.log('🔄 Actualizando tarjetas del evento en todas las vistas:', eventoId);
  
  // Buscar todas las tarjetas de este evento (inicio, favoritos, perfil/historial)
  const cards = document.querySelectorAll(`[data-evento-id="${eventoId}"]`);
  
  cards.forEach(el => {
    const card = el.closest('.inicio-card-evento, .favoritos-card-evento');
    if (!card) return;
    
    // Actualizar título
    const tituloEl = card.querySelector('.inicio-titulo-evento, .favoritos-titulo-evento');
    if (tituloEl && eventoActualizado.titulo) {
      tituloEl.textContent = eventoActualizado.titulo;
    }
    
    // Actualizar descripción
    const descEl = card.querySelector('.inicio-descripcion-evento, .favoritos-descripcion-evento');
    if (descEl && eventoActualizado.descripcion) {
      descEl.textContent = eventoActualizado.descripcion;
    }
    
    // Actualizar detalles (fecha, hora, ubicación, participantes)
    const detallesContainer = card.querySelector('.inicio-detalles-evento, .favoritos-detalles-evento');
    if (detallesContainer && eventoActualizado.fecha && eventoActualizado.hora && eventoActualizado.ubicacion) {
      const fechaFormateada = formatearFechaArgentina(eventoActualizado.fecha);
      const horaFormateada = formatearHoraArgentina(eventoActualizado.hora);
      const unidos = Array.isArray(eventoActualizado.participantes) 
        ? eventoActualizado.participantes.length 
        : Number(eventoActualizado.unidos || 0);
      const disponibles = Math.max(0, Number(eventoActualizado.maxPersonas || 0) - unidos);
      
      detallesContainer.innerHTML = `
        <span><img src="img/calendario.png" alt="Fecha" class="icono-evento"> ${fechaFormateada}</span>
        <span><img src="img/reloj-circular.png" alt="Hora" class="icono-evento"> ${horaFormateada}</span>
        <span><img src="img/ubicacion.png" alt="Ubicación" class="icono-evento"> ${eventoActualizado.ubicacion}</span>
        <span><img src="img/personas.png" alt="Participantes" class="icono-evento"> ${unidos}/${eventoActualizado.maxPersonas} unidos <span class="evento-disponibles-texto">(${disponibles} lugares disponibles)</span></span>
      `;
    }
    
    // Actualizar link de grupo si existe
    const linkGrupoRow = card.querySelector('.inicio-link-grupo-row, .favoritos-link-grupo-row');
    const userId = localStorage.getItem('currentUserId') || localStorage.getItem('userId');
    const yaParticipa = Array.isArray(eventoActualizado.participantes) && eventoActualizado.participantes.includes(userId);
    const esOrganizador = eventoActualizado.organizadorId === userId;
    
    if (eventoActualizado.linkGrupo && String(eventoActualizado.linkGrupo).trim() && (yaParticipa || esOrganizador)) {
      if (!linkGrupoRow) {
        // Crear el row si no existe
        const descEl = card.querySelector('.inicio-descripcion-evento, .favoritos-descripcion-evento');
        if (descEl) {
          const nuevoLinkRow = document.createElement('div');
          nuevoLinkRow.className = card.classList.contains('inicio-card-evento') ? 'inicio-link-grupo-row' : 'favoritos-link-grupo-row';
          nuevoLinkRow.innerHTML = `
            <span>Link de grupo:</span>
            <a href="${eventoActualizado.linkGrupo}" target="_blank" rel="noopener noreferrer">${eventoActualizado.linkGrupo}</a>
          `;
          descEl.after(nuevoLinkRow);
        }
      } else {
        // Actualizar el link existente
        const linkEl = linkGrupoRow.querySelector('a');
        if (linkEl) {
          linkEl.href = eventoActualizado.linkGrupo;
          linkEl.textContent = eventoActualizado.linkGrupo;
        }
      }
    } else if (linkGrupoRow) {
      // Remover el link si ya no debe mostrarse
      linkGrupoRow.remove();
    }
  });
  
  console.log(`✅ ${cards.length} tarjetas actualizadas`);
};

// Registrar en fase de captura y burbuja, y soportar dispositivos táctiles
document.addEventListener("DOMContentLoaded", async () => {
  // Los modales ya tienen class="hidden" en el HTML
  
  // 0) Inicializar estado de administrador
  try {
    window._isAdmin = await esAdministrador();
    if (window._isAdmin) {
      console.log('✅ Usuario administrador detectado');
    }
  } catch (error) {
    console.error('❌ Error al verificar estado de administrador:', error);
    window._isAdmin = false;
  }

  // 0.0) Verificar que el usuario tenga nombre completo, si no, redirigir a perfil
  const verificarPerfilCompleto = async () => {
    const uid = localStorage.getItem('currentUserId') || localStorage.getItem('userId');
    if (!uid) return; // No hay sesión
    
    // Páginas donde NO validar (permitir acceso libre)
    const paginasExcluidas = ['index.html', 'login.html', 'registro.html', 'perfil.html', ''];
    const paginaActual = window.location.pathname.split('/').pop() || 'index.html';
    if (paginasExcluidas.includes(paginaActual)) return;
    
    try {
      const usuario = await getFromFirestore('usuarios', uid);
      if (!usuario) {
        console.warn('⚠️ Usuario no encontrado en BD');
        return;
      }
      
      const tieneNombre = usuario.nombre && usuario.nombre.trim();
      const tieneApellido = usuario.apellido && usuario.apellido.trim();
      
      if (!tieneNombre || !tieneApellido) {
        console.warn('⚠️ Usuario sin nombre/apellido completo:', { nombre: usuario.nombre, apellido: usuario.apellido });
        mostrarMensajeError('Por favor completá tu perfil con nombre y apellido para usar ACTIVA');
        
        // Redirigir después de 3 segundos
        setTimeout(() => {
          window.location.href = 'perfil.html';
        }, 3000);
        return false;
      }
      
      console.log('✅ Perfil completo:', `${usuario.nombre} ${usuario.apellido}`);
      return true;
    } catch (error) {
      console.error('❌ Error verificando perfil:', error);
      return true; // En caso de error, permitir continuar
    }
  };
  
  await verificarPerfilCompleto();

  // 0.1) Prefetch ligero de perfil si falta caché (mejora primera pintura en perfil.html)
  try {
    const uid = localStorage.getItem('currentUserId');
    const tieneCacheBasica = !!(localStorage.getItem('currentUserName') || localStorage.getItem('perfilSexo') || localStorage.getItem('userPhoto'));
    if (uid && !tieneCacheBasica) {
      const [perfil, usuario] = await Promise.all([
        getFromFirestore('perfiles', uid),
        getFromFirestore('usuarios', uid)
      ]);
      const nombre = (perfil?.nombre) || usuario?.nombre || '';
      const apellido = (perfil?.apellido) || usuario?.apellido || '';
      const edad = (perfil?.edad) || usuario?.edad;
      const sexo = (perfil?.sexo) || usuario?.sexo;
      const descripcion = perfil?.descripcion || '';
      const foto = (perfil?.foto) || usuario?.foto;
      const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ').trim();
      if (nombreCompleto) localStorage.setItem('currentUserName', nombreCompleto);
      if (edad !== undefined) localStorage.setItem('perfilEdad', String(edad));
      if (sexo) localStorage.setItem('perfilSexo', sexo);
      if (descripcion) localStorage.setItem('perfilDescripcion', descripcion);
      if (foto) localStorage.setItem('userPhoto', foto);
    }
  } catch {}

  // 1) Carrusel simple (index.html)
  const carruselImgs = $$('.img-actividad');
  const dotsContainer = $('#carrusel-dots');
  if (carruselImgs.length && dotsContainer) {
    let actual = 0;
    let intervalo;
    dotsContainer.innerHTML = '';
    carruselImgs.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.className = 'carrusel-dot' + (idx === 0 ? ' active' : '');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Imagen ${idx + 1}`);
      dot.addEventListener('click', () => mostrarImagen(idx));
      dotsContainer.appendChild(dot);
    });
    const mostrarImagen = (idx) => {
      carruselImgs.forEach((img, i) => {
        img.classList.toggle('active', i === idx);
        dotsContainer.children[i].classList.toggle('active', i === idx);
      });
      actual = idx;
    };
    const siguienteImagen = () => mostrarImagen((actual + 1) % carruselImgs.length);
    intervalo = setInterval(siguienteImagen, 3000);
    dotsContainer.addEventListener('mouseenter', () => clearInterval(intervalo));
    dotsContainer.addEventListener('mouseleave', () => { intervalo = setInterval(siguienteImagen, 3000); });
  }

  // 2) Fondo animado con íconos (si existe contenedor)
  const fondos = $$('.fondo-animado');
  console.log('🎨 Fondos animados encontrados:', fondos.length);
  fondos.forEach((fondo, index) => {
    console.log(`🎨 Inicializando fondo ${index + 1} en:`, fondo.parentElement?.tagName);
    const iconos = [
      'cafe-con-leche-matcha.png','camara-fotografica.png','campamento-nocturno.png','camping-table.png','cocinando.png','corredor.png','deporte.png','ejercicios-de-estiramiento.png','frito.png','guitarra-electrica.png','juego (1).png','juego (2).png','juego (3).png','juego (4).png','juego.png','jugador-de-futbol.png','kayac.png','lectura.png','libro.png','linea.png','maquilladora.png','martini.png','microfono.png','origami.png','paleta-de-pintura.png','persona.png','piano (1).png','silla-de-playa.png','sillas.png','te-de-mate.png','teatro.png','tejido-de-punto.png','yoga (1).png','yoga.png'
    ];
    const basePath = 'img/fondo/';
    let isRendering = false; // Flag para evitar renderizados simultáneos
    
    const getAlto = () => {
      if (fondo.classList.contains('fondo-animado-header')) {
        const header = document.querySelector('.header-principal');
        return header ? header.offsetHeight : 120;
      } else {
        // Buscar el contenedor main según la página
        const main = document.querySelector('.main-container') || 
                     document.querySelector('.crear-evento-main-nueva') ||
                     document.querySelector('main');
        return (main && main.scrollHeight) || document.documentElement.scrollHeight || document.body.scrollHeight || window.innerHeight;
      }
    };
    
    const renderFondo = () => {
      if (isRendering) return; // Evitar renderizados concurrentes
      isRendering = true;
      
      const alto = getAlto();
      console.log(`📏 Alto calculado para fondo: ${alto}px`);
      fondo.style.height = alto + 'px';
      
      // Solo limpiar si hay contenido previo
  const existingIcons = fondo.querySelectorAll('.bg-icon');
  const needsUpdate = existingIcons.length === 0 || Math.abs(parseInt(fondo.dataset.lastHeight || '0') - alto) > 20;
      
      if (!needsUpdate) {
        isRendering = false;
        return;
      }
      
      fondo.dataset.lastHeight = alto;
      fondo.innerHTML = '';
      
      // Grilla más densa con más íconos
      const filas = fondo.classList.contains('fondo-animado-header') ? 4 : Math.max(25, Math.ceil(alto / 40));
      const columnas = 18; // Aumentado de 12 a 18 columnas
      const cellW = 100 / columnas;
      const cellH = alto / filas;
      
      let posiciones = [];
      for (let f = 0; f < filas; f++) {
        for (let c = 0; c < columnas; c++) {
          posiciones.push({
            left: c * cellW + cellW * (0.25 + Math.random() * 0.50),
            top: f * cellH + cellH * (0.25 + Math.random() * 0.50)
          });
        }
      }
      posiciones = posiciones.sort(() => Math.random() - 0.5);
      
      // Aumentar cantidad de íconos para llenar mejor el espacio
      const total = fondo.classList.contains('fondo-animado-header') 
        ? Math.min(posiciones.length, 35) // Aumentado de 20 a 35 para header
        : Math.min(posiciones.length, 150); // Aumentado de 80 a 150 para main
      
      // Crear fragmento para optimizar renderizado
      const fragment = document.createDocumentFragment();
      
      for (let i = 0; i < total; i++) {
        const img = document.createElement('img');
        img.className = 'bg-icon';
        img.src = basePath + iconos[i % iconos.length];
        img.alt = '';
        img.loading = 'lazy'; // Lazy loading para mejor rendimiento
        const pos = posiciones[i];
        img.style.left = pos.left + '%';
        img.style.top = pos.top + 'px';
        
        // Variar el delay de animación para cada ícono
        img.style.animationDelay = `-${Math.random() * 240}s`;
        
        fragment.appendChild(img);
      }
      
      fondo.appendChild(fragment);
      console.log(`✅ ${total} íconos agregados al fondo`);
      isRendering = false;
    };
    
    // Renderizado inicial
    console.log('🚀 Iniciando renderizado de fondo...');
    renderFondo();
    
    // Re-renderizar después de un delay para asegurar que el main esté completamente cargado
    setTimeout(() => {
      console.log('⏱️ Re-renderizando después de 1.5s...');
      renderFondo();
    }, 1500);
    setTimeout(() => {
      console.log('⏱️ Re-renderizando después de 3s...');
      renderFondo();
    }, 3000);
    setTimeout(() => {
      console.log('⏱️ Re-renderizando después de 4.5s...');
      renderFondo();
    }, 4500); // refuerzo extra para cargas lentas
   
    // Resize con debounce
    let resizeTimeout;
    window.addEventListener('resize', () => { 
      clearTimeout(resizeTimeout); 
      resizeTimeout = setTimeout(renderFondo, 300); 
    });
    
    // Observer SOLO para eventos significativos en el main (evitar bucle infinito)
    if (!fondo.classList.contains('fondo-animado-header')) {
      const main = document.querySelector('.main-container') || 
                   document.querySelector('.crear-evento-main-nueva') ||
                   document.querySelector('main');
      if (main && window.MutationObserver) {
        let observerTimeout;
        const observer = new MutationObserver((mutations) => {
          // Solo re-renderizar si se agregaron/eliminaron eventos (no por cambios internos del fondo)
          const relevantChange = mutations.some(m => {
            return m.addedNodes.length > 0 || m.removedNodes.length > 0;
          });
          
          if (relevantChange && !isRendering) {
            clearTimeout(observerTimeout);
            observerTimeout = setTimeout(renderFondo, 500);
          }
        });
        
        // Observar solo el contenedor de eventos, no todo el main
        const eventosLista = document.getElementById('eventos-lista');
        if (eventosLista) {
          observer.observe(eventosLista, { childList: true, subtree: false });
        }
      }
    }
  });

  // 3) Registro y verificación (registro.html)
  (function registroFlow(){
    const tabEmail = $("#tab-email");
    const tabPhone = $("#tab-phone");
    const emailGroup = $("#email-group");
    const phoneGroup = $("#phone-group");
    const registerForm = $("#register-form");
    const formContainer = $("#form-container");
    const codeContainer = $("#code-container");
    const destinoSpan = $("#destino");
    const btnVerificarCodigo = $("#btn-verificar-codigo");
    const btnVolver = $("#btn-volver");
    const perfilContainer = $("#perfil-container");
    const usuarioForm = $("#usuario-form");
    const usuarioDestino = $("#usuario-destino");
    const mainContainer = $(".main-container");
    const perfilTitulo = $(".perfil-usuario-titulo");
    // Modo debug OTP: mostrar código si la cuota de EmailJS está agotada
    const _urlp_otp = new URLSearchParams(window.location.search);
    const debugOTP = _urlp_otp.get('debugotp') === '1' || localStorage.getItem('debugOTP') === '1';
    let destino = "";
    let codigoGenerado = "";

    // Tabs correo/teléfono
    if (tabEmail && tabPhone && emailGroup && phoneGroup) {
      tabEmail.addEventListener("click", (e) => {
        e.preventDefault();
        tabEmail.classList.add("active");
        tabPhone.classList.remove("active");
        emailGroup.style.display = "block";
        phoneGroup.style.display = "none";
        console.log("Cambiado a correo");
      });
      
      tabPhone.addEventListener("click", (e) => {
        e.preventDefault();
        tabPhone.classList.add("active");
        tabEmail.classList.remove("active");
        emailGroup.style.display = "none";
        phoneGroup.style.display = "block";
        console.log("Cambiado a teléfono");
      });
    }

    // Envío de código de verificación
    if (registerForm) {
      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Formulario enviado");
        
        const email = document.getElementById("email") ? document.getElementById("email").value.trim() : "";
        const phone = document.getElementById("phone") ? document.getElementById("phone").value.trim() : "";
        
        // Determinar qué campo está activo
        const emailVisible = emailGroup && emailGroup.style.display !== "none";
        const phoneVisible = phoneGroup && phoneGroup.style.display !== "none";
        
        if (emailVisible && email) {
          destino = email;
        } else if (phoneVisible && phone) {
          destino = phone;
        } else {
          mostrarMensajeError("Por favor, completa el campo correspondiente.");
          return;
        }
        
        console.log("Destino:", destino);

        // Control: evitar registro con correo/teléfono ya registrado
        try {
          const posibleUserId = destino.replace(/[@\s\+\-\.]/g, '_');
          const yaExiste = await getFromFirestore('usuarios', posibleUserId);
          if (yaExiste) {
            const esCorreo = /@/.test(destino);
            const texto = esCorreo
              ? 'Este correo ya está registrado. Iniciá sesión para continuar.'
              : 'Este teléfono ya está registrado. Iniciá sesión para continuar.';
            mostrarMensajeError(texto);
            // Redirigir suavemente al login
            setTimeout(() => { window.location.href = 'login.html'; }, 1400);
            return;
          }
        } catch (eVerif) {
          console.warn('No se pudo verificar duplicados, continuo con el envío del código:', eVerif);
          // Continuamos con el flujo para no bloquear si Firestore falla temporalmente
        }
        
        // Generar código
        codigoGenerado = (Math.floor(100000 + Math.random() * 900000)).toString();
        
        // Enviar código de verificación
        try {
          let resultado = { success: false };
          
          // Mostrar indicador de carga
          const btnEnviar = document.querySelector('#register-form button[type="submit"]');
          const textoOriginal = btnEnviar.textContent;
          btnEnviar.textContent = "Enviando...";
          btnEnviar.disabled = true;
          
          if (email) {
            console.log(`Enviando código ${codigoGenerado} al correo: ${email}`);
            resultado = await enviarCodigoEmail(email, codigoGenerado);
          } else if (phone) {
            console.log(`Enviando código ${codigoGenerado} al teléfono: ${phone}`);
            resultado = await enviarCodigoSMS(phone, codigoGenerado);
          }
          
          // Restaurar botón
          btnEnviar.textContent = textoOriginal;
          btnEnviar.disabled = false;
          
          if (resultado.success) {
            console.log("🎉 Código enviado exitosamente, cambiando pantalla...");
            
            // Cambiar a pantalla de verificación
            console.log("🔍 Buscando elementos para cambio de pantalla:");
            console.log("   formContainer:", formContainer);
            console.log("   codeContainer:", codeContainer);
            console.log("   destinoSpan:", destinoSpan);
            
            if (formContainer && codeContainer) {
              console.log("✅ Elementos encontrados, cambiando pantalla...");
              formContainer.style.display = "none";
              codeContainer.style.display = "block";
              if (destinoSpan) destinoSpan.textContent = destino;
              
              console.log("📱 Pantalla cambiada correctamente");
              
              // Código demo removido para producción
            } else {
              console.error("❌ No se encontraron los elementos para cambiar pantalla:");
              console.error("   formContainer:", !!formContainer);
              console.error("   codeContainer:", !!codeContainer);
            }
            
            // Mostrar mensaje de éxito debajo del recuadro
            mostrarMensajeExito(`✅ Código de verificación enviado a ${destino}. Revisa tu ${email ? 'correo' : 'teléfono'}.`);
          } else {
            throw new Error(resultado.error || "No se pudo enviar el código");
          }
          
        } catch (error) {
          console.error("Error enviando código:", error);
          
          // Restaurar botón en caso de error
          const btnEnviar = document.querySelector('#register-form button[type="submit"]');
          if (btnEnviar) {
            btnEnviar.textContent = "Enviar Código de Verificación";
            btnEnviar.disabled = false;
          }
          
          // Si la cuota de EmailJS está agotada y el modo debugOTP está activo, mostrar el código en pantalla para destrabar registros
          const msgLower = (error && (error.message || String(error))).toLowerCase();
          const esCuotaAgotada = msgLower.includes('quota') || msgLower.includes('426') || msgLower.includes('payment required');
          if (esCuotaAgotada && debugOTP) {
            try {
              // Cambiar a pantalla de verificación igual que en éxito
              if (formContainer && codeContainer) {
                formContainer.style.display = "none";
                codeContainer.style.display = "block";
                if (destinoSpan) destinoSpan.textContent = destino;
              }
              // Prefijar el input con el código para agilizar
              const inputCodigo = document.getElementById('codigo');
              if (inputCodigo) inputCodigo.value = codigoGenerado;
              // Mostrar aviso visible con el código
              mostrarMensajeExito(`🧪 Modo debug OTP activo. Tu código es: ${codigoGenerado}`);
              console.warn('⚠️ EmailJS cuota agotada. Modo debug OTP mostró el código en pantalla.');
            } catch (e2) {
              console.error('Error aplicando modo debug OTP:', e2);
              mostrarMensajeError(`❌ Error al enviar el código: ${error.message}. Por favor inténtalo de nuevo.`);
            }
          } else {
            // Mostrar mensaje de error debajo del recuadro normal
            mostrarMensajeError(`❌ Error al enviar el código: ${error.message}. Por favor verifica tu conexión e inténtalo de nuevo.`);
          }
        }
      });
    }

    // Verificar código
    if (btnVerificarCodigo) {
      btnVerificarCodigo.addEventListener("click", function(e){
        e.preventDefault();
        
        const codigoIngresado = document.getElementById("codigo") ? document.getElementById("codigo").value.trim() : "";
        
        if (!codigoIngresado) {
          mostrarMensajeError("Por favor, ingresa el código de verificación.");
          return;
        }
        
        if (codigoIngresado !== codigoGenerado) {
          mostrarMensajeError("Código incorrecto. Inténtalo de nuevo.");
          return;
        }
        
        // Código correcto, mostrar formulario de perfil
        if (codeContainer) codeContainer.style.display = "none";
        if (perfilContainer) perfilContainer.style.display = "block";
        if (perfilTitulo) perfilTitulo.style.display = "block";
        if (mainContainer) mainContainer.classList.add('solo-perfil');
        
        if (usuarioDestino) usuarioDestino.textContent = destino;
        
        console.log("Código verificado correctamente");
      });
    }

    // Volver al formulario inicial
    if (btnVolver) {
      btnVolver.addEventListener("click", function(e){
        e.preventDefault();
        if (formContainer) formContainer.style.display = "block";
        if (codeContainer) codeContainer.style.display = "none";
        if (perfilContainer) perfilContainer.style.display = "none";
        if (perfilTitulo) perfilTitulo.style.display = "none";
        if (mainContainer) mainContainer.classList.remove('solo-perfil');
      });
    }

    // Crear usuario final
    if (usuarioForm) {
      usuarioForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById("nombre") ? document.getElementById("nombre").value.trim() : "";
        const apellido = document.getElementById("apellido") ? document.getElementById("apellido").value.trim() : "";
        const edad = document.getElementById("edad") ? document.getElementById("edad").value.trim() : "";
        const sexo = document.getElementById("sexo") ? document.getElementById("sexo").value : "";
        const password = document.getElementById("password") ? document.getElementById("password").value : "";
        const password2 = document.getElementById("password2") ? document.getElementById("password2").value : "";
        
        if (!nombre || !apellido || !edad || !sexo || !password) {
          mostrarToast("Por favor, completá todos los campos.", 'error');
          return;
        }
        
        if (password !== password2) {
          mostrarToast("Las contraseñas no coinciden.", 'error');
          return;
        }
        
        if (password.length < 6) {
          mostrarToast("La contraseña debe tener al menos 6 caracteres.", 'error');
          return;
        }
        
        try {
          // Verificar si el usuario ya existe
          const userId = destino.replace(/[@\s\+\-\.]/g, '_');
          const usuarioExistente = await getFromFirestore("usuarios", userId);
          if (usuarioExistente) {
            mostrarMensajeError("Ya existe un usuario con ese correo o número. Por favor inicia sesión o usa otro.");
            return;
          }

          const usuario = { 
            destino, 
            nombre, 
            apellido, 
            edad: parseInt(edad), 
            sexo,
            password,
            fechaCreacion: new Date().toISOString()
          };

          await saveToFirestore("usuarios", usuario, userId);
          localStorage.setItem("currentUserId", userId);

          mostrarMensajeExito("¡Usuario creado exitosamente!");
          window.location.href = "login.html";

        } catch (error) {
          console.error("Error creando usuario:", error);
          mostrarMensajeError("Error al crear el usuario. Inténtalo de nuevo.");
        }
      });
    }
  })();


  // 4) Guardar perfil (perfil-form) y mostrar en perfil.html
  (function perfilFlow(){
    const perfilForm = document.getElementById("perfil-form");
    const btnEditarPerfil = document.getElementById("btn-editar-perfil");
    const btnCancelarPerfil = document.getElementById("btn-cancelar-perfil");
    
    // Migración automática: sincronizar perfiles a usuarios (ejecutar una sola vez)
    const migrarPerfilAUsuario = async () => {
      try {
        // Verificar si ya se ejecutó la migración
        const migracionKey = 'migracion_perfil_usuario_v1';
        if (localStorage.getItem(migracionKey)) {
          console.log('✅ Migración ya ejecutada previamente');
          return;
        }
        
        console.log('🔄 Iniciando migración de perfiles a usuarios...');
        
        // Obtener todos los perfiles
        const perfiles = await getFromFirestore('perfiles');
        
        if (!perfiles || perfiles.length === 0) {
          console.log('No hay perfiles para migrar');
          localStorage.setItem(migracionKey, 'true');
          return;
        }
        
        console.log(`📋 Encontrados ${perfiles.length} perfiles para migrar`);
        
        let migrados = 0;
        let errores = 0;
        
        // Migrar cada perfil
        for (const perfil of perfiles) {
          try {
            const userId = perfil.id;
            
            // Verificar que el usuario existe
            const usuario = await getFromFirestore('usuarios', userId);
            if (!usuario) {
              console.warn(`⚠️ Usuario ${userId} no existe, saltando...`);
              continue;
            }
            
            // Preparar datos a actualizar
            const datosActualizados = {};
            if (perfil.nombre) datosActualizados.nombre = perfil.nombre;
            if (perfil.apellido) datosActualizados.apellido = perfil.apellido;
            if (perfil.edad !== undefined) datosActualizados.edad = perfil.edad;
            if (perfil.sexo) datosActualizados.sexo = perfil.sexo;
            if (perfil.descripcion) datosActualizados.descripcion = perfil.descripcion;
            if (perfil.foto) datosActualizados.foto = perfil.foto;
            
            // Solo actualizar si hay datos para migrar
            if (Object.keys(datosActualizados).length > 0) {
              await saveToFirestore('usuarios', datosActualizados, userId);
              migrados++;
              console.log(`✅ Migrado perfil de usuario ${userId}: ${perfil.nombre} ${perfil.apellido}`);
            }
            
            // Pequeña pausa para no saturar Firestore
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            errores++;
            console.error(`❌ Error migrando perfil ${perfil.id}:`, error);
          }
        }
        
        console.log(`🎉 Migración completada: ${migrados} perfiles migrados, ${errores} errores`);
        
        // Marcar migración como completada
        localStorage.setItem(migracionKey, 'true');
        
        if (migrados > 0) {
          mostrarMensajeExito(`Sincronización completada: ${migrados} perfiles actualizados`);
        }
      } catch (error) {
        console.error('❌ Error en migración automática:', error);
      }
    };
    
    // Exponer función global para ejecución manual desde consola
    window.ejecutarMigracionPerfiles = async () => {
      localStorage.removeItem('migracion_perfil_usuario_v1');
      await migrarPerfilAUsuario();
    };
    
    // Ejecutar migración si estamos en la página de perfil
    if (document.getElementById('perfil-container') || document.getElementById('perfil-form')) {
      // Ejecutar después de un pequeño delay para no bloquear la carga de la página
      setTimeout(() => {
        migrarPerfilAUsuario();
      }, 2000);
    }
    
    // Migración de eventos: normalizar campo ubicacion
    const migrarEventosUbicacion = async () => {
      try {
        const migracionKey = 'migracion_eventos_ubicacion_v1';
        if (localStorage.getItem(migracionKey)) {
          console.log('✅ Migración de eventos ya ejecutada');
          return;
        }
        
        console.log('🔄 Normalizando campo ubicacion en eventos...');
        
        const eventos = await getFromFirestore('eventos');
        if (!eventos || eventos.length === 0) {
          localStorage.setItem(migracionKey, 'true');
          return;
        }
        
        let actualizados = 0;
        for (const evento of eventos) {
          try {
            // Si tiene 'lugar' pero no 'ubicacion', copiar
            if (evento.lugar && !evento.ubicacion) {
              await saveToFirestore('eventos', { ubicacion: evento.lugar }, evento.id);
              actualizados++;
              console.log(`✅ Normalizado evento ${evento.id}: ${evento.lugar}`);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Error normalizando evento ${evento.id}:`, error);
          }
        }
        
        console.log(`🎉 Migración de eventos completada: ${actualizados} actualizados`);
        localStorage.setItem(migracionKey, 'true');
        
        if (actualizados > 0) {
          mostrarMensajeExito(`${actualizados} eventos actualizados con ubicacion normalizada`);
        }
      } catch (error) {
        console.error('❌ Error en migración de eventos:', error);
      }
    };
    
    // Ejecutar migración de eventos en cualquier página después de cargar
    setTimeout(() => {
      migrarEventosUbicacion();
    }, 3000);

    // Ejecutar migración de perfiles -> usuarios en cualquier página (una sola vez)
    // Esto asegura que, aunque no entres a perfil.html, la sincronización masiva ocurra.
    setTimeout(() => {
      migrarPerfilAUsuario();
    }, 4000);

    // Sincronizar automáticamente: copiar datos del perfil -> usuarios para el usuario logueado
    const sincronizarUsuarioDesdePerfilActual = async () => {
      try {
        const userId = localStorage.getItem('currentUserId') || localStorage.getItem('userId');
        if (!userId) return;

        const perfil = await getFromFirestore('perfiles', userId);
        if (!perfil) {
          console.log('ℹ️ No hay perfil para sincronizar');
          return;
        }

        const usuario = await getFromFirestore('usuarios', userId);

        const updates = {};
        const copiarSiCambia = (campo) => {
          if (perfil[campo] !== undefined && perfil[campo] !== null) {
            if (!usuario || usuario[campo] !== perfil[campo]) {
              updates[campo] = perfil[campo];
            }
          }
        };

        copiarSiCambia('nombre');
        copiarSiCambia('apellido');
        copiarSiCambia('sexo');
        copiarSiCambia('descripcion');
        copiarSiCambia('foto');
        if (typeof perfil.edad === 'number' && (!usuario || usuario.edad !== perfil.edad)) {
          updates.edad = perfil.edad;
        }

        if (Object.keys(updates).length > 0) {
          updates.fechaActualizacion = new Date().toISOString();
          await saveToFirestore('usuarios', updates, userId);
          console.log(`✅ Usuario sincronizado desde perfil (${userId})`, updates);
        } else {
          console.log('ℹ️ Usuario ya estaba sincronizado con el perfil');
        }
      } catch (e) {
        console.error('❌ Error al sincronizar usuario desde perfil:', e);
      }
    };

    // Ejecutar sincronización del usuario actual poco después de cargar cualquier página
    setTimeout(() => {
      sincronizarUsuarioDesdePerfilActual();
    }, 1500);

    // Exponer función global para forzar sincronización manual desde consola
    window.forzarSyncUsuario = async () => {
      await sincronizarUsuarioDesdePerfilActual();
    };

    // Exponer sync por ID específico: copia perfil -> usuarios para el doc indicado
    window.syncUsuarioPorId = async (id) => {
      try {
        if (!id) { console.warn('Debe especificar un ID de usuario (docId en Firestore)'); return; }
        const perfil = await getFromFirestore('perfiles', id);
        if (!perfil) { console.warn(`No existe perfil con id ${id}`); return; }
        const updates = {};
        if (perfil.nombre) updates.nombre = perfil.nombre;
        if (perfil.apellido) updates.apellido = perfil.apellido;
        if (typeof perfil.edad === 'number') updates.edad = perfil.edad;
        if (perfil.sexo) updates.sexo = perfil.sexo;
        if (perfil.descripcion) updates.descripcion = perfil.descripcion;
        if (perfil.foto) updates.foto = perfil.foto;
        updates.fechaActualizacion = new Date().toISOString();
        await saveToFirestore('usuarios', updates, id);
        console.log(`✅ Sync manual aplicado a usuarios/${id}`, updates);
        return true;
      } catch (e) {
        console.error('❌ Error en syncUsuarioPorId:', e);
        return false;
      }
    };
    
    if (btnEditarPerfil && perfilForm) {
      btnEditarPerfil.addEventListener('click', (e) => {
        e.preventDefault();
        // Mostrar formulario quitando la clase que fuerza display:none !important
        perfilForm.classList.remove('hidden');
        // Ocultar botón de 3 puntitos
        btnEditarPerfil.classList.add('hidden');
      });
    }
    
    // Botón Cancelar: cierra el formulario sin guardar
    if (btnCancelarPerfil && perfilForm && btnEditarPerfil) {
      btnCancelarPerfil.addEventListener('click', (e) => {
        e.preventDefault();
        // Ocultar formulario
        perfilForm.classList.add('hidden');
        // Mostrar botón de 3 puntitos
        btnEditarPerfil.classList.remove('hidden');
        // Recargar datos originales sin guardar cambios
        loadPerfil();
      });
    }
    
    if (perfilForm) {
      perfilForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log('📝 INICIANDO GUARDADO DE PERFIL...');
        
        const nombre = (document.getElementById("nombre") || {}).value || "";
        const apellido = (document.getElementById("apellido") || {}).value || "";
        const edad = (document.getElementById("edad") || {}).value || "";
        const sexo = (document.getElementById("sexo") || {}).value || "";
        const descripcion = (document.getElementById("perfil-descripcion-input") || {}).value || "";
        const fotoImgForm = document.getElementById("perfil-foto-form");
        const fotoImgHeader = document.getElementById("perfil-foto");
        const foto = (fotoImgForm && fotoImgForm.src) ? fotoImgForm.src : (fotoImgHeader && fotoImgHeader.src ? fotoImgHeader.src : "");
        const userId = localStorage.getItem('currentUserId');
        
        console.log('📋 Datos del formulario:', { nombre, apellido, edad, sexo, descripcion, fotoLength: foto?.length, userId });
        
        if (!userId) {
          console.error('❌ No hay userId en localStorage');
          mostrarMensajeError('Error: Usuario no identificado');
          return;
        }
        
        // Validar tamaño de la foto antes de guardar
        if (foto && foto.length > 1048000) {
          const tamanoKB = Math.round(foto.length / 1024);
          console.error(`❌ Foto muy grande: ${tamanoKB}KB (límite: ~1000KB)`);
          mostrarMensajeError(`La imagen es muy grande (${tamanoKB}KB). Intenta con una imagen más pequeña o de menor calidad.`);
          return;
        }
        
        try {
          const perfil = { 
            nombre, 
            apellido, 
            edad: parseInt(edad) || 0,
            sexo,
            descripcion, 
            foto,
            fechaActualizacion: new Date().toISOString()
          };
          
          console.log('💾 Guardando en perfiles...', perfil);
          await saveToFirestore("perfiles", perfil, userId);
          console.log('✅ Guardado en perfiles exitoso');
          
          // También actualizar todos los datos editados en la colección 'usuarios'
          const datosUsuario = {
            nombre,
            apellido,
            edad: parseInt(edad) || 0,
            sexo,
            descripcion,
            foto,
            fechaActualizacion: new Date().toISOString()
          };
          
          console.log('💾 Guardando en usuarios...', datosUsuario);
          await saveToFirestore("usuarios", datosUsuario, userId);
          console.log('✅ Guardado en usuarios exitoso');
          
          // Persistir datos útiles y caché para próximas visitas
          const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ').trim();
          if (nombreCompleto) localStorage.setItem('currentUserName', nombreCompleto);
          if (edad) localStorage.setItem('perfilEdad', String(edad));
          if (sexo) localStorage.setItem('perfilSexo', sexo);
          if (descripcion) localStorage.setItem('perfilDescripcion', descripcion);
          if (foto) localStorage.setItem('userPhoto', foto);
          
          console.log('✅ Cache actualizado en localStorage');
          mostrarMensajeExito("¡Perfil guardado exitosamente!");

          // Cerrar el formulario de edición y mostrar la vista normal
          perfilForm.classList.add('hidden');
          if (btnEditarPerfil) btnEditarPerfil.classList.remove('hidden');

          // Recargar datos en la vista sin redirigir
          await loadPerfil();
          console.log('🎉 PROCESO DE GUARDADO COMPLETADO');
        } catch (error) {
          console.error('❌ ERROR GUARDANDO PERFIL:', error);
          mostrarMensajeError('Error al guardar el perfil: ' + (error.message || 'Error desconocido'));
        }
      });
    }

    // Cargar perfil desde Firestore (solo en perfil.html)
    const loadPerfil = async () => {
      const userId = localStorage.getItem('currentUserId');
      if (!userId) return;

  const perfilNombre = document.getElementById('perfil-nombre');
  const perfilEdad = document.getElementById('perfil-edad');
  const perfilSexo = document.getElementById('perfil-sexo');
  const perfilDesc = document.getElementById('perfil-descripcion');
  const perfilFoto = document.getElementById('perfil-foto');
  const perfilFotoFormEl = document.getElementById('perfil-foto-form');

      // Pintar instantáneamente desde caché
      const cacheNombre = localStorage.getItem('currentUserName');
      const cacheEdad = localStorage.getItem('perfilEdad');
      const cacheSexo = localStorage.getItem('perfilSexo');
      const cacheDesc = localStorage.getItem('perfilDescripcion');
      const cacheFoto = localStorage.getItem('userPhoto');
      if (perfilNombre && cacheNombre) perfilNombre.textContent = cacheNombre;
      if (perfilEdad && cacheEdad) perfilEdad.textContent = `Edad: ${cacheEdad}`;
      if (perfilSexo && cacheSexo) perfilSexo.textContent = `Sexo: ${cacheSexo}`;
      if (perfilDesc && cacheDesc) { 
        perfilDesc.textContent = cacheDesc; 
        perfilDesc.classList.remove('hidden');
      }
      if (perfilFoto) {
        perfilFoto.src = cacheFoto || DEFAULT_AVATAR;
        perfilFoto.onerror = () => { perfilFoto.src = DEFAULT_AVATAR; };
      }
      if (perfilFotoFormEl) {
        perfilFotoFormEl.src = cacheFoto || DEFAULT_AVATAR;
      }

      // Traer datos priorizando 'perfiles' (si existe evitamos la 2da lectura)
      let perfilData = await getFromFirestore('perfiles', userId);
      let usuarioData = {};
      if (!perfilData) {
        // Solo si no hay perfil, consultamos 'usuarios'
        usuarioData = (await getFromFirestore('usuarios', userId)) || {};
        perfilData = {};
      } else {
        // Si hay perfil, intentamos completar faltantes con 'usuarios' en segundo plano (no bloquea render)
        (async () => {
          try {
            const u = await getFromFirestore('usuarios', userId);
            if (u) {
              // Refrescar caché sin forzar re-render
              const nombre = perfilData.nombre || u.nombre || '';
              const apellido = perfilData.apellido || u.apellido || '';
              const edad = perfilData.edad || u.edad || '';
              const sexo = perfilData.sexo || u.sexo || '';
              const descripcion = perfilData.descripcion || '';
              const foto = perfilData.foto || u.foto || localStorage.getItem('userPhoto') || DEFAULT_AVATAR;
              const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ').trim();
              if (nombreCompleto) localStorage.setItem('currentUserName', nombreCompleto);
              if (edad) localStorage.setItem('perfilEdad', String(edad));
              if (sexo) localStorage.setItem('perfilSexo', sexo);
              if (descripcion) localStorage.setItem('perfilDescripcion', descripcion);
              if (foto) localStorage.setItem('userPhoto', foto);
            }
          } catch {}
        })();
      }

  const nombre = perfilData.nombre || usuarioData.nombre || '';
  const apellido = perfilData.apellido || usuarioData.apellido || '';
  const edad = perfilData.edad || usuarioData.edad || '';
  const sexo = perfilData.sexo || usuarioData.sexo || '';
  const descripcion = perfilData.descripcion || '';
  const foto = perfilData.foto || usuarioData.foto || cacheFoto || DEFAULT_AVATAR;

      // Actualizar UI con datos definitivos
      if (perfilNombre) perfilNombre.textContent = (nombre && apellido) ? `${nombre} ${apellido}` : (nombre || 'Nombre Apellido');
      if (perfilEdad) perfilEdad.textContent = edad ? `Edad: ${edad}` : 'Edad: --';
      if (perfilSexo) perfilSexo.textContent = sexo ? `Sexo: ${sexo}` : (perfilSexo.textContent || 'Sexo: --');
      if (perfilDesc) {
        if (descripcion) {
          perfilDesc.textContent = descripcion;
          perfilDesc.classList.remove('hidden');
        } else {
          perfilDesc.textContent = '';
          perfilDesc.classList.add('hidden');
        }
      }
      if (perfilFoto) {
        perfilFoto.src = foto || DEFAULT_AVATAR;
      }
      if (perfilFotoFormEl) {
        perfilFotoFormEl.src = foto || DEFAULT_AVATAR;
      }

      // Actualizar caché para próximas visitas
      const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ').trim();
      if (nombreCompleto) localStorage.setItem('currentUserName', nombreCompleto);
      if (edad) localStorage.setItem('perfilEdad', String(edad));
      if (sexo) localStorage.setItem('perfilSexo', sexo);
      if (descripcion) localStorage.setItem('perfilDescripcion', descripcion);
      if (foto) localStorage.setItem('userPhoto', foto);

      // Inicializar formulario de edición con los datos actuales
      const perfilFormEl = document.getElementById('perfil-form');
      if (perfilFormEl) {
        const formNombre = perfilFormEl.querySelector('#nombre');
        const formApellido = perfilFormEl.querySelector('#apellido');
        const formEdad = perfilFormEl.querySelector('#edad');
        const formSexo = perfilFormEl.querySelector('#sexo');
        const formDesc = perfilFormEl.querySelector('#perfil-descripcion-input');
        const formFoto = perfilFormEl.querySelector('#perfil-foto-form');
        if (formNombre) formNombre.value = nombre;
        if (formApellido) formApellido.value = apellido;
        if (formEdad) formEdad.value = edad;
        if (formSexo) formSexo.value = sexo;
        if (formDesc) formDesc.value = descripcion;
        if (formFoto) formFoto.src = foto || DEFAULT_AVATAR;
      }
    };
    // Solo ejecutar en la página de perfil
    if (document.getElementById('perfil-form')) {
      loadPerfil();
    }
    
    // Secciones de creados/participa removidas: mantenemos solo Historial

    // Edición rápida en perfil.html
  const btnEditarFoto = document.getElementById("btn-editar-foto");
  const btnCambiarFoto = document.getElementById("btn-cambiar-foto");
  const btnQuitarFoto = document.getElementById("btn-quitar-foto");
  const fotoInput = document.getElementById("foto-perfil");
  const fotoImgForm = document.getElementById("perfil-foto-form");
  const perfilFoto = document.getElementById("perfil-foto");
    const btnEditarDesc = document.getElementById("btn-editar-desc");
    const btnGuardar = document.getElementById("btn-guardar");

    // Función para comprimir imagen antes de guardarla en Firestore
    const comprimirImagen = (file, maxWidth = 400, maxHeight = 400, quality = 0.8) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            // Crear canvas para redimensionar
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Calcular nuevas dimensiones manteniendo aspect ratio
            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;

            // Dibujar imagen redimensionada
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Convertir a base64 con compresión
            const comprimida = canvas.toDataURL('image/jpeg', quality);
            
            // Verificar tamaño (límite Firestore: 1MB = 1048576 bytes)
            // Base64 ocupa ~33% más, así que límite real es ~750KB
            const tamanoBytes = comprimida.length;
            const tamanoKB = Math.round(tamanoBytes / 1024);
            
            console.log(`📸 Imagen procesada: ${tamanoKB}KB (original: ${Math.round(file.size / 1024)}KB)`);
            
            if (tamanoBytes > 1048000) {
              console.warn('⚠️ Imagen aún muy grande, reduciendo calidad...');
              // Intentar con menor calidad
              const comprimidaExtra = canvas.toDataURL('image/jpeg', 0.6);
              const nuevoTamano = Math.round(comprimidaExtra.length / 1024);
              console.log(`📸 Recomprimida a ${nuevoTamano}KB`);
              resolve(comprimidaExtra);
            } else {
              resolve(comprimida);
            }
          };
          img.onerror = () => reject(new Error('Error al cargar imagen'));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Error al leer archivo'));
        reader.readAsDataURL(file);
      });
    };

    const bindFotoChange = () => {
      if (!fotoInput) return;
      fotoInput.addEventListener('change', async () => {
        const file = fotoInput.files && fotoInput.files[0];
        if (!file) return;
        
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
          mostrarMensajeError('Por favor seleccioná una imagen válida');
          return;
        }
        
        // Validar tamaño original (máximo 10MB antes de comprimir)
        if (file.size > 10 * 1024 * 1024) {
          mostrarMensajeError('La imagen es muy grande. Máximo 10MB');
          return;
        }
        
        try {
          console.log('🔄 Comprimiendo imagen...');
          mostrarMensajeInfo('Procesando imagen...');
          
          // Comprimir imagen
          const imagenComprimida = await comprimirImagen(file);
          
          // Actualizar vista previa
          if (fotoImgForm) fotoImgForm.src = imagenComprimida;
          if (btnGuardar) btnGuardar.style.display = 'block';
          
          console.log('✅ Imagen lista para guardar');
          mostrarMensajeExito('Imagen cargada correctamente');
        } catch (error) {
          console.error('❌ Error procesando imagen:', error);
          mostrarMensajeError('Error al procesar la imagen');
        }
      });
    };

    if (btnEditarFoto && fotoInput) {
      btnEditarFoto.addEventListener('click', () => fotoInput.click());
      bindFotoChange();
    }
    if (btnCambiarFoto && fotoInput) {
      btnCambiarFoto.addEventListener('click', () => fotoInput.click());
      bindFotoChange();
    }

    if (btnQuitarFoto) {
      btnQuitarFoto.addEventListener('click', () => {
        // Solo quitar la foto del formulario, la del header se actualiza al guardar
        if (fotoImgForm) fotoImgForm.src = DEFAULT_AVATAR;
        if (fotoInput) fotoInput.value = '';
        // No persistimos aún; se guarda al enviar el formulario
      });
    }

    if (btnEditarDesc && perfilDesc && btnGuardar) {
      btnEditarDesc.addEventListener('click', () => {
        perfilDesc.removeAttribute('readonly');
        perfilDesc.focus();
        btnGuardar.style.display = 'block';
      });
    }
  })();

  // (handler de logout ya registrado a nivel global)

  // 5) Crear evento (crear-evento.html)
  const crearForm = $('#form-crear-evento');
  if (crearForm) {
        // Overlay simple para indicar progreso durante la creación
        const getCrearOverlay = () => {
          let overlay = document.getElementById('overlay-crear-evento');
          if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'overlay-crear-evento';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.35);display:none;align-items:center;justify-content:center;z-index:9999;';
            const box = document.createElement('div');
            box.style.cssText = 'background:#fff;padding:18px 20px;border-radius:10px;box-shadow:0 6px 22px rgba(0,0,0,0.2);min-width:260px;display:flex;gap:10px;align-items:center;justify-content:center;';
            box.innerHTML = `
              <div class="spinner" style="width:20px;height:20px;border:3px solid #e0e0e0;border-top-color:#003918;border-radius:50%;animation:spin 1s linear infinite;"></div>
              <span id="overlay-crear-texto" style="color:#003918;font-weight:600;">Creando evento…</span>
            `;
            const style = document.createElement('style');
            style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
            document.head.appendChild(style);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
          }
          return overlay;
        };
        const showCrearOverlay = (mensaje = 'Creando evento…') => {
          const overlay = getCrearOverlay();
          const txt = overlay.querySelector('#overlay-crear-texto');
          if (txt) txt.textContent = mensaje;
          overlay.style.display = 'flex';
        };
        const updateCrearOverlay = (mensaje) => {
          const overlay = getCrearOverlay();
          const txt = overlay.querySelector('#overlay-crear-texto');
          if (txt && mensaje) txt.textContent = mensaje;
        };
        const hideCrearOverlay = () => {
          const overlay = document.getElementById('overlay-crear-evento');
          if (overlay) overlay.style.display = 'none';
        };

    // Modo debug para creación: activar con ?debug=1 o localStorage.debugCrearEvento = '1'
    const urlParamsCrear = new URLSearchParams(window.location.search);
    const debugCrear = urlParamsCrear.get('debug') === '1' || localStorage.getItem('debugCrearEvento') === '1';

    // Panel de debug en página para poder copiar logs sin redirigir
    let crearDebugBox = document.getElementById('crear-debug');
    const ensureCrearDebugBox = () => {
      if (!debugCrear) return null;
      if (!crearDebugBox) {
        crearDebugBox = document.createElement('div');
        crearDebugBox.id = 'crear-debug';
        crearDebugBox.style.cssText = 'margin-top:16px;padding:12px;border:1px solid #ddd;border-radius:8px;background:#f7fbf9;';
        crearDebugBox.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <strong style="color:#003918;">Debug creación de evento</strong>
            <div>
              <button id="crear-debug-copiar" type="button" class="btn-base" style="margin-right:8px;">Copiar</button>
              <button id="crear-debug-cerrar" type="button" class="btn-base">Ocultar</button>
            </div>
          </div>
          <pre id="crear-debug-pre" style="white-space:pre-wrap;max-height:220px;overflow:auto;background:#fff;padding:8px;border:1px solid #eee;border-radius:6px;margin:0;"></pre>
          <p style="margin-top:8px;color:#2d5f3f;font-size:0.9em;">Tip: Puedes desactivar el debug quitando <code>?debug=1</code> o borrando <code>localStorage.debugCrearEvento</code>.</p>
        `;
        // Insertar después del formulario
        crearForm.parentNode.insertBefore(crearDebugBox, crearForm.nextSibling);
        const pre = crearDebugBox.querySelector('#crear-debug-pre');
        const btnCopiar = crearDebugBox.querySelector('#crear-debug-copiar');
        const btnCerrar = crearDebugBox.querySelector('#crear-debug-cerrar');
        if (btnCopiar && pre) {
          btnCopiar.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(pre.textContent || ''); mostrarMensajeExito('Logs copiados'); } catch { mostrarMensajeError('No se pudieron copiar los logs'); }
          });
        }
        if (btnCerrar) {
          btnCerrar.addEventListener('click', () => { crearDebugBox.style.display = 'none'; });
        }
      }
      return crearDebugBox;
    };
    const logCrear = (...args) => {
      try { console.log('🐞 CrearEvento:', ...args); } catch {}
      if (!debugCrear) return;
      const box = ensureCrearDebugBox();
      const pre = box && box.querySelector('#crear-debug-pre');
      if (pre) {
        const line = args.map(a => {
          try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
        }).join(' ');
        pre.textContent += (pre.textContent ? '\n' : '') + line;
      }
    };

    // Configurar min hoy en el calendario y restringir hora si es hoy
    const dateInput = document.getElementById('fecha');
    const timeInput = document.getElementById('hora');
    const pad2Local = (n) => String(n).padStart(2, '0');
    const todayLocalISO = () => {
      const d = new Date();
      return `${d.getFullYear()}-${pad2Local(d.getMonth() + 1)}-${pad2Local(d.getDate())}`;
    };
    const nowLocalHHmm = () => {
      const d = new Date();
      return `${pad2Local(d.getHours())}:${pad2Local(d.getMinutes())}`;
    };
    if (dateInput) {
      dateInput.min = todayLocalISO();
      dateInput.addEventListener('change', () => {
        if (!timeInput) return;
        if (dateInput.value === todayLocalISO()) {
          timeInput.min = nowLocalHHmm();
        } else {
          timeInput.removeAttribute('min');
        }
      });
    }

    crearForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      console.log('📝 Iniciando creación de evento...');
      if (debugCrear) ensureCrearDebugBox();
      logCrear('Inicio submit crear-evento');
      
      try {
        // Verificar que el usuario esté logueado
        const userIdAuth = localStorage.getItem('currentUserId') || localStorage.getItem('userId');
      
        if (!userIdAuth) {
          mostrarMensajeError('Debes iniciar sesión para crear un evento');
          logCrear('Error: usuario no autenticado');
          return;
        }

        console.log('✅ Usuario autenticado:', userIdAuth);
        logCrear('Usuario autenticado', userIdAuth);

        const formData = new FormData(e.target);
        
        // Obtener valores del formulario
        const titulo = formData.get('titulo')?.trim();
        const descripcion = formData.get('descripcion')?.trim();
        const fechaEntrada = formData.get('fecha')?.toString().trim();
        const horaEntrada = formData.get('hora')?.toString().trim();
        const ubicacion = formData.get('ubicacion')?.trim();
        const maxPersonasRaw = formData.get('max-personas');
        const linkGrupo = formData.get('link-grupo')?.trim() || '';
        
  console.log('📋 Datos del formulario:', { titulo, descripcion, fechaEntrada, horaEntrada, ubicacion, maxPersonasRaw });
  logCrear('Datos formulario', { titulo, descripcion, fechaEntrada, horaEntrada, ubicacion, maxPersonasRaw });

        // Validaciones básicas
        if (!titulo || !descripcion || !fechaEntrada || !horaEntrada || !ubicacion || !maxPersonasRaw) {
          mostrarMensajeError('Todos los campos son obligatorios');
          logCrear('Validación fallida: campos obligatorios faltantes');
          return;
        }

        // Normalizar fecha y hora
        const fechaEvento = normalizarFecha(fechaEntrada);
        const horaEvento = normalizarHora(horaEntrada);
        
        console.log('🕐 Fecha/hora normalizadas:', { fechaEvento, horaEvento });
        logCrear('Fecha/hora normalizadas', { fechaEvento, horaEvento });
        
        if (!fechaEvento || !horaEvento) {
          mostrarMensajeError('Fecha u hora inválida. Seleccioná desde el calendario o usá DD/MM/AAAA y HH:mm');
          logCrear('Validación fallida: fecha/hora inválida');
          return;
        }
      
        // Validar que la fecha no sea en el pasado
        const fechaHoraEvento = crearFechaLocal(fechaEvento, horaEvento);
        const ahora = new Date();
      
        console.log('📅 Validando fecha futura:', { fechaHoraEvento, ahora, esFutura: fechaHoraEvento > ahora });
        logCrear('Validación fecha futura', { esFutura: fechaHoraEvento > ahora });
        
        if (!fechaHoraEvento || fechaHoraEvento <= ahora) {
          mostrarMensajeError('La fecha y hora del evento debe ser futura');
          logCrear('Validación fallida: fecha pasada');
          return;
        }

        // Preparar UI de progreso
        const submitBtn = crearForm.querySelector('button[type="submit"], input[type="submit"]');
        let submitPrevText = '';
        if (submitBtn) {
          submitPrevText = submitBtn.textContent || submitBtn.value || '';
          if ('disabled' in submitBtn) submitBtn.disabled = true;
          if ('textContent' in submitBtn) submitBtn.textContent = 'Creando…';
          if ('value' in submitBtn) submitBtn.value = 'Creando…';
        }
        showCrearOverlay('Creando evento…');

        // Crear objeto del evento
        const evento = {
          titulo: titulo,
          descripcion: descripcion,
          fecha: fechaEvento,
          hora: horaEvento,
          ubicacion: ubicacion,
          linkGrupo: linkGrupo,
          maxPersonas: parseInt(maxPersonasRaw),
          unidos: 1,
          organizadorId: userIdAuth,
          createdAt: new Date().toISOString(),
          fechaHoraEvento: fechaHoraEvento.toISOString(),
          participantes: [userIdAuth],
          activo: true
        };
      
        console.log('💾 Guardando evento en Firestore...');
        logCrear('Guardando evento en Firestore');
        const eventoId = await saveToFirestore('eventos', evento);
        console.log('✅ Evento guardado con ID:', eventoId);
        logCrear('Evento guardado', { eventoId });

        // Guardar en el historial del usuario creador
        const historialData = {
          eventoId: eventoId,
          tipo: 'creado',
          titulo: evento.titulo,
          descripcion: evento.descripcion,
          fecha: evento.fecha,
          hora: evento.hora,
          ubicacion: evento.ubicacion,
          linkGrupo: evento.linkGrupo,
          maxPersonas: evento.maxPersonas,
          unidos: 1,
          organizadorId: evento.organizadorId,
          fechaCreacion: new Date().toISOString()
        };
      
        console.log('📝 Guardando historial...');
        logCrear('Guardando historial');
        await saveToFirestore('historial', historialData, `${userIdAuth}_${eventoId}_creado`);
        console.log('✅ Historial guardado');
        logCrear('Historial guardado');
      
        // Enviar notificaciones inmediatamente (bloqueante pero más confiable)
        console.log('📧 Enviando notificaciones de nuevo evento...');
        updateCrearOverlay('Enviando notificaciones...');
        try {
          await notificarNuevoEvento(evento, eventoId);
          console.log('✅ Notificaciones completadas');
        } catch (errNotif) {
          console.warn('⚠️ Error en notificaciones (no crítico):', errNotif);
        }
      
        mostrarMensajeExito('¡Evento creado exitosamente!');
        updateCrearOverlay('Evento creado. Redirigiendo a inicio…');
        e.target.reset();
        // Ya no necesitamos localStorage para notificaciones diferidas
        localStorage.setItem('eventoCreadoReciente', '1');
        
        if (debugCrear) {
          logCrear('Debug activo: NO redirigiré para poder copiar los logs.');
          mostrarMensajeExito('Debug activo: no se redirige automáticamente.');
          // En modo debug, reactivar botón y dejar overlay visible con mensaje
          if (submitBtn) {
            if ('disabled' in submitBtn) submitBtn.disabled = false;
            if ('textContent' in submitBtn) submitBtn.textContent = submitPrevText || 'Crear';
            if ('value' in submitBtn) submitBtn.value = submitPrevText || 'Crear';
          }
        } else {
          console.log('🔄 Redirigiendo a inicio...');
          // Redirigir a inicio después de 1.2s
          setTimeout(() => {
            window.location.href = 'inicio.html';
          }, 1200);
        }
      
      } catch (error) {
        console.error('❌ Error completo:', error);
        console.error('❌ Nombre del error:', error.name);
        console.error('❌ Mensaje:', error.message);
        console.error('❌ Stack:', error.stack);
        logCrear('Error en creación', { name: error?.name, message: error?.message });
        mostrarMensajeError(`Error al crear el evento: ${error.message || 'Error desconocido'}`);
        // Restaurar UI de progreso
        hideCrearOverlay();
        const submitBtn = crearForm.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) {
          if ('disabled' in submitBtn) submitBtn.disabled = false;
          if ('textContent' in submitBtn) submitBtn.textContent = 'Crear';
          if ('value' in submitBtn) submitBtn.value = 'Crear';
        }
      }
    });
  }

  // 6) Inicio: botón Unirse y Favoritos (migrado a bindEventoButtons)

  // 7) Favoritos: render en favoritos.html
  const favoritosLista = $('#favoritos-lista');
  if (favoritosLista) {
    const loadFavoritos = async () => {
      const userId = localStorage.getItem('currentUserId');
      if (!userId) {
        favoritosLista.innerHTML = "<p style='text-align:center;'>Inicia sesión para ver tus favoritos.</p>";
        return;
      }

      // Usar el mismo patrón de Inicio: control de loading/vacío en el DOM
      const loadingDiv = document.getElementById('favoritos-loading');
      const vacioDiv = document.getElementById('favoritos-vacio');
      if (loadingDiv) loadingDiv.style.display = 'block';
      if (vacioDiv) vacioDiv.style.display = 'none';

      // Traer SOLO los favoritos del usuario (consulta indexada)
      let misFavoritos = [];
      try {
        misFavoritos = await getFromFirestoreWhere('favoritos', 'userId', '==', userId);
      } catch (err) {
        console.warn('No se pudieron obtener favoritos desde BD, usando solo locales:', err);
        misFavoritos = [];
      }

      // Añadir eventos marcados solo en local
      const setLocal = getLocalFavoritosSet(userId);
      const idsBD = new Set(misFavoritos.map(f => f.eventoId));
      const idsSoloLocales = Array.from(setLocal).filter(id => !idsBD.has(id));

      if (idsSoloLocales.length) {
        // Traer solo esos eventos por ID, no toda la colección
        let eventosLocales = [];
        try { eventosLocales = await getManyFromFirestore('eventos', idsSoloLocales); } catch (e) { eventosLocales = []; }
        const mapa = new Map((eventosLocales || []).map(e => [e.id, e]));
        const sinteticos = idsSoloLocales.map(id => {
          const e = mapa.get(id);
          return e ? {
            id: `${userId}_${e.id}`,
            eventoId: e.id,
            userId,
            titulo: e.titulo,
            descripcion: e.descripcion,
            fecha: e.fecha,
            hora: e.hora,
            ubicacion: e.ubicacion,
            organizador: e.organizador,
            fechaAgregado: 'local'
          } : null;
        }).filter(Boolean);
        misFavoritos = [...misFavoritos, ...sinteticos];
      }

      if (!misFavoritos.length) {
        if (loadingDiv) loadingDiv.style.display = 'none';
        const vacio = document.getElementById('favoritos-vacio');
        if (vacio) vacio.style.display = 'block';
        return;
      } else {
        // Funciones helper para formatear fecha y hora usando funciones centralizadas
        // Limpiar contenedor conservando controles (loading/vacío)
        const controlesFav = favoritosLista.querySelectorAll('#favoritos-loading, #favoritos-vacio');
        favoritosLista.innerHTML = '';
        controlesFav.forEach(el => favoritosLista.appendChild(el));
        const ahora = new Date();

        // 1) Obtener TODOS los eventos favoritos en paralelo
        const favIds = Array.from(new Set(misFavoritos.map(f => f.eventoId).filter(Boolean)));
        const eventosFav = await getManyFromFirestore('eventos', favIds);
        const mapaEventos = new Map(eventosFav.map(e => [e.id, e]));

        // 2) Filtrar por eventos futuros y activos
        const eventosRender = eventosFav.filter(ev => {
          if (ev.activo !== true) return false;
          const d = construirFechaHora(ev);
          if (!d) return true; // si no hay fecha válida, no ocultar por error de dato
          return ahora < d;
        });

        // 3) Pre-cargar perfiles de organizadores en paralelo
        const organizadorIds = Array.from(new Set(eventosRender.map(e => e.organizadorId).filter(Boolean)));
        const perfiles = await getManyFromFirestore('perfiles', organizadorIds);
        const mapaPerfiles = new Map(perfiles.map(p => [p.id, p]));

        // 4) Renderizar
        const favoritosPorIdEvento = new Map(misFavoritos.map(f => [f.eventoId, f]));
        for (const evento of eventosRender) {
          const fav = favoritosPorIdEvento.get(evento.id);
          if (!fav) continue;

          // Datos del organizador: primero buscar en usuarios (registro), luego en perfiles (edición)
          let nombreOrganizador = 'Desconocido';
          let fotoOrganizador = DEFAULT_AVATAR;
          
          if (evento.organizadorId) {
            try {
              // Prioridad 1: buscar en usuarios (donde se registran)
              const usuarioOrganizador = await getFromFirestore('usuarios', evento.organizadorId);
              if (usuarioOrganizador && (usuarioOrganizador.nombre || usuarioOrganizador.apellido)) {
                nombreOrganizador = (usuarioOrganizador.nombre && usuarioOrganizador.apellido)
                  ? `${usuarioOrganizador.nombre} ${usuarioOrganizador.apellido}`
                  : (usuarioOrganizador.nombre || usuarioOrganizador.apellido || nombreOrganizador);
                fotoOrganizador = usuarioOrganizador.foto || fotoOrganizador;
              } else {
                // Prioridad 2: buscar en perfiles (legacy)
                const perfilOrganizador = mapaPerfiles.get(evento.organizadorId);
                if (perfilOrganizador) {
                  nombreOrganizador = (perfilOrganizador.nombre && perfilOrganizador.apellido)
                    ? `${perfilOrganizador.nombre} ${perfilOrganizador.apellido}`
                    : (perfilOrganizador.nombre || nombreOrganizador);
                  fotoOrganizador = perfilOrganizador.foto || fotoOrganizador;
                }
              }
            } catch (e) {
              console.warn('Error obteniendo datos del organizador:', e);
            }
          }

          const unidos = Array.isArray(evento.participantes) ? evento.participantes.length : (Array.isArray(evento.usuariosUnidos) ? evento.usuariosUnidos.length : Number(evento.unidos || 0));
          const max = Number(evento.maxPersonas || 0);
          const disponibles = Math.max(0, max - unidos);
          const isOrganizadorFav = userId && evento.organizadorId && evento.organizadorId === userId;
          const yaParticipa = Array.isArray(evento.participantes) && evento.participantes.includes(userId);

          // Formatear fecha y hora con funciones centralizadas
          const fechaFormateada = formatearFechaArgentina(evento.fecha);
          const horaFormateada = formatearHoraArgentina(evento.hora);

          const card = document.createElement('div');
          card.className = 'favoritos-card-evento';
          
          // Link de grupo: solo visible si el usuario YA está participando (o es el organizador)
          const linkGrupoFavRow = (evento.linkGrupo && String(evento.linkGrupo).trim() && (yaParticipa || isOrganizadorFav))
            ? `<div class="favoritos-link-grupo-row">
                 <span>Link de grupo:</span>
                 <a href="${evento.linkGrupo}" target="_blank" rel="noopener noreferrer">${evento.linkGrupo}</a>
               </div>`
            : '';
          card.innerHTML = `
            <div class="favoritos-titulo-row">
              <h2 class="favoritos-titulo-evento">${evento.titulo || ''}</h2>
              ${(yaParticipa || isOrganizadorFav) ? '<span class="evento-participando-badge">Participando</span>' : ''}
            </div>
            <p class="favoritos-descripcion-evento">${evento.descripcion || ''}</p>
            ${linkGrupoFavRow}
            <div class="favoritos-detalles-evento">
              <span><img src="img/calendario.png" alt="Fecha" class="icono-evento"> ${fechaFormateada}</span>
              <span><img src="img/reloj-circular.png" alt="Hora" class="icono-evento"> ${horaFormateada}</span>
              <span><img src="img/ubicacion.png" alt="Ubicación" class="icono-evento"> ${evento.ubicacion || ''}</span>
              <span><img src="img/personas.png" alt="Participantes" class="icono-evento"> ${unidos}/${max} unidos <span class="evento-disponibles-texto">(${disponibles} lugares disponibles)</span></span>
            </div>
            <div class="favoritos-bottom-row">
              <div class="favoritos-organizador">
                <img src="${fotoOrganizador}" alt="Foto organizador" class="favoritos-organizador-foto" onerror="this.src='${DEFAULT_AVATAR}'" />
                <span class="favoritos-organizador-nombre">${organizadorLabel(nombreOrganizador)}</span>
              </div>
              <div class="favoritos-actions">
                <button class="inicio-btn-favorito-nuevo active" data-evento-id="${fav.eventoId}" aria-pressed="true" aria-label="Quitar de favoritos">
                  <img src="img/logo-estrella.png" alt="Favorito" class="icono-evento" />
                </button>
                <button class="inicio-btn-compartir-nuevo" data-evento-id="${fav.eventoId}">
                  <img src="img/logo-compartir.png" alt="Compartir" class="icono-evento" />
                </button>
                ${isOrganizadorFav 
                  ? `<button class="inicio-btn-organizador" disabled>Organizador</button>`
                  : (yaParticipa 
                      ? `<button class=\"favoritos-btn-salir\" data-evento-id=\"${fav.eventoId}\">No participar</button>` 
                      : `<button class=\"favoritos-btn-unirse\" data-evento-id=\"${fav.eventoId}\">Unirse</button>`)}
              </div>
            </div>`;
          favoritosLista.appendChild(card);
        }
        
        // Ocultar loading
        if (loadingDiv) loadingDiv.style.display = 'none';

        // Mostrar mensaje si no hay eventos favoritos
        const tieneCards = Array.from(favoritosLista.children).some(el => !['FAVORITOS-LOADING','FAVORITOS-VACIO'].includes(el.id?.toUpperCase?.()))
        if (!tieneCards) {
          const vacio = document.getElementById('favoritos-vacio');
          if (vacio) vacio.style.display = 'block';
        } else {
          const vacio = document.getElementById('favoritos-vacio');
          if (vacio) vacio.style.display = 'none';
          bindFavoritosButtons();
        }
      }
    };
    loadFavoritos();
    
    // Exponer loadFavoritos globalmente para recarga desde edición
    window.loadFavoritosRef = loadFavoritos;
  }
  
  // Función global para eliminar eventos duplicados manualmente
  window.eliminarEventosDuplicados = async () => {
    console.log('🛠️ Buscando eventos duplicados...');
    try {
      const userId = localStorage.getItem('currentUserId') || localStorage.getItem('userId');
      if (!userId) {
        console.error('❌ No hay usuario autenticado');
        return;
      }
      
      // Obtener todos los eventos del usuario
      const todosEventos = await getFromFirestore('eventos');
      const eventosUsuario = todosEventos.filter(e => e.organizadorId === userId);
      
      console.log(`📋 Eventos del usuario: ${eventosUsuario.length}`);
      
      // Obtener historial del usuario
      const todosHistorial = await getFromFirestore('historial');
      const miHistorial = todosHistorial.filter(h => h.id && h.id.startsWith(`${userId}_`));
      const eventosEnHistorial = new Set(miHistorial.map(h => h.eventoId));
      
      console.log(`📖 Eventos en historial: ${eventosEnHistorial.size}`);
      
      // Encontrar duplicados (eventos sin historial)
      const duplicados = eventosUsuario.filter(e => !eventosEnHistorial.has(e.id));
      
      if (duplicados.length === 0) {
        console.log('✅ No se encontraron duplicados');
        return;
      }
      
      console.log(`🔥 Encontrados ${duplicados.length} duplicados:`);
      duplicados.forEach(e => {
        console.log(`  - ${e.titulo} (ID: ${e.id})`);
      });
      
      const confirmar = confirm(`¿Deseas eliminar ${duplicados.length} evento(s) duplicado(s) que no aparecen en tu historial?`);
      if (!confirmar) {
        console.log('❌ Cancelado por el usuario');
        return;
      }
      
      let eliminados = 0;
      for (const evento of duplicados) {
        try {
          // Eliminar evento
          await deleteFromFirestore('eventos', evento.id);
          
          // Limpiar referencias en favoritos
          const favs = await getFromFirestore('favoritos');
          for (const fav of (favs || [])) {
            if (fav.eventoId === evento.id) {
              await deleteFromFirestore('favoritos', fav.id);
            }
          }
          
          // Limpiar referencias en valoraciones
          const vals = await getFromFirestore('valoraciones');
          for (const val of (vals || [])) {
            if (val.eventoId === evento.id) {
              await deleteFromFirestore('valoraciones', val.id);
            }
          }
          
          eliminados++;
          console.log(`✅ Eliminado: ${evento.titulo}`);
        } catch (err) {
          console.error(`❌ Error eliminando ${evento.titulo}:`, err);
        }
      }
      
      console.log(`✅ Proceso completado: ${eliminados} evento(s) eliminado(s)`);
      
      // Recargar vistas
      if (document.querySelector('#eventos-lista')) {
        location.reload();
      }
    } catch (error) {
      console.error('❌ Error en eliminarEventosDuplicados:', error);
    }
  };
  
  function organizadorLabel(nombre){
  if (!nombre) return '';
  return `<b>Organizado por</b><br>${nombre}`;
  }

  // 8) Buscador en tiempo real en inicio.html
  const buscador = $('#buscador');
  if (buscador) {
    const eventosLista = $('#eventos-lista');
    let timeoutBusqueda;
    
    // Crear mensaje "sin resultados" dinámicamente
    const mensajeSinResultados = document.createElement('div');
    mensajeSinResultados.id = 'sin-resultados-busqueda';
    mensajeSinResultados.style.display = 'none';
    mensajeSinResultados.innerHTML = `
      <div style="text-align: center; padding: 3em 2em; background: #f7fbf9; border-radius: 10px; margin: 2em auto; max-width: 600px; border: 1.5px solid #e0e0e0;">
        <h3 style="color: #003918; margin-bottom: 0.5em; font-size: 1.4em;">🔍 No se encontraron eventos</h3>
        <p style="color: #2d5f3f; margin-bottom: 1.5em; font-size: 1.05em;">No hay eventos que coincidan con "<span id="termino-busqueda" style="font-weight: bold;"></span>"</p>
        <a href="crear-evento.html" style="display: inline-block; background: #003918; color: #fff; padding: 0.7em 1.8em; border-radius: 8px; text-decoration: none; font-weight: bold; transition: background 0.2s;">
          ¡Crea el primer evento!
        </a>
      </div>
    `;
    
    if (eventosLista) {
      eventosLista.appendChild(mensajeSinResultados);
    }
    
    buscador.addEventListener('input', () => {
      clearTimeout(timeoutBusqueda);
      
      // Pequeño delay para evitar búsquedas excesivas mientras escribe
      timeoutBusqueda = setTimeout(() => {
        const query = buscador.value.trim().toLowerCase();
        const cards = $$('.inicio-card-evento');
        let eventosVisibles = 0;
        
        cards.forEach(card => {
          if (!query) {
            // Si no hay búsqueda, mostrar todos
            card.style.display = '';
            eventosVisibles++;
          } else {
            // Buscar en título, descripción y ubicación
            const titulo = card.querySelector('.inicio-titulo-evento')?.textContent.toLowerCase() || '';
            const descripcion = card.querySelector('.inicio-descripcion-evento')?.textContent.toLowerCase() || '';
            const ubicacion = card.querySelector('.inicio-detalles-evento')?.textContent.toLowerCase() || '';
            const organizador = card.querySelector('.inicio-organizador-nombre')?.textContent.toLowerCase() || '';
            
            const coincide = titulo.includes(query) || 
                           descripcion.includes(query) || 
                           ubicacion.includes(query) ||
                           organizador.includes(query);
            
            if (coincide) {
              card.style.display = '';
              eventosVisibles++;
            } else {
              card.style.display = 'none';
            }
          }
        });
        
        // Mostrar/ocultar mensaje de "sin resultados"
        if (query && eventosVisibles === 0) {
          mensajeSinResultados.style.display = 'block';
          document.getElementById('termino-busqueda').textContent = query;
        } else {
          mensajeSinResultados.style.display = 'none';
        }
      }, 300); // 300ms de delay
    });
  }

  // 9) Menú de tres puntitos y cerrar sesión
  
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      mostrarMensajeExito('¡Bienvenido!');
      const email = (document.getElementById("email") || {}).value || "";
      const phone = (document.getElementById("phone") || {}).value || "";
      const password = (document.getElementById("password") || {}).value || "";
      
      const destino = email || phone;
      if (!destino || !password) {
        mostrarToast("Por favor, completá todos los campos.", 'error');
        return;
      }
      
      const userId = destino.replace(/[@\s\+\-\.]/g, '_');
      const usuario = await getFromFirestore("usuarios", userId);
      
      if (usuario && usuario.password === password) {
        localStorage.setItem("currentUserId", userId);
        // Prefetch de perfil para que la vista cargue más rápido
        try {
          const [perfil, usuarioData] = await Promise.all([
            getFromFirestore('perfiles', userId),
            getFromFirestore('usuarios', userId)
          ]);
          const nombre = (perfil?.nombre) || usuarioData?.nombre || '';
          const apellido = (perfil?.apellido) || usuarioData?.apellido || '';
          const edad = (perfil?.edad) || usuarioData?.edad;
          const sexo = (perfil?.sexo) || usuarioData?.sexo;
          const descripcion = perfil?.descripcion || '';
          const foto = (perfil?.foto) || usuarioData?.foto;
          const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ').trim();
          if (nombreCompleto) localStorage.setItem('currentUserName', nombreCompleto);
          if (edad !== undefined) localStorage.setItem('perfilEdad', String(edad));
          if (sexo) localStorage.setItem('perfilSexo', sexo);
          if (descripcion) localStorage.setItem('perfilDescripcion', descripcion);
          if (foto) localStorage.setItem('userPhoto', foto);
        } catch {}
        mostrarMensajeExito('¡Bienvenido!');
        window.location.href = 'inicio.html';
      } else {
        mostrarToast("Credenciales incorrectas.", 'error');
      }
    });
  }

  // 11) Cargar eventos dinámicamente en inicio.html
  // Helpers de fecha/hora robustos y normalización de eventos
  const pad2 = (n) => String(n).padStart(2, '0');
  const normalizarFecha = (fRaw) => {
    if (!fRaw) return '';
    const f = String(fRaw).trim();
    // ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f;
    // DD/MM/YYYY o DD-MM-YYYY
    const m = f.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const d = pad2(m[1]);
      const mo = pad2(m[2]);
      const y = m[3];
      return `${y}-${mo}-${d}`;
    }
    // Si es Date o similar
    const d2 = new Date(f);
    if (!isNaN(d2.getTime())) {
      return `${d2.getFullYear()}-${pad2(d2.getMonth()+1)}-${pad2(d2.getDate())}`;
    }
    return '';
  };

  const normalizarHora = (hRaw) => {
    if (!hRaw && hRaw !== 0) return '';
    const h = String(hRaw).trim().toLowerCase().replace(/\s*hs?\.?$/,'');
    // HH:mm o HH:mm:ss
    let m = h.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (m) {
      const hh = pad2(Math.min(23, parseInt(m[1])));
      const mm = pad2(Math.min(59, parseInt(m[2])));
      return `${hh}:${mm}`;
    }
    // Solo HH
    m = h.match(/^(\d{1,2})$/);
    if (m) {
      const hh = pad2(Math.min(23, parseInt(m[1])));
      return `${hh}:00`;
    }
    return '';
  };

  const construirFechaHora = (evento) => {
    // Priorizar ISO almacenado (pero parsearlo como local, no UTC)
    if (evento && evento.fechaHoraEvento) {
      const d = new Date(evento.fechaHoraEvento);
      if (!isNaN(d.getTime())) return d;
    }
    const f = normalizarFecha(evento?.fecha);
    const h = normalizarHora(evento?.hora);
    if (!f || !h) return null;
    // Usar crearFechaLocal para evitar problemas de zona horaria
    return crearFechaLocal(f, h);
  };

  // Normalización de eventos (fechas inválidas)
  const normalizarEventosEnBD = async (eventos) => {
    const ahora = new Date();
    const normalizados = [];
    let eventosModificados = 0;
    
    for (const e of (eventos || [])) {
      let cambiado = false;
      let fechaISO = normalizarFecha(e.fecha);
      let horaISO = normalizarHora(e.hora);
      let fechaHora = construirFechaHora({ ...e, fecha: fechaISO || e.fecha, hora: horaISO || e.hora });

      // Si no hay fechaHora válida pero hay fechaHoraEvento ISO, usarla para derivar
      if (!fechaHora && e.fechaHoraEvento) {
        const d = new Date(e.fechaHoraEvento);
        if (!isNaN(d.getTime())) {
          fechaHora = d;
          fechaISO = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
          horaISO = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
          cambiado = true;
        }
      }

      // Si aún faltan fecha/hora pero createdAt existe, no derivamos para evitar inconsistencias de negocio
      if (!fechaISO || !horaISO) {
        // mantener valores originales
      }

      // Asegurar fechaHoraEvento ISO consistente si tenemos fecha/hora
      if ((!e.fechaHoraEvento || isNaN(new Date(e.fechaHoraEvento).getTime())) && fechaISO && horaISO) {
        const d = new Date(`${fechaISO}T${horaISO}`);
        if (!isNaN(d.getTime())) {
          e.fechaHoraEvento = d.toISOString();
          cambiado = true;
        }
      }

      // Normalizar tipos de 'activo'
      let activoValor = e.activo;
      if (typeof activoValor === 'string') {
        const s = activoValor.trim().toLowerCase();
        activoValor = (s === 'true' || s === '1' || s === 'si' || s === 'sí');
      } else {
        activoValor = !!activoValor;
      }

      // No forzar activar si alguien lo desactivó manualmente. Solo activar por defecto si el campo falta.
      if (e.activo === undefined && fechaHora && ahora < fechaHora) {
        activoValor = true;
        cambiado = true;
      }

      const actualizado = { ...e };
      if (fechaISO && e.fecha !== fechaISO) { actualizado.fecha = fechaISO; cambiado = true; }
      if (horaISO && e.hora !== horaISO) { actualizado.hora = horaISO; cambiado = true; }
      if (actualizado.activo !== activoValor) { actualizado.activo = activoValor; cambiado = true; }

  // Guardar solo si hay cambios
      if (cambiado) {
        try { 
          await saveToFirestore('eventos', actualizado, e.id);
          eventosModificados++;
        } catch (err) { 
          console.warn('⚠️ No se pudo normalizar evento', e.id, err); 
        }
      }
      normalizados.push(actualizado);
    }
    
    if (eventosModificados > 0) {
      console.log(`✅ ${eventosModificados} eventos normalizados en BD`);
    } else {
      console.log('✅ Todos los eventos ya están normalizados (sin escrituras redundantes)');
    }
    
    return normalizados;
  };
  
  // Sincroniza el estado visual de favoritos según la BD del usuario actual
  // Fusiona con favoritos locales (fallback) para evitar errores visibles cuando la BD falla
  const marcarFavoritosUsuario = async () => {
    const userId = localStorage.getItem('currentUserId') || localStorage.getItem('userId');
    if (!userId) return;
    try {
      const favs = await getFromFirestore('favoritos');
      const setFavBD = new Set((favs || []).filter(f => f.userId === userId).map(f => f.eventoId));
      const setLocal = getLocalFavoritosSet(userId);
      const setFav = new Set([...setFavBD, ...setLocal]);
      document.querySelectorAll('.inicio-btn-favorito-nuevo').forEach((btn) => {
        const id = btn.getAttribute('data-evento-id');
        const active = setFav.has(id);
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    } catch (e) {
      console.warn('⚠️ No se pudieron sincronizar favoritos UI (BD falló), aplicando fallback local:', e);
      // Aplicar solo favoritos locales
      const userIdLocal = localStorage.getItem('currentUserId') || localStorage.getItem('userId');
      const setLocal = userIdLocal ? getLocalFavoritosSet(userIdLocal) : new Set();
      document.querySelectorAll('.inicio-btn-favorito-nuevo').forEach((btn) => {
        const id = btn.getAttribute('data-evento-id');
        const active = setLocal.has(id);
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }
  };
  
  // Paginación de eventos
  let paginaActualInicio = 1;
  const EVENTOS_POR_PAGINA = 10;
  let eventosTotalesInicio = [];
  
  // 🔄 Escuchar si se editó un evento desde otra vista y recargar
  const verificarYRecargarSiEditado = () => {
    const eventoEditadoReciente = localStorage.getItem('eventoEditadoReciente');
    if (eventoEditadoReciente === '1') {
      localStorage.removeItem('eventoEditadoReciente');
      console.log('🔄 Evento editado detectado, recargando inicio...');
      if (document.querySelector('#eventos-lista')) {
        loadEventosInicio(paginaActualInicio);
      }
      if (document.querySelector('#favoritos-lista')) {
        const loadFavoritosRef = window.loadFavoritosRef;
        if (typeof loadFavoritosRef === 'function') {
          loadFavoritosRef();
        }
      }
    }
  };
  
  // Verificar cada 2 segundos si hubo edición
  setInterval(verificarYRecargarSiEditado, 2000);
  
  const loadEventosInicio = async (pagina = 1) => {
    const eventosContainer = $('#eventos-lista');
    if (!eventosContainer) return;
    
      const loadingDiv = $('#eventos-loading');
      const vacioDiv = $('#eventos-vacio');
    
      try {
        // Mostrar loading
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (vacioDiv) vacioDiv.style.display = 'none';
      
  // Obtener y normalizar todos los eventos desde Firestore
  const eventosRaw = await getFromFirestore('eventos');
  const eventosData = await normalizarEventosEnBD(eventosRaw);

        // Filtrar solo eventos activos y que aún no hayan comenzado
        const ahora = new Date();
        const eventosVisibles = eventosData.filter(evento => {
          // activo debe ser boolean true
          if (evento.activo !== true) return false;
          const d = construirFechaHora(evento);
          // Si no tenemos fecha/hora válidas, lo mostramos para no ocultar por error de dato
          if (!d) return true;
          return ahora < d;
        });

        // Ocultar loading
        if (loadingDiv) loadingDiv.style.display = 'none';

        if (!eventosVisibles.length) {
          if (vacioDiv) vacioDiv.style.display = 'block';
          return;
        }

        // Ordenar eventos por fecha más próxima
        eventosVisibles.sort((a, b) => {
          const da = construirFechaHora(a) || new Date(8640000000000000);
          const db = construirFechaHora(b) || new Date(8640000000000000);
          return da - db;
        });

  // Calcular slice y total de páginas
        eventosTotalesInicio = eventosVisibles;
        const totalPaginas = Math.ceil(eventosTotalesInicio.length / EVENTOS_POR_PAGINA);
        const inicio = (pagina - 1) * EVENTOS_POR_PAGINA;
        const fin = inicio + EVENTOS_POR_PAGINA;
        const eventosPagina = eventosTotalesInicio.slice(inicio, fin);

        // Limpiar contenedor (mantener solo elementos de control)
        const elementosControl = eventosContainer.querySelectorAll('#eventos-loading, #eventos-vacio');
        eventosContainer.innerHTML = '';
        elementosControl.forEach(el => eventosContainer.appendChild(el));

        // Crear cards para eventos de esta página
        for (const evento of eventosPagina) {
          // Obtener datos del organizador: primero usuarios (registro), luego perfiles (edición)
          let nombreOrganizador = 'Desconocido';
          let fotoOrganizador = DEFAULT_AVATAR;
          
          if (evento.organizadorId) {
            try {
              console.log(`🔍 Buscando organizador para evento "${evento.titulo}" con ID: ${evento.organizadorId}`);
              
              // Prioridad 1: buscar en usuarios (donde se registran)
              const usuarioOrganizador = await getFromFirestore('usuarios', evento.organizadorId);
              console.log('📊 Usuario obtenido:', usuarioOrganizador ? { 
                nombre: usuarioOrganizador.nombre, 
                apellido: usuarioOrganizador.apellido,
                foto: usuarioOrganizador.foto ? 'presente' : 'no'
              } : 'NO ENCONTRADO');
              
              if (usuarioOrganizador && (usuarioOrganizador.nombre || usuarioOrganizador.apellido)) {
                nombreOrganizador = usuarioOrganizador.nombre && usuarioOrganizador.apellido 
                  ? `${usuarioOrganizador.nombre} ${usuarioOrganizador.apellido}`
                  : usuarioOrganizador.nombre || usuarioOrganizador.apellido || nombreOrganizador;
                fotoOrganizador = usuarioOrganizador.foto || fotoOrganizador;
                console.log(`✅ Organizador desde usuarios: ${nombreOrganizador}`);
              } else {
                // Prioridad 2: buscar en perfiles (legacy)
                console.log('🔄 Usuario no encontrado o sin nombre, buscando en perfiles...');
                const perfilOrganizador = await getFromFirestore('perfiles', evento.organizadorId);
                console.log('📊 Perfil obtenido:', perfilOrganizador ? {
                  nombre: perfilOrganizador.nombre,
                  apellido: perfilOrganizador.apellido,
                  foto: perfilOrganizador.foto ? 'presente' : 'no'
                } : 'NO ENCONTRADO');
                
                if (perfilOrganizador && (perfilOrganizador.nombre || perfilOrganizador.apellido)) {
                  nombreOrganizador = perfilOrganizador.nombre && perfilOrganizador.apellido 
                    ? `${perfilOrganizador.nombre} ${perfilOrganizador.apellido}`
                    : perfilOrganizador.nombre || nombreOrganizador;
                  fotoOrganizador = perfilOrganizador.foto || fotoOrganizador;
                  console.log(`✅ Organizador desde perfiles: ${nombreOrganizador}`);
                } else {
                  // Fallback 3: intentar con ID saneado (caso datos antiguos guardaron el ID sin sanitizar)
                  const sanitizeId = (s) => String(s || '').replace(/[@\s\+\-\.]/g, '_');
                  const altId = sanitizeId(evento.organizadorId);
                  if (altId && altId !== evento.organizadorId) {
                    console.log(`🧩 Intentando resolver organizador con ID saneado: ${altId}`);
                    const usuarioAlt = await getFromFirestore('usuarios', altId);
                    if (usuarioAlt && (usuarioAlt.nombre || usuarioAlt.apellido)) {
                      nombreOrganizador = usuarioAlt.nombre && usuarioAlt.apellido
                        ? `${usuarioAlt.nombre} ${usuarioAlt.apellido}`
                        : usuarioAlt.nombre || usuarioAlt.apellido || nombreOrganizador;
                      fotoOrganizador = usuarioAlt.foto || fotoOrganizador;
                      console.log(`✅ Organizador resuelto con ID saneado (usuarios): ${nombreOrganizador}`);
                    } else {
                      const perfilAlt = await getFromFirestore('perfiles', altId);
                      if (perfilAlt && (perfilAlt.nombre || perfilAlt.apellido)) {
                        nombreOrganizador = perfilAlt.nombre && perfilAlt.apellido
                          ? `${perfilAlt.nombre} ${perfilAlt.apellido}`
                          : perfilAlt.nombre || nombreOrganizador;
                        fotoOrganizador = perfilAlt.foto || fotoOrganizador;
                        console.log(`✅ Organizador resuelto con ID saneado (perfiles): ${nombreOrganizador}`);
                      }
                    }
                    if (nombreOrganizador === 'Desconocido') {
                      console.warn(`⚠️ No se encontró organizador con ID original ${evento.organizadorId} ni con ID saneado ${altId}`);
                      console.warn(`💡 POSIBLE CAUSA: el usuario no tiene nombre/apellido en 'usuarios' o el evento guarda un ID inconsistente.`);
                      mostrarMensajeError(`El organizador del evento "${evento.titulo}" no tiene nombre configurado. Debe ir a Perfil y completar sus datos.`);
                    } else {
                      console.warn(`ℹ️ Sugerencia: actualizar evento.organizadorId a ${altId} para consistencia futura.`);
                    }
                  } else {
                    console.warn(`⚠️ No se encontró organizador con ID: ${evento.organizadorId} ni en usuarios ni en perfiles`);
                    console.warn(`💡 POSIBLE SOLUCIÓN: El usuario ${evento.organizadorId} debe completar su perfil con nombre y apellido`);
                    mostrarMensajeError(`El organizador del evento "${evento.titulo}" no tiene nombre configurado. Debe ir a Perfil y completar sus datos.`);
                  }
                }
              }
            } catch (e) {
              console.error('❌ Error obteniendo datos del organizador:', e);
            }
          } else {
            console.warn('⚠️ Evento sin organizadorId:', evento.titulo);
          }

          const unidosCalc = Array.isArray(evento.participantes) ? evento.participantes.length : (Array.isArray(evento.usuariosUnidos) ? evento.usuariosUnidos.length : Number(evento.unidos || 0));
          const disponibles = Math.max(0, Number(evento.maxPersonas || 0) - unidosCalc);
          const currentUserId = localStorage.getItem('currentUserId') || localStorage.getItem('userId');
          const isOrganizador = currentUserId && evento.organizadorId && evento.organizadorId === currentUserId;
          const yaParticipa = currentUserId && Array.isArray(evento.participantes) && evento.participantes.includes(currentUserId);
          const isAdmin = window._isAdmin || false;

          let botonTexto = 'Unirse';
          let botonDisabled = false;
          if (disponibles <= 0) {
            botonTexto = 'Completo';
            botonDisabled = true;
          } else if (isOrganizador) {
            botonTexto = 'Organizador';
            botonDisabled = true;
          } else if (yaParticipa) {
            botonTexto = 'Participando';
            botonDisabled = true;
          }
          
          // Formatear con funciones centralizadas
          const fechaFormateada = formatearFechaArgentina(evento.fecha);
          const horaFormateada = formatearHoraArgentina(evento.hora);
          
          // Link de grupo: solo visible si el usuario YA está participando (o es el organizador)
          const linkGrupoRow = (evento.linkGrupo && String(evento.linkGrupo).trim() && (yaParticipa || isOrganizador))
            ? `<div class="inicio-link-grupo-row">
                 <span>Link de grupo:</span>
                 <a href="${evento.linkGrupo}" target="_blank" rel="noopener noreferrer">${evento.linkGrupo}</a>
               </div>`
            : '';

          const eventoCard = document.createElement('div');
          eventoCard.className = 'inicio-card-evento';
          eventoCard.dataset.eventoId = evento.id;

          eventoCard.innerHTML = `
            <div class="inicio-titulo-row">
              <h2 class="inicio-titulo-evento">${evento.titulo}</h2>
              ${(yaParticipa || isOrganizador) ? '<span class="evento-participando-badge">Participando</span>' : ''}
            </div>
            <p class="inicio-descripcion-evento">${evento.descripcion}</p>
            ${linkGrupoRow}
            <div class="inicio-detalles-evento">
              <span><img src="img/calendario.png" alt="Fecha" class="icono-evento" /> ${fechaFormateada}</span>
              <span><img src="img/reloj-circular.png" alt="Hora" class="icono-evento" /> ${horaFormateada}</span>
              <span><img src="img/ubicacion.png" alt="Ubicación" class="icono-evento" /> ${evento.ubicacion}</span>
              <span>
                <img src="img/personas.png" alt="Personas" class="icono-evento" />
                ${unidosCalc}/${evento.maxPersonas} unidos 
                <span class="evento-disponibles-texto">(${disponibles} lugares disponibles)</span>
              </span>
            </div>
            <div class="inicio-bottom-row">
              <div class="evento-organizador">
                <img src="${fotoOrganizador}" alt="Foto organizador" class="inicio-organizador-foto" onerror="this.src='${DEFAULT_AVATAR}'" />
                <span class="inicio-organizador-nombre"><b>Organizado por</b><br>${nombreOrganizador}</span>
              </div>
              <div class="evento-actions">
                <button class="inicio-btn-favorito-nuevo" data-evento-id="${evento.id}" aria-pressed="false" aria-label="Marcar como favorito">
                  <img src="img/logo-estrella.png" alt="Favorito" class="icono-evento" />
                </button>
                <button class="inicio-btn-compartir-nuevo" data-evento-id="${evento.id}">
                  <img src="img/logo-compartir.png" alt="Compartir" class="icono-evento" />
                </button>
                ${isOrganizador ? `<button class="inicio-btn-organizador" disabled>Organizador</button>` : ''}
                ${(!isOrganizador && !yaParticipa) ? `<button class="inicio-btn-unirse-nuevo" data-evento-id="${evento.id}">Unirse</button>` : ''}
                ${(!isOrganizador && yaParticipa) ? `<button class="inicio-btn-salir-nuevo" data-evento-id="${evento.id}">No participar</button>` : ''}
                ${(isAdmin && !isOrganizador) ? `<button class="inicio-btn-eliminar-admin" data-evento-id="${evento.id}">Eliminar (Admin)</button>` : ''}
              </div>
            </div>
          `;

          eventosContainer.appendChild(eventoCard);
        }
      
        // ✅ PAGINACIÓN: Agregar controles de navegación
        if (totalPaginas > 1) {
          const paginacionDiv = document.createElement('div');
          paginacionDiv.style.cssText = 'display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 24px; padding: 16px;';
          
          const btnAnterior = document.createElement('button');
          btnAnterior.textContent = '← Anterior';
          btnAnterior.disabled = pagina === 1;
          btnAnterior.style.cssText = 'padding: 10px 20px; border-radius: 8px; background: var(--violet); color: white; border: none; cursor: pointer; font-weight: 600;';
          if (pagina === 1) btnAnterior.style.opacity = '0.5';
          btnAnterior.addEventListener('click', () => {
            if (pagina > 1) {
              paginaActualInicio = pagina - 1;
              loadEventosInicio(paginaActualInicio);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          });
          
          const infoPagina = document.createElement('span');
          infoPagina.textContent = `Página ${pagina} de ${totalPaginas} (${eventosTotalesInicio.length} eventos)`;
          infoPagina.style.cssText = 'font-weight: 600; color: var(--green-dark);';
          
          const btnSiguiente = document.createElement('button');
          btnSiguiente.textContent = 'Siguiente →';
          btnSiguiente.disabled = pagina === totalPaginas;
          btnSiguiente.style.cssText = 'padding: 10px 20px; border-radius: 8px; background: var(--violet); color: white; border: none; cursor: pointer; font-weight: 600;';
          if (pagina === totalPaginas) btnSiguiente.style.opacity = '0.5';
          btnSiguiente.addEventListener('click', () => {
            if (pagina < totalPaginas) {
              paginaActualInicio = pagina + 1;
              loadEventosInicio(paginaActualInicio);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          });
          
          paginacionDiv.appendChild(btnAnterior);
          paginacionDiv.appendChild(infoPagina);
          paginacionDiv.appendChild(btnSiguiente);
          eventosContainer.appendChild(paginacionDiv);
        }
      
        // Re-bind event listeners para los nuevos elementos
        bindEventoButtons();
        // Sincronizar estado visual de favoritos con BD
        await marcarFavoritosUsuario();
      
      } catch (error) {
        console.error('Error cargando eventos:', error);
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (vacioDiv) {
          vacioDiv.innerHTML = '<p>Error cargando eventos. <a href="#" onclick="location.reload()">Recargar página</a></p>';
          vacioDiv.style.display = 'block';
        }
      }
    };
  
    // Reutilizar funciones centralizadas (ya definidas arriba)
    // const formatearFechaArgentina y formatearHoraArgentina están globales
  
    // Sistema de limpieza automática de eventos
    const limpiarEventosExpirados = async () => {
      try {
        const eventosData = await getFromFirestore('eventos');
        const ahora = new Date();
      
        for (const evento of eventosData) {
          if (!evento.activo) continue;

          // Calcular con campo canónico
          let fechaHoraEvento = null;
          if (evento.fechaHoraEvento) {
            const d = new Date(evento.fechaHoraEvento);
            if (!isNaN(d.getTime())) fechaHoraEvento = d;
          }
          if (!fechaHoraEvento) {
            const d = construirFechaHora(evento);
            if (d) fechaHoraEvento = d;
          }
          if (!fechaHoraEvento) continue; // si no hay fecha/hora válida, no tocar

          const horaLimite = new Date(fechaHoraEvento.getTime() + 60 * 60 * 1000); // +1 hora
        
          if (ahora > horaLimite) {
            console.log(`Limpiando evento expirado: ${evento.titulo}`);
          
            // Marcar evento como inactivo en lugar de eliminarlo
            const eventoInactivo = {
              ...evento,
              activo: false,
              fechaFinalizacion: ahora.toISOString()
            };
          
            await saveToFirestore('eventos', eventoInactivo, evento.id);
          
            // Mover a historial de todos los participantes si no existe
            if (evento.participantes && evento.participantes.length > 0) {
              for (const participanteId of evento.participantes) {
                const historialId = `${participanteId}_${evento.id}_finalizado`;
                const historialExistente = await getFromFirestore('historial', historialId);
              
                if (!historialExistente) {
                  const historialData = {
                    eventoId: evento.id,
                    tipo: 'finalizado',
                    titulo: evento.titulo,
                    fecha: evento.fecha,
                    hora: evento.hora,
                    ubicacion: evento.ubicacion,
                    organizador: evento.organizador,
                    fechaFinalizacion: ahora.toISOString(),
                    participantes: evento.participantes.length
                  };
                
                  await saveToFirestore('historial', historialData, historialId);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error limpiando eventos expirados:', error);
      }
    };
  
    // Ejecutar limpieza cada 30 minutos
    const iniciarLimpiezaAutomatica = () => {
      limpiarEventosExpirados(); // Ejecutar inmediatamente
      setInterval(limpiarEventosExpirados, 30 * 60 * 1000); // Cada 30 minutos
    };
  
  const bindEventoButtons = () => {
    $$('.inicio-btn-unirse-nuevo').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
        btn.addEventListener('click', async () => {
          const eventoId = btn.dataset.eventoId;
          // Evitar doble clic marcando estado de carga
          if (btn.dataset.loading === '1') return;
          const prevText = btn.textContent;
          const currentLabel = prevText.trim();
          // Validaciones rápidas según estado visual actual
          if (currentLabel === 'Completo') {
            mostrarMensajeError('Este evento está completo');
            return;
          }
          if (currentLabel === 'Organizador') {
            mostrarMensajeError('Sos el organizador de este evento');
            return;
          }
          if (currentLabel === 'Participando') {
            mostrarMensajeError('Ya estás unido a este evento');
            return;
          }

          // Activar estado de carga
          btn.dataset.loading = '1';
          btn.disabled = true;
          btn.textContent = 'Cargando…';
          const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
          if (!userId) {
            mostrarMensajeError('Debes iniciar sesión para unirte a un evento');
            window.location.href = 'login.html';
            btn.dataset.loading = '0';
            btn.disabled = false;
            btn.textContent = prevText;
            return;
          }
        
          try {
            // Obtener datos actuales del evento
            const evento = await getFromFirestore('eventos', eventoId);
          
            if (!evento) {
              mostrarMensajeError('Evento no encontrado');
              btn.dataset.loading = '0';
              btn.disabled = false;
              btn.textContent = prevText;
              return;
            }
          
            // Verificar si ya está unido
            if (evento.participantes && evento.participantes.includes(userId)) {
              // Ya unido: ajustar UI a estado consistente
              const card = btn.closest('.inicio-card-evento');
              const headerFlex = card?.querySelector('div > h2.inicio-titulo-evento')?.parentElement;
              if (headerFlex && !headerFlex.querySelector('.evento-participando-badge')) {
                const badge = document.createElement('span');
                badge.className = 'evento-participando-badge';
                badge.textContent = 'Participando';
                headerFlex.appendChild(badge);
              }
              btn.outerHTML = `<button class=\"inicio-btn-salir-nuevo\" data-evento-id=\"${eventoId}\">No participar</button>`;
              btn.dataset.loading = '0';
              bindEventoButtons();
              return;
            }
          
            // Verificar disponibilidad
            const actualesUnidos = Array.isArray(evento.participantes) ? evento.participantes.length
              : (Array.isArray(evento.usuariosUnidos) ? evento.usuariosUnidos.length : Number(evento.unidos || 0));
            if (actualesUnidos >= Number(evento.maxPersonas || 0)) {
              mostrarMensajeError('Este evento está completo');
              btn.disabled = true;
              btn.textContent = 'Completo';
              btn.dataset.loading = '0';
              return;
            }

            // Actualizar evento
            const participantesActualizados = Array.isArray(evento.participantes) ? [...evento.participantes] : [];
            participantesActualizados.push(userId);
            const nuevosUnidos = participantesActualizados.length;
          
            const eventoActualizado = {
              ...evento,
              participantes: participantesActualizados,
              unidos: nuevosUnidos
            };
          
            await saveToFirestore('eventos', eventoActualizado, eventoId);
          
            // Actualizar contadores en TODAS las instancias del evento (inicio, favoritos, perfil)
            actualizarContadoresEvento(eventoId, eventoActualizado.unidos, evento.maxPersonas);
          
            // Guardar en historial del usuario
            const historialData = {
              eventoId: eventoId,
              tipo: 'unido',
              titulo: evento.titulo,
              descripcion: evento.descripcion,
              fecha: evento.fecha,
              hora: evento.hora,
              ubicacion: evento.ubicacion,
              linkGrupo: evento.linkGrupo,
              maxPersonas: evento.maxPersonas,
              unidos: eventoActualizado.unidos,
              organizadorId: evento.organizadorId, // Solo el ID, no datos estáticos
              fechaUnion: new Date().toISOString()
            };
          
            await saveToFirestore('historial', historialData, `${userId}_${eventoId}_unido`);
          
            // ===== ENVIAR NOTIFICACIONES POR EMAIL =====
            console.log('📧 Iniciando envío de notificaciones por email...');
            
            // 1. Confirmación al usuario que se unió
            try {
              console.log(`📧 Enviando confirmación a usuario ${userId}...`);
              const confirmacionEnviada = await enviarConfirmacionUnion(userId, eventoId);
              if (confirmacionEnviada) {
                console.log('✅ Confirmación enviada exitosamente');
              } else {
                console.warn('⚠️ No se pudo enviar confirmación (usuario sin email o datos faltantes)');
              }
            } catch (emailError) {
              console.error('❌ Error enviando confirmación al usuario:', emailError);
              // No bloqueamos el flujo si falla el email
            }
            
            // 2. Notificar al organizador que alguien se unió
            try {
              console.log(`📧 Notificando al organizador ${evento.organizadorId}...`);
              const notificacionEnviada = await notificarOrganizadorNuevoParticipante(evento.organizadorId, userId, eventoId);
              if (notificacionEnviada) {
                console.log('✅ Notificación al organizador enviada exitosamente');
              } else {
                console.warn('⚠️ No se pudo notificar al organizador (sin email o datos faltantes)');
              }
            } catch (emailError) {
              console.error('❌ Error notificando al organizador:', emailError);
              // No bloqueamos el flujo si falla el email
            }
            
            console.log('📧 Proceso de notificaciones completado');
            // ===== FIN NOTIFICACIONES =====
          
            mostrarMensajeExito(`¡Te has unido a "${evento.titulo}"!`);

            // Refrescar historial si está en perfil abierto
            if (document.querySelector('#eventos-historial')) {
              // Marcar para recarga rápida del historial en próxima vista
              localStorage.setItem('refrescarHistorial', '1');
            }
          
            // Actualizar UI inmediatamente
            const card = btn.closest('.inicio-card-evento');
            const nuevosDisponibles = evento.maxPersonas - eventoActualizado.unidos;
          
            // Actualizar contadores en la card
            const personasSpan = card.querySelector('.inicio-detalles-evento span:last-child');
            personasSpan.innerHTML = `
              <img src="img/personas.png" alt="Personas" class="icono-evento">
              ${eventoActualizado.unidos}/${evento.maxPersonas} unidos 
              <span class="evento-disponibles-texto">(${nuevosDisponibles} lugares disponibles)</span>
            `;
          
            // Reemplazar botón por 'No participar'
            btn.outerHTML = `<button class=\"inicio-btn-salir-nuevo\" data-evento-id=\"${eventoId}\">No participar</button>`;
            // Añadir badge si no existe
            const headerFlex = card.querySelector('div > h2.inicio-titulo-evento')?.parentElement;
            if (headerFlex && !headerFlex.querySelector('.evento-participando-badge')) {
              const badge = document.createElement('span');
              badge.className = 'evento-participando-badge';
              badge.textContent = 'Participando';
              headerFlex.appendChild(badge);
            }
            btn.dataset.loading = '0';
            // Re-vincular handlers para el nuevo botón salir
            bindEventoButtons();
          
          } catch (error) {
            console.error('Error uniéndose al evento:', error);
            mostrarMensajeError('Error al unirse al evento. Intenta nuevamente.');
            // Restablecer si falló
            btn.dataset.loading = '0';
            btn.disabled = false;
            btn.textContent = prevText;
          }
      });
    });

    $$('.inicio-btn-favorito-nuevo').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', async () => {
          const eventoId = btn.dataset.eventoId;
          const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
        
          if (!userId) {
            mostrarMensajeError('Debes iniciar sesión para agregar favoritos');
            window.location.href = 'login.html';
            return;
          }
        
          // Toggle visual inmediato
          btn.classList.toggle('active');
          const isActive = btn.classList.contains('active');
          btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');

          try {
            if (isActive) {
              // Agregar a favoritos en BD
              const evento = await getFromFirestore('eventos', eventoId);
              const favoritoData = {
                eventoId: eventoId,
                userId: userId,
                titulo: evento?.titulo || '',
                descripcion: evento?.descripcion || '',
                fecha: evento?.fecha || '',
                hora: evento?.hora || '',
                ubicacion: evento?.ubicacion || '',
                organizador: evento?.organizador || '',
                fechaAgregado: new Date().toISOString()
              };
              await saveToFirestore('favoritos', favoritoData, `${userId}_${eventoId}`);
              // Si había un fallback local para este id, eliminarlo
              const setLocalAfterAdd = getLocalFavoritosSet(userId);
              if (setLocalAfterAdd.has(eventoId)) { setLocalAfterAdd.delete(eventoId); setLocalFavoritosSet(userId, setLocalAfterAdd); }
              mostrarMensajeExito('Agregado a favoritos');
            } else {
              // Remover de favoritos de Firestore
              await deleteFromFirestore('favoritos', `${userId}_${eventoId}`);
              // Asegurarse de limpiar fallback local si existiera
              const setLocalAfterRem = getLocalFavoritosSet(userId);
              if (setLocalAfterRem.has(eventoId)) { setLocalAfterRem.delete(eventoId); setLocalFavoritosSet(userId, setLocalAfterRem); }
              mostrarMensajeExito('Removido de favoritos');
            }
          } catch (error) {
            console.error('Error con favoritos (usando fallback local):', error);
            // Fallback local: mantener el estado visual y persistir localmente
            const setLocal = getLocalFavoritosSet(userId);
            if (isActive) {
              setLocal.add(eventoId);
              setLocalFavoritosSet(userId, setLocal);
              mostrarMensajeExito('Agregado a favoritos (guardado localmente)');
            } else {
              setLocal.delete(eventoId);
              setLocalFavoritosSet(userId, setLocal);
              mostrarMensajeExito('Removido de favoritos (guardado localmente)');
            }
          }
      });
    });

    // Compartir: copiar link del evento al portapapeles
    $$('.inicio-btn-compartir-nuevo').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', async () => {
        try {
          const eventoId = btn.dataset.eventoId;
          // Construimos un link simple con query param, compatible con hosting estático
          // Apunta a inicio.html with anchor o query para que puedas identificarlo si luego sumas detalle.
          const base = window.location.origin + window.location.pathname.replace(/[^\/]+$/, 'inicio.html');
          const url = `${base}?evento=${encodeURIComponent(eventoId)}`;
          await navigator.clipboard.writeText(url);
          // Efecto presionado temporal
          btn.classList.add('pressed');
          mostrarMensajeExito('Link del evento copiado al portapapeles');
          setTimeout(() => {
            btn.classList.remove('pressed');
          }, 900);
        } catch (err) {
          console.error('No se pudo copiar el link:', err);
          mostrarMensajeError('No se pudo copiar el link.');
        }
      });
    });

    // Salir del evento
    $$('.inicio-btn-salir-nuevo').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', async () => {
        const eventoId = btn.dataset.eventoId;
        const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
        if (!userId) {
          mostrarMensajeError('Debes iniciar sesión');
          window.location.href = 'login.html';
          return;
        }
        try {
          btn.disabled = true;
          btn.textContent = 'Saliendo…';
          const evento = await getFromFirestore('eventos', eventoId);
          if (!evento || !Array.isArray(evento.participantes) || !evento.participantes.includes(userId)) {
            mostrarMensajeError('No estabas unido a este evento');
            btn.disabled = false; btn.textContent = 'Salir';
            return;
          }
          const nuevosParticipantes = evento.participantes.filter(p => p !== userId);
          const nuevosUnidos = nuevosParticipantes.length;
          const actualizado = { ...evento, participantes: nuevosParticipantes, unidos: nuevosUnidos };
          await saveToFirestore('eventos', actualizado, eventoId);
          
          // Actualizar contadores en TODAS las instancias del evento (inicio, favoritos, perfil)
          actualizarContadoresEvento(eventoId, nuevosUnidos, evento.maxPersonas);
          
          mostrarMensajeExito('Saliste del evento');
          if (document.querySelector('#eventos-historial')) {
            localStorage.setItem('refrescarHistorial', '1');
          }
          // Actualizar UI de la card
          const card = btn.closest('.inicio-card-evento');
          const personasSpan = card?.querySelector('.inicio-detalles-evento span:last-child');
          if (personasSpan) {
            const nuevosDisp = (evento.maxPersonas || 0) - nuevosUnidos;
            personasSpan.innerHTML = `
              <img src="img/personas.png" alt="Personas" class="icono-evento">
              ${nuevosUnidos}/${evento.maxPersonas} unidos 
              <span class="evento-disponibles-texto">(${nuevosDisp} lugares disponibles)</span>
            `;
          }
          // Eliminar badge 'Participando' si existe
          const headerFlex = card?.querySelector('div > h2.inicio-titulo-evento')?.parentElement;
          const badge = headerFlex?.querySelector('.evento-participando-badge');
          if (badge) badge.remove();
          // Reactivar botón Unirse si aplica
          let btnUnirse = card?.querySelector('.inicio-btn-unirse-nuevo');
          if (!btnUnirse) {
            btnUnirse = document.createElement('button');
            btnUnirse.className = 'inicio-btn-unirse-nuevo';
            btnUnirse.dataset.eventoId = eventoId;
            btnUnirse.textContent = 'Unirse';
            const actions = card?.querySelector('.evento-actions');
            actions?.appendChild(btnUnirse);
          } else {
            btnUnirse.disabled = false;
            btnUnirse.textContent = 'Unirse';
          }
          // Eliminar botón Salir y re-vincular
          btn.remove();
          bindEventoButtons();
        } catch (err) {
          console.error('Error al salir del evento:', err);
          mostrarMensajeError('No se pudo salir del evento');
          btn.disabled = false;
          btn.textContent = 'Salir';
        }
      });
    });

    // Botón eliminar admin
    $$('.inicio-btn-eliminar-admin').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', async () => {
        const eventoId = btn.dataset.eventoId;
        const isAdmin = window._isAdmin || false;
        
        if (!isAdmin) {
          mostrarMensajeError('No tienes permisos de administrador');
          return;
        }
        // Reusar el mismo modal de confirmación que ven los organizadores
        const modalConf = document.querySelector('#modal-confirmar-borrado');
        const btnCancelarB = document.querySelector('#btn-cancelar-borrado');
        const btnConfirmarB = document.querySelector('#btn-confirmar-borrado');

        // Lógica de borrado encapsulada para reutilizar con modal o confirm nativo
        const ejecutarBorradoAdmin = async () => {
          try {
            btn.disabled = true;
            btn.textContent = 'Eliminando…';

            const evento = await getFromFirestore('eventos', eventoId);
            if (!evento) {
              mostrarMensajeError('Evento no encontrado');
              btn.disabled = false;
              btn.textContent = 'Eliminar (Admin)';
              return;
            }

            // Notificar a participantes antes de borrar
            try {
              const fechaFormateada = formatearFechaArgentina(evento.fecha);
              const horaFormateada = formatearHoraArgentina(evento.hora);
              const mensajeCancelacion = `❌ El evento "${evento.titulo}" ha sido CANCELADO por el administrador\n\n` +
                `📅 Fecha que era: ${fechaFormateada}\n` +
                `🕐 Hora: ${horaFormateada}\n` +
                `📍 Lugar: ${evento.lugar}\n\n` +
                `Este evento infringió las reglas de la plataforma.`;

              await notificarParticipantes(
                eventoId,
                TIPO_NOTIF.EVENTO_CANCELADO,
                mensajeCancelacion,
                { fecha: evento.fecha, hora: evento.hora, lugar: evento.lugar }
              );
              console.log('📧 Notificaciones de cancelación enviadas (Admin)');
            } catch (notifError) {
              console.error('Error al enviar notificaciones:', notifError);
            }

            // Borrar evento y relaciones
            await deleteFromFirestore('eventos', eventoId);
            console.log('🛡️ Administrador eliminó evento:', eventoId);

            const todosHistorial = await getFromFirestore('historial');
            const historialRelacionados = (todosHistorial || []).filter(h => h.eventoId === eventoId);
            for (const h of historialRelacionados) { if (h.id) await deleteFromFirestore('historial', h.id); }

            const todosFavoritos = await getFromFirestore('favoritos');
            const favoritosRelacionados = (todosFavoritos || []).filter(f => f.eventoId === eventoId);
            for (const f of favoritosRelacionados) { if (f.id) await deleteFromFirestore('favoritos', f.id); }

            const todasValoraciones = await getFromFirestore('valoraciones');
            const valoracionesRelacionadas = (todasValoraciones || []).filter(v => v.eventoId === eventoId);
            for (const v of valoracionesRelacionadas) { if (v.id) await deleteFromFirestore('valoraciones', v.id); }

            mostrarMensajeExito('Evento eliminado correctamente (Admin)');
            loadEventosInicio(paginaActualInicio);
          } catch (err) {
            console.error('Error al eliminar evento (Admin):', err);
            mostrarMensajeError('No se pudo eliminar el evento');
            btn.disabled = false;
            btn.textContent = 'Eliminar (Admin)';
          }
        };

        if (modalConf && btnCancelarB && btnConfirmarB) {
          // Mostrar modal estilo "recuadro"
          modalConf.dataset.eventoId = eventoId;
          modalConf.classList.remove('hidden');
          document.body.classList.add('modal-open');

          const cerrarModal = () => {
            modalConf.dataset.eventoId = '';
            modalConf.classList.add('hidden');
            document.body.classList.remove('modal-open');
          };

          // Handlers one-off
          const onCancel = () => { cerrarModal(); };
          const onConfirm = async () => { cerrarModal(); await ejecutarBorradoAdmin(); };

          btnCancelarB.addEventListener('click', onCancel, { once: true });
          btnConfirmarB.addEventListener('click', onConfirm, { once: true });
          modalConf.addEventListener('click', (e) => { if (e.target === modalConf) cerrarModal(); }, { once: true });
        } else {
          // Fallback a confirm nativo si el modal no está disponible
          if (confirm('¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer.')) {
            await ejecutarBorradoAdmin();
          }
        }
      });
    });
  };
  
  loadEventosInicio();
  bindEventoButtons();

  // Manejo de botones en favoritos
  const bindFavoritosButtons = () => {
    // Unirse desde favoritos
    $$('.favoritos-btn-unirse').forEach((btn) => {
      if (btn.dataset.bound) return; btn.dataset.bound = 'true';
      btn.addEventListener('click', async () => {
        const eventoId = btn.dataset.eventoId;
        const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
        if (!userId) { mostrarMensajeError('Debes iniciar sesión'); window.location.href = 'login.html'; return; }
        try {
          btn.disabled = true; btn.textContent = 'Cargando…';
          const evento = await getFromFirestore('eventos', eventoId);
          if (!evento) { mostrarMensajeError('Evento no encontrado'); btn.disabled = false; btn.textContent = 'Unirse'; return; }
          if (Array.isArray(evento.participantes) && evento.participantes.includes(userId)) {
            // Ya participa: ajustar UI coherente
            const cardExist = btn.closest('.favoritos-card-evento');
            const headerFlexExist = cardExist?.querySelector('div > h2.favoritos-titulo-evento')?.parentElement;
            if (headerFlexExist && !headerFlexExist.querySelector('.evento-participando-badge')) {
              const badge = document.createElement('span');
              badge.className = 'evento-participando-badge';
              badge.textContent = 'Participando';
              headerFlexExist.appendChild(badge);
            }
            btn.outerHTML = `<button class=\"favoritos-btn-salir\" data-evento-id=\"${eventoId}\">No participar</button>`;
            bindFavoritosButtons();
            return;
          }
          const actualesUnidos = Array.isArray(evento.participantes) ? evento.participantes.length : (Array.isArray(evento.usuariosUnidos) ? evento.usuariosUnidos.length : Number(evento.unidos || 0));
          if (actualesUnidos >= Number(evento.maxPersonas || 0)) { btn.disabled = true; btn.textContent = 'Completo'; return; }
          const participantes = Array.isArray(evento.participantes) ? [...evento.participantes] : []; participantes.push(userId);
          const unidos = participantes.length;
          await saveToFirestore('eventos', { ...evento, participantes, unidos }, eventoId);
          
          // Actualizar contadores en TODAS las instancias del evento (inicio, favoritos, perfil)
          actualizarContadoresEvento(eventoId, unidos, evento.maxPersonas);
          
          await saveToFirestore('historial', { eventoId, tipo:'unido', titulo: evento.titulo, fecha: evento.fecha, hora: evento.hora, ubicacion: evento.ubicacion, organizador: evento.organizador, fechaUnion: new Date().toISOString() }, `${userId}_${eventoId}_unido`);
          mostrarMensajeExito(`¡Te has unido a "${evento.titulo}"!`);
          if (document.querySelector('#eventos-historial')) { localStorage.setItem('refrescarHistorial', '1'); }
          // Actualizar UI card
          const card = btn.closest('.favoritos-card-evento');
          const spanPart = card?.querySelector('.favoritos-detalles-evento span:last-child');
          if (spanPart) { const disp = (evento.maxPersonas||0) - unidos; spanPart.innerHTML = `<img src="img/personas.png" alt="Participantes" class="icono-evento"> ${unidos}/${evento.maxPersonas} unidos <span class="evento-disponibles-texto">(${disp} lugares disponibles)</span>`; }
          // cambiar botón
          // Añadir badge si no existe
          const headerFlex = card.querySelector('div > h2.favoritos-titulo-evento')?.parentElement;
          if (headerFlex && !headerFlex.querySelector('.evento-participando-badge')) {
            const badge = document.createElement('span');
            badge.className = 'evento-participando-badge';
            badge.textContent = 'Participando';
            headerFlex.appendChild(badge);
          }
          btn.outerHTML = `<button class=\"favoritos-btn-salir\" data-evento-id=\"${eventoId}\">No participar</button>`;
          bindFavoritosButtons();
        } catch (e) { console.error(e); mostrarMensajeError('No se pudo unir'); btn.disabled = false; btn.textContent = 'Unirse'; }
      });
    });

    // Salir desde favoritos
    $$('.favoritos-btn-salir').forEach((btn) => {
      if (btn.dataset.bound) return; btn.dataset.bound = 'true';
      btn.addEventListener('click', async () => {
        const eventoId = btn.dataset.eventoId;
        const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
        if (!userId) { mostrarMensajeError('Debes iniciar sesión'); window.location.href = 'login.html'; return; }
        try {
          btn.disabled = true; btn.textContent = 'Saliendo…';
          const evento = await getFromFirestore('eventos', eventoId);
          if (!evento || !Array.isArray(evento.participantes)) { mostrarMensajeError('Evento no válido'); btn.disabled = false; btn.textContent = 'Salir'; return; }
          if (!evento.participantes.includes(userId)) { mostrarMensajeError('No estabas unido'); btn.disabled = false; btn.textContent = 'Salir'; return; }
          const participantes = evento.participantes.filter(p => p !== userId);
          const unidos = participantes.length;
          await saveToFirestore('eventos', { ...evento, participantes, unidos }, eventoId);
          
          // Actualizar contadores en TODAS las instancias del evento (inicio, favoritos, perfil)
          actualizarContadoresEvento(eventoId, unidos, evento.maxPersonas);
          
          mostrarMensajeExito('Saliste del evento');
          if (document.querySelector('#eventos-historial')) { localStorage.setItem('refrescarHistorial', '1'); }
          const card = btn.closest('.favoritos-card-evento');
          const spanPart = card?.querySelector('.favoritos-detalles-evento span:last-child');
          if (spanPart) { const disp = (evento.maxPersonas||0) - unidos; spanPart.innerHTML = `<img src="img/personas.png" alt="Participantes" class="icono-evento"> ${unidos}/${evento.maxPersonas} unidos <span class="evento-disponibles-texto">(${disp} lugares disponibles)</span>`; }
          // Eliminar badge 'Participando' si existe
          const headerFlex = card?.querySelector('div > h2.favoritos-titulo-evento')?.parentElement;
          const badge = headerFlex?.querySelector('.evento-participando-badge');
          if (badge) badge.remove();
          btn.outerHTML = `<button class=\"favoritos-btn-unirse\" data-evento-id=\"${eventoId}\">Unirse</button>`;
          bindFavoritosButtons();
        } catch (e) { console.error(e); mostrarMensajeError('No se pudo salir'); btn.disabled = false; btn.textContent = 'Salir'; }
      });
    });

    // Botón de estrella (favoritos) en página de favoritos
    document.querySelectorAll('.favoritos-card-evento .inicio-btn-favorito-nuevo').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', async () => {
        const eventoId = btn.dataset.eventoId;
        const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
        
        if (!userId) {
          mostrarMensajeError('Debes iniciar sesión');
          window.location.href = 'login.html';
          return;
        }
        
        try {
          // En favoritos, siempre está activo, así que al hacer click se quita
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
          
          await deleteFromFirestore('favoritos', `${userId}_${eventoId}`);
          mostrarMensajeExito('Removido de favoritos');
          
          // Eliminar la card con animación
          const card = btn.closest('.favoritos-card-evento');
          if (card) {
            card.style.transition = 'opacity 0.3s ease';
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 300);
          }
          
          // Desmarcar estrella en inicio (si existe)
          document.querySelectorAll(`.inicio-card-evento .inicio-btn-favorito-nuevo[data-evento-id="${eventoId}"]`).forEach(star => {
            star.classList.remove('active');
            star.setAttribute('aria-pressed', 'false');
          });
        } catch (error) {
          console.error('Error al quitar de favoritos:', error);
          mostrarMensajeError('Error al quitar de favoritos');
          btn.classList.add('active'); // Revertir estado visual
        }
      });
    });

    // Botón de compartir en página de favoritos
    document.querySelectorAll('.favoritos-card-evento .inicio-btn-compartir-nuevo').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', async () => {
        try {
          const eventoId = btn.dataset.eventoId;
          const base = window.location.origin + window.location.pathname.replace(/[^\/]+$/, 'inicio.html');
          const url = `${base}?evento=${encodeURIComponent(eventoId)}`;
          await navigator.clipboard.writeText(url);
          
          // Efecto presionado temporal
          btn.classList.add('pressed');
          mostrarMensajeExito('Link del evento copiado al portapapeles');
          setTimeout(() => {
            btn.classList.remove('pressed');
          }, 900);
        } catch (err) {
          console.error('No se pudo copiar el link:', err);
          mostrarMensajeError('No se pudo copiar el link.');
        }
      });
    });
  };

  // ========================================
  // HISTORIAL DE EVENTOS (perfil.html)
  // ========================================
  
  const historialContent = document.querySelector('#historial-content');
  let cacheHistorial = [];

  const cargarHistorial = async () => {
    const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
    if (!userId) return [];
    
    try {
      const todosHistorial = await getFromFirestore('historial');
      // Filtrar solo entradas del usuario actual
      const miHistorial = (todosHistorial || []).filter(h => {
        if (!h.id) return false;
        // El ID tiene formato: userId_eventoId_tipo
        return h.id.startsWith(`${userId}_`);
      });
      return miHistorial;
    } catch (error) {
      console.error('Error cargando historial:', error);
      return [];
    }
  };

  const renderHistorial = async (items, tipoFiltro = 'todos') => {
    if (!historialContent) return;
    
    console.log('🎨 renderHistorial llamado con:', {
      cantidadItems: items.length,
      tipoFiltro,
      primerosItems: items.slice(0, 2).map(i => ({
        id: i.id,
        titulo: i.titulo,
        descripcion: i.descripcion?.substring(0, 50),
        fecha: i.fecha,
        hora: i.hora
      }))
    });
    
    // Filtrar según pestaña (nuevas reglas)
    const userIdFH = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
    const ahoraFiltro = new Date();
    const esPasado = (h) => { const d = construirFechaHora(h); return d && d <= ahoraFiltro; };
    const esFuturo = (h) => { const d = construirFechaHora(h); return d && d > ahoraFiltro; };

    let itemsFiltrados = items;
    switch (tipoFiltro) {
      case 'todos':
        // Todos: eventos a los que se unió o que creó (activos o finalizados)
        itemsFiltrados = items.filter(h => (
          h.tipo === 'unido' ||
          h.tipo === 'creado' ||
          h.tipo === 'finalizado'
        ));
        break;
      case 'creado':
        // Creados: todos los eventos creados por el usuario (activos o finalizados)
        itemsFiltrados = items.filter(h => (h.tipo === 'creado') || (h.organizadorId && h.organizadorId === userIdFH));
        break;
      case 'unido':
        // Unidos: todos los que se unió (activos o finalizados) y NO es organizador
        itemsFiltrados = items.filter(h => (
          h.tipo === 'unido' ||
          (h.tipo === 'finalizado' && (!h.organizadorId || h.organizadorId !== userIdFH))
        ));
        break;
      case 'finalizado':
        // Finalizados: los que se unió o creó y ya finalizaron
        itemsFiltrados = items.filter(h => esPasado(h) && (h.tipo === 'unido' || h.tipo === 'creado' || h.tipo === 'finalizado'));
        break;
      default:
        itemsFiltrados = items;
    }

    // Agrupar por eventoId y mostrar solo la entrada más relevante por evento
    const prioridad = { finalizado: 3, creado: 2, unido: 1 };
    const eventosMap = new Map();
    for (const h of itemsFiltrados) {
      const eid = h.eventoId;
      if (!eid) continue;
      if (!eventosMap.has(eid) || prioridad[h.tipo] > prioridad[eventosMap.get(eid).tipo]) {
        eventosMap.set(eid, h);
      }
    }
    itemsFiltrados = Array.from(eventosMap.values());

    if (!itemsFiltrados.length) {
      historialContent.innerHTML = `<p style="color:#888;">No hay eventos ${tipoFiltro !== 'todos' ? 'en esta categoría' : 'en tu historial'}.</p>`;
      return;
    }

    // Separar eventos activos (futuros) y pasados
    const ahora = new Date();
    const activos = [];
    const pasados = [];
    
    itemsFiltrados.forEach(item => {
      const fechaEvento = construirFechaHora(item);
      if (fechaEvento && fechaEvento > ahora) {
        activos.push(item);
      } else {
        pasados.push(item);
      }
    });

    // Ordenar activos: del más próximo al más lejano
    activos.sort((a, b) => {
      const fa = construirFechaHora(a) || new Date(8640000000000000);
      const fb = construirFechaHora(b) || new Date(8640000000000000);
      return fa - fb;
    });

    // Ordenar pasados: del más reciente al más antiguo
    pasados.sort((a, b) => {
      const fa = construirFechaHora(a) || new Date(0);
      const fb = construirFechaHora(b) || new Date(0);
      return fb - fa;
    });

    // OPTIMIZACIÓN: Cargar todos los datos necesarios de una sola vez
    const todosEventosIds = itemsFiltrados.map(item => item.eventoId).filter(Boolean);
    const organizadoresIds = [...new Set(itemsFiltrados.map(item => item.organizadorId).filter(Boolean))];
    
    // Cargar eventos actuales, perfiles y valoraciones en paralelo
    const [todosEventos, todosPerfiles, todosUsuarios, todasValoraciones, misValoraciones] = await Promise.all([
      getFromFirestore('eventos'),
      getFromFirestore('perfiles'),
        getFromFirestore('usuarios'),
      getFromFirestore('valoraciones'),
      getFromFirestore('valoraciones')
    ]);
    
    // Crear mapas para acceso rápido
    const eventosMapActual = new Map();
    (todosEventos || []).forEach(ev => {
      if (ev.id) eventosMapActual.set(ev.id, ev);
    });

    const perfilesMap = new Map();
        // Primero cargar usuarios (tienen prioridad)
        (todosUsuarios || []).forEach(usuario => {
          if (usuario.id) perfilesMap.set(usuario.id, usuario);
        });
        // Luego perfiles (sobrescribe si hay datos más recientes)
    (todosPerfiles || []).forEach(perfil => {
      if (perfil.id) perfilesMap.set(perfil.id, perfil);
    });
    
    const valoracionesPorEvento = new Map();
    (todasValoraciones || []).forEach(val => {
      if (!val.eventoId) return;
      if (!valoracionesPorEvento.has(val.eventoId)) {
        valoracionesPorEvento.set(val.eventoId, []);
      }
      valoracionesPorEvento.get(val.eventoId).push(val);
    });
    
    const misValoracionesMap = new Map();
    (misValoraciones || []).forEach(val => {
      if (val.id) misValoracionesMap.set(val.id, val);
    });

    // Renderizar todos los eventos con datos precargados
  const htmlPartsActivos = activos.map(item => renderHistorialItem(item, false, perfilesMap, valoracionesPorEvento, misValoracionesMap, eventosMapActual));
  const htmlPartsPasados = pasados.map(item => renderHistorialItem(item, true, perfilesMap, valoracionesPorEvento, misValoracionesMap, eventosMapActual));
    
    const html = htmlPartsActivos.join('') + htmlPartsPasados.join('');
    historialContent.innerHTML = html;

    // Bind event listeners
    bindHistorialButtons();
    bindEditarButtons(); // Asegurar que los botones de editar también se vinculen
  };

  // Helper para renderizar cada item del historial (OPTIMIZADO - sin consultas async)
  function renderHistorialItem(item, esPasado, perfilesMap, valoracionesPorEvento, misValoracionesMap, eventosMapActual) {
    const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
    const esCreado = item.tipo === 'creado';
    const esUnido = item.tipo === 'unido';
    const esFinalizado = item.tipo === 'finalizado';
    const fechaEvento = construirFechaHora(item);
    const esFuturo = fechaEvento && fechaEvento > new Date();
    
    // Usar funciones centralizadas para formatear (ya definidas globalmente)
    const fechaFormateada = formatearFechaArgentina(item.fecha);
    const horaFormateada = formatearHoraArgentina(item.hora);
    
    // Calcular cupos con datos ACTUALES del evento en BD
    const eventoActual = (eventosMapActual && item.eventoId) ? eventosMapActual.get(item.eventoId) : null;
    const unidos = eventoActual
      ? (Array.isArray(eventoActual.participantes) ? eventoActual.participantes.length
        : (Array.isArray(eventoActual.usuariosUnidos) ? eventoActual.usuariosUnidos.length : Number(eventoActual.unidos || 0)))
      : Number(item.unidos || 0);
    const maxPersonas = eventoActual && eventoActual.maxPersonas != null
      ? Number(eventoActual.maxPersonas)
      : Number(item.maxPersonas || 0);
    const disponibles = Math.max(0, maxPersonas - unidos);
    
    // Preparar campos visibles con datos ACTUALES del evento si existen
    const tituloMostrar = (eventoActual && eventoActual.titulo) ? eventoActual.titulo : (item.titulo || 'Sin título');
    const descripcionMostrar = (eventoActual && eventoActual.descripcion) ? eventoActual.descripcion : (item.descripcion || 'Sin descripción');
    const ubicacionMostrar = (eventoActual && eventoActual.ubicacion) ? eventoActual.ubicacion : (item.ubicacion || 'No especificado');
    
    // Obtener datos del organizador: usar solo los mapas precargados (no async)
    let nombreOrganizador = item.organizador || 'Desconocido';
    let fotoOrganizador = item.fotoOrganizador || DEFAULT_AVATAR;
    
    if (item.organizadorId && perfilesMap.has(item.organizadorId)) {
      const perfilOrganizador = perfilesMap.get(item.organizadorId);
      nombreOrganizador = perfilOrganizador.nombre && perfilOrganizador.apellido 
        ? `${perfilOrganizador.nombre} ${perfilOrganizador.apellido}`
        : perfilOrganizador.nombre || nombreOrganizador;
      fotoOrganizador = perfilOrganizador.foto || fotoOrganizador;
    }
    
    // Link de grupo: solo visible si el usuario está participando o es el organizador
    const esOrganizador = esCreado;
    const estaParticipando = esUnido || esCreado;
    const linkGrupo = (eventoActual && eventoActual.linkGrupo) ? eventoActual.linkGrupo : item.linkGrupo;
    const linkGrupoRow = (linkGrupo && String(linkGrupo).trim() && estaParticipando)
      ? `<div class="inicio-link-grupo-row">
           <span>Link de grupo:</span>
           <a href="${linkGrupo}" target="_blank" rel="noopener noreferrer">${linkGrupo}</a>
         </div>`
      : '';
    
    // Obtener promedio de valoraciones desde el mapa precargado
    let promedio = null; 
    let cantidadVotos = 0;
    
    if (valoracionesPorEvento.has(item.eventoId)) {
      const valsEvento = valoracionesPorEvento.get(item.eventoId);
      cantidadVotos = valsEvento.length;
      if (cantidadVotos > 0) {
        const suma = valsEvento.reduce((acc, v) => acc + Number(v.estrellas || 0), 0);
        promedio = Math.round((suma / cantidadVotos) * 10) / 10; // 1 decimal
      }
    }

    // Determinar botones de acción según estado y rol
    let botonesAccion = '';
    
    // Verificar si es administrador (se puede hacer con una variable global cacheada)
    const isAdmin = window._isAdmin || false;
    
    if (!esPasado && esFuturo) {
      // Evento futuro: organizador puede editar/borrar, participante puede salir, admin puede eliminar cualquier evento
      if (esCreado || isAdmin) {
        botonesAccion = `
          <div class="historial-botones-verticales">
            ${esCreado || isAdmin ? `<button class="btn-editar-evento" data-id="${item.eventoId}">Editar</button>` : ''}
            <button class="btn-borrar-evento" data-id="${item.eventoId}">${isAdmin && !esCreado ? 'Eliminar (Admin)' : 'Borrar'}</button>
          </div>
        `;
      } else if (esUnido) {
        botonesAccion = `
          <button class="btn-no-participar" data-id="${item.eventoId}">No participar</button>
        `;
      }
    } else if (esPasado && !esCreado) {
      // Evento pasado: solo participantes (no organizadores) pueden valorar
      const valoracionId = `${userId}_${item.eventoId}`;
      const valoracionExistente = misValoracionesMap.get(valoracionId);

      if (valoracionExistente && valoracionExistente.estrellas) {
        const estrellas = valoracionExistente.estrellas;
        botonesAccion = `
          <div class="historial-valoracion">
            <p style="margin:8px 0 4px;font-size:0.9em;color:#4CAF50;">✓ Tu valoración: ${'★'.repeat(estrellas)}${'☆'.repeat(5-estrellas)}</p>
            ${promedio !== null ? `<p class="promedio-texto">Promedio: ${promedio} (${cantidadVotos})</p>` : ''}
          </div>
        `;
      } else {
        botonesAccion = `
          <div class="historial-valoracion">
            <p style="margin:8px 0 4px;font-size:0.9em;color:#666;">¿Cómo fue tu experiencia?</p>
            <div class="estrellas-container" data-evento-id="${item.eventoId}">
              ${[1,2,3,4,5].map(i => `<span class="estrella" data-valor="${i}">★</span>`).join('')}
            </div>
            <button class="btn-enviar-valoracion btn-base btn-primary" data-evento-id="${item.eventoId}" style="margin-top:8px;display:none;color:#003918;">Enviar valoración</button>
            ${promedio !== null ? `<p class="promedio-texto">Promedio: ${promedio} (${cantidadVotos})</p>` : ''}
          </div>
        `;
      }
    }

    // Si el organizador está viendo un evento pasado, mostrar promedio
    let bloquePromedioOrganizador = '';
    if (esPasado && esCreado) {
      bloquePromedioOrganizador = promedio !== null
        ? `<div class="historial-promedio-texto">Valoración: ${promedio} (${cantidadVotos})</div>`
        : `<div class="historial-promedio-texto">Valoración: --</div>`;
    }

    // Renderizar con la misma estructura que inicio
    return `
      <div class="inicio-card-evento${esPasado ? ' historial-pasado' : ''}" data-evento-id="${item.eventoId}">
        <div class="inicio-titulo-row">
          <h2 class="inicio-titulo-evento">${tituloMostrar}</h2>
          ${(esCreado || isAdmin) && !esPasado && esFuturo ? `
            <div class="historial-botones-horizontales">
              ${esCreado || isAdmin ? `<button class="btn-editar-evento" data-id="${item.eventoId}">Editar</button>` : ''}
              <button class="btn-borrar-evento" data-id="${item.eventoId}">${isAdmin && !esCreado ? 'Eliminar (Admin)' : 'Borrar'}</button>
            </div>
          ` : ''}
          ${esUnido && !esPasado ? '<span class="evento-participando-badge">Participando</span>' : ''}
        </div>
        <p class="inicio-descripcion-evento">${descripcionMostrar}</p>
        ${linkGrupoRow}
        <div class="inicio-detalles-evento">
          <span><img src="img/calendario.png" alt="Fecha" class="icono-evento" /> ${fechaFormateada}</span>
          <span><img src="img/reloj-circular.png" alt="Hora" class="icono-evento" /> ${horaFormateada}</span>
          <span><img src="img/ubicacion.png" alt="Ubicación" class="icono-evento" /> ${ubicacionMostrar}</span>
          <span>
            <img src="img/personas.png" alt="Personas" class="icono-evento" />
            ${unidos}/${maxPersonas} unidos 
            <span class="evento-disponibles-texto">(${disponibles} lugares disponibles)</span>
          </span>
        </div>
        <div class="inicio-bottom-row">
          <div class="evento-organizador">
            <img src="${fotoOrganizador}" alt="Foto organizador" class="inicio-organizador-foto" onerror="this.src='${DEFAULT_AVATAR}'" />
            <span class="inicio-organizador-nombre"><b>Organizado por</b><br>${nombreOrganizador}</span>
          </div>
          ${esCreado && !esPasado ? `
            <button class="participantes-toggle" data-evento-id="${item.eventoId}">Ver participantes</button>
          ` : ''}
          <div class="evento-actions">
            ${!esCreado && esUnido && !esPasado && esFuturo ? `
              <button class="btn-no-participar" data-id="${item.eventoId}">No participar</button>
            ` : ''}
            ${!esCreado && esPasado ? botonesAccion : ''}
          </div>
        </div>
        ${bloquePromedioOrganizador}
        ${esCreado && !esPasado ? `
          <div class="participantes-section" data-evento-id="${item.eventoId}">
            <div class="participantes-separador hidden">
              <div class="participantes-lista hidden"></div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Vincular eventos de botones del historial
  function bindHistorialButtons() {
    // Botón borrar evento
    historialContent.querySelectorAll('.btn-borrar-evento').forEach(btn => {
      btn.addEventListener('click', () => {
        const eventoId = btn.getAttribute('data-id');
        if (!eventoId) return;
        const modalConf = document.querySelector('#modal-confirmar-borrado');
        if (!modalConf) return;
        modalConf.dataset.eventoId = eventoId;
        // Mostrar modal: solo quitar clase hidden
        modalConf.classList.remove('hidden');
        console.log('🧨 Abriendo modal de confirmación de borrado para evento:', eventoId);
        document.body.classList.add('modal-open');
      });
    });

    // Botón no participar
    historialContent.querySelectorAll('.btn-no-participar').forEach(btn => {
      btn.addEventListener('click', async () => {
        const eventoId = btn.getAttribute('data-id');
        const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
        if (!eventoId || !userId) return;
        
        try {
          const evento = await getFromFirestore('eventos', eventoId);
          if (!evento || !Array.isArray(evento.participantes)) return;
          
          const nuevosParticipantes = evento.participantes.filter(pid => pid !== userId);
          const nuevosUnidos = nuevosParticipantes.length;
          
          await saveToFirestore('eventos', { 
            ...evento, 
            participantes: nuevosParticipantes,
            unidos: nuevosUnidos
          }, eventoId);
          
          const historialId = `${userId}_${eventoId}_unido`;
          await deleteFromFirestore('historial', historialId);
          
          mostrarMensajeExito('Has dejado de participar en el evento');
          
          cacheHistorial = await cargarHistorial();
          const activeTab = document.querySelector('.historial-tab.active');
          const tipo = activeTab ? activeTab.getAttribute('data-tipo') : 'todos';
          renderHistorial(cacheHistorial, tipo);
        } catch (err) {
          console.error(err);
          mostrarMensajeError('No se pudo dejar de participar');
        }
      });
    });

    // Sistema de valoración con estrellas (rewritten for robustness)
    historialContent.querySelectorAll('.estrellas-container').forEach((container) => {
      const estrellas = container.querySelectorAll('.estrella');
      const eventoId = container.getAttribute('data-evento-id') || '';
      const btnEnviar = historialContent.querySelector(`.btn-enviar-valoracion[data-evento-id="${eventoId}"]`);
      let valorSeleccionado = 0;

      estrellas.forEach((estrella) => {
        // Hover effect
        estrella.addEventListener('mouseenter', () => {
          const valor = parseInt(estrella.getAttribute('data-valor') || '0', 10);
          estrellas.forEach((e, idx) => {
            const activo = idx < valor;
            e.style.color = activo ? '#FFD700' : '#ddd';
            e.style.transform = activo ? 'scale(1.2)' : 'scale(1)';
          });
        });

        // Click para seleccionar
        estrella.addEventListener('click', () => {
          valorSeleccionado = parseInt(estrella.getAttribute('data-valor') || '0', 10);
          estrellas.forEach((e, idx) => {
            const activo = idx < valorSeleccionado;
            e.style.color = activo ? '#FFD700' : '#ddd';
            if (activo) { e.classList.add('seleccionada'); } else { e.classList.remove('seleccionada'); }
          });
          if (btnEnviar) btnEnviar.style.display = 'inline-block';
        });
      });

      // Restaurar al salir
      container.addEventListener('mouseleave', () => {
        estrellas.forEach((e, idx) => {
          const activo = idx < valorSeleccionado;
          e.style.color = activo ? '#FFD700' : '#ddd';
          e.style.transform = 'scale(1)';
        });
      });

      // Enviar valoración
      if (btnEnviar) {
        btnEnviar.addEventListener('click', async () => {
          if (valorSeleccionado === 0) {
            mostrarMensajeError('Por favor seleccioná una calificación');
            return;
          }

          const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
          if (!userId) return;

          try {
            await saveToFirestore(
              'valoraciones',
              { eventoId, userId, estrellas: valorSeleccionado, fecha: new Date().toISOString() },
              `${userId}_${eventoId}`
            );
            mostrarMensajeExito(`¡Valoración enviada: ${valorSeleccionado} estrellas!`);
            // Recalcular promedio y mostrar junto a tu valoración
            let promedio = null; let cantidad = 0;
            try {
              const todas = await getFromFirestore('valoraciones');
              const vals = (todas || []).filter(v => v.eventoId === eventoId);
              cantidad = vals.length;
              if (cantidad > 0) {
                const suma = vals.reduce((acc, v) => acc + Number(v.estrellas || 0), 0);
                promedio = Math.round((suma / cantidad) * 10) / 10;
              }
            } catch {}
            const htmlValor = '<p style="color:#4CAF50;font-size:0.9em;margin:8px 0;">✓ Tu valoración: ' +
              '★'.repeat(valorSeleccionado) + '☆'.repeat(5 - valorSeleccionado) + '</p>' +
              (promedio !== null ? `<p class="promedio-texto">Promedio: ${promedio} (${cantidad})</p>` : '');
            container.parentElement.innerHTML = htmlValor;
          } catch (err) {
            console.error(err);
            mostrarMensajeError('No se pudo enviar la valoración');
          }
        });
      }
    });

    // Botón ver participantes (solo para organizadores de eventos futuros)
    historialContent.querySelectorAll('.participantes-toggle').forEach(btn => {
      btn.addEventListener('click', async function() {
        const eventoId = this.getAttribute('data-evento-id');
        const eventoCard = this.closest('.inicio-card-evento');
        const section = eventoCard.querySelector('.participantes-section');
        
        if (!section) {
          console.error('No se encontró la sección de participantes');
          return;
        }
        
        const separador = section.querySelector('.participantes-separador');
        const lista = section.querySelector('.participantes-lista');

  if (lista.classList.contains('hidden')) {
          try {
            const evento = await getFromFirestore('eventos', eventoId);
            if (!evento || !Array.isArray(evento.participantes) || evento.participantes.length === 0) {
              lista.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">No hay participantes aún.</p>';
            } else {
              let html = '';
              for (const pId of evento.participantes) {
                const perfil = await getFromFirestore('perfiles', pId);
                const usuario = await getFromFirestore('usuarios', pId);
                
                const nombre = perfil?.nombre || usuario?.nombre || 'Usuario';
                const apellido = perfil?.apellido || usuario?.apellido || '';
                const edad = perfil?.edad || 'N/A';
                const sexo = perfil?.sexo || 'N/A';
                const foto = perfil?.foto || usuario?.foto || DEFAULT_AVATAR;
                
                html += `
                  <div class="participante-card">
                    <div class="participante-avatar">
                      <img src="${foto}" alt="${nombre}" class="participante-foto" onerror="this.src='${DEFAULT_AVATAR}'">
                    </div>
                    <div class="participante-info">
                      <p class="participante-nombre">${nombre} ${apellido}</p>
                      <div class="participante-detalles">
                        <span>${edad} años</span>
                        <span>${sexo}</span>
                      </div>
                    </div>
                  </div>
                `;
              }
              lista.innerHTML = html;
            }
            separador.classList.remove('hidden');
            lista.classList.remove('hidden');
            this.textContent = 'Ocultar participantes';
          } catch (err) {
            console.error('Error cargando participantes:', err);
            lista.innerHTML = '<p style="color:var(--red);padding:12px;">Error cargando participantes.</p>';
            separador.classList.remove('hidden');
            lista.classList.remove('hidden');
          }
        } else {
          separador.classList.add('hidden');
          lista.classList.add('hidden');
          this.textContent = 'Ver participantes';
        }
      });
    });
  }

  // Función global para vincular botones de editar
  function bindEditarButtons() {
    if (!historialContent) return;
    
    historialContent.querySelectorAll('.btn-editar-evento').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!id) return;
        
        console.log('🔧 Botón Editar presionado, eventoId:', id); // Debug
        
        const ev = await getFromFirestore('eventos', id);
        if (!ev) {
          mostrarMensajeError('Evento no encontrado');
          return;
        }
        
  // Validación de permisos
        const userIdLocal = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
        if (ev.organizadorId !== userIdLocal) {
          mostrarMensajeError('⛔ Solo el organizador puede editar este evento');
          return;
        }
        
        // Obtener referencias al modal y formulario
        const modal = document.querySelector('#modal-editar-evento');
        const inputId = document.querySelector('#edit-evento-id');
        const inputTitulo = document.querySelector('#edit-titulo');
        const inputDesc = document.querySelector('#edit-descripcion');
        const inputFecha = document.querySelector('#edit-fecha');
        const inputHora = document.querySelector('#edit-hora');
        const inputUbicacion = document.querySelector('#edit-ubicacion');
        const inputMax = document.querySelector('#edit-maxPersonas');
        const editLinkGrupoInput = document.getElementById('edit-link-grupo');
        
        if (!modal) {
          console.error('❌ Modal de edición no encontrado');
          return;
        }
        
        // Llenar el formulario con los datos del evento
        inputId.value = id;
        inputTitulo.value = ev.titulo || '';
        inputDesc.value = ev.descripcion || '';
        
        // Fecha para input (evitar desfase por parseo UTC de 'YYYY-MM-DD')
        // Prioridad: si ya está en formato 'YYYY-MM-DD', usarla tal cual.
        // Si viene como 'DD/MM/YYYY' o 'DD-MM-YYYY', convertir a 'YYYY-MM-DD' sin usar Date.
        // Como último recurso, si existe fechaHoraEvento ISO, derivar fecha local.
        let fechaInput = '';
        if (ev.fecha && /^\d{4}-\d{2}-\d{2}$/.test(ev.fecha)) {
          fechaInput = ev.fecha;
        } else if (ev.fecha && /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.test(ev.fecha)) {
          const mm = ev.fecha.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (mm) {
            const dd = String(mm[1]).padStart(2,'0');
            const mo = String(mm[2]).padStart(2,'0');
            const yy = mm[3];
            fechaInput = `${yy}-${mo}-${dd}`;
          }
        } else if (ev.fechaHoraEvento) {
          const d = new Date(ev.fechaHoraEvento);
          if (!isNaN(d)) {
            const y = d.getFullYear();
            const mo = String(d.getMonth()+1).padStart(2,'0');
            const da = String(d.getDate()).padStart(2,'0');
            fechaInput = `${y}-${mo}-${da}`;
          }
        }
        inputFecha.value = fechaInput;

        // Normalizar hora (HH:MM)
        if (ev.hora) {
          const hhmm = ev.hora.match(/\d{2}:\d{2}/)?.[0] || '';
          inputHora.value = hhmm;
        } else {
          inputHora.value = '';
        }
        
        inputUbicacion.value = ev.ubicacion || '';
        if (editLinkGrupoInput) editLinkGrupoInput.value = ev.linkGrupo || '';
        inputMax.value = ev.maxPersonas || 1;

        // Abrir modal
        console.log('✅ Abriendo modal de edición'); // Debug
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
      });
    });
  }

  // Inicializar historial si estamos en perfil.html
  if (historialContent) {
    (async () => {
      cacheHistorial = await cargarHistorial();
      renderHistorial(cacheHistorial, 'todos');

      // Tabs de filtro
      document.querySelectorAll('.historial-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.historial-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const tipo = tab.getAttribute('data-tipo') || 'todos';
          renderHistorial(cacheHistorial, tipo);
        });
      });

      // Modal confirmación de borrado - configurar handlers
      const modalConf = document.querySelector('#modal-confirmar-borrado');
      const btnCancelarB = document.querySelector('#btn-cancelar-borrado');
      const btnConfirmarB = document.querySelector('#btn-confirmar-borrado');

  // Validación de DOM
      if (!modalConf) {
        console.warn('⚠️ Modal de confirmación (#modal-confirmar-borrado) no encontrado');
        return; // No ejecutar si no existe el modal
      }

      const cerrarModalBorrar = () => {
        if (modalConf) {
          modalConf.dataset.eventoId = '';
          modalConf.classList.add('hidden');
          document.body.classList.remove('modal-open');
        }
      };

      if (btnCancelarB && !btnCancelarB.dataset.bound) {
        btnCancelarB.dataset.bound = 'true';
        btnCancelarB.addEventListener('click', cerrarModalBorrar);
      }

      // Cerrar confirmación al hacer clic fuera
      if (modalConf && !modalConf.dataset.boundOutside) {
        modalConf.dataset.boundOutside = 'true';
        modalConf.addEventListener('click', (e) => {
          if (e.target === modalConf) cerrarModalBorrar();
        });
      }

      if (btnConfirmarB && !btnConfirmarB.dataset.boundConfirm) {
        btnConfirmarB.dataset.boundConfirm = 'true';
        btnConfirmarB.addEventListener('click', async () => {
          const id = modalConf.dataset.eventoId;
          if (!id) return;
          
          try {
            // Validación de permisos
            const eventoABorrar = await getFromFirestore('eventos', id);
            const userIdLocal = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
            const isAdmin = window._isAdmin || false;
            
            if (!eventoABorrar) {
              mostrarMensajeError('Evento no encontrado');
              cerrarModalBorrar();
              return;
            }
            
            // Permitir borrado si es el organizador O si es administrador
            if (eventoABorrar.organizadorId !== userIdLocal && !isAdmin) {
              mostrarMensajeError('⛔ Solo el organizador puede borrar este evento');
              cerrarModalBorrar();
              return;
            }
            
            // Mensaje especial si es admin borrando evento de otro usuario
            if (isAdmin && eventoABorrar.organizadorId !== userIdLocal) {
              console.log('🛡️ Administrador borrando evento de otro usuario:', id);
            }
            
            console.log('🗑️ Borrando evento:', id);
            
            // NOTIFICAR A PARTICIPANTES ANTES DE BORRAR
            try {
              const fechaFormateada = formatearFechaArgentina(eventoABorrar.fecha);
              const horaFormateada = formatearHoraArgentina(eventoABorrar.hora);
              const mensajeCancelacion = `❌ El evento "${eventoABorrar.titulo}" ha sido CANCELADO\n\n` +
                `📅 Fecha que era: ${fechaFormateada}\n` +
                `🕐 Hora: ${horaFormateada}\n` +
                `📍 Lugar: ${eventoABorrar.lugar}\n\n` +
                `Lo sentimos por las molestias.`;
              
              await notificarParticipantes(
                id,
                TIPO_NOTIF.EVENTO_CANCELADO,
                mensajeCancelacion,
                { fecha: eventoABorrar.fecha, hora: eventoABorrar.hora, lugar: eventoABorrar.lugar }
              );
              console.log('📧 Notificaciones de cancelación enviadas');
            } catch (notifError) {
              console.error('Error al enviar notificaciones de cancelación:', notifError);
              // Continuar con el borrado aunque falle la notificación
            }
            
            // 1) Borrar evento de la colección eventos
            await deleteFromFirestore('eventos', id);
            console.log('✅ Evento borrado de colección eventos');
            
            // 2) Borrar TODAS las entradas de historial relacionadas con este evento
            const todosHistorial = await getFromFirestore('historial');
            console.log('📋 Total historial en BD:', todosHistorial?.length || 0);
            console.log('🔍 Buscando entradas para borrar con eventoId:', id);
            
            const entradasRelacionadas = (todosHistorial || []).filter(h => {
              if (!h.id || typeof h.id !== 'string') return false;
              const partes = h.id.split('_');
              const eventoIdEnId = partes.length >= 2 ? partes[1] : null;
              // Buscar tanto en el ID como en el campo eventoId
              const coincide = eventoIdEnId === id || h.eventoId === id;
              if (coincide) {
                console.log('🎯 Entrada para borrar:', { id: h.id, eventoId: h.eventoId });
              }
              return coincide;
            });
            
            console.log(`�️ Se encontraron ${entradasRelacionadas.length} entradas de historial para borrar`);
            
            // Borrar cada entrada de historial
            for (const entrada of entradasRelacionadas) {
              await deleteFromFirestore('historial', entrada.id);
              console.log(`✅ Borrada entrada de historial: ${entrada.id}`);
            }
            
            console.log('🎉 Todas las entradas de historial borradas');
            
            // 3) Borrar valoraciones relacionadas con este evento
            const todasValoraciones = await getFromFirestore('valoraciones');
            const valoracionesEvento = (todasValoraciones || []).filter(v => v.eventoId === id);
            
            console.log(`🔍 Se encontraron ${valoracionesEvento.length} valoraciones para borrar`);
            
            for (const val of valoracionesEvento) {
              if (val.id) {
                await deleteFromFirestore('valoraciones', val.id);
                console.log(`✅ Borrada valoración: ${val.id}`);
              }
            }
            
            console.log('🎉 Evento completamente eliminado de todas las colecciones');
            mostrarMensajeExito('Evento borrado definitivamente (incluyendo historial de todos los participantes)');
          } catch (err) {
            console.error('❌ Error al borrar evento:', err);
            mostrarMensajeError('No se pudo borrar el evento');
          } finally {
            cerrarModalBorrar();
              console.log('🔄 Recargando historial después de borrado...');
            cacheHistorial = await cargarHistorial();
              console.log('📊 Historial cargado:', cacheHistorial.length, 'entradas');
            const activeTab = document.querySelector('.historial-tab.active');
            const tipo = activeTab ? activeTab.getAttribute('data-tipo') : 'todos';
              console.log('🎨 Renderizando historial tipo:', tipo);
            renderHistorial(cacheHistorial, tipo);
              console.log('✅ Historial actualizado después de borrado');
          }
        });
      }

      // Modal edición de evento - Configurar handlers
      const modal = document.querySelector('#modal-editar-evento');
      const formEditar = document.querySelector('#form-editar-evento');
      const btnCancelarEd = document.querySelector('#btn-cancelar-edicion');

  // Validación de DOM
      if (!modal) {
        console.warn('⚠️ Modal de edición (#modal-editar-evento) no encontrado en el DOM');
        return;
      }
      if (!formEditar) {
        console.warn('⚠️ Formulario de edición (#form-editar-evento) no encontrado');
        return;
      }

      const cerrarModal = () => {
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
      };

      if (btnCancelarEd && !btnCancelarEd.dataset.bound) {
        btnCancelarEd.dataset.bound = 'true';
        btnCancelarEd.addEventListener('click', cerrarModal);
      }

      // Cerrar al hacer clic fuera del contenido
      if (modal && !modal.dataset.boundOutside) {
        modal.dataset.boundOutside = 'true';
        modal.addEventListener('click', (e) => {
          if (e.target === modal) cerrarModal();
        });
      }

      // Cerrar con tecla Escape
      if (!document.body.dataset.boundEscClose) {
        document.body.dataset.boundEscClose = 'true';
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            const abiertos = document.querySelectorAll('.modal:not(.hidden)');
            abiertos.forEach(m => {
              m.classList.add('hidden');
              document.body.classList.remove('modal-open');
            });
          }
        });
      }

      // Vincular botones de editar al cargar la página
      bindEditarButtons();

      // Configurar manejador del formulario de edición
      if (formEditar && !formEditar.dataset.bound) {
        formEditar.dataset.bound = 'true';
        formEditar.onsubmit = async (e) => {
          e.preventDefault();
          console.log('📝 SUBMIT DEL FORMULARIO DE EDICIÓN INICIADO');
          
          // Obtener referencias a los inputs
          const inputId = document.querySelector('#edit-evento-id');
          const inputTitulo = document.querySelector('#edit-titulo');
          const inputDesc = document.querySelector('#edit-descripcion');
          const inputFecha = document.querySelector('#edit-fecha');
          const inputHora = document.querySelector('#edit-hora');
          const inputUbicacion = document.querySelector('#edit-ubicacion');
          const inputMax = document.querySelector('#edit-maxPersonas');
          const editLinkGrupoInput = document.getElementById('edit-link-grupo');
          
          console.log('🔍 Valores del formulario:', {
            id: inputId?.value,
            titulo: inputTitulo?.value,
            descripcion: inputDesc?.value?.substring(0, 50),
            fecha: inputFecha?.value,
            hora: inputHora?.value,
            ubicacion: inputUbicacion?.value,
            linkGrupo: editLinkGrupoInput?.value,
            maxPersonas: inputMax?.value
          });
          
          const id = inputId.value;
          if (!id) {
            console.error('❌ No hay ID de evento');
            return;
          }
          
          try {
            // Normalizar fecha/hora desde el editor (permite DD/MM/AAAA)
            const fechaEdit = normalizarFecha(inputFecha.value);
            const horaEdit = normalizarHora(inputHora.value);
            console.log('📅 Fecha normalizada:', fechaEdit, 'Hora normalizada:', horaEdit);
            
            if (!fechaEdit || !horaEdit) {
              console.error('❌ Fecha u hora inválida');
              mostrarMensajeError('Fecha u hora inválida. Usa formato DD/MM/AAAA y HH:mm');
              return;
            }
            // Usar crearFechaLocal para evitar problemas de zona horaria
            const fh = crearFechaLocal(fechaEdit, horaEdit);
            if (!fh || isNaN(fh.getTime())) {
              console.error('❌ Fecha/hora no válida');
              mostrarMensajeError('Fecha/hora no válida');
              return;
            }
            const ahora2 = new Date();
            if (fh <= ahora2) {
              console.error('❌ Fecha en el pasado');
              mostrarMensajeError('La fecha y hora deben ser futuras');
              return;
            }
            
            // Obtener evento actual y mantener campos que no se editan
            console.log('🔍 Obteniendo evento actual con ID:', id);
            const eventoActual = await getFromFirestore('eventos', id);
            
            if (!eventoActual) {
              console.error('❌ Evento no encontrado en Firestore');
              mostrarMensajeError('No se pudo encontrar el evento');
              return;
            }
            
            console.log('✅ Evento actual obtenido:', {
              titulo: eventoActual.titulo,
              organizadorId: eventoActual.organizadorId,
              participantes: eventoActual.participantes?.length
            });
            
            // Obtener datos del formulario
            const linkGrupo = editLinkGrupoInput?.value?.trim() || '';
            const nuevoMaxPersonas = parseInt(inputMax.value, 10) || 1;
            
            // Validar que maxPersonas no sea menor que los participantes actuales
            const participantesActuales = Array.isArray(eventoActual.participantes) ? eventoActual.participantes.length : 0;
            console.log('👥 Participantes actuales:', participantesActuales, 'Nuevo máximo:', nuevoMaxPersonas);
            
            if (nuevoMaxPersonas < participantesActuales) {
              console.error('❌ maxPersonas menor que participantes');
              mostrarMensajeError(`No podés reducir el máximo a ${nuevoMaxPersonas} porque ya hay ${participantesActuales} participantes unidos`);
              return;
            }
            
            // Crear payload manteniendo campos críticos que no se editan
            const payload = {
              ...eventoActual, // Mantener todos los campos existentes
              titulo: inputTitulo.value.trim(),
              descripcion: inputDesc.value.trim(),
              fecha: fechaEdit,
              hora: horaEdit,
              ubicacion: inputUbicacion.value.trim(),
              linkGrupo: linkGrupo,
              maxPersonas: nuevoMaxPersonas,
              fechaHoraEvento: fh.toISOString(),
              fechaActualizacion: new Date().toISOString(), // Agregar timestamp de actualización
              // Asegurar que estos campos se mantengan:
              activo: eventoActual.activo !== undefined ? eventoActual.activo : true,
              organizadorId: eventoActual.organizadorId,
              participantes: eventoActual.participantes || [],
              unidos: Array.isArray(eventoActual.participantes) ? eventoActual.participantes.length : Number(eventoActual.unidos || 0)
            };
            
            console.log('💾 GUARDANDO EVENTO ACTUALIZADO:', id);
            console.log('📝 Payload completo:', {
              titulo: payload.titulo,
              descripcion: payload.descripcion?.substring(0, 50) + '...',
              fecha: payload.fecha,
              hora: payload.hora,
              ubicacion: payload.ubicacion,
              linkGrupo: payload.linkGrupo ? 'presente' : 'no',
              maxPersonas: payload.maxPersonas,
              unidos: payload.unidos,
              participantes: payload.participantes?.length || 0,
              activo: payload.activo,
              organizadorId: payload.organizadorId
            });
            await saveToFirestore('eventos', payload, id);
            console.log('✅ Evento guardado en BD con merge: true');
            
            // Actualizar también las entradas del historial de todos los usuarios
            const todosHistorial = await getFromFirestore('historial');
            console.log('📋 Total historial en BD:', todosHistorial?.length || 0);
            console.log('🔍 Buscando entradas para eventoId:', id);
            console.log('🔍 Ejemplos de IDs en historial:', todosHistorial?.slice(0, 3).map(h => ({ id: h.id, eventoId: h.eventoId })));
            
            const entradasRelacionadas = (todosHistorial || []).filter(h => {
              if (!h.id || typeof h.id !== 'string') return false;
              const partes = h.id.split('_');
              const eventoIdEnId = partes.length >= 2 ? partes[1] : null;
              const coincide = eventoIdEnId === id || h.eventoId === id;
              if (coincide) {
                console.log('✅ Entrada coincidente encontrada:', { id: h.id, eventoId: h.eventoId, eventoIdEnId });
              }
              return coincide;
            });
            
            console.log(`🔄 Actualizando ${entradasRelacionadas.length} entradas de historial`);
            
            // Actualizar cada entrada de historial con los nuevos datos
            for (const entrada of entradasRelacionadas) {
              const entradaActualizada = {
                ...entrada,
                titulo: payload.titulo,
                descripcion: payload.descripcion,
                fecha: payload.fecha,
                hora: payload.hora,
                ubicacion: payload.ubicacion,
                linkGrupo: payload.linkGrupo,
                maxPersonas: payload.maxPersonas
              };
              await saveToFirestore('historial', entradaActualizada, entrada.id);
              console.log(`✅ Actualizada entrada: ${entrada.id}`);
            }
            
            console.log('🎉 Todas las actualizaciones completadas');
            
            // ===== NOTIFICAR A PARTICIPANTES SOBRE LA EDICIÓN =====
            try {
              console.log('🔍 INICIANDO DETECCIÓN DE CAMBIOS...');
              console.log('📋 Evento anterior:', {
                fecha: eventoActual.fecha,
                hora: eventoActual.hora,
                ubicacion: eventoActual.ubicacion || eventoActual.lugar,
                descripcion: eventoActual.descripcion?.substring(0, 30) + '...',
                linkGrupo: eventoActual.linkGrupo,
                maxPersonas: eventoActual.maxPersonas
              });
              console.log('📋 Evento nuevo:', {
                fecha: payload.fecha,
                hora: payload.hora,
                ubicacion: payload.ubicacion,
                descripcion: payload.descripcion?.substring(0, 30) + '...',
                linkGrupo: payload.linkGrupo,
                maxPersonas: payload.maxPersonas
              });
              
              // Detectar qué campos cambiaron comparando con el evento original
              const cambios = [];
              
              // Normalizar valores para comparación (evitar false positives por tipos)
              const fechaAnterior = String(eventoActual.fecha || '').trim();
              const fechaNueva = String(payload.fecha || '').trim();
              const horaAnterior = String(eventoActual.hora || '').trim();
              const horaNueva = String(payload.hora || '').trim();
              const ubicacionAnterior = String(eventoActual.ubicacion || eventoActual.lugar || '').trim();
              const ubicacionNueva = String(payload.ubicacion || '').trim();
              const descripcionAnterior = String(eventoActual.descripcion || '').trim();
              const descripcionNueva = String(payload.descripcion || '').trim();
              const linkAnterior = String(eventoActual.linkGrupo || '').trim();
              const linkNuevo = String(payload.linkGrupo || '').trim();
              const maxAnterior = parseInt(eventoActual.maxPersonas) || 0;
              const maxNuevo = parseInt(payload.maxPersonas) || 0;
              
              console.log('🔍 Comparaciones:');
              if (fechaAnterior !== fechaNueva) {
                console.log(`  ✏️ FECHA cambió: "${fechaAnterior}" → "${fechaNueva}"`);
                cambios.push(`la fecha (de ${formatearFechaArgentina(eventoActual.fecha)} a ${formatearFechaArgentina(payload.fecha)})`);
              }
              if (horaAnterior !== horaNueva) {
                console.log(`  ✏️ HORA cambió: "${horaAnterior}" → "${horaNueva}"`);
                cambios.push(`la hora (de ${formatearHoraArgentina(eventoActual.hora)} a ${formatearHoraArgentina(payload.hora)})`);
              }
              if (ubicacionAnterior !== ubicacionNueva) {
                console.log(`  ✏️ UBICACIÓN cambió: "${ubicacionAnterior}" → "${ubicacionNueva}"`);
                cambios.push(`la ubicacion (de "${ubicacionAnterior}" a "${payload.ubicacion}")`);
              }
              if (descripcionAnterior !== descripcionNueva) {
                console.log(`  ✏️ DESCRIPCIÓN cambió`);
                cambios.push('la descripcion');
              }
              if (linkAnterior !== linkNuevo) {
                console.log(`  ✏️ LINK cambió: "${linkAnterior}" → "${linkNuevo}"`);
                cambios.push('el link del grupo');
              }
              if (maxAnterior !== maxNuevo) {
                console.log(`  ✏️ MAX PARTICIPANTES cambió: ${maxAnterior} → ${maxNuevo}`);
                cambios.push(`el maximo de participantes (de ${maxAnterior} a ${maxNuevo})`);
              }
              
              console.log(`📊 Total cambios detectados: ${cambios.length}`);
              
              // Solo enviar si hubo cambios reales
              if (cambios.length > 0) {
                const cambiosTexto = `Se modifico ${cambios.join(', ')}.`;
                
                console.log('📧 Enviando notificación con mensaje:', cambiosTexto);
                
                // Enviar UNA SOLA notificación por email a participantes
                await notificarEdicionEvento(id, cambiosTexto);
                
                console.log('✅ Notificaciones de edición enviadas:', cambiosTexto);
              } else {
                console.log('ℹ️ No se detectaron cambios significativos, sin notificación');
              }
            } catch (notifError) {
              console.error('❌ Error enviando notificaciones de edición:', notifError);
              // No bloqueamos el flujo si falla la notificación
            }
            // ===== FIN NOTIFICACIONES =====
            
            mostrarMensajeExito('Evento actualizado para todos los participantes');
            cerrarModal();
            
            // Pequeño delay para asegurar que Firestore termine de actualizar
            await new Promise(resolve => setTimeout(resolve, 300));
            
            console.log('🔄 Recargando historial...');
            // Recargar historial con datos actualizados
            cacheHistorial = await cargarHistorial();
            console.log('📊 Historial cargado:', cacheHistorial.length, 'entradas');
            const activeTab = document.querySelector('.historial-tab.active');
            const tipo = activeTab ? activeTab.getAttribute('data-tipo') : 'todos';
            console.log('🎨 Renderizando historial tipo:', tipo);
            renderHistorial(cacheHistorial, tipo);
            console.log('✅ Renderizado completado');
            
            // 🔄 Actualizar tarjetas de este evento en TODAS las vistas (inicio, favoritos)
            // si el usuario tiene esas páginas abiertas (sin recargar)
            actualizarTarjetasEventoEnTodasLasVistas(id, payload);
            
            // Marcar que se editó un evento para que otras vistas lo detecten
            localStorage.setItem('eventoEditadoReciente', '1');
          } catch (err) {
            console.error('❌ Error al actualizar:', err);
            mostrarMensajeError('No se pudo actualizar el evento');
          }
        };
      }

      // Bind participantes toggle
      const bindParticipantesToggle = () => {
        historialContent.querySelectorAll('.participantes-toggle').forEach(btn => {
          if (btn.dataset.bound) return;
          btn.dataset.bound = 'true';
          btn.addEventListener('click', async () => {
            const section = btn.closest('.participantes-section');
            const lista = section.querySelector('.participantes-lista');
            const eventoId = section.getAttribute('data-evento-id');
            if (!lista || !eventoId) return;

            if (lista.dataset.loaded !== '1') {
              // Cargar evento y perfiles de participantes
              const ev = await getFromFirestore('eventos', eventoId);
              const participantes = Array.isArray(ev?.participantes) ? ev.participantes : [];
              if (!participantes.length) {
                lista.innerHTML = '<p style="color:#666;">Aún no hay participantes.</p>';
              } else {
                const items = [];
                for (const pid of participantes) {
                  const perfil = await getFromFirestore('perfiles', pid) || {};
                  const nombre = [perfil.nombre || '', perfil.apellido || ''].filter(Boolean).join(' ');
                  const edad = perfil.edad ? `${perfil.edad} años` : 'Edad no informada';
                  const sexo = perfil.sexo || 'Sexo no informado';
                  const foto = perfil.foto || '';
                  items.push(`
                    <div class="participante-item">
                      <div class="participante-avatar">${foto ? `<img src="${foto}" alt="Foto" class="participante-foto" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">` : `<img src="img/personas.png" alt="Participante" style="width:24px;height:24px;vertical-align:middle;">`}</div>
                      <div class="participante-info">
                        <div class="participante-nombre">${nombre || pid}</div>
                        <div class="participante-extra">${edad} · ${sexo}</div>
                      </div>
                    </div>
                  `);
                }
                lista.innerHTML = items.join('');
              }
              lista.dataset.loaded = '1';
            }
            // Toggle visual
            const visible = lista.style.display !== 'none';
            lista.style.display = visible ? 'none' : 'block';
            btn.textContent = visible ? 'Ver participantes' : 'Ocultar participantes';
          });
        });
      };
      
      bindParticipantesToggle();
    })();
  }

  // ========================================
  // REPARAR HISTORIAL SIN organizadorId
  // ========================================
  const repararHistorialSinOrganizadorId = async () => {
    const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
    if (!userId) return;

    try {
      console.log('🔧 Verificando historial para reparar eventos sin organizadorId...');
      
      // Obtener todo el historial del usuario
      const todosHistorial = await getFromFirestore('historial');
      const miHistorial = (todosHistorial || []).filter(h => h.id && h.id.startsWith(`${userId}_`));
      
      // Filtrar eventos sin organizadorId O con campos obsoletos (organizador, fotoOrganizador)
      const eventosParaReparar = miHistorial.filter(h => 
        (!h.organizadorId && h.eventoId) || h.organizador || h.fotoOrganizador
      );
      
      if (eventosParaReparar.length === 0) {
        console.log('✅ Todos los eventos del historial están correctos');
        return;
      }

      console.log(`📝 Se encontraron ${eventosParaReparar.length} eventos para reparar...`);

      // Reparar cada evento
      let reparados = 0;
      for (const historialItem of eventosParaReparar) {
        try {
          // Obtener el evento completo de la colección eventos
          const eventoCompleto = await getFromFirestore('eventos', historialItem.eventoId);
          
          if (eventoCompleto && eventoCompleto.organizadorId) {
            // Crear versión limpia sin campos obsoletos
            const { organizador, fotoOrganizador, ...historialLimpio } = historialItem;
            
            // Actualizar el historial SOLO con organizadorId y otros datos necesarios
            // IMPORTANTE: Eliminar valores undefined para evitar error de Firestore
            const historialActualizado = {
              ...historialLimpio,
              organizadorId: eventoCompleto.organizadorId,
              descripcion: eventoCompleto.descripcion || historialLimpio.descripcion || '',
              linkGrupo: eventoCompleto.linkGrupo || historialLimpio.linkGrupo || '',
              maxPersonas: eventoCompleto.maxPersonas || historialLimpio.maxPersonas || 1,
              unidos: (Array.isArray(eventoCompleto.participantes) ? eventoCompleto.participantes.length : (eventoCompleto.unidos || historialLimpio.unidos || 0))
            };
            
            // Eliminar cualquier campo que sea undefined
            Object.keys(historialActualizado).forEach(key => {
              if (historialActualizado[key] === undefined) {
                delete historialActualizado[key];
              }
            });

            await saveToFirestore('historial', historialActualizado, historialItem.id);
            reparados++;
            console.log(`✅ Reparado: ${historialItem.titulo} (${historialItem.eventoId})`);
          } else {
            console.warn(`⚠️ No se pudo reparar ${historialItem.eventoId}: evento no encontrado o sin organizadorId`);
          }
        } catch (error) {
          console.error(`❌ Error reparando ${historialItem.eventoId}:`, error);
        }
      }

      console.log(`🎉 Reparación completada: ${reparados}/${eventosParaReparar.length} eventos actualizados`);
      
      // Si estamos en la página de perfil, recargar el historial
      if (historialContent) {
        const historialActualizado = await cargarHistorial();
        cacheHistorial = historialActualizado;
        await renderHistorial(historialActualizado, 'todos');
      }
      
    } catch (error) {
      console.error('❌ Error en reparación de historial:', error);
    }
  };

  // ========================================
  // LIMPIAR EVENTOS DUPLICADOS
  // ========================================
  const limpiarEventosDuplicados = async () => {
    try {
      const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
      if (!userId) return;
      const flagKey = `dedupe_v2_done_${userId}`;
      if (localStorage.getItem(flagKey) === '1') return;

      console.log('🧹 Buscando eventos duplicados para usuario:', userId);
      const todos = await getFromFirestore('eventos');
      const mios = (todos || []).filter(e => e.organizadorId === userId);
      if (!mios.length) { localStorage.setItem(flagKey, '1'); return; }

      const normFecha = (f) => {
        if (!f) return '';
        const s = String(f).trim();
        const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const d = new Date(s); if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        return '';
      };
      const normHora = (h) => {
        if (!h && h !== 0) return '';
        const s = String(h).trim();
        const m = s.match(/^(\d{1,2}):(\d{2})/);
        if (m) return `${String(Math.min(23,parseInt(m[1]))).padStart(2,'0')}:${String(Math.min(59,parseInt(m[2]))).padStart(2,'0')}`;
        const m2 = s.match(/^(\d{1,2})$/); if (m2) return `${String(Math.min(23,parseInt(m2[1]))).padStart(2,'0')}:00`;
        return '';
      };

      const groups = new Map();
      for (const e of mios) {
        const tituloKey = (e.titulo || '').trim().toLowerCase();
        const fKey = normFecha(e.fecha);
        const hKey = normHora(e.hora);
        const fhKey = e.fechaHoraEvento && !isNaN(new Date(e.fechaHoraEvento)) ? new Date(e.fechaHoraEvento).toISOString() : '';
        if (!tituloKey || (!fhKey && (!fKey || !hKey))) continue; // clave insuficiente
        const key = `${tituloKey}|${fhKey || (fKey+'T'+hKey)}|${(e.ubicacion||'').trim().toLowerCase()}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(e);
      }

      const toDelete = [];
      const withinMinutes = (aIso, bIso, min=10) => {
        if (!aIso || !bIso) return false;
        const a = new Date(aIso).getTime(); const b = new Date(bIso).getTime();
        if (isNaN(a) || isNaN(b)) return false; return Math.abs(a-b) <= min*60*1000;
      };

      for (const [key, arr] of groups.entries()) {
        if (arr.length <= 1) continue;
        // ordenar por createdAt (más antiguo primero); fallback a fechaHoraEvento
        const sorted = [...arr].sort((x,y) => {
          const ax = new Date(x.createdAt || x.fechaHoraEvento || 0).getTime();
          const ay = new Date(y.createdAt || y.fechaHoraEvento || 0).getTime();
          return ax - ay;
        });
        const keeper = sorted[0];
        for (let i=1;i<sorted.length;i++) {
          const cand = sorted[i];
          const cerca = withinMinutes(keeper.createdAt, cand.createdAt, 10) || withinMinutes(keeper.fechaHoraEvento, cand.fechaHoraEvento, 10);
          // Considerar duplicado si están muy cerca en el tiempo y coinciden clave
          if (cerca) toDelete.push(cand);
        }
      }

      if (!toDelete.length) { console.log('✅ No se encontraron duplicados'); localStorage.setItem(flagKey,'1'); return; }
      console.log(`🧹 Eliminando ${toDelete.length} evento(s) duplicado(s)`);

      // Cargar colecciones relacionadas para borrar referencias
      const [historial, favoritos, valoraciones] = await Promise.all([
        getFromFirestore('historial'),
        getFromFirestore('favoritos'),
        getFromFirestore('valoraciones')
      ]);

      for (const ev of toDelete) {
        try {
          // Borrar referencias en historial
          const histRefs = (historial||[]).filter(h => h.eventoId === ev.id);
          for (const h of histRefs) await deleteFromFirestore('historial', h.id);
          // Borrar favoritos
          const favRefs = (favoritos||[]).filter(f => f.eventoId === ev.id);
          for (const f of favRefs) await deleteFromFirestore('favoritos', f.id);
          // Borrar valoraciones
          const valRefs = (valoraciones||[]).filter(v => v.eventoId === ev.id);
          for (const v of valRefs) await deleteFromFirestore('valoraciones', v.id);
          // Borrar evento
          await deleteFromFirestore('eventos', ev.id);
          console.log(`🗑️  Eliminado duplicado: ${ev.id} (${ev.titulo})`);
        } catch (err) {
          console.error('❌ Error eliminando duplicado', ev.id, err);
        }
      }

      localStorage.setItem(flagKey,'1');
      // Refrescar vistas abiertas
      try { if (typeof loadEventosInicio === 'function') loadEventosInicio(1); } catch {}
      try { if (document.querySelector('#favoritos-lista') && typeof window.loadFavoritosRef === 'function') window.loadFavoritosRef(); } catch {}
      try {
        if (document.querySelector('#historial-content')) {
          cacheHistorial = await cargarHistorial();
          const activeTab = document.querySelector('.historial-tab.active');
          const tipo = activeTab ? activeTab.getAttribute('data-tipo') : 'todos';
          renderHistorial(cacheHistorial, tipo);
        }
      } catch {}
      console.log('✅ Limpieza de duplicados completada');
    } catch (e) {
      console.error('❌ Error en limpieza de duplicados:', e);
    }
  };

  // Ejecutar limpieza una sola vez automáticamente y exponer manual
  setTimeout(() => { limpiarEventosDuplicados(); }, 4500);
  window.limpiarDuplicados = limpiarEventosDuplicados;

  // Ejecutar reparación automática si estamos en perfil.html
  if (historialContent) {
    repararHistorialSinOrganizadorId();
  }

  // ==============================
  // INICIAR SISTEMA DE NOTIFICACIONES
  // ==============================
  const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
  if (userId) {
    console.log('🔔 Iniciando sistema de notificaciones...');
    iniciarSistemaNotificaciones();
  }

    // ==============================
    // PÁGINA DE RECUPERACIÓN DE CONTRASEÑA
    // ==============================
    const emailForm = document.getElementById('email-form');
    const codigoForm = document.getElementById('codigo-form');
    const stepEmail = document.getElementById('step-email');
    const stepCodigo = document.getElementById('step-codigo');
    const stepExito = document.getElementById('step-exito');
    const reenviarCodigoBtn = document.getElementById('reenviar-codigo');
  
    if (emailForm && codigoForm) {
      let emailActual = '';

      // Paso 1: Enviar código
      emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('email-recuperacion');
        const email = emailInput.value.trim();
        const submitBtn = emailForm.querySelector('button[type="submit"]');
      
        if (!email) {
          alert('Por favor ingresá tu correo electrónico');
          return;
        }

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Enviando...';
        
          await enviarCodigoRecuperacion(email);
        
          emailActual = email;
          document.getElementById('email-enviado').textContent = email;
          stepEmail.style.display = 'none';
          stepCodigo.style.display = 'block';
        
        } catch (error) {
          alert(error.message || 'Error al enviar el código. Intenta nuevamente.');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Enviar Código';
        }
      });

      // Reenviar código
      if (reenviarCodigoBtn) {
        reenviarCodigoBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          if (!emailActual) return;
        
          try {
            reenviarCodigoBtn.textContent = 'Reenviando...';
            await enviarCodigoRecuperacion(emailActual);
            alert('Código reenviado exitosamente');
          } catch (error) {
            alert(error.message || 'Error al reenviar el código');
          } finally {
            reenviarCodigoBtn.textContent = 'Reenviar código';
          }
        });
      }

      // Paso 2: Verificar código y cambiar contraseña
      codigoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
      
        const codigo = document.getElementById('codigo-verificacion').value.trim();
        const nuevaPassword = document.getElementById('nueva-password').value;
        const confirmarPassword = document.getElementById('confirmar-password').value;
        const submitBtn = codigoForm.querySelector('button[type="submit"]');
      
        if (!codigo || codigo.length !== 6) {
          alert('Por favor ingresá el código de 6 dígitos');
          return;
        }
      
        if (nuevaPassword.length < 6) {
          alert('La contraseña debe tener al menos 6 caracteres');
          return;
        }
      
        if (nuevaPassword !== confirmarPassword) {
          alert('Las contraseñas no coinciden');
          return;
        }

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Verificando...';
        
          await verificarCodigoYCambiarPassword(emailActual, codigo, nuevaPassword);
        
          stepCodigo.style.display = 'none';
          stepExito.style.display = 'block';
        
        } catch (error) {
          alert(error.message || 'Error al cambiar la contraseña. Verifica el código.');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Cambiar Contraseña';
        }
      });
    }

}); // Fin DOMContentLoaded
// ==============================
// Recuperación de contraseña integrada en login.html
// ==============================
const btnAbrirRecuperar = document.getElementById('btn-abrir-recuperar');
const modalRecuperar = document.getElementById('recuperar-modal');
const emailFormRecuperar = document.getElementById('email-form-recuperar');
const codigoFormRecuperar = document.getElementById('codigo-form-recuperar');
const passwordFormRecuperar = document.getElementById('password-form-recuperar');
const stepEmailRecuperar = document.getElementById('step-email-recuperar');
const stepCodigoRecuperar = document.getElementById('step-codigo-recuperar');
const stepPasswordRecuperar = document.getElementById('step-password-recuperar');
const stepExitoRecuperar = document.getElementById('step-exito-recuperar');
const reenviarCodigoRecuperar = document.getElementById('reenviar-codigo-recuperar');
const btnVolverLoginRecuperar = document.getElementById('btn-volver-login-recuperar');
let emailActualRecuperar = '';
let codigoVerificadoRecuperar = '';

if (btnAbrirRecuperar && modalRecuperar) {
  btnAbrirRecuperar.addEventListener('click', (e) => {
    e.preventDefault();
    modalRecuperar.style.display = 'block';
    stepEmailRecuperar.style.display = 'block';
    stepCodigoRecuperar.style.display = 'none';
    stepPasswordRecuperar.style.display = 'none';
    stepExitoRecuperar.style.display = 'none';
    document.body.style.overflow = 'hidden';
  });
  if (btnVolverLoginRecuperar) {
    btnVolverLoginRecuperar.addEventListener('click', () => {
      modalRecuperar.style.display = 'none';
      document.body.style.overflow = '';
    });
  }
}

// Paso 1: Enviar código
if (emailFormRecuperar) {
  emailFormRecuperar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('email-recuperacion');
    const email = emailInput.value.trim();
    const submitBtn = emailFormRecuperar.querySelector('button[type="submit"]');
    if (!email) {
      alert('Por favor ingresá tu correo electrónico');
      return;
    }
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
      await enviarCodigoRecuperacion(email);
      emailActualRecuperar = email;
      document.getElementById('email-enviado-recuperar').textContent = email;
      stepEmailRecuperar.style.display = 'none';
      stepCodigoRecuperar.style.display = 'block';
    } catch (error) {
      alert(error.message || 'Error al enviar el código. Intenta nuevamente.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar Código';
    }
  });
}

// Reenviar código
if (reenviarCodigoRecuperar) {
  reenviarCodigoRecuperar.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!emailActualRecuperar) return;
    try {
      reenviarCodigoRecuperar.textContent = 'Reenviando...';
      await enviarCodigoRecuperacion(emailActualRecuperar);
      alert('Código reenviado exitosamente');
    } catch (error) {
      alert(error.message || 'Error al reenviar el código');
    } finally {
      reenviarCodigoRecuperar.textContent = 'Reenviar código';
    }
  });
}

// Paso 2: Verificar código solamente
if (codigoFormRecuperar) {
  codigoFormRecuperar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codigo = document.getElementById('codigo-verificacion-recuperar').value.trim();
    const submitBtn = codigoFormRecuperar.querySelector('button[type="submit"]');
    if (!codigo || codigo.length !== 6) {
      alert('Por favor ingresá el código de 6 dígitos');
      return;
    }
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verificando...';
      
      // Verificar el código sin cambiar la contraseña aún
      const emailLower = emailActualRecuperar.toLowerCase();
      const datoCodigo = codigosRecuperacion.get(emailLower);
      
      if (!datoCodigo) {
        throw new Error('No se encontró un código de verificación. Solicita uno nuevo.');
      }
      if (Date.now() > datoCodigo.expira) {
        codigosRecuperacion.delete(emailLower);
        throw new Error('El código ha expirado. Solicita uno nuevo.');
      }
      if (datoCodigo.intentos >= 5) {
        codigosRecuperacion.delete(emailLower);
        throw new Error('Demasiados intentos fallidos. Solicita un nuevo código.');
      }
      if (datoCodigo.codigo !== codigo) {
        datoCodigo.intentos++;
        throw new Error(`Código incorrecto. Intentos restantes: ${5 - datoCodigo.intentos}`);
      }
      
      // Código correcto, guardar y pasar al siguiente paso
      codigoVerificadoRecuperar = codigo;
      stepCodigoRecuperar.style.display = 'none';
      stepPasswordRecuperar.style.display = 'block';
      
    } catch (error) {
      alert(error.message || 'Error al verificar el código.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Verificar Código';
    }
  });
}

// Paso 3: Cambiar contraseña
if (passwordFormRecuperar) {
  passwordFormRecuperar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevaPasswordInput = document.getElementById('nueva-password-recuperar');
    const confirmarPasswordInput = document.getElementById('confirmar-password-recuperar');
    const nuevaPassword = nuevaPasswordInput.value.trim();
    const confirmarPassword = confirmarPasswordInput.value.trim();
    const submitBtn = passwordFormRecuperar.querySelector('button[type="submit"]');
    
    // Validaciones
    if (!nuevaPassword || !confirmarPassword) {
      alert('Por favor completá ambos campos de contraseña');
      return;
    }
    
    if (nuevaPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      nuevaPasswordInput.focus();
      return;
    }
    
    if (nuevaPassword !== confirmarPassword) {
      alert('Las contraseñas no coinciden. Por favor verificá que ambas sean iguales.');
      confirmarPasswordInput.value = '';
      confirmarPasswordInput.focus();
      return;
    }
    
    if (!emailActualRecuperar || !codigoVerificadoRecuperar) {
      alert('Error en el proceso. Por favor reiniciá la recuperación.');
      return;
    }
    
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Cambiando contraseña...';
      
      await verificarCodigoYCambiarPassword(emailActualRecuperar, codigoVerificadoRecuperar, nuevaPassword);
      
      // Limpiar campos
      nuevaPasswordInput.value = '';
      confirmarPasswordInput.value = '';
      
      stepPasswordRecuperar.style.display = 'none';
      stepExitoRecuperar.style.display = 'block';
      
      console.log('✅ Contraseña actualizada exitosamente en la base de datos');
    } catch (error) {
      console.error('❌ Error al cambiar contraseña:', error);
      alert(error.message || 'Error al cambiar la contraseña. Por favor intentá nuevamente.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Cambiar Contraseña';
    }
  });
}
