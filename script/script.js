
<script type="module">
  // Importa las funciones que usaremos
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

  // Configuración de tu proyecto Firebase
  const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "tfi-activa.firebaseapp.com",
    projectId: "tfi-activa",
    storageBucket: "tfi-activa.appspot.com",
    messagingSenderId: "TU_ID",
    appId: "TU_APP_ID"
  };

  // Inicializa Firebase
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Hacemos disponibles las variables en el navegador
  window.auth = auth;
  window.db = db;
</script>

// Inicializa Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAgufVX3sdXEzTJQC6ZTqv6Clh0Coo4A40",
  authDomain: "tfi-activa.firebaseapp.com",
  projectId: "tfi-activa",
  storageBucket: "tfi-activa.firebasestorage.app",
  messagingSenderId: "459768332837",
  appId: "1:459768332837:web:e28594decec0743631b5cc",
  measurementId: "G-5944BHTK50"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Carrusel de imágenes para Index.html
document.addEventListener("DOMContentLoaded", () => {
  const carrusel = document.getElementById('carrusel-imagenes');
  const prevBtn = document.getElementById('carrusel-prev');
  const nextBtn = document.getElementById('carrusel-next');
  const dotsContainer = document.getElementById('carrusel-dots');
  if (carrusel && prevBtn && nextBtn) {
    let current = 0;
    const imgs = Array.from(carrusel.getElementsByClassName('img-actividad'));
    const total = imgs.length;
    // Crear dots
    let dots = [];
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      dots = imgs.map((_, idx) => {
        const d = document.createElement('button');
        d.className = 'carrusel-dot' + (idx === 0 ? ' active' : '');
        d.type = 'button';
        d.setAttribute('aria-label', `Ir a la imagen ${idx + 1}`);
        d.addEventListener('click', () => {
          current = idx;
          updateCarrusel();
          resetInterval();
        });
        dotsContainer.appendChild(d);
        return d;
      });
    }
    function updateCarrusel() {
      imgs.forEach((img, i) => {
        if (i === current) {
          img.classList.add('active');
        } else {
          img.classList.remove('active');
        }
      });
      if (dots.length) {
        dots.forEach((d, i) => d.classList.toggle('active', i === current));
      }
    }
    updateCarrusel();
    prevBtn.onclick = () => { current = (current - 1 + total) % total; updateCarrusel(); resetInterval(); };
    nextBtn.onclick = () => { current = (current + 1) % total; updateCarrusel(); resetInterval(); };
    // Avance automático cada 4 segundos
    let autoTimer = null;
    function startInterval() {
      autoTimer = setInterval(() => {
        current = (current + 1) % total;
        updateCarrusel();
      }, 4000);
    }
    function resetInterval() {
      if (autoTimer) clearInterval(autoTimer);
      startInterval();
    }
    startInterval();
    // Pausar en hover/focus para accesibilidad
    const host = carrusel.parentElement; // .carrusel-full
    const pauseTargets = [host, prevBtn, nextBtn];
    pauseTargets.forEach(el => {
      if (!el) return;
      el.addEventListener('mouseenter', () => autoTimer && clearInterval(autoTimer));
      el.addEventListener('mouseleave', () => resetInterval());
      el.addEventListener('focusin', () => autoTimer && clearInterval(autoTimer));
      el.addEventListener('focusout', () => resetInterval());
    });
  }
});
// --- Registro y verificación de usuario (correo/teléfono) ---
document.addEventListener("DOMContentLoaded", () => {
  // Tabs correo/teléfono
  const tabEmail = document.getElementById("tab-email");
  const tabPhone = document.getElementById("tab-phone");
  const emailGroup = document.getElementById("email-group");
  const phoneGroup = document.getElementById("phone-group");
  const registerForm = document.getElementById("register-form");
  const formContainer = document.getElementById("form-container");
  const codeContainer = document.getElementById("code-container");
  const codeMsg = document.getElementById("code-msg");
  const destinoSpan = document.getElementById("destino");
  const btnVerificarCodigo = document.getElementById("btn-verificar-codigo");
  const btnVolver = document.getElementById("btn-volver");
  const perfilContainer = document.getElementById("perfil-container");
  const perfilForm = document.getElementById("perfil-form");
  const usuarioForm = document.getElementById("usuario-form");
  const usuarioDestino = document.getElementById("usuario-destino");

  let destino = "";
  let codigoGenerado = "";

  // Cambiar entre correo y teléfono
  if (tabEmail && tabPhone && emailGroup && phoneGroup) {
    tabEmail.addEventListener("click", () => {
      tabEmail.classList.add("active");
      tabPhone.classList.remove("active");
      emailGroup.style.display = "block";
      phoneGroup.style.display = "none";
    });
    tabPhone.addEventListener("click", () => {
      tabPhone.classList.add("active");
      tabEmail.classList.remove("active");
      emailGroup.style.display = "none";
      phoneGroup.style.display = "block";
    });
  }

  // Enviar código de verificación
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      let email = document.getElementById("email").value;
      let phone = document.getElementById("phone").value;
      if (emailGroup.style.display !== "none" && email) {
        destino = email;
      } else if (phoneGroup.style.display !== "none" && phone) {
        destino = phone;
      } else {
        alert("Por favor, completa el campo correspondiente.");
        return;
      }
      // Simular envío de código
      codigoGenerado = (Math.floor(100000 + Math.random() * 900000)).toString();
      // Mostrar pantalla de código
      if (formContainer && codeContainer) {
        formContainer.style.display = "none";
        codeContainer.style.display = "block";
        if (destinoSpan) destinoSpan.textContent = destino;
        // Mostrar el código en pantalla para pruebas
        const codigoDemo = document.getElementById("codigo-demo");
        if (codigoDemo) {
          codigoDemo.innerHTML = `Código de prueba: <b>${codigoGenerado}</b>`;
        }
      }
      // (En app real, aquí se enviaría el código por email o SMS)
      // Para pruebas, mostrar el código en consola:
      console.log("Código de verificación generado:", codigoGenerado);
    });
  }

  // Verificar código
  if (btnVerificarCodigo) {
    btnVerificarCodigo.addEventListener("click", function () {
      if (formContainer) formContainer.style.display = "none";
      if (codeContainer) codeContainer.style.display = "none";
      if (perfilContainer) perfilContainer.style.display = "block";
      document.querySelector('.main-container').classList.add('solo-perfil');
      // Obtiene el correo/teléfono ingresado
      destino = document.getElementById("destino").textContent;
      if (usuarioDestino) usuarioDestino.textContent = destino;
    });
  }

  // Guardar perfil
  if (perfilForm) {
    perfilForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const nombre = document.getElementById("nombre").value;
      const apellido = document.getElementById("apellido").value;
      const edad = document.getElementById("edad").value;
      const descripcion = document.getElementById("descripcion").value;
      // Guardar en localStorage o enviar a backend
      const perfil = { nombre, apellido, edad, descripcion };
      localStorage.setItem("perfilUsuario", JSON.stringify(perfil));
      alert("¡Perfil guardado exitosamente!");
      window.location.href = "Index.html";
    });
  }

  // Volver al inicio de sesión
  if (btnVolver) {
    btnVolver.addEventListener("click", function () {
      if (formContainer) formContainer.style.display = "block";
      if (codeContainer) codeContainer.style.display = "none";
      if (perfilContainer) perfilContainer.style.display = "none";
      document.querySelector('.main-container').classList.remove('solo-perfil');
    });
  }

  // Validar contraseñas y guardar usuario
  if (usuarioForm) {
    usuarioForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const nombre = document.getElementById("nombre").value;
      const apellido = document.getElementById("apellido").value;
      const edad = document.getElementById("edad").value;
      const password = document.getElementById("password").value;
      const password2 = document.getElementById("password2").value;
      if (password !== password2) {
        alert("Las contraseñas no coinciden.");
        return;
      }
      // Guarda el usuario en localStorage (puedes cambiar por backend)
      const usuario = { destino, nombre, apellido, edad, password };
      localStorage.setItem("usuarioRegistrado", JSON.stringify(usuario));
      alert("¡Usuario creado exitosamente!");
      window.location.href = "login.html";
    });
  }
});
document.addEventListener("DOMContentLoaded", function () {
  const imagenes = document.querySelectorAll('.img-actividad');
  const dotsContainer = document.getElementById('carrusel-dots');
  let actual = 0;
  let intervalo;

  // Crear dots
  dotsContainer.innerHTML = '';
  imagenes.forEach((_, idx) => {
    const dot = document.createElement('button');
    dot.className = 'carrusel-dot' + (idx === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Imagen ${idx + 1}`);
    dot.addEventListener('click', () => mostrarImagen(idx));
    dotsContainer.appendChild(dot);
  });

  function mostrarImagen(idx) {
    imagenes.forEach((img, i) => {
      img.classList.toggle('active', i === idx);
      dotsContainer.children[i].classList.toggle('active', i === idx);
    });
    actual = idx;
  }

  function siguienteImagen() {
    let siguiente = (actual + 1) % imagenes.length;
    mostrarImagen(siguiente);
  }

  intervalo = setInterval(siguienteImagen, 3000);

  // Pausar el carrusel al pasar el mouse
  dotsContainer.addEventListener('mouseenter', () => clearInterval(intervalo));
  dotsContainer.addEventListener('mouseleave', () => {
    intervalo = setInterval(siguienteImagen, 3000);
  });
});
// Redirige al inicio después de guardar el perfil
document.addEventListener("DOMContentLoaded", () => {
  const perfilForm = document.getElementById("perfil-form");
  if (perfilForm) {
    perfilForm.addEventListener("submit", function (e) {
      e.preventDefault();
      // Aquí puedes guardar los datos del perfil en la base de datos/localStorage
      window.location.href = "inicio.html";
    });
  }
});
// Solo ejecuta la animación si existe el fondo en la página actual
document.addEventListener("DOMContentLoaded", function () {
  const fondo = document.querySelector('.fondo-animado');
  if (!fondo) return;

  const emojis = ["🎾","⚽","🎸","🎨","📷","🍕","🏃‍♂️","🎤","🏀","🧩","🍔","🎭","🎹","🏓","🥗","🎬","🎯","🏐","🎲","🎪","🎨","📚","🎵","⚡","🌟","💫","🎮","🚴‍♀️","🏊‍♂️","🧘‍♀️","🎺","🎻","🥊","🏸","⛹️‍♂️","🤸‍♀️","🕺","💃","🎪","🎨","🖼️","🎭","🎪","🎨","🎹","🎸","🥁","🎤","🎧","📸","📹","🎬","📚","✍️","🧑‍🍳","👨‍🍳","🍳","🥘","🍝","🍕","🍰","☕","🍷","🧑‍🎨","👩‍🎨","🖌️","🖍️"];
  fondo.innerHTML = "";
  
  // Genera 45 emojis (antes eran 25)
  for (let i = 0; i < 45; i++) {
    const emoji = document.createElement('span');
    emoji.className = 'emoji emoji-static';
    emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    
    // Posición aleatoria dentro del área permitida
    emoji.style.left = (Math.random() * 90) + '%';
    emoji.style.top = (Math.random() * 85) + '%';
    
    // Tamaño aleatorio
    emoji.style.fontSize = (Math.random() * 0.8 + 1.2) + 'rem';
    
    // Opacidad aleatoria más visible
    emoji.style.opacity = 0.12 + Math.random() * 0.08;
    
    // Duración de animación aleatoria
    const duracion = Math.random() * 6 + 8;
    emoji.style.animationDuration = duracion + 's';
    
    // Delay aleatorio
    emoji.style.animationDelay = (Math.random() * -8) + 's';
    
    fondo.appendChild(emoji);
  }
});
// Redirige al inicio y muestra alerta después de crear evento
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-crear-evento");
  if (form) {
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      alert("¡Su evento fue creado con éxito!");
      window.location.href = "inicio.html";
    });
  }
});
// Agrega esto al final de script.js para mostrar los favoritos en favoritos.html

document.addEventListener("DOMContentLoaded", () => {
  const favoritosLista = document.getElementById("favoritos-lista");
  if (favoritosLista) {
    // Obtiene los favoritos guardados en localStorage
    const favoritos = JSON.parse(localStorage.getItem("eventosFavoritos") || "[]");
    if (favoritos.length === 0) {
      favoritosLista.innerHTML = "<p style='text-align:center;'>No tienes eventos favoritos aún.</p>";
    } else {
      favoritos.forEach(evento => {
        const card = document.createElement("div");
        card.className = "evento-card";
        card.innerHTML = `
          <h2 class="evento-titulo">${evento.titulo}</h2>
          <p class="evento-descripcion">${evento.descripcion}</p>
          <div class="evento-detalles">
            <span>📅 ${evento.fecha}</span>
            <span>⏰ ${evento.hora}</span>
            <span>📍 ${evento.ubicacion}</span>
            <span>👥 ${evento.unidos} <a href="#" class="evento-disponibles">${evento.disponibles}</a></span>
          </div>
          <div class="evento-bottom-row">
            <div class="evento-organizador">
              <img src="${evento.fotoOrganizador}" alt="Foto ${evento.organizador}" class="evento-organizador-foto">
              <span class="evento-organizador-nombre">👤 <b>Organizado por</b><br>${evento.organizador}</span>
            </div>
            <div class="evento-actions">
              <button class="btn-favorito-evento active">★</button>
              <button class="btn-compartir-evento">🔗</button>
              <button class="btn-unirse-evento">Unirse</button>
            </div>
          </div>
        `;
        favoritosLista.appendChild(card);
      });
    }
  }
});

// Ejemplo de cómo guardar favoritos desde inicio.html (agrega esto en el manejador de la estrellita):
// localStorage.setItem("eventosFavoritos", JSON.stringify(arrayDeFavoritos));

// Agrega esto en script.js para mostrar los datos del perfil y eventos en perfil.html

document.addEventListener("DOMContentLoaded", () => {
  // Mostrar datos de perfil
  const perfil = JSON.parse(localStorage.getItem("perfilUsuario") || "{}");
  if (document.getElementById("perfil-nombre")) {
    document.getElementById("perfil-nombre").textContent = perfil.nombre ? perfil.nombre : "Nombre Apellido";
    document.getElementById("perfil-edad").textContent = perfil.edad ? `Edad: ${perfil.edad}` : "Edad: --";
    document.getElementById("perfil-descripcion").textContent = perfil.descripcion ? `Descripción: ${perfil.descripcion}` : "Descripción: --";
    if (perfil.foto) {
      document.getElementById("perfil-foto").src = perfil.foto;
    }
  }

  // Eventos en los que participa
  const eventosParticipa = JSON.parse(localStorage.getItem("eventosParticipa") || "[]");
  const eventosCreados = JSON.parse(localStorage.getItem("eventosCreados") || "[]");
  const participaSection = document.getElementById("eventos-participa");
  const creadosSection = document.getElementById("eventos-creados");

  if (participaSection && eventosParticipa.length > 0) {
    participaSection.innerHTML = "";
    eventosParticipa.forEach(evento => {
      const card = document.createElement("div");
      card.className = "evento-card";
      card.innerHTML = `
        <h2 class="evento-titulo">${evento.titulo}</h2>
        <p class="evento-descripcion">${evento.descripcion}</p>
        <div class="evento-detalles">
          <span>📅 ${evento.fecha}</span>
          <span>⏰ ${evento.hora}</span>
          <span>📍 ${evento.ubicacion}</span>
          <span>👥 ${evento.unidos} <a href="#" class="evento-disponibles">${evento.disponibles}</a></span>
        </div>
      `;
      participaSection.appendChild(card);
    });
  }

  if (creadosSection && eventosCreados.length > 0) {
    creadosSection.innerHTML = "";
    eventosCreados.forEach(evento => {
      const card = document.createElement("div");
      card.className = "evento-card";
      card.innerHTML = `
        <h2 class="evento-titulo">${evento.titulo}</h2>
        <p class="evento-descripcion">${evento.descripcion}</p>
        <div class="evento-detalles">
          <span>📅 ${evento.fecha}</span>
          <span>⏰ ${evento.hora}</span>
          <span>📍 ${evento.ubicacion}</span>
          <span>👥 ${evento.unidos} <a href="#" class="evento-disponibles">${evento.disponibles}</a></span>
        </div>
      `;
      creadosSection.appendChild(card);
    });
  }
});
// Guarda el perfil creado en registro y lo muestra en perfil.html
document.addEventListener("DOMContentLoaded", () => {
  const perfilForm = document.getElementById("perfil-form");
  if (perfilForm) {
    perfilForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const nombre = document.getElementById("nombre").value;
      const apellido = document.getElementById("apellido").value;
      const edad = document.getElementById("edad").value;
      const descripcion = document.getElementById("descripcion").value;
      const foto = document.getElementById("foto-perfil") ? document.getElementById("foto-perfil").value : "img/perfil-default.png";
      // Guarda el perfil en localStorage
      const perfil = { nombre, apellido, edad, descripcion, foto };
      localStorage.setItem("perfilUsuario", JSON.stringify(perfil));
      alert("¡Perfil guardado exitosamente!");
      window.location.href = "inicio.html";
    });
  }

  // Mostrar datos de perfil en perfil.html
  const perfil = JSON.parse(localStorage.getItem("perfilUsuario") || "{}");
  if (document.getElementById("perfil-nombre")) {
    document.getElementById("perfil-nombre").textContent = perfil.nombre && perfil.apellido ? `${perfil.nombre} ${perfil.apellido}` : "Nombre Apellido";
    document.getElementById("perfil-edad").textContent = perfil.edad ? `Edad: ${perfil.edad}` : "Edad: --";
    document.getElementById("perfil-descripcion").textContent = perfil.descripcion ? `Descripción: ${perfil.descripcion}` : "Descripción: --";
    if (perfil.foto) {
      document.getElementById("perfil-foto").src = perfil.foto;
    }
  }
});
// Guarda el usuario creado en el registro
document.addEventListener("DOMContentLoaded", () => {
  const perfilForm = document.getElementById("perfil-form");
  if (perfilForm) {
    perfilForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const nombre = document.getElementById("nombre").value;
      const apellido = document.getElementById("apellido").value;
      const edad = document.getElementById("edad").value;
      const descripcion = document.getElementById("descripcion").value;
      // Puedes agregar más campos si lo necesitas (ej: foto)
      const usuario = { nombre, apellido, edad, descripcion };
      localStorage.setItem("perfilUsuario", JSON.stringify(usuario));
      alert("¡Perfil guardado exitosamente!");
      window.location.href = "inicio.html";
    });
  }
});
// Muestra/oculta el menú de los tres puntitos y cierra sesión
document.addEventListener("DOMContentLoaded", () => {
  const btnDots = document.getElementById("btn-menu-dots");
  const menuDropdown = document.getElementById("menu-dots-dropdown");
  const cerrarSesion = document.getElementById("cerrar-sesion");

  if (btnDots && menuDropdown) {
    btnDots.addEventListener("click", (e) => {
      e.stopPropagation();
      menuDropdown.style.display = menuDropdown.style.display === "block" ? "none" : "block";
    });

    document.addEventListener("click", () => {
      menuDropdown.style.display = "none";
    });

    menuDropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  if (cerrarSesion) {
    cerrarSesion.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "login.html";
    });
  }
});
// Muestra el mensaje solo cuando aparece el recuadro de crear usuario/perfil
document.addEventListener("DOMContentLoaded", () => {
  const perfilContainer = document.getElementById("perfil-container");
  const perfilAviso = document.querySelector(".perfil-usuario-aviso");

  // Oculta el aviso al cargar la página
  if (perfilAviso) perfilAviso.style.display = "none";

  // Cuando se muestra el recuadro de crear usuario, muestra el aviso
  const btnVerificarCodigo = document.getElementById("btn-verificar-codigo");
  if (btnVerificarCodigo && perfilContainer && perfilAviso) {
    btnVerificarCodigo.addEventListener("click", function () {
      setTimeout(() => {
        if (perfilContainer.style.display === "block") {
          perfilAviso.style.display = "block";
        }
      }, 100); // Espera a que el recuadro se muestre
    });
  }
});
// Guarda un usuario de prueba en localStorage al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  const usuarioPrueba = {
    correo: "prueba@correo.com",
    telefono: "+54 9 11 1234-5678",
    nombre: "Prueba",
    apellido: "Usuario",
    edad: 25,
    sexo: "Otro",
    password: "123456"
  };
  localStorage.setItem("usuarioPrueba", JSON.stringify(usuarioPrueba));
});
// Redirige a inicio.html después de iniciar sesión correctamente
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      // Aquí puedes validar el usuario si lo deseas
      window.location.href = "inicio.html";
    });
  }
});
document.addEventListener("DOMContentLoaded", () => {
  // Mostrar datos del usuario logueado
  const usuario = JSON.parse(localStorage.getItem("usuarioRegistrado") || localStorage.getItem("usuarioPrueba") || "{}");
  if (usuario) {
    document.getElementById("perfil-nombre").textContent = usuario.nombre && usuario.apellido ? `${usuario.nombre} ${usuario.apellido}` : "Nombre Apellido";
    document.getElementById("perfil-edad").textContent = usuario.edad ? `Edad: ${usuario.edad}` : "Edad: --";
    document.getElementById("perfil-sexo").textContent = usuario.sexo ? `Sexo: ${usuario.sexo}` : "Sexo: --";
    document.getElementById("perfil-descripcion").value = usuario.descripcion || "";
    if (usuario.foto) {
      document.getElementById("perfil-foto").src = usuario.foto;
    }
  }

  // Editar foto
  const fotoInput = document.getElementById("foto-perfil");
  const fotoImg = document.getElementById("perfil-foto");
  const btnEditarFoto = document.getElementById("btn-editar-foto");
  if (btnEditarFoto && fotoInput && fotoImg) {
    btnEditarFoto.addEventListener("click", () => fotoInput.click());
    fotoInput.addEventListener("change", function () {
      const file = fotoInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          fotoImg.src = e.target.result;
          usuario.foto = e.target.result;
          mostrarGuardar();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Editar descripción
  const btnEditarDesc = document.getElementById("btn-editar-desc");
  const perfilDesc = document.getElementById("perfil-descripcion");
  if (btnEditarDesc && perfilDesc) {
    btnEditarDesc.addEventListener("click", () => {
      perfilDesc.removeAttribute("readonly");
      perfilDesc.focus();
      mostrarGuardar();
    });
  }

  // Mostrar botón guardar
  function mostrarGuardar() {
    document.getElementById("btn-guardar").style.display = "block";
  }

  // Guardar cambios
  const perfilForm = document.getElementById("perfil-form");
  if (perfilForm) {
    perfilForm.addEventListener("submit", function (e) {
      e.preventDefault();
      usuario.descripcion = perfilDesc.value;
      usuario.foto = fotoImg.src;
      localStorage.setItem("usuarioRegistrado", JSON.stringify(usuario));
      perfilDesc.setAttribute("readonly", true);
      document.getElementById("btn-guardar").style.display = "none";
      alert("¡Perfil actualizado!");
      window.location.href = "perfil.html"; // Redirige a perfil.html en vez de inicio.html
    });
  }

  // Mostrar eventos en los que participa
  const eventosParticipa = JSON.parse(localStorage.getItem("eventosParticipa") || "[]");
  const participaSection = document.getElementById("eventos-participa");
  if (participaSection) {
    participaSection.innerHTML = eventosParticipa.length === 0
      ? "<p style='color:#888;'>No te has unido a ningún evento aún.</p>"
      : eventosParticipa.map(evento => `
        <div class="evento-card">
          <h2 class="evento-titulo">${evento.titulo}</h2>
          <p class="evento-descripcion">${evento.descripcion}</p>
          <div class="evento-detalles">
            <span>📅 ${evento.fecha}</span>
            <span>⏰ ${evento.hora}</span>
            <span>📍 ${evento.ubicacion}</span>
            <span>👥 ${evento.unidos} <a href="#" class="evento-disponibles">${evento.disponibles}</a></span>
          </div>
        </div>
      `).join("");
  }

  // Mostrar eventos creados
  const eventosCreados = JSON.parse(localStorage.getItem("eventosCreados") || "[]");
  const creadosSection = document.getElementById("eventos-creados");
  if (creadosSection) {
    creadosSection.innerHTML = eventosCreados.length === 0
      ? "<p style='color:#888;'>No has creado ningún evento aún.</p>"
      : eventosCreados.map(evento => `
        <div class="evento-card">
          <h2 class="evento-titulo">${evento.titulo}</h2>
          <p class="evento-descripcion">${evento.descripcion}</p>
          <div class="evento-detalles">
            <span>📅 ${evento.fecha}</span>
            <span>⏰ ${evento.hora}</span>
            <span>📍 ${evento.ubicacion}</span>
            <span>👥 ${evento.unidos} <a href="#" class="evento-disponibles">${evento.disponibles}</a></span>
          </div>
        </div>
      `).join("");
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const btnEditarPerfil = document.getElementById("btn-editar-perfil");
  const perfilForm = document.getElementById("perfil-form");
  if (btnEditarPerfil && perfilForm) {
    btnEditarPerfil.addEventListener("click", function (e) {
      e.preventDefault();
      perfilForm.style.display = "flex";
      btnEditarPerfil.style.display = "none";
    });
  }
});
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.inicio-btn-unirse-nuevo').forEach((btn, idx) => {
    btn.addEventListener('click', function () {
      // Busca el span de lugares disponibles en el mismo evento
      const card = btn.closest('.inicio-card-evento');
      const disponiblesSpan = card.querySelector('.evento-disponibles-texto');
      // Extrae el número actual y lo descuenta
      const match = disponiblesSpan.textContent.match(/\((\d+) lugares disponibles\)/);
      if (match) {
        let disponibles = parseInt(match[1]);
        if (disponibles > 0) {
          disponibles--;
          disponiblesSpan.textContent = `(${disponibles} lugares disponibles)`;
        }
      }
    });
  });
});

// Guarda un usuario en la colección "usuarios"
function guardarUsuario(usuario) {
  db.collection("usuarios").add(usuario)
    .then((docRef) => {
      console.log("Usuario guardado con ID: ", docRef.id);
    })
    .catch((error) => {
      console.error("Error al guardar usuario: ", error);
    });
}

// Ejemplo de uso:
guardarUsuario({
  nombre: "Prueba",
  apellido: "Usuario",
  edad: 25,
  sexo: "Otro",
  correo: "prueba@correo.com"
});
