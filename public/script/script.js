// Script unificado con Firebase Firestore v11 modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, deleteDoc, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Configuración EmailJS - COMPLETA CON TUS VALORES
const EMAILJS_CONFIG = {
  PUBLIC_KEY: "S5pjW2LUKXjEC3o64",
  SERVICE_ID: "service_g5avyrb",
  TEMPLATE_ID: "template_35wpfmm" // ← ID real proporcionado
};

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
    await setDoc(doc(db, col, id), { ...data, id });
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

const deleteFromFirestore = async (col, id) => {
  if (!db) throw new Error('Firestore no inicializado');
  await deleteDoc(doc(db, col, id));
};

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

    // Con sesión: mostrar contenido y boton de logout si existe
    const showBody = () => {
      try {
        document.body && document.body.removeAttribute('data-protected');
        const logout = document.getElementById('nav-cerrar-sesion');
        if (logout) logout.style.display = 'inline';
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

// Cargar EmailJS para envío de códigos por correo
const loadEmailJS = () => {
  return new Promise((resolve, reject) => {
    if (window.emailjs) {
      console.log("📚 EmailJS ya está cargado");
      resolve();
      return;
    }
    console.log("📥 Descargando librería EmailJS...");
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
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
    const params = { to_email: email, codigo };
    const result = await emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, params);
    return { success: true, result };
  } catch (error) {
    console.error('Error enviando email con EmailJS:', error);
    const msg = error?.message || error?.text || 'Error desconocido';
    return { success: false, error: msg };
  }
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

// Registrar en fase de captura y burbuja, y soportar dispositivos táctiles
document.addEventListener("DOMContentLoaded", () => {
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
  fondos.forEach(fondo => {
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
        const main = document.querySelector('.main-container');
        return (main && main.scrollHeight) || document.documentElement.scrollHeight || document.body.scrollHeight || window.innerHeight;
      }
    };
    
    const renderFondo = () => {
      if (isRendering) return; // Evitar renderizados concurrentes
      isRendering = true;
      
      const alto = getAlto();
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
      isRendering = false;
    };
    
    // Renderizado inicial
    renderFondo();
    
    // Re-renderizar después de un delay para asegurar que el main esté completamente cargado
  setTimeout(renderFondo, 1500);
  setTimeout(renderFondo, 3000);
  setTimeout(renderFondo, 4500); // refuerzo extra para cargas lentas
   
    // Resize con debounce
    let resizeTimeout;
    window.addEventListener('resize', () => { 
      clearTimeout(resizeTimeout); 
      resizeTimeout = setTimeout(renderFondo, 300); 
    });
    
    // Observer SOLO para eventos significativos en el main (evitar bucle infinito)
    if (!fondo.classList.contains('fondo-animado-header')) {
      const main = document.querySelector('.main-container');
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
    if (btnEditarPerfil && perfilForm) {
      btnEditarPerfil.addEventListener('click', (e) => {
        e.preventDefault();
        perfilForm.style.display = 'block';
        btnEditarPerfil.style.display = 'none';
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
          // Persistir datos útiles y caché para próximas visitas
          const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ').trim();
          if (nombreCompleto) localStorage.setItem('currentUserName', nombreCompleto);
          if (edad) localStorage.setItem('perfilEdad', String(edad));
          if (sexo) localStorage.setItem('perfilSexo', sexo);
          if (descripcion) localStorage.setItem('perfilDescripcion', descripcion);
          if (foto) localStorage.setItem('userPhoto', foto);
        mostrarMensajeExito("¡Perfil guardado exitosamente!");
        
        // Cerrar el formulario de edición y mostrar la vista normal
        perfilForm.style.display = 'none';
        if (btnEditarPerfil) btnEditarPerfil.style.display = 'inline-block';
        
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
      if (perfilDesc && cacheDesc) { perfilDesc.textContent = cacheDesc; perfilDesc.style.display = 'block'; }
      if (perfilFoto) {
        perfilFoto.src = cacheFoto || DEFAULT_AVATAR;
        perfilFoto.onerror = () => { perfilFoto.src = DEFAULT_AVATAR; };
      }
      if (perfilFotoFormEl) {
        perfilFotoFormEl.src = cacheFoto || DEFAULT_AVATAR;
      }

      // Traer datos en paralelo
      const [usuarioDataRaw, perfilDataRaw] = await Promise.all([
        getFromFirestore('usuarios', userId),
        getFromFirestore('perfiles', userId)
      ]);
      const usuarioData = usuarioDataRaw || {};
      const perfilData = perfilDataRaw || {};

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
        perfilDesc.textContent = descripcion ? descripcion : 'Descripción: --';
        perfilDesc.style.display = descripcion ? 'block' : 'none';
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
          if (fotoImgForm) fotoImgForm.src = src;
          if (perfilFoto) perfilFoto.src = src;
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
        if (fotoImgForm) fotoImgForm.src = DEFAULT_AVATAR;
        if (perfilFoto) perfilFoto.src = DEFAULT_AVATAR;
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
      
        // Validar que la fecha no sea en el pasado
        const fechaHoraEvento = new Date(`${fechaEvento}T${horaEvento}`);
        const ahora = new Date();
      
        if (fechaHoraEvento <= ahora) {
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
            unidos: evento.unidos,
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
        favoritosLista.innerHTML = "<p class='centrado'>Inicia sesión para ver tus favoritos.</p>";
        return;
      }
      
      // Traer favoritos del usuario
      const favoritos = await getFromFirestore('favoritos');
      const misFavoritos = (favoritos || []).filter(f => f.userId === userId);
      
      if (!misFavoritos.length) {
        favoritosLista.innerHTML = "<p class='centrado'>No tienes eventos favoritos aún.</p>";
      } else {
        // Funciones helper para formatear fecha y hora
        const formatearFecha = (fechaStr) => {
          const fecha = new Date(fechaStr);
          const opciones = { day: '2-digit', month: '2-digit', year: 'numeric' };
          return fecha.toLocaleDateString('es-ES', opciones);
        };
      
        const formatearHora = (horaStr) => {
          const [horas, minutos] = horaStr.split(':');
          return `${horas}:${minutos}`;
        };
        
        favoritosLista.innerHTML = '';
        const ahora = new Date();
        
        for (const fav of misFavoritos) {
          // Obtener el evento vigente para datos actualizados
          const evento = await getFromFirestore('eventos', fav.eventoId);
          if (!evento) continue;

          // Filtrar eventos que ya pasaron
          const fechaEvento = construirFechaHora(evento);
          if (!fechaEvento || ahora >= fechaEvento) continue;

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

          const unidos = Number(evento.unidos || 0);
          const max = Number(evento.maxPersonas || 0);
          const disponibles = Math.max(0, max - unidos);
          const isOrganizadorFav = userId && evento.organizadorId && evento.organizadorId === userId;
          const yaParticipa = Array.isArray(evento.participantes) && evento.participantes.includes(userId);

          // Formatear fecha y hora
          const pad2 = (n) => String(n).padStart(2, '0');
          const fechaFormateada = formatearFecha(evento.fecha || (construirFechaHora(evento) ? `${construirFechaHora(evento).getFullYear()}-${pad2(construirFechaHora(evento).getMonth()+1)}-${pad2(construirFechaHora(evento).getDate())}` : ''));
          const horaFormateada = formatearHora(evento.hora || '');

          const card = document.createElement('div');
          card.className = 'favoritos-card-evento';
          // Link de grupo solo visible para participantes
          const linkGrupoFavRow = (evento.linkGrupo && String(evento.linkGrupo).trim() && (yaParticipa || isOrganizadorFav))
            ? `<div class="favoritos-link-grupo-row">
                 <span class="texto-bold texto-verde texto-mediano texto-italic">Link de grupo:</span>
                 <a href="${evento.linkGrupo}" target="_blank" rel="noopener noreferrer" class="texto-violeta texto-mediano texto-italic">${evento.linkGrupo}</a>
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
                ${isOrganizadorFav ? '' : (yaParticipa ? `<button class=\"favoritos-btn-salir\" data-evento-id=\"${fav.eventoId}\">No participar</button>` : `<button class=\"favoritos-btn-unirse\" data-evento-id=\"${fav.eventoId}\">Unirse</button>`)}
              </div>
            </div>`;
          favoritosLista.appendChild(card);
        }
        
        // Mostrar mensaje si no hay eventos favoritos futuros
        if (favoritosLista.children.length === 0) {
          favoritosLista.innerHTML = "<p class='centrado'>No tienes eventos favoritos próximos.</p>";
        } else {
          bindFavoritosButtons();
        }
      }
    };
    loadFavoritos();
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
      <div class="sin-resultados-busqueda centrado">
        <h3 class="favoritos-titulo-grande">🔍 No se encontraron eventos</h3>
        <p class="favoritos-descripcion-verde">No hay eventos que coincidan con "<span id="termino-busqueda" class="texto-bold"></span>"</p>
        <a href="crear-evento.html" class="btn-crear-evento-vacio">¡Crea el primer evento!</a>
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
    // Priorizar ISO almacenado
    if (evento && evento.fechaHoraEvento) {
      const d = new Date(evento.fechaHoraEvento);
      if (!isNaN(d.getTime())) return d;
    }
    // Construir desde fecha/hora
    const f = normalizarFecha(evento?.fecha);
    const h = normalizarHora(evento?.hora);
    if (!f || !h) return null;
    const d = new Date(`${f}T${h}`);
    return isNaN(d.getTime()) ? null : d;
  };

  // Cargar eventos al inicio
  const eventosListaInicio = document.getElementById('eventos-lista');
  if (eventosListaInicio) {
    const loadEventosInicio = async () => {
      try {
        const eventosLoading = document.getElementById('eventos-loading');
        const eventosVacio = document.getElementById('eventos-vacio');
        
        // Mostrar loading
        if (eventosLoading) eventosLoading.style.display = 'block';
        if (eventosVacio) eventosVacio.style.display = 'none';
        
        const eventos = await getFromFirestore('eventos');
        const ahora = new Date();
        const eventosFuturos = eventos.filter(e => {
          const fechaEvento = construirFechaHora(e);
          return fechaEvento && ahora < fechaEvento;
        });
        
        // Ocultar loading
        if (eventosLoading) eventosLoading.style.display = 'none';
        
        if (!eventosFuturos.length) {
          if (eventosVacio) eventosVacio.style.display = 'block';
          return;
        }
        
        // Obtener favoritos del usuario para marcar las estrellas
        const userId = localStorage.getItem('currentUserId');
        let favoritosUsuario = [];
        if (userId) {
          try {
            const todosFavoritos = await getFromFirestore('favoritos');
            favoritosUsuario = (todosFavoritos || [])
              .filter(f => f.userId === userId)
              .map(f => f.eventoId);
          } catch (e) {
            console.warn('No se pudieron cargar favoritos:', e);
          }
        }
        
        // Renderizar eventos
        for (const evento of eventosFuturos) {
          const card = document.createElement('div');
          card.className = 'inicio-card-evento evento-card';
          
          // Obtener datos del organizador
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
          
          const userId = localStorage.getItem('currentUserId');
          const yaParticipa = Array.isArray(evento.participantes) && evento.participantes.includes(userId);
          const isOrganizador = userId && evento.organizadorId === userId;
          const esFavorito = favoritosUsuario.includes(evento.id);
          
          // Link de grupo solo visible para participantes
          const linkGrupoHTML = (evento.linkGrupo && (yaParticipa || isOrganizador))
            ? `<div class="inicio-link-grupo-row">
                 <span class="texto-bold texto-verde texto-mediano texto-italic">Link de grupo:</span>
                 <a href="${evento.linkGrupo}" target="_blank" rel="noopener noreferrer" class="texto-violeta texto-mediano texto-italic">${evento.linkGrupo}</a>
               </div>`
            : '';
          
          card.innerHTML = `
            <div class="evento-titulo-row">
              <h2 class="inicio-titulo-evento evento-titulo">${evento.titulo || ''}</h2>
              ${(yaParticipa || isOrganizador) ? '<span class="evento-participando-badge">Participando</span>' : ''}
            </div>
            <p class="inicio-descripcion-evento evento-descripcion">${evento.descripcion || ''}</p>
            ${linkGrupoHTML}
            <div class="inicio-detalles-evento evento-detalles">
              <span><img src="img/calendario.png" alt="Fecha" class="icono-evento"> ${evento.fecha || ''}</span>
              <span><img src="img/reloj-circular.png" alt="Hora" class="icono-evento"> ${evento.hora || ''}</span>
              <span><img src="img/ubicacion.png" alt="Ubicación" class="icono-evento"> ${evento.ubicacion || ''}</span>
            </div>
            <div class="evento-bottom-row">
              <div class="evento-organizador inicio-organizador">
                <img src="${fotoOrganizador}" alt="Foto organizador" class="evento-organizador-foto inicio-organizador-foto" onerror="this.src='img/PERFIL1.jpg'" />
                <span class="inicio-organizador-nombre">${organizadorLabel(nombreOrganizador)}</span>
              </div>
              <div class="evento-actions inicio-actions">
                <button class="inicio-btn-favorito-nuevo ${esFavorito ? 'active' : ''}" data-evento-id="${evento.id}" aria-pressed="${esFavorito}" aria-label="${esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                  <img src="img/logo-estrella.png" alt="Favorito" class="icono-evento" />
                </button>
                <button class="inicio-btn-compartir-nuevo" data-evento-id="${evento.id}">
                  <img src="img/logo-compartir.png" alt="Compartir" class="icono-evento" />
                </button>
                ${isOrganizador ? '' : (yaParticipa ? `<button class="inicio-btn-salir" data-evento-id="${evento.id}">No participar</button>` : `<button class="inicio-btn-unirse" data-evento-id="${evento.id}">Unirse</button>`)}
              </div>
            </div>
          `;
          
          eventosListaInicio.appendChild(card);
        }
        
        // Bind de eventos después de renderizar
        bindEventoButtons();
        
      } catch (error) {
        console.error('Error cargando eventos:', error);
        const eventosLoading = document.getElementById('eventos-loading');
        if (eventosLoading) {
          eventosLoading.innerHTML = '<p class="centrado">Error al cargar eventos. Por favor recarga la página.</p>';
        }
      }
    };
    
    loadEventosInicio();
  }

  // Bind de botones de eventos con TODA la funcionalidad
  const bindEventoButtons = () => {
    const userId = localStorage.getItem('currentUserId');
    
    // BOTONES DE FAVORITOS
    const btnsFavorito = document.querySelectorAll('.inicio-btn-favorito-nuevo');
    btnsFavorito.forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!userId) {
          mostrarMensajeError('Debes iniciar sesión para marcar favoritos');
          return;
        }
        
        const eventoId = this.dataset.eventoId;
        const isActive = this.classList.contains('active');
        
        try {
          if (isActive) {
            // Quitar de favoritos
            await deleteFromFirestore('favoritos', `${userId}_${eventoId}`);
            this.classList.remove('active');
            this.setAttribute('aria-pressed', 'false');
            this.setAttribute('aria-label', 'Agregar a favoritos');
            mostrarMensajeExito('Eliminado de favoritos');
          } else {
            // Agregar a favoritos
            const favData = {
              userId,
              eventoId,
              fechaAgregado: new Date().toISOString()
            };
            await saveToFirestore('favoritos', favData, `${userId}_${eventoId}`);
            this.classList.add('active');
            this.setAttribute('aria-pressed', 'true');
            this.setAttribute('aria-label', 'Quitar de favoritos');
            mostrarMensajeExito('Agregado a favoritos');
          }
        } catch (error) {
          console.error('Error toggling favorito:', error);
          mostrarMensajeError('Error al actualizar favoritos');
        }
      });
    });
    
    // BOTONES DE COMPARTIR
    const btnsCompartir = document.querySelectorAll('.inicio-btn-compartir-nuevo');
    btnsCompartir.forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const eventoId = this.dataset.eventoId;
        const url = `${window.location.origin}/inicio.html?evento=${eventoId}`;
        
        try {
          if (navigator.share) {
            await navigator.share({
              title: 'Evento en Activá',
              text: '¡Mirá este evento!',
              url: url
            });
          } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(url);
            mostrarMensajeExito('¡Link copiado al portapapeles!');
          } else {
            // Fallback para navegadores antiguos
            const input = document.createElement('input');
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            mostrarMensajeExito('¡Link copiado!');
          }
        } catch (error) {
          console.error('Error compartiendo:', error);
          mostrarMensajeError('No se pudo compartir');
        }
      });
    });
    
    // BOTONES DE UNIRSE
    const btnsUnirse = document.querySelectorAll('.inicio-btn-unirse, .favoritos-btn-unirse');
    btnsUnirse.forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!userId) {
          mostrarMensajeError('Debes iniciar sesión para unirte a eventos');
          return;
        }
        
        const eventoId = this.dataset.eventoId;
        
        try {
          const evento = await getFromFirestore('eventos', eventoId);
          if (!evento) {
            mostrarMensajeError('Evento no encontrado');
            return;
          }
          
          const participantes = Array.isArray(evento.participantes) ? evento.participantes : [];
          const unidos = Number(evento.unidos || 0);
          const max = Number(evento.maxPersonas || 0);
          
          if (unidos >= max) {
            mostrarMensajeError('El evento está completo');
            return;
          }
          
          if (participantes.includes(userId)) {
            mostrarMensajeError('Ya estás participando en este evento');
            return;
          }
          
          // Actualizar evento
          participantes.push(userId);
          const eventoActualizado = {
            ...evento,
            participantes,
            unidos: unidos + 1
          };
          await saveToFirestore('eventos', eventoActualizado, eventoId);
          
          // Agregar al historial
          const historialData = {
            eventoId,
            tipo: 'unido',
            titulo: evento.titulo,
            descripcion: evento.descripcion,
            fecha: evento.fecha,
            hora: evento.hora,
            ubicacion: evento.ubicacion,
            linkGrupo: evento.linkGrupo,
            maxPersonas: evento.maxPersonas,
            unidos: evento.unidos,
            organizadorId: evento.organizadorId,
            fechaUnion: new Date().toISOString()
          };
          await saveToFirestore('historial', historialData, `${userId}_${eventoId}_unido`);
          
          mostrarMensajeExito('¡Te uniste al evento!');
          
          // Recargar la página para actualizar la UI
          setTimeout(() => location.reload(), 1000);
          
        } catch (error) {
          console.error('Error uniéndose al evento:', error);
          mostrarMensajeError('Error al unirse al evento');
        }
      });
    });
    
    // BOTONES DE NO PARTICIPAR (SALIR)
    const btnsSalir = document.querySelectorAll('.inicio-btn-salir, .favoritos-btn-salir, .perfil-btn-salir');
    btnsSalir.forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!userId) return;
        
        const eventoId = this.dataset.eventoId;
        
        try {
          const evento = await getFromFirestore('eventos', eventoId);
          if (!evento) {
            mostrarMensajeError('Evento no encontrado');
            return;
          }
          
          const participantes = Array.isArray(evento.participantes) ? evento.participantes : [];
          const unidos = Number(evento.unidos || 0);
          
          if (!participantes.includes(userId)) {
            mostrarMensajeError('No estás participando en este evento');
            return;
          }
          
          // Actualizar evento
          const nuevosParticipantes = participantes.filter(p => p !== userId);
          const eventoActualizado = {
            ...evento,
            participantes: nuevosParticipantes,
            unidos: Math.max(0, unidos - 1)
          };
          await saveToFirestore('eventos', eventoActualizado, eventoId);
          
          // Eliminar del historial
          try {
            await deleteFromFirestore('historial', `${userId}_${eventoId}_unido`);
          } catch (e) {
            console.warn('No se pudo eliminar del historial:', e);
          }
          
          mostrarMensajeExito('Has dejado el evento');
          
          // Recargar la página
          setTimeout(() => location.reload(), 1000);
          
        } catch (error) {
          console.error('Error saliendo del evento:', error);
          mostrarMensajeError('Error al salir del evento');
        }
      });
    });
  };

  const bindFavoritosButtons = () => {
    bindEventoButtons(); // Reutilizar la misma lógica
  };

  // Cerrar sesión global (fuera del DOMContentLoaded para que esté disponible siempre)
  const cerrarSesionHandler = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('userId');
    localStorage.removeItem('currentUserName');
    localStorage.removeItem('userPhoto');
    localStorage.removeItem('perfilEdad');
    localStorage.removeItem('perfilSexo');
    localStorage.removeItem('perfilDescripcion');
    mostrarMensajeExito('Sesión cerrada exitosamente');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 800);
  };

  // Vincular botones de cerrar sesión
  const btnsCerrarSesion = document.querySelectorAll('#nav-cerrar-sesion, .nav-logout-btn, .btn-cerrar-sesion-simple');
  btnsCerrarSesion.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', cerrarSesionHandler);
    }
  });

  // HISTORIAL DE EVENTOS EN PERFIL
  const historialContent = document.getElementById('historial-content');
  const historialTabs = document.querySelectorAll('.historial-tab');
  
  if (historialContent && historialTabs.length > 0) {
    let filtroActual = 'todos';
    
    const cargarHistorial = async (filtro = 'todos') => {
      // Mostrar estado de carga
      if (historialContent) {
        historialContent.innerHTML = '<p class="historial-cargando">Cargando historial...</p>';
      }
      try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
        if (!userId) {
          historialContent.innerHTML = '<p class="centrado">Iniciá sesión para ver tu historial.</p>';
          return;
        }
        
        const todosHistorial = await getFromFirestore('historial');
        
        const miHistorial = (todosHistorial || []).filter(h => {
          const idCompleto = String(h.id);
          return idCompleto.startsWith(userId + '_');
        });
        
        await renderHistorial(miHistorial, filtro);
        
      } catch (error) {
        console.error('Error cargando historial:', error);
        historialContent.innerHTML = '<p class="centrado">Error al cargar el historial.</p>';
      }
    };
    
    const renderHistorial = async (items, tipoFiltro = 'todos') => {
      // Filtrar por tipo
      let filtrados = items;
      
      if (tipoFiltro === 'creado') {
        filtrados = items.filter(item => item.tipo === 'creado');
      } else if (tipoFiltro === 'unido') {
        filtrados = items.filter(item => item.tipo === 'unido');
      } else if (tipoFiltro === 'finalizado') {
        filtrados = items.filter(item => {
          const fechaEvento = construirFechaHora(item);
          return fechaEvento && new Date() >= fechaEvento;
        });
      }
      
      // Separar en activos y pasados
      const activos = [];
      const pasados = [];
      
      for (const item of filtrados) {
        const fechaEvento = construirFechaHora(item);
        if (fechaEvento && new Date() >= fechaEvento) {
          pasados.push(item);
        } else {
          activos.push(item);
        }
      }
      
      if (filtrados.length === 0) {
        historialContent.innerHTML = '<p class="centrado">No hay eventos en esta categoría.</p>';
        return;
      }
      
      // Renderizar cada item
      const htmlPartsActivos = await Promise.all(activos.map(item => renderHistorialItem(item, false)));
      const htmlPartsPasados = await Promise.all(pasados.map(item => renderHistorialItem(item, true)));
      
      let html = '';
      if (htmlPartsActivos.length > 0) {
        html += htmlPartsActivos.join('');
      }
      if (htmlPartsPasados.length > 0) {
        html += htmlPartsPasados.join('');
      }
      
      historialContent.innerHTML = html;
      bindHistorialButtons();
    };
    
    async function renderHistorialItem(item, esPasado) {
      const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
      const esCreado = item.tipo === 'creado';
      const esUnido = item.tipo === 'unido';
      const esFinalizado = item.tipo === 'finalizado';
      const fechaEvento = construirFechaHora(item);
      const esFuturo = fechaEvento && fechaEvento > new Date();
      // Cargar datos del evento para mostrar promedio de valoraciones
      let eventoDoc = null;
      try {
        if (item.eventoId) {
          eventoDoc = await getFromFirestore('eventos', item.eventoId);
        }
      } catch (e) {
        // ignorar
      }
      
      let fechaMostrar = item.fecha || '';
      let horaMostrar = item.hora || '';
      
      // Determinar acciones según estado y rol
      let botonesAccion = '';
      
      if (!esPasado && esFuturo) {
        // Evento futuro: organizador puede editar/borrar, participante puede salir
        if (esCreado) {
          botonesAccion = `
            <div class="historial-actions">
              <button class="btn-editar-evento btn-base btn-secondary" data-id="${item.eventoId}" title="Editar evento">Editar</button>
              <button class="btn-borrar-evento btn-base btn-danger" data-id="${item.eventoId}" title="Borrar evento">Borrar</button>
            </div>
          `;
        } else if (esUnido) {
          botonesAccion = `
            <div class="historial-actions">
              <button class="btn-no-participar btn-base btn-danger" data-id="${item.eventoId}" title="No participar">No participar</button>
            </div>
          `;
        }
      } else if (esPasado && !esCreado) {
        // Evento pasado: solo participantes (no organizadores) pueden valorar
        // Verificar si ya valoró este evento
        const valoracionId = `${userId}_${item.eventoId}`;
        let valoracionExistente = null;
        try {
          valoracionExistente = await getFromFirestore('valoraciones', valoracionId);
        } catch (e) {
          // No existe valoración
        }
  
        if (valoracionExistente && valoracionExistente.estrellas) {
          // Ya valoró: mostrar valoración existente
          const estrellas = valoracionExistente.estrellas;
          botonesAccion = `
            <div class="historial-valoracion">
              <p style="margin:8px 0 4px;font-size:0.9em;color:#4CAF50;">✔ Tu valoración: ${'★'.repeat(estrellas)}${'☆'.repeat(5-estrellas)}</p>
            </div>
          `;
        } else {
          // Aún no valoró: mostrar sistema de estrellas
          botonesAccion = `
            <div class="historial-valoracion">
              <p style="margin:8px 0 4px;font-size:0.9em;color:#666;">¿Cómo fue tu experiencia?</p>
              <div class="estrellas-container" data-evento-id="${item.eventoId}">
                ${[1,2,3,4,5].map(i => `<span class="estrella" data-valor="${i}">★</span>`).join('')}
              </div>
              <button class="btn-enviar-valoracion btn-base btn-primary" data-evento-id="${item.eventoId}" style="margin-top:8px;display:none;">Enviar valoración</button>
            </div>
          `;
        }
      }
  
      // Calcular bloque de promedio de valoraciones
      let bloquePromedio = '';
      const cantVal = Number(eventoDoc?.cantidadValoraciones || 0);
      const prom = Number(eventoDoc?.valoracionPromedio || 0);
      if (cantVal > 0 && (esCreado || (esPasado && !esCreado))) {
        const estrellasLlenas = Math.round(prom);
        bloquePromedio = `
          <div class="historial-valoracion">
            <p style="margin:8px 0 0;color:#444;font-size:0.95em;">
              Promedio: ${'★'.repeat(estrellasLlenas)}${'☆'.repeat(5 - estrellasLlenas)}
              <span style="color:#777;">(${prom.toFixed(1)} de ${cantVal})</span>
            </p>
          </div>`;
      }

      return `
        <div class="historial-item${esPasado ? ' historial-pasado' : ''}" style="${esPasado ? 'opacity:0.6;filter:grayscale(0.3);' : ''}">
          <div class="historial-header">
            <h4>${item.titulo || 'Sin título'}</h4>
            ${botonesAccion}
          </div>
          <div class="historial-detalles">
            ${item.descripcion ? `<p>${item.descripcion}</p>` : ''}
            <div class="historial-info">
              ${fechaMostrar ? `<span><img src="img/calendario.png" alt="Fecha" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;">${fechaMostrar}</span>` : ''}
              ${horaMostrar ? `<span><img src="img/reloj-circular.png" alt="Hora" style="width:16px;height:16px;vertical-align:middle;margin:0 6px 0 10px;">${horaMostrar}</span>` : ''}
              ${item.ubicacion ? `<span><img src="img/ubicacion.png" alt="Ubicación" style="width:16px;height:16px;vertical-align:middle;margin:0 6px 0 10px;">${item.ubicacion}</span>` : ''}
            </div>
            ${item.organizador && !esCreado ? `<p class="historial-organizador">Organizado por: ${item.organizador}</p>` : ''}
            ${item.participantes ? `<p class="historial-participantes">Participantes: ${item.participantes}</p>` : ''}
            ${bloquePromedio}
          </div>
          ${esCreado && !esPasado ? `
            <div class="participantes-section" data-evento-id="${item.eventoId}">
              <button class="participantes-toggle btn-base btn-secondary">Ver participantes</button>
              <div class="participantes-lista" style="display:none;"></div>
            </div>
          ` : ''}
        </div>
      `;
    }
  
    const bindHistorialButtons = () => {
      // Botón borrar evento
      historialContent.querySelectorAll('.btn-borrar-evento').forEach(btn => {
        btn.addEventListener('click', () => {
          const eventoId = btn.getAttribute('data-id');
          if (!eventoId) return;
          const modalConf = document.querySelector('#modal-confirmar-borrado');
          if (!modalConf) return;
          modalConf.dataset.eventoId = eventoId;
          modalConf.style.display = 'flex';
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
            const nuevosUnidos = Math.max(0, (evento.unidos || 0) - 1);
            
            await saveToFirestore('eventos', { 
              ...evento, 
              participantes: nuevosParticipantes,
              unidos: nuevosUnidos
            }, eventoId);
            
            const historialId = `${userId}_${eventoId}_unido`;
            await deleteFromFirestore('historial', historialId);
            
            mostrarMensajeExito('Has dejado de participar en el evento');
            
            const activeTab = document.querySelector('.historial-tab.active');
            const tipo = activeTab ? activeTab.getAttribute('data-tipo') : 'todos';
            await cargarHistorial(tipo);
          } catch (err) {
            console.error(err);
            mostrarMensajeError('No se pudo dejar de participar');
          }
        });
      });
  
      // Sistema de valoración con estrellas
      historialContent.querySelectorAll('.estrellas-container').forEach(container => {
        const estrellas = container.querySelectorAll('.estrella');
        const eventoId = container.getAttribute('data-evento-id');
        const btnEnviar = historialContent.querySelector(`.btn-enviar-valoracion[data-evento-id="${eventoId}"]`);
        let valorSeleccionado = 0;
  
        estrellas.forEach(estrella => {
          // Hover effect
          estrella.addEventListener('mouseenter', function() {
            const valor = parseInt(this.getAttribute('data-valor'));
            estrellas.forEach((e, i) => {
              e.classList.toggle('seleccionada', i < valor);
            });
          });
  
          // Click para seleccionar
          estrella.addEventListener('click', function() {
            valorSeleccionado = parseInt(this.getAttribute('data-valor'));
            estrellas.forEach((e, i) => {
              e.classList.toggle('seleccionada', i < valorSeleccionado);
            });
            if (btnEnviar) {
              btnEnviar.style.display = 'inline-block';
            }
          });
        });
  
        // Reset on mouse leave
        container.addEventListener('mouseleave', function() {
          estrellas.forEach((e, i) => {
            e.classList.toggle('seleccionada', i < valorSeleccionado);
          });
        });
  
        // Enviar valoración
        if (btnEnviar) {
          btnEnviar.addEventListener('click', async function() {
            if (valorSeleccionado === 0) {
              mostrarMensajeError('Por favor selecciona al menos una estrella');
              return;
            }
  
            const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
            if (!userId) return;
  
            try {
              const valoracionId = `${userId}_${eventoId}`;
              const valoracion = {
                userId,
                eventoId,
                estrellas: valorSeleccionado,
                fecha: new Date().toISOString()
              };
  
              await saveToFirestore('valoraciones', valoracion, valoracionId);
  
              // Actualizar promedio del evento
              const todasValoraciones = await getFromFirestore('valoraciones');
              const valoracionesEvento = (todasValoraciones || []).filter(v => v.eventoId === eventoId);
              const promedio = valoracionesEvento.reduce((sum, v) => sum + v.estrellas, 0) / valoracionesEvento.length;
  
              const evento = await getFromFirestore('eventos', eventoId);
              if (evento) {
                await saveToFirestore('eventos', {
                  ...evento,
                  valoracionPromedio: promedio,
                  cantidadValoraciones: valoracionesEvento.length
                }, eventoId);
              }
  
              mostrarMensajeExito('¡Gracias por tu valoración!');
  
              // Recargar historial
              const activeTab = document.querySelector('.historial-tab.active');
              const tipo = activeTab ? activeTab.getAttribute('data-tipo') : 'todos';
              await cargarHistorial(tipo);
            } catch (error) {
              console.error('Error guardando valoración:', error);
              mostrarMensajeError('Error al guardar la valoración');
            }
          });
        }
      });
  
      // Toggle ver participantes para eventos creados (activos)
      historialContent.querySelectorAll('.participantes-toggle').forEach(btn => {
        btn.addEventListener('click', async function() {
          const section = this.closest('.participantes-section');
          if (!section) return;
          const lista = section.querySelector('.participantes-lista');
          const eventoId = section.getAttribute('data-evento-id');
          if (!lista || !eventoId) return;

          const isHidden = !lista.style.display || lista.style.display === 'none';
          if (isHidden) {
            this.textContent = 'Ocultar participantes';
            lista.style.display = 'block';
            if (!lista.dataset.loaded) {
              // Cargar participantes
              lista.innerHTML = '<p style="color:#777;font-size:0.9em;">Cargando participantes...</p>';
              try {
                const evento = await getFromFirestore('eventos', eventoId);
                const participantes = Array.isArray(evento?.participantes) ? evento.participantes : [];
                if (participantes.length === 0) {
                  lista.innerHTML = '<p style="color:#777;font-size:0.9em;">Todavía no hay participantes.</p>';
                } else {
                  const items = await Promise.all(participantes.map(async pid => {
                    try {
                      const [usuario, perfil] = await Promise.all([
                        getFromFirestore('usuarios', pid),
                        getFromFirestore('perfiles', pid)
                      ]);
                      const nombre = (perfil?.nombre || usuario?.nombre || 'Usuario').toString();
                      const apellido = (perfil?.apellido || usuario?.apellido || '').toString();
                      const edad = perfil?.edad ? `${perfil.edad}` : '';
                      const sexo = perfil?.sexo || '';
                      const extra = [edad && `${edad} años`, sexo].filter(Boolean).join(' • ');
                      const foto = (perfil?.fotoUrl || '').replace(/"/g, '&quot;') || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23e6e6e6"/><circle cx="50" cy="38" r="18" fill="%23bdbdbd"/><path d="M20 80c6-14 24-18 30-18s24 4 30 18" fill="%23bdbdbd"/></svg>';
                      const altTxt = `${nombre} ${apellido}`.replace(/"/g, '&quot;');
                      return `
                        <div class='participante-item'>
                          <img class='participante-foto' src='${foto}' alt='${altTxt}'>
                          <div class="participante-info">
                            <div class='participante-nombre'>${nombre} ${apellido}</div>
                            ${extra ? `<div class='participante-extra'>${extra}</div>` : ''}
                          </div>
                        </div>
                      `;
                    } catch {
                      return '';
                    }
                  }));
                  lista.innerHTML = items.filter(Boolean).join('');
                }
                lista.dataset.loaded = '1';
              } catch (e) {
                lista.innerHTML = '<p style="color:#b00;font-size:0.9em;">No se pudieron cargar los participantes.</p>';
              }
            }
          } else {
            this.textContent = 'Ver participantes';
            lista.style.display = 'none';
          }
        });
      });

      // Botón editar evento
      historialContent.querySelectorAll('.btn-editar-evento').forEach(btn => {
        btn.addEventListener('click', async function(e) {
          e.preventDefault();
          const eventoId = this.getAttribute('data-id');
          
          try {
            const evento = await getFromFirestore('eventos', eventoId);
            if (!evento) {
              mostrarMensajeError('Evento no encontrado');
              return;
            }
            
            // Llenar modal de edición
            document.getElementById('edit-evento-id').value = eventoId;
            document.getElementById('edit-titulo').value = evento.titulo || '';
            document.getElementById('edit-descripcion').value = evento.descripcion || '';
            document.getElementById('edit-fecha').value = evento.fecha || '';
            document.getElementById('edit-hora').value = evento.hora || '';
            document.getElementById('edit-ubicacion').value = evento.ubicacion || '';
            document.getElementById('edit-link-grupo').value = evento.linkGrupo || '';
            document.getElementById('edit-maxPersonas').value = evento.maxPersonas || '';
            
            // Mostrar modal
            const modal = document.getElementById('modal-editar-evento');
            if (modal) {
              modal.style.display = 'flex';
              document.body.classList.add('modal-open');
            }
          } catch (error) {
            console.error('Error cargando evento:', error);
            mostrarMensajeError('Error al cargar el evento');
          }
        });
      });
    };

    // Vincular tabs del historial
    if (historialTabs && historialTabs.length) {
      historialTabs.forEach(tab => {
        tab.addEventListener('click', function() {
          historialTabs.forEach(t => t.classList.remove('active'));
          this.classList.add('active');
          filtroActual = this.getAttribute('data-tipo') || 'todos';
          cargarHistorial(filtroActual);
        });
      });
    }

    // Carga inicial del historial
    cargarHistorial('todos');
    
    // Bind form de edición
    const formEditar = document.getElementById('form-editar-evento');
    const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
    
    if (formEditar && btnCancelarEdicion) {
      formEditar.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const eventoId = document.getElementById('edit-evento-id').value;
        const titulo = document.getElementById('edit-titulo').value.trim();
        const descripcion = document.getElementById('edit-descripcion').value.trim();
        const fecha = document.getElementById('edit-fecha').value;
        const hora = document.getElementById('edit-hora').value;
        const ubicacion = document.getElementById('edit-ubicacion').value.trim();
        const linkGrupo = document.getElementById('edit-link-grupo').value.trim();
        const maxPersonas = parseInt(document.getElementById('edit-maxPersonas').value);
        
        try {
          const evento = await getFromFirestore('eventos', eventoId);
          if (!evento) {
            mostrarMensajeError('Evento no encontrado');
            return;
          }
          
          const eventoActualizado = {
            ...evento,
            titulo,
            descripcion,
            fecha,
            hora,
            ubicacion,
            linkGrupo,
            maxPersonas,
            fechaHoraEvento: new Date(`${fecha}T${hora}`).toISOString()
          };
          
          await saveToFirestore('eventos', eventoActualizado, eventoId);
          
          mostrarMensajeExito('Evento actualizado exitosamente');
          
          // Cerrar modal
          const modal = document.getElementById('modal-editar-evento');
          if (modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
          }
          
          // Recargar historial
          setTimeout(() => cargarHistorial(filtroActual), 500);
          
        } catch (error) {
          console.error('Error actualizando evento:', error);
          mostrarMensajeError('Error al actualizar el evento');
        }
      });
      
      btnCancelarEdicion.addEventListener('click', function() {
        const modal = document.getElementById('modal-editar-evento');
        if (modal) {
          modal.style.display = 'none';
          document.body.classList.remove('modal-open');
        }
      });
    }
    
    // Bind confirmación de borrado
    const btnConfirmarBorrado = document.getElementById('btn-confirmar-borrado');
    const btnCancelarBorrado = document.getElementById('btn-cancelar-borrado');
    const modalConfirmar = document.getElementById('modal-confirmar-borrado');
    
    if (btnConfirmarBorrado && btnCancelarBorrado && modalConfirmar) {
      btnConfirmarBorrado.addEventListener('click', async function() {
        const eventoId = modalConfirmar.dataset.eventoId;
        
        try {
          await deleteFromFirestore('eventos', eventoId);
          
          // Eliminar del historial de todos los usuarios
          const historial = await getFromFirestore('historial');
          const eliminaciones = historial
            .filter(h => h.eventoId === eventoId)
            .map(h => deleteFromFirestore('historial', h.id));
          
          await Promise.all(eliminaciones);
          
          mostrarMensajeExito('Evento eliminado exitosamente');
          
          // Cerrar modal
          modalConfirmar.style.display = 'none';
          document.body.classList.remove('modal-open');
          
          // Recargar historial
          setTimeout(() => cargarHistorial(filtroActual), 500);
          
        } catch (error) {
          console.error('Error eliminando evento:', error);
          mostrarMensajeError('Error al eliminar el evento');
        }
      });
      
      btnCancelarBorrado.addEventListener('click', function() {
        modalConfirmar.style.display = 'none';
        document.body.classList.remove('modal-open');
      });
    }
  }

}); // Fin DOMContentLoaded