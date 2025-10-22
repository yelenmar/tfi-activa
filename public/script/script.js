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
          // Persistir datos útiles para otras pantallas
          const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ').trim();
          if (nombreCompleto) localStorage.setItem('currentUserName', nombreCompleto);
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
      
      // Buscar datos de usuario y perfil
      const usuarioData = await getFromFirestore("usuarios", userId) || {};
      const perfilData = await getFromFirestore("perfiles", userId) || {};
      const perfilNombre = $("#perfil-nombre");
      const perfilEdad = $("#perfil-edad");
      const perfilSexo = $("#perfil-sexo");
      const perfilDesc = $("#perfil-descripcion");
      const perfilFoto = $("#perfil-foto");

      // Datos actuales (perfil editado tiene prioridad)
      const nombre = perfilData.nombre || usuarioData.nombre || "";
      const apellido = perfilData.apellido || usuarioData.apellido || "";
      const edad = perfilData.edad || usuarioData.edad || "";
      const sexo = perfilData.sexo || usuarioData.sexo || "";
      const descripcion = perfilData.descripcion || "";
      const foto = perfilData.foto || "img/perfil-default.png";

      // Mostrar datos en la vista
      if (perfilNombre) perfilNombre.textContent = (nombre && apellido) ? `${nombre} ${apellido}` : (nombre || "Nombre Apellido");
      if (perfilEdad) perfilEdad.textContent = edad ? `Edad: ${edad}` : "Edad: --";
      if (perfilSexo) perfilSexo.textContent = sexo ? `Sexo: ${sexo}` : (perfilSexo.textContent || "Sexo: --");
      if (perfilDesc) {
        perfilDesc.textContent = descripcion ? descripcion : "Descripción: --";
        perfilDesc.style.display = descripcion ? "block" : "none";
      }
      if (perfilFoto) perfilFoto.src = foto;

  // También sincronizar en localStorage para reutilizar en crear evento
  const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ').trim();
  if (nombreCompleto) localStorage.setItem('currentUserName', nombreCompleto);
  if (foto) localStorage.setItem('userPhoto', foto);

      // Inicializar formulario de edición con los datos actuales, solo si existe el form de perfil
  const perfilFormEl = document.getElementById('perfil-form');
  if (perfilFormEl) {
    const formNombre = perfilFormEl.querySelector('#nombre');
    const formApellido = perfilFormEl.querySelector('#apellido');
    const formEdad = perfilFormEl.querySelector('#edad');
    const formSexo = perfilFormEl.querySelector('#sexo');
  const formDesc = perfilFormEl.querySelector('#perfil-descripcion-input');
    const formFoto = document.getElementById('perfil-foto-form');
    if (formNombre) formNombre.value = nombre;
    if (formApellido) formApellido.value = apellido;
    if (formEdad) formEdad.value = edad;
    if (formSexo) formSexo.value = sexo;
    if (formDesc) formDesc.value = descripcion;
    if (formFoto && foto) formFoto.src = foto;
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
    const fotoInput = $("#foto-perfil");
    const fotoImgForm = $("#perfil-foto-form");
    const btnEditarDesc = $("#btn-editar-desc");
    const btnGuardar = $("#btn-guardar");

    const bindFotoChange = () => {
      if (!fotoInput) return;
      fotoInput.addEventListener('change', () => {
        const file = fotoInput.files && fotoInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          if (fotoImgForm) fotoImgForm.src = e.target.result;
          if (perfilFoto) perfilFoto.src = e.target.result;
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

        // Obtener nombre y foto desde perfil si están disponibles
        let organizerName = localStorage.getItem('currentUserName') 
          || localStorage.getItem('nombreCompleto') 
          || localStorage.getItem('usuarioNombre') 
          || '';
        let organizerPhoto = localStorage.getItem('userPhoto') || '';

        try {
          if (!organizerName || !organizerPhoto) {
            const perfil = await getFromFirestore('perfiles', userIdAuth);
            if (perfil) {
              const nombreCompuesto = [perfil.nombre, perfil.apellido].filter(Boolean).join(' ').trim();
              if (!organizerName && nombreCompuesto) organizerName = nombreCompuesto;
              if (!organizerPhoto && perfil.foto) organizerPhoto = perfil.foto;
            }
          }
        } catch (e1) {
          console.warn('No se pudo recuperar perfil para completar nombre/foto del organizador', e1);
        }

        if (!organizerName) organizerName = userIdAuth;
        if (!organizerPhoto) organizerPhoto = 'img/perfil-default.png';

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
          organizador: organizerName,
          organizadorId: userIdAuth,
          createdAt: new Date().toISOString(),
          fechaHoraEvento: fechaHoraEvento.toISOString(),
          participantes: [userIdAuth], // El organizador es el primer participante
          activo: true,
          fotoOrganizador: organizerPhoto
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
      
      // Traer favoritos del usuario
      const favoritos = await getFromFirestore('favoritos');
      const misFavoritos = (favoritos || []).filter(f => f.userId === userId);
      
      if (!misFavoritos.length) {
        favoritosLista.innerHTML = "<p style='text-align:center;'>No tienes eventos favoritos aún.</p>";
      } else {
        favoritosLista.innerHTML = '';
        for (const fav of misFavoritos) {
          // Obtener el evento vigente para datos actualizados
          const evento = await getFromFirestore('eventos', fav.eventoId);
          if (!evento) continue;

          const unidos = Number(evento.unidos || 0);
          const max = Number(evento.maxPersonas || 0);
          const disponibles = Math.max(0, max - unidos);
          const isOrganizadorFav = userId && evento.organizadorId && evento.organizadorId === userId;
          const yaParticipa = Array.isArray(evento.participantes) && evento.participantes.includes(userId);

          const card = document.createElement('div');
          card.className = 'favoritos-card-evento';
          const linkGrupoFavRow = (evento.linkGrupo && String(evento.linkGrupo).trim())
            ? `<div class="favoritos-link-grupo-row" style="margin:6px 0 2px 0; display:block;">
                 <span style="font-weight:600; color: var(--green-dark); margin-right:6px; font-size: 1.08em; font-style: italic;">Link de grupo:</span>
                 <a href="${evento.linkGrupo}" target="_blank" rel="noopener noreferrer" style="color: var(--violet); font-size: 1.08em; font-style: italic; word-break: break-all; text-decoration: none;">${evento.linkGrupo}</a>
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
              <span><img src="img/calendario.png" alt="Fecha" class="icono-evento"> ${evento.fecha || ''}</span>
              <span><img src="img/reloj-circular.png" alt="Hora" class="icono-evento"> ${evento.hora || ''}</span>
              <span><img src="img/ubicacion.png" alt="Ubicación" class="icono-evento"> ${evento.ubicacion || ''}</span>
              <span><img src="img/personas.png" alt="Participantes" class="icono-evento"> ${unidos}/${max} unidos <span class="evento-disponibles-texto">(${disponibles} lugares disponibles)</span></span>
            </div>
            <div class="favoritos-bottom-row">
              <div class="favoritos-organizador">
                ${evento.fotoOrganizador ? `<img src="${evento.fotoOrganizador}" alt="Foto" class="favoritos-organizador-foto">` : '<img src="img/PERFIL1.jpg" alt="Perfil" class="favoritos-organizador-foto">'}
                <span class="favoritos-organizador-nombre">${organizadorLabel(evento.organizador)}</span>
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
        bindFavoritosButtons();
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
    const f = normalizarFecha(evento?.fecha);
    const h = normalizarHora(evento?.hora);
    if (!f || !h) return null;
    const d = new Date(`${f}T${h}`);
    return isNaN(d.getTime()) ? null : d;
  };

  // ✅ OPTIMIZACIÓN: Solo normalizar eventos con fechas inválidas (Prioridad MEDIA)
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

      // ✅ OPTIMIZACIÓN: Solo guardar si hay cambios reales
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
  const marcarFavoritosUsuario = async () => {
    const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
    if (!userId) return;
    try {
      const favs = await getFromFirestore('favoritos');
      const setFav = new Set((favs || []).filter(f => f.userId === userId).map(f => f.eventoId));
      document.querySelectorAll('.inicio-btn-favorito-nuevo').forEach((btn) => {
        const id = btn.getAttribute('data-evento-id');
        const active = setFav.has(id);
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    } catch (e) {
      console.warn('⚠️ No se pudieron sincronizar favoritos UI:', e);
    }
  };
  
  // ✅ PAGINACIÓN DE EVENTOS (Prioridad BAJA)
  let paginaActualInicio = 1;
  const EVENTOS_POR_PAGINA = 10;
  let eventosTotalesInicio = [];
  
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

        // ✅ PAGINACIÓN: Guardar total y calcular slice
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
        eventosPagina.forEach(evento => {
          const disponibles = evento.maxPersonas - evento.unidos;
          const currentUserId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
          const isOrganizador = currentUserId && evento.organizadorId && evento.organizadorId === currentUserId;
          const yaParticipa = currentUserId && Array.isArray(evento.participantes) && evento.participantes.includes(currentUserId);

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
          const fechaFormateada = formatearFecha(evento.fecha || (construirFechaHora(evento) ? `${construirFechaHora(evento).getFullYear()}-${pad2(construirFechaHora(evento).getMonth()+1)}-${pad2(construirFechaHora(evento).getDate())}` : ''));
          const dEvt = construirFechaHora(evento);
          const horaFormateada = formatearHora(evento.hora || (dEvt ? `${pad2(dEvt.getHours())}:${pad2(dEvt.getMinutes())}` : ''));
          const linkGrupoRow = (evento.linkGrupo && String(evento.linkGrupo).trim())
            ? `<div class="inicio-link-grupo-row" style="margin:6px 0 2px 0; display:block;">
                 <span style="font-weight:600; color: var(--green-dark); margin-right:6px; font-size: 1.08em; font-style: italic;">Link de grupo:</span>
                 <a href="${evento.linkGrupo}" target="_blank" rel="noopener noreferrer" style="color: var(--violet); font-size: 1.08em; font-style: italic; word-break: break-all; text-decoration: none;">${evento.linkGrupo}</a>
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
                ${evento.unidos}/${evento.maxPersonas} unidos 
                <span class="evento-disponibles-texto">(${disponibles} lugares disponibles)</span>
              </span>
            </div>
            <div class="inicio-bottom-row">
              <div class="evento-organizador">
                <img src="${evento.fotoOrganizador || 'img/PERFIL1.jpg'}" alt="Foto ${evento.organizador}" class="inicio-organizador-foto" />
                <span class="inicio-organizador-nombre"><b>Organizado por</b><br>${evento.organizador}</span>
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
              </div>
            </div>
          `;

          eventosContainer.appendChild(eventoCard);
        });
      
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
            if (evento.unidos >= evento.maxPersonas) {
              mostrarMensajeError('Este evento está completo');
              btn.disabled = true;
              btn.textContent = 'Completo';
              btn.dataset.loading = '0';
              return;
            }

            // Actualizar evento
            const participantesActualizados = evento.participantes || [];
            participantesActualizados.push(userId);
          
            const eventoActualizado = {
              ...evento,
              unidos: evento.unidos + 1,
              participantes: participantesActualizados
            };
          
            await saveToFirestore('eventos', eventoActualizado, eventoId);
          
            // Guardar en historial del usuario
            const historialData = {
              eventoId: eventoId,
              tipo: 'unido',
              titulo: evento.titulo,
              fecha: evento.fecha,
              hora: evento.hora,
              ubicacion: evento.ubicacion,
              organizador: evento.organizador,
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
        
          try {
            btn.classList.toggle('active');
            const isActive = btn.classList.contains('active');
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
          
            if (isActive) {
              // Agregar a favoritos
              const evento = await getFromFirestore('eventos', eventoId);
              const favoritoData = {
                eventoId: eventoId,
                userId: userId,
                titulo: evento.titulo,
                descripcion: evento.descripcion,
                fecha: evento.fecha,
                hora: evento.hora,
                ubicacion: evento.ubicacion,
                organizador: evento.organizador,
                fechaAgregado: new Date().toISOString()
              };
            
              await saveToFirestore('favoritos', favoritoData, `${userId}_${eventoId}`);
              mostrarMensajeExito('Agregado a favoritos');
            } else {
              // Remover de favoritos de Firestore
              await deleteFromFirestore('favoritos', `${userId}_${eventoId}`);
              mostrarMensajeExito('Removido de favoritos');
            }
          } catch (error) {
            console.error('Error con favoritos:', error);
            mostrarMensajeError('Error al gestionar favoritos');
            btn.classList.toggle('active'); // Revertir estado visual
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
          const nuevosUnidos = Math.max(0, (evento.unidos || 0) - 1);
          const actualizado = { ...evento, participantes: nuevosParticipantes, unidos: nuevosUnidos };
          await saveToFirestore('eventos', actualizado, eventoId);
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
          if ((evento.unidos || 0) >= (evento.maxPersonas || 0)) { btn.disabled = true; btn.textContent = 'Completo'; return; }
          const participantes = Array.isArray(evento.participantes) ? [...evento.participantes] : []; participantes.push(userId);
          const unidos = (evento.unidos || 0) + 1;
          await saveToFirestore('eventos', { ...evento, participantes, unidos }, eventoId);
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
          const unidos = Math.max(0, (evento.unidos||0) - 1);
          await saveToFirestore('eventos', { ...evento, participantes, unidos }, eventoId);
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
    
    // Filtrar por tipo si no es "todos"
    let itemsFiltrados = items;
    if (tipoFiltro !== 'todos') {
      itemsFiltrados = items.filter(h => h.tipo === tipoFiltro);
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

    // Renderizar todos los eventos (activos primero, luego pasados) - AWAIT para cada item
    const htmlPartsActivos = await Promise.all(activos.map(item => renderHistorialItem(item, false)));
    const htmlPartsPasados = await Promise.all(pasados.map(item => renderHistorialItem(item, true)));
    
    const html = htmlPartsActivos.join('') + htmlPartsPasados.join('');
    historialContent.innerHTML = html;

    // Bind event listeners
    bindHistorialButtons();
  };

  // Helper para renderizar cada item del historial
  async function renderHistorialItem(item, esPasado) {
    const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
    const esCreado = item.tipo === 'creado';
    const esUnido = item.tipo === 'unido';
    const esFinalizado = item.tipo === 'finalizado';
    const fechaEvento = construirFechaHora(item);
    const esFuturo = fechaEvento && fechaEvento > new Date();
    
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
            <p style="margin:8px 0 4px;font-size:0.9em;color:#4CAF50;">✓ Tu valoración: ${'★'.repeat(estrellas)}${'☆'.repeat(5-estrellas)}</p>
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
            // Ocultar sistema de valoración (evitar nested template literal issues)
            const htmlValor = '<p style="color:#4CAF50;font-size:0.9em;margin:8px 0;">✓ Tu valoración: ' +
              '★'.repeat(valorSeleccionado) + '☆'.repeat(5 - valorSeleccionado) + '</p>';
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
        const section = this.closest('.participantes-section');
        const lista = section.querySelector('.participantes-lista');
        const eventoId = section.getAttribute('data-evento-id');

        if (lista.style.display === 'none') {
          try {
            const evento = await getFromFirestore('eventos', eventoId);
            if (!evento || !Array.isArray(evento.participantes)) {
              lista.innerHTML = '<p>No hay participantes aún.</p>';
            } else {
              let html = '<ul style="list-style:none;padding:8px 0;margin:0;">';
              for (const pId of evento.participantes) {
                const perfil = await getFromFirestore('perfiles', pId);
                const usuario = await getFromFirestore('usuarios', pId);
                const nombre = perfil?.nombre || usuario?.nombre || pId;
                const apellido = perfil?.apellido || usuario?.apellido || '';
                html += `<li style="padding:4px 0;">👤 ${nombre} ${apellido}</li>`;
              }
              html += '</ul>';
              lista.innerHTML = html;
            }
            lista.style.display = 'block';
            this.textContent = 'Ocultar participantes';
          } catch (err) {
            console.error(err);
            lista.innerHTML = '<p>Error cargando participantes.</p>';
            lista.style.display = 'block';
          }
        } else {
          lista.style.display = 'none';
          this.textContent = 'Ver participantes';
        }
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

      // ✅ VALIDACIÓN DOM (Prioridad ALTA)
      if (!modalConf) {
        console.warn('⚠️ Modal de confirmación (#modal-confirmar-borrado) no encontrado');
        return; // No ejecutar si no existe el modal
      }

      const cerrarModalBorrar = () => {
        if (modalConf) {
          modalConf.dataset.eventoId = '';
          modalConf.style.display = 'none';
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
            // ✅ VALIDACIÓN DE PERMISOS (Prioridad BAJA)
            const eventoABorrar = await getFromFirestore('eventos', id);
            const userIdLocal = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
            
            if (!eventoABorrar) {
              mostrarMensajeError('Evento no encontrado');
              cerrarModalBorrar();
              return;
            }
            
            if (eventoABorrar.organizadorId !== userIdLocal) {
              mostrarMensajeError('⛔ Solo el organizador puede borrar este evento');
              cerrarModalBorrar();
              return;
            }
            
            // 1) Borrar evento
            await deleteFromFirestore('eventos', id);
            // 2) Borrar entradas de historial relacionadas a este usuario-evento
            const todos = await getFromFirestore('historial');
            const relacionados = (todos || []).filter(h => typeof h.id === 'string' && h.id.startsWith(`${userIdLocal}_${id}_`));
            for (const h of relacionados) {
              await deleteFromFirestore('historial', h.id);
            }
            mostrarMensajeExito('Evento borrado definitivamente');
          } catch (err) {
            console.error(err);
            mostrarMensajeError('No se pudo borrar el evento');
          } finally {
            cerrarModalBorrar();
            // Recargar historial
            cacheHistorial = await cargarHistorial();
            const activeTab = document.querySelector('.historial-tab.active');
            const tipo = activeTab ? activeTab.getAttribute('data-tipo') : 'todos';
            renderHistorial(cacheHistorial, tipo);
          }
        });
      }

      // Modal edición de evento
      const modal = document.querySelector('#modal-editar-evento');
      const formEditar = document.querySelector('#form-editar-evento');
      const inputId = document.querySelector('#edit-evento-id');
      const inputTitulo = document.querySelector('#edit-titulo');
      const inputDesc = document.querySelector('#edit-descripcion');
      const inputFecha = document.querySelector('#edit-fecha');
      const inputHora = document.querySelector('#edit-hora');
      const inputUbicacion = document.querySelector('#edit-ubicacion');
      const inputMax = document.querySelector('#edit-maxPersonas');
      const btnCancelarEd = document.querySelector('#btn-cancelar-edicion');

      // ✅ VALIDACIÓN DOM (Prioridad ALTA)
      if (!modal) {
        console.warn('⚠️ Modal de edición (#modal-editar-evento) no encontrado en el DOM');
        return; // Detener ejecución si modal no existe
      }
      if (!formEditar) {
        console.warn('⚠️ Formulario de edición (#form-editar-evento) no encontrado');
        return;
      }

      const abrirModal = () => {
        if (!modal) return;
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
      };
      const cerrarModal = () => {
        if (!modal) return;
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
                m.style.display = 'none';
                document.body.classList.remove('modal-open');
              }
            });
          }
        });
      }

      // Bind botones editar
      const bindEditarButtons = () => {
        historialContent.querySelectorAll('.btn-editar-evento').forEach(btn => {
          if (btn.dataset.bound) return;
          btn.dataset.bound = 'true';
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (!id) return;
            
            const ev = await getFromFirestore('eventos', id);
            if (!ev) {
              mostrarMensajeError('Evento no encontrado');
              return;
            }
            
            // ✅ VALIDACIÓN DE PERMISOS (Prioridad BAJA)
            const userIdLocal = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
            if (ev.organizadorId !== userIdLocal) {
              mostrarMensajeError('⛔ Solo el organizador puede editar este evento');
              return;
            }
            
            inputId.value = id;
            inputTitulo.value = ev.titulo || '';
            inputDesc.value = ev.descripcion || '';
            
            // Normalizar fecha (yyyy-mm-dd) y hora (HH:MM)
            const fechaISO = ev.fecha ? new Date(ev.fecha) : null;
            if (fechaISO && !isNaN(fechaISO)) {
              const y = fechaISO.getFullYear();
              const m = String(fechaISO.getMonth()+1).padStart(2,'0');
              const d = String(fechaISO.getDate()).padStart(2,'0');
              inputFecha.value = `${y}-${m}-${d}`;
            } else {
              // Si ev.fecha ya está en formato yyyy-mm-dd lo usamos tal cual
              inputFecha.value = (ev.fecha && /^\d{4}-\d{2}-\d{2}$/.test(ev.fecha)) ? ev.fecha : '';
            }

            if (ev.hora) {
              const hhmm = ev.hora.match(/\d{2}:\d{2}/)?.[0] || '';
              inputHora.value = hhmm;
            } else {
              inputHora.value = '';
            }
            inputUbicacion.value = ev.ubicacion || '';
            
            // Cargar link de grupo si existe
            const editLinkGrupoInput = document.getElementById('edit-link-grupo');
            if (editLinkGrupoInput) editLinkGrupoInput.value = ev.linkGrupo || '';
            
            inputMax.value = ev.maxPersonas || 1;

            // Restringir fechas pasadas y, si es hoy, horas pasadas
            const pad2Local = (n) => String(n).padStart(2, '0');
            const todayLocalISO = () => {
              const d = new Date();
              return `${d.getFullYear()}-${pad2Local(d.getMonth() + 1)}-${pad2Local(d.getDate())}`;
            };
            const nowLocalHHmm = () => {
              const d = new Date();
              return `${pad2Local(d.getHours())}:${pad2Local(d.getMinutes())}`;
            };
            if (inputFecha) inputFecha.min = todayLocalISO();
            if (inputFecha && inputHora) {
              inputFecha.addEventListener('change', () => {
                if (inputFecha.value === todayLocalISO()) {
                  inputHora.min = nowLocalHHmm();
                } else {
                  inputHora.removeAttribute('min');
                }
              });
            }
            abrirModal();
          });
        });
      };
      
      bindEditarButtons();

      if (formEditar && !formEditar.dataset.bound) {
        formEditar.dataset.bound = 'true';
        formEditar.onsubmit = async (e) => {
          e.preventDefault();
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
            const fh = new Date(`${fechaEdit}T${horaEdit}`);
            if (isNaN(fh.getTime())) {
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
            
            // Obtener datos del formulario
            const editLinkGrupoInput = document.getElementById('edit-link-grupo');
            const linkGrupo = editLinkGrupoInput?.value?.trim() || '';
            
            const payload = {
              ...eventoActual,
              titulo: inputTitulo.value.trim(),
              descripcion: inputDesc.value.trim(),
              fecha: fechaEdit,
              hora: horaEdit,
              ubicacion: inputUbicacion.value.trim(),
              linkGrupo: linkGrupo,
              maxPersonas: parseInt(inputMax.value, 10) || 1,
              fechaHoraEvento: fh.toISOString()
            };
            await saveToFirestore('eventos', payload, id);
            mostrarMensajeExito('Evento actualizado');
            cerrarModal();
            
            // Recargar historial
            cacheHistorial = await cargarHistorial();
            const activeTab = document.querySelector('.historial-tab.active');
            const tipo = activeTab ? activeTab.getAttribute('data-tipo') : 'todos';
            renderHistorial(cacheHistorial, tipo);
            bindEditarButtons();
          } catch (err) {
            console.error(err);
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

}); // Fin DOMContentLoaded
