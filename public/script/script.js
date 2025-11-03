// Script unificado con Firebase Firestore v11 modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, deleteDoc, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Silenciar logs informativos en producción (mantiene warnings y errores)
const SILENCE_INFO_LOGS = true;
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
  if (id) {
    // Usar merge para actualizar solo los campos provistos y no sobreescribir
    // accidentalmente otros campos existentes en el documento.
    await setDoc(doc(db, col, id), { ...data, id }, { merge: true });
    return id;
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
// Template ID: template_p7ka3kx (One-Time Password)
const EMAILJS_CONFIG = {
  PUBLIC_KEY: '-dIDVhLNDyn8jILqB',       // Nueva Public Key provista
  SERVICE_ID: 'service_qfr7y9j',         // Nuevo servicio "Activa"
  TEMPLATE_ID: 'template_p7ka3kx',       // Nuevo template OTP
  TEMPLATE_ID_NOTIF: ''                  // Opcional: template para notificaciones
};

// ==============================
// Favoritos: helpers (fallback local)
// ==============================
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

    if (emailCandidato) {
      const norm = normalizarEmail(emailCandidato);
      if (adminNorms.includes(norm)) return true;
    }

    // 2) Fallback: comparar por userId contra versión saneada del email admin
    //    (coincide con el esquema usado para IDs: reemplazar @, +, espacios, guiones y puntos por '_')
    const sanitizeId = (e) => e.replace(/[@\s\+\-\.]/g, '_');
    for (const adminRaw of ADMIN_EMAILS) {
      if (sanitizeId(adminRaw) === userId) return true;
      // También probar con el normalizado gmail (sin puntos)
      if (sanitizeId(normalizarEmail(adminRaw)) === userId) return true;
    }

    // 3) Fallback extra: intentar leer perfil por si el correo está allí
    const perfil = await getFromFirestore('perfiles', userId);
    if (perfil && perfil.email) {
      const normPerfil = normalizarEmail(perfil.email);
      if (adminNorms.includes(normPerfil)) return true;
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

// Formatear fecha ISO (YYYY-MM-DD) a formato argentino (DD/MM/YYYY)
const formatearFechaArgentina = (fechaStr) => {
  if (!fechaStr) return '';
  // Si es formato ISO YYYY-MM-DD, parsear directamente sin zona horaria
  const match = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [_, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  // Fallback: intentar parsear como fecha
  try {
    const fecha = new Date(fechaStr);
    if (!isNaN(fecha.getTime())) {
      return `${pad2(fecha.getDate())}/${pad2(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
    }
  } catch (e) {}
  return fechaStr; // Devolver original si no se puede parsear
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
  CONFIRMACION_RECIBIDA: 'confirmacion_recibida'
};

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
      verification_code: mensaje,
      codigo: mensaje,
      code: mensaje,
      subject: asunto || 'Notificación',
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
    const metodo = usuario.metodoComunicacion || 'email';
    const notificacionesActivas = usuario.notificacionesActivas !== false; // Por defecto true
    
    // Si el usuario desactivó notificaciones, no enviar
    if (!notificacionesActivas) {
      console.log('Usuario tiene notificaciones desactivadas:', userId);
      return false;
    }
    
    // Registrar en Firestore
    await registrarNotificacion(userId, tipo, eventoId, mensaje, metadata);
    
    // Enviar según método preferido
    let enviado = false;
    if (metodo === 'email' && usuario.email) {
      const asunto = `Activá - ${metadata.tituloEvento || 'Notificación'}`;
      enviado = await enviarEmail(usuario.email, asunto, mensaje);
    } else if (metodo === 'telefono' && usuario.telefono) {
      enviado = enviarWhatsApp(usuario.telefono, mensaje);
    }
    
    if (enviado) {
      console.log(`Notificación enviada a ${usuario.nombre} vía ${metodo}`);
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
    
    // Agregar título del evento a metadata
    metadata.tituloEvento = evento.titulo;
    
    // Enviar notificación a cada participante
    console.log(`Notificando a ${participantes.length} participantes del evento "${evento.titulo}"`);
    
    const promesas = participantes.map(userId => 
      enviarNotificacion(userId, tipo, eventoId, mensaje, metadata)
    );
    
    await Promise.allSettled(promesas);
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
        usuariosNoParticipantes.push(doc.id);
      }
    });
    
    if (usuariosNoParticipantes.length === 0) {
      console.log('No hay usuarios para notificar (todos son participantes)');
      return;
    }
    
    metadata.tituloEvento = evento.titulo;
    
    console.log(`Notificando a ${usuariosNoParticipantes.length} usuarios sobre evento disponible`);
    
    const promesas = usuariosNoParticipantes.map(userId =>
      enviarNotificacion(userId, TIPO_NOTIF.EVENTO_DISPONIBLE, eventoId, mensaje, metadata)
    );
    
    await Promise.allSettled(promesas);
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

/**
 * Iniciar sistema de notificaciones (ejecutar recordatorios)
 * En producción, esto debería ser una Cloud Function con cron job
 */
function iniciarSistemaNotificaciones() {
  // Ejecutar al iniciar
  generarRecordatoriosDiarios();
  
  // Ejecutar cada 24 horas (86400000 ms)
  // Para desarrollo, puedes usar 1 hora (3600000)
  setInterval(generarRecordatoriosDiarios, 86400000);
  
  console.log('Sistema de notificaciones iniciado');
}

// ==============================
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
    const publicPages = ['index.html', 'login.html', 'registro.html'];
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
    // Proveer todos los aliases típicos que puede usar el template en EmailJS
    const params = {
      to_email: email,
      email: email,
      user_email: email,
      reply_to: email,
      to: email,
      verification_code: codigo,
      codigo: codigo,
      code: codigo,
      subject: 'Código de verificación',
      app_name: 'Activá'
    };
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
    bottom: 20px;
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
  div.style.cssText = base + (tipo === 'exito' ? 'background-color:#003918;' : 'background-color:#dc3545;');
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
    div.style.animation = 'slideDown 0.3s ease-out';
    setTimeout(() => div.remove(), 300);
  }, 4000);
};
const mostrarMensajeExito = (msg) => mostrarToast(msg, 'exito');
const mostrarMensajeError = (msg) => mostrarToast(msg, 'error');

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
    const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
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
          
          // Mostrar mensaje de error debajo del recuadro
          mostrarMensajeError(`❌ Error al enviar el código: ${error.message}. Por favor verifica tu conexión e inténtalo de nuevo.`);
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
          alert("Por favor, completa todos los campos.");
          return;
        }
        
        if (password !== password2) {
          alert("Las contraseñas no coinciden.");
          return;
        }
        
        if (password.length < 6) {
          alert("La contraseña debe tener al menos 6 caracteres.");
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
    const perfilForm = $("#perfil-form");
    const btnEditarPerfil = $("#btn-editar-perfil");
    const btnCancelarPerfil = $("#btn-cancelar-perfil");
    
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
        const nombre = (document.getElementById("nombre") || {}).value || "";
        const apellido = (document.getElementById("apellido") || {}).value || "";
        const edad = (document.getElementById("edad") || {}).value || "";
        const sexo = (document.getElementById("sexo") || {}).value || "";
  const descripcion = (document.getElementById("perfil-descripcion-input") || {}).value || "";
        const fotoImgForm = document.getElementById("perfil-foto-form");
        const fotoImgHeader = document.getElementById("perfil-foto");
        const foto = (fotoImgForm && fotoImgForm.src) ? fotoImgForm.src : (fotoImgHeader && fotoImgHeader.src ? fotoImgHeader.src : "");
        const userId = localStorage.getItem('currentUserId');
        const perfil = { 
          nombre, 
          apellido, 
          edad: parseInt(edad),
          sexo,
          descripcion, 
          foto,
          fechaActualizacion: new Date().toISOString()
        };
        await saveToFirestore("perfiles", perfil, userId);
      // También actualizar todos los datos editados en la colección 'usuarios'
      await saveToFirestore("usuarios", {
        nombre,
        apellido,
        edad: parseInt(edad),
        sexo,
        descripcion,
        foto
      }, userId);
      // Persistir datos útiles y caché para próximas visitas
      const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ').trim();
      if (nombreCompleto) localStorage.setItem('currentUserName', nombreCompleto);
      if (edad) localStorage.setItem('perfilEdad', String(edad));
      if (sexo) localStorage.setItem('perfilSexo', sexo);
      if (descripcion) localStorage.setItem('perfilDescripcion', descripcion);
      if (foto) localStorage.setItem('userPhoto', foto);
      mostrarMensajeExito("¡Perfil guardado exitosamente!");

      // Cerrar el formulario de edición y mostrar la vista normal
      perfilForm.classList.add('hidden');
      if (btnEditarPerfil) btnEditarPerfil.classList.remove('hidden');

      // Recargar datos en la vista sin redirigir
      await loadPerfil();
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
  const btnEditarFoto = $("#btn-editar-foto");
  const btnCambiarFoto = $("#btn-cambiar-foto");
  const btnQuitarFoto = $("#btn-quitar-foto");
  const fotoInput = $("#foto-perfil");
  const fotoImgForm = $("#perfil-foto-form");
  const perfilFoto = $("#perfil-foto");
    const btnEditarDesc = $("#btn-editar-desc");
    const btnGuardar = $("#btn-guardar");

    const bindFotoChange = () => {
  if (!fotoInput) return;
      fotoInput.addEventListener('change', () => {
        const file = fotoInput.files && fotoInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target.result;
          // Solo actualizar la foto del formulario, NO la del header
          if (fotoImgForm) fotoImgForm.src = src;
          // Al guardar el form se actualizará la foto del header
          if (btnGuardar) btnGuardar.style.display = 'block';
        };
        reader.readAsDataURL(file);
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
      const titulo = (document.getElementById('titulo') || {}).value || '';
      const descripcion = (document.getElementById('descripcion') || {}).value || '';
      const fecha = (document.getElementById('fecha') || {}).value || '';
      const hora = (document.getElementById('hora') || {}).value || '';
      const maxPersonas = parseInt((document.getElementById('max-personas') || {}).value || '0');
      const ubicacion = (document.getElementById('ubicacion') || {}).value || '';
      
        // Verificar que el usuario esté logueado
        const userIdAuth = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
      
        if (!userIdAuth) {
          mostrarMensajeError('Debes iniciar sesión para crear un evento');
          // No redirigimos automáticamente para no interrumpir el flujo
          return;
        }

        const formData = new FormData(e.target);
        // Aceptar input de calendario (YYYY-MM-DD) y también DD/MM/AAAA
        let fechaEntrada = (formData.get('fecha') || '').toString().trim();
        let horaEntrada = (formData.get('hora') || '').toString().trim();
        const fechaEvento = normalizarFecha(fechaEntrada);
        const horaEvento = normalizarHora(horaEntrada);
        if (!fechaEvento || !horaEvento) {
          mostrarMensajeError('Fecha u hora inválida. Seleccioná desde el calendario o usá DD/MM/AAAA y HH:mm');
          return;
        }
      
        // Validar que la fecha no sea en el pasado (usar fecha local sin conversión UTC)
        const fechaHoraEvento = crearFechaLocal(fechaEvento, horaEvento);
        const ahora = new Date();
      
        if (!fechaHoraEvento || fechaHoraEvento <= ahora) {
          mostrarMensajeError('La fecha y hora del evento debe ser futura');
          return;
        }

        // Obtener datos del formulario
        const linkGrupo = formData.get('link-grupo')?.trim() || '';

        const evento = {
          titulo: formData.get('titulo'),
          descripcion: formData.get('descripcion'),
          fecha: fechaEvento,
          hora: horaEvento,
          ubicacion: formData.get('ubicacion'),
          linkGrupo: linkGrupo,
          maxPersonas: parseInt(formData.get('max-personas')),
          unidos: 1, // El organizador cuenta como unido
          organizadorId: userIdAuth, // Solo guardamos el ID, los datos se consultan dinámicamente
          createdAt: new Date().toISOString(),
          fechaHoraEvento: fechaHoraEvento.toISOString(),
          participantes: [userIdAuth], // El organizador es el primer participante
          activo: true
        };
      
        try {
          const eventoId = await saveToFirestore('eventos', evento);
        
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
            unidos: Array.isArray(evento.participantes) ? evento.participantes.length : Number(evento.unidos || 0),
            organizadorId: evento.organizadorId, // Solo el ID, no datos estáticos
            fechaCreacion: new Date().toISOString()
          };
        
          await saveToFirestore('historial', historialData, `${userIdAuth}_${eventoId}_creado`);
        
          mostrarMensajeExito('¡Evento creado exitosamente!');
          e.target.reset();
          // Nota: guardamos un flag para mostrar toast en inicio
          localStorage.setItem('eventoCreadoReciente', '1');
        
          // Redirigir a inicio después de 1.2s
          setTimeout(() => {
            window.location.href = 'inicio.html';
          }, 1200);
        
        } catch (error) {
          console.error('Error creando evento:', error);
          mostrarMensajeError('Error al crear el evento. Intenta nuevamente.');
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
        favoritosLista.innerHTML = "<p style='text-align:center;'>No tienes eventos favoritos aún.</p>";
      } else {
        // Funciones helper para formatear fecha y hora usando funciones centralizadas
        favoritosLista.innerHTML = '';
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

          // Datos del organizador
          let nombreOrganizador = 'Desconocido';
          let fotoOrganizador = 'img/PERFIL1.jpg';
          const perfilOrganizador = mapaPerfiles.get(evento.organizadorId);
          if (perfilOrganizador) {
            nombreOrganizador = (perfilOrganizador.nombre && perfilOrganizador.apellido)
              ? `${perfilOrganizador.nombre} ${perfilOrganizador.apellido}`
              : (perfilOrganizador.nombre || nombreOrganizador);
            fotoOrganizador = perfilOrganizador.foto || fotoOrganizador;
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
                <img src="${fotoOrganizador}" alt="Foto organizador" class="favoritos-organizador-foto" onerror="this.src='img/PERFIL1.jpg'" />
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
        
        // Mostrar mensaje si no hay eventos favoritos futuros
        if (favoritosLista.children.length === 0) {
          favoritosLista.innerHTML = "<p style='text-align:center;'>No tienes eventos favoritos próximos.</p>";
        } else {
          bindFavoritosButtons();
        }
      }
    };
    loadFavoritos();
    
    // Exponer loadFavoritos globalmente para recarga desde edición
    window.loadFavoritosRef = loadFavoritos;
  }
  
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
        alert("Por favor completa todos los campos.");
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
        alert("Credenciales incorrectas.");
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
    const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
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
      const userIdLocal = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
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
          // Obtener datos del organizador dinámicamente desde la BD
          let nombreOrganizador = 'Desconocido';
          let fotoOrganizador = 'img/PERFIL1.jpg';
          
          if (evento.organizadorId) {
            try {
              const perfilOrganizador = await getFromFirestore('perfiles', evento.organizadorId);
              if (perfilOrganizador) {
                nombreOrganizador = perfilOrganizador.nombre && perfilOrganizador.apellido 
                  ? `${perfilOrganizador.nombre} ${perfilOrganizador.apellido}`
                  : perfilOrganizador.nombre || nombreOrganizador;
                fotoOrganizador = perfilOrganizador.foto || fotoOrganizador;
              }
            } catch (e) {
              console.warn('No se pudo obtener perfil del organizador:', e);
            }
          }

          const unidosCalc = Array.isArray(evento.participantes) ? evento.participantes.length : (Array.isArray(evento.usuariosUnidos) ? evento.usuariosUnidos.length : Number(evento.unidos || 0));
          const disponibles = Math.max(0, Number(evento.maxPersonas || 0) - unidosCalc);
          const currentUserId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
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
                <img src="${fotoOrganizador}" alt="Foto organizador" class="inicio-organizador-foto" onerror="this.src='img/PERFIL1.jpg'" />
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
          modalConf.style.display = 'flex';
          document.body.classList.add('modal-open');

          const cerrarModal = () => {
            modalConf.dataset.eventoId = '';
            modalConf.style.display = 'none';
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
    const [todosEventos, todosPerfiles, todasValoraciones, misValoraciones] = await Promise.all([
      getFromFirestore('eventos'),
      getFromFirestore('perfiles'),
      getFromFirestore('valoraciones'),
      getFromFirestore('valoraciones')
    ]);
    
    // Crear mapas para acceso rápido
    const eventosMapActual = new Map();
    (todosEventos || []).forEach(ev => {
      if (ev.id) eventosMapActual.set(ev.id, ev);
    });

    const perfilesMap = new Map();
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
    
    // Obtener datos del organizador desde el mapa precargado
    let nombreOrganizador = item.organizador || 'Desconocido';
    let fotoOrganizador = item.fotoOrganizador || 'img/PERFIL1.jpg';
    
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
            <button class="btn-enviar-valoracion btn-base btn-primary" data-evento-id="${item.eventoId}" style="margin-top:8px;display:none;">Enviar valoración</button>
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
            <img src="${fotoOrganizador}" alt="Foto organizador" class="inicio-organizador-foto" onerror="this.src='img/PERFIL1.jpg'" />
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
        // Mostrar modal: quitar clase hidden y usar display:flex
        modalConf.classList.remove('hidden');
        modalConf.style.display = 'flex';
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
                const foto = perfil?.foto || 'img/PERFIL1.jpg';
                
                html += `
                  <div class="participante-card">
                    <div class="participante-avatar">
                      <img src="${foto}" alt="${nombre}" class="participante-foto" onerror="this.src='img/PERFIL1.jpg'">
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
        
        // Normalizar fecha (yyyy-mm-dd)
        const fechaISO = ev.fecha ? new Date(ev.fecha) : null;
        if (fechaISO && !isNaN(fechaISO)) {
          const y = fechaISO.getFullYear();
          const m = String(fechaISO.getMonth()+1).padStart(2,'0');
          const d = String(fechaISO.getDate()).padStart(2,'0');
          inputFecha.value = `${y}-${m}-${d}`;
        } else {
          inputFecha.value = (ev.fecha && /^\d{4}-\d{2}-\d{2}$/.test(ev.fecha)) ? ev.fecha : '';
        }

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
        modal.style.display = 'flex';
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
          modalConf.style.display = 'none';
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
        modal.style.display = 'none';
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
            const abiertos = document.querySelectorAll('.modal');
            abiertos.forEach(m => {
              if (m.style.display !== 'none') {
                m.classList.add('hidden');
                m.style.display = 'none';
                document.body.classList.remove('modal-open');
              }
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
          
          // Obtener referencias a los inputs
          const inputId = document.querySelector('#edit-evento-id');
          const inputTitulo = document.querySelector('#edit-titulo');
          const inputDesc = document.querySelector('#edit-descripcion');
          const inputFecha = document.querySelector('#edit-fecha');
          const inputHora = document.querySelector('#edit-hora');
          const inputUbicacion = document.querySelector('#edit-ubicacion');
          const inputMax = document.querySelector('#edit-maxPersonas');
          const editLinkGrupoInput = document.getElementById('edit-link-grupo');
          
          const id = inputId.value;
          if (!id) return;
          
          try {
            // Normalizar fecha/hora desde el editor (permite DD/MM/AAAA)
            const fechaEdit = normalizarFecha(inputFecha.value);
            const horaEdit = normalizarHora(inputHora.value);
            if (!fechaEdit || !horaEdit) {
              mostrarMensajeError('Fecha u hora inválida. Usa formato DD/MM/AAAA y HH:mm');
              return;
            }
            // Usar crearFechaLocal para evitar problemas de zona horaria
            const fh = crearFechaLocal(fechaEdit, horaEdit);
            if (!fh || isNaN(fh.getTime())) {
              mostrarMensajeError('Fecha/hora no válida');
              return;
            }
            const ahora2 = new Date();
            if (fh <= ahora2) {
              mostrarMensajeError('La fecha y hora deben ser futuras');
              return;
            }
            
            // Obtener evento actual y mantener campos que no se editan
            const eventoActual = await getFromFirestore('eventos', id);
            
            if (!eventoActual) {
              mostrarMensajeError('No se pudo encontrar el evento');
              return;
            }
            
            // Obtener datos del formulario
            const linkGrupo = editLinkGrupoInput?.value?.trim() || '';
            const nuevoMaxPersonas = parseInt(inputMax.value, 10) || 1;
            
            // Validar que maxPersonas no sea menor que los participantes actuales
            const participantesActuales = Array.isArray(eventoActual.participantes) ? eventoActual.participantes.length : 0;
            if (nuevoMaxPersonas < participantesActuales) {
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
              // Asegurar que estos campos se mantengan:
              activo: eventoActual.activo !== undefined ? eventoActual.activo : true,
              organizadorId: eventoActual.organizadorId,
              participantes: eventoActual.participantes || [],
              unidos: Array.isArray(eventoActual.participantes) ? eventoActual.participantes.length : Number(eventoActual.unidos || 0)
            };
            
            console.log('💾 Guardando evento actualizado:', id);
            console.log('📝 Datos a guardar:', {
              titulo: payload.titulo,
              descripcion: payload.descripcion?.substring(0, 50) + '...',
              fecha: payload.fecha,
              hora: payload.hora,
              ubicacion: payload.ubicacion,
              linkGrupo: payload.linkGrupo ? 'presente' : 'no',
              maxPersonas: payload.maxPersonas,
              unidos: payload.unidos,
              participantes: payload.participantes?.length || 0,
              activo: payload.activo
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
            
            // NOTIFICAR A PARTICIPANTES SOBRE LA EDICIÓN
            try {
              const fechaFormateada = formatearFechaArgentina(payload.fecha);
              const horaFormateada = formatearHoraArgentina(payload.hora);
              const mensajeEdicion = `✏️ El evento "${payload.titulo}" ha sido MODIFICADO\n\n` +
                `📅 Nueva fecha: ${fechaFormateada}\n` +
                `🕐 Nueva hora: ${horaFormateada}\n` +
                `📍 Lugar: ${payload.ubicacion}\n` +
                `📝 Descripción: ${payload.descripcion}\n\n` +
                `Por favor, verificá los cambios.`;
              
              await notificarParticipantes(
                id,
                TIPO_NOTIF.EVENTO_EDITADO,
                mensajeEdicion,
                { 
                  fecha: payload.fecha, 
                  hora: payload.hora, 
                  lugar: payload.ubicacion,
                  descripcion: payload.descripcion
                }
              );
              console.log('📧 Notificaciones de edición enviadas');
            } catch (notifError) {
              console.error('Error al enviar notificaciones de edición:', notifError);
              // Continuar aunque falle la notificación
            }
            
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

}); // Fin DOMContentLoaded
