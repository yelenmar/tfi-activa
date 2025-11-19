# 📱 Manual de Usuario - Activá

## Índice
1. [Introducción](#introducción)
2. [Registro e Inicio de Sesión](#registro-e-inicio-de-sesión)
3. [Página de Inicio](#página-de-inicio)
4. [Crear un Evento](#crear-un-evento)
5. [Unirse a Eventos](#unirse-a-eventos)
6. [Gestión de Favoritos](#gestión-de-favoritos)
7. [Mi Perfil](#mi-perfil)
8. [Historial de Eventos](#historial-de-eventos)
9. [Notificaciones](#notificaciones)
10. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Introducción

**Activá** es una plataforma web diseñada para organizar y participar en eventos deportivos y recreativos. Podés crear tus propios eventos, unirte a los de otros usuarios, gestionar tu perfil y recibir notificaciones automáticas.

**URL de acceso:** https://tfi-activa.web.app

---

## Registro e Inicio de Sesión

### Registrarse por primera vez

1. **Accedé a la página de registro**
   - Hacé clic en "Registrarse" desde la página de inicio
   - O ingresá directamente a: https://tfi-activa.web.app/registro.html

2. **Elegí tu método de registro**
   - **Por correo electrónico** (recomendado)
   - **Por teléfono** (funcionalidad limitada)

3. **Ingresá tu correo electrónico**
   - Escribí tu email en el campo correspondiente
   - Hacé clic en "Enviar Código de Verificación"

4. **Verificá tu código**
   - Revisá tu bandeja de entrada (y spam si es necesario)
   - Ingresá el código de 6 dígitos que recibiste
   - Hacé clic en "Verificar Código"

5. **Completá tu perfil**
   - **Nombre:** Tu nombre real
   - **Apellido:** Tu apellido
   - **Edad:** Tu edad en años
   - **Sexo:** Masculino, Femenino u Otro
   - **Contraseña:** Mínimo 6 caracteres
   - **Confirmar contraseña:** Repetí tu contraseña

6. **Finalizar registro**
   - Hacé clic en "Crear Usuario"
   - Serás redirigido automáticamente al inicio de sesión

### Iniciar sesión

1. Ingresá tu **correo electrónico o teléfono**
2. Ingresá tu **contraseña**
3. Hacé clic en "Iniciar Sesión"

### Recuperar contraseña

1. Desde la página de login, hacé clic en "¿Olvidaste tu contraseña?"
2. Ingresá tu correo electrónico
3. Hacé clic en "Enviar Código"
4. Revisá tu email y copiá el código de 6 dígitos
5. Ingresá el código en la pantalla de verificación
6. Establecé tu nueva contraseña
7. Confirmá la nueva contraseña
8. Hacé clic en "Cambiar Contraseña"

---

## Página de Inicio

La página de inicio muestra todos los **eventos activos y futuros** disponibles.

### Elementos de la interfaz

- **Barra superior:**
  - Logo de Activá (click para recargar)
  - Buscador de eventos
  - Menú de usuario (tres puntitos)

- **Buscador:**
  - Escribí palabras clave (título, ubicación, descripción)
  - Los resultados se filtran en tiempo real

- **Tarjetas de eventos:**
  Cada evento muestra:
  - **Título** del evento
  - **Descripción** breve
  - **Fecha y hora**
  - **Ubicación**
  - **Cupos:** X/Y unidos (Z lugares disponibles)
  - **Organizador:** Nombre y foto
  - **Botones de acción:**
    - ⭐ Favorito
    - 🔗 Compartir
    - 📝 Unirse / Organizador / No participar

### Navegación

- **Inicio:** Ver todos los eventos
- **Crear Evento:** Organizar un nuevo evento
- **Favoritos:** Ver tus eventos guardados
- **Perfil:** Gestionar tu información personal

---

## Crear un Evento

### Pasos para crear un evento

1. **Acceder al formulario**
   - Hacé clic en "Crear Evento" en el menú principal
   - O ingresá a: https://tfi-activa.web.app/crear-evento.html

2. **Completar los datos del evento**

   **Información básica:**
   - **Título:** Nombre descriptivo del evento (ej: "Fútbol 5 - Cancha Los Pinos")
   - **Descripción:** Detalles adicionales, nivel requerido, qué llevar, etc.

   **Fecha y hora:**
   - **Fecha:** Seleccioná desde el calendario (debe ser futura)
   - **Hora:** Formato 24 horas (ej: 18:00)

   **Ubicación:**
   - **Ubicación:** Dirección completa o nombre del lugar (ej: "Polideportivo Municipal - Av. Siempre Viva 123")

   **Participantes:**
   - **Máximo de personas:** Cupos totales incluyéndote a vos (mínimo 2)

   **Comunicación (opcional):**
   - **Link de grupo:** URL de WhatsApp, Telegram o Discord para coordinar

3. **Enviar el evento**
   - Revisá que todos los datos sean correctos
   - Hacé clic en "Crear Evento"
   - Verás un mensaje: "Creando evento..."
   - Luego: "Enviando notificaciones..." (puede tardar unos segundos)
   - Serás redirigido a Inicio cuando se complete

4. **Notificaciones automáticas**
   - Todos los usuarios registrados recibirán un email con tu nuevo evento
   - Solo se notifica a usuarios que NO sean vos (el organizador)

### Restricciones

- ✅ La fecha y hora deben ser **futuras**
- ✅ Todos los campos son **obligatorios** excepto el link de grupo
- ✅ El máximo de personas debe ser al menos **2**

---

## Unirse a Eventos

### Cómo participar en un evento

1. **Buscar eventos disponibles**
   - Navegá por la página de Inicio
   - Usá el buscador si buscás algo específico

2. **Ver detalles del evento**
   - Cada tarjeta muestra toda la información
   - Verificá que haya cupos disponibles
   - Revisá la fecha, hora y ubicación

3. **Unirse al evento**
   - Hacé clic en el botón "**Unirse**"
   - Verás el mensaje "Cargando…"
   - El botón cambiará a "**No participar**"
   - Aparecerá un badge "**Participando**"
   - El contador de unidos se actualizará

4. **Acceder al link de grupo** (si hay)
   - Una vez unido, verás una sección "Link de grupo"
   - Hacé clic para unirte al grupo de coordinación

### Salir de un evento

1. Hacé clic en el botón "**No participar**"
2. Confirmá tu decisión
3. El evento desaparecerá de tu historial de "Unidos"
4. Ya no recibirás notificaciones de ese evento

### Restricciones

- ❌ No podés unirte a eventos **completos** (cupos llenos)
- ❌ No podés unirte a tus **propios eventos** (sos el organizador)
- ✅ Podés salir de un evento **antes de que comience**
- ✅ Podés volver a unirte si cambiás de opinión (y hay cupos)

---

## Gestión de Favoritos

### Agregar a favoritos

1. Hacé clic en el **botón de estrella** (⭐) en cualquier evento
2. La estrella se llenará de color
3. El evento se guardará en tu lista de Favoritos

### Ver tus favoritos

1. Hacé clic en "**Favoritos**" en el menú principal
2. Verás todos los eventos que marcaste
3. Podés:
   - **Unirte** al evento
   - **Salir** si ya estás participando
   - **Quitar de favoritos** (click en la estrella)
   - **Compartir** el evento

### Quitar de favoritos

1. Desde la página de Favoritos, hacé clic en la **estrella llena**
2. La tarjeta desaparecerá con una animación
3. También podés quitar favoritos desde la página de Inicio

---

## Mi Perfil

### Acceder a tu perfil

1. Hacé clic en el **menú de tres puntitos** (⋮) en la esquina superior derecha
2. Seleccioná "**Perfil**"

### Editar información personal

1. En tu perfil, hacé clic en "**Editar Perfil**"

2. **Foto de perfil:**
   - Hacé clic en "**Cambiar foto**" o en el ícono de editar
   - Seleccioná una imagen de tu dispositivo
   - La foto se comprimirá automáticamente para optimizar el rendimiento
   - Para quitar la foto, hacé clic en "**Quitar foto**"

3. **Descripción:**
   - Hacé clic en el **ícono de lápiz** junto a tu descripción
   - Escribí una bio personal (ej: "Fanático del fútbol y runner los domingos")
   - Hacé clic en "**Guardar**"

4. **Datos básicos:**
   - Nombre, apellido, edad y sexo se editan desde el formulario principal
   - Hacé los cambios necesarios
   - Hacé clic en "**Guardar Cambios**"

5. **Cancelar edición:**
   - Si no querés guardar, hacé clic en "**Cancelar**"
   - Los cambios se descartarán

### Datos que NO se pueden editar

- ❌ **Email o teléfono:** Son tu identificador único
- ❌ **Contraseña:** Usá la función de "Recuperar contraseña" desde el login

---

## Historial de Eventos

Tu historial muestra todos los eventos en los que participaste o creaste.

### Acceder al historial

1. Desde tu **Perfil**, scrolleá hacia abajo
2. Verás el título "**Historial de Eventos**"

### Pestañas de filtrado

- **Todos:** Eventos creados y unidos (activos y pasados)
- **Creados:** Solo eventos que vos organizaste
- **Unidos:** Solo eventos a los que te uniste
- **Finalizados:** Eventos que ya pasaron

### Eventos activos (futuros)

**Si sos el organizador:**
- **Editar:** Modificar título, descripción, fecha, hora, ubicación, cupos o link
- **Borrar:** Eliminar el evento (requiere confirmación)
- **Ver participantes:** Ver lista de usuarios unidos

**Si estás participando:**
- **No participar:** Salir del evento
- **Link de grupo:** Acceder al grupo de coordinación

### Eventos finalizados (pasados)

**Si participaste (no organizaste):**
- **Valorar:** Calificar el evento con 1 a 5 estrellas
- Ver tu valoración ya enviada
- Ver el promedio de valoraciones

**Si organizaste:**
- Ver el **promedio de valoraciones** que recibió tu evento
- Ver la **cantidad de votos** totales

### Editar un evento

1. Hacé clic en "**Editar**" en tu evento
2. Modificá los campos que necesites:
   - Título, descripción
   - Fecha y hora (debe seguir siendo futura)
   - Ubicación
   - Máximo de personas (no puede ser menor a los unidos actuales)
   - Link de grupo
3. Hacé clic en "**Guardar Cambios**"
4. Todos los participantes recibirán un email notificando la edición

### Borrar un evento

1. Hacé clic en "**Borrar**"
2. Aparecerá un modal de confirmación
3. Hacé clic en "**Confirmar**" para eliminar definitivamente
4. El evento se borrará de:
   - Lista de eventos activos
   - Historial de todos los participantes
   - Favoritos de todos los usuarios
5. Todos los participantes recibirán una notificación

⚠️ **Importante:** Esta acción NO se puede deshacer.

---

## Notificaciones

Activá envía notificaciones automáticas por email en los siguientes casos:

### Tipos de notificaciones

1. **Nuevo evento creado**
   - Quién recibe: Todos los usuarios (excepto el organizador)
   - Cuándo: Inmediatamente después de crear el evento
   - Contenido: Título, descripción, fecha, hora, ubicación

2. **Recordatorio 3 días antes**
   - Quién recibe: Todos los participantes (incluido organizador)
   - Cuándo: 72 horas antes del evento (a la misma hora)
   - Contenido: Recordatorio con detalles completos

3. **Recordatorio el día del evento**
   - Quién recibe: Todos los participantes
   - Cuándo: A las 4:00 AM del día del evento
   - Contenido: Recordatorio final con link de grupo

4. **Cupos disponibles 3 horas antes**
   - Quién recibe: Todos los usuarios (si quedan lugares)
   - Cuándo: 3 horas antes del inicio
   - Contenido: Alerta de últimos cupos disponibles

5. **Evento editado**
   - Quién recibe: Todos los participantes
   - Cuándo: Inmediatamente después de guardar cambios
   - Contenido: Notificación de modificación con nuevos datos

6. **Evento cancelado**
   - Quién recibe: Todos los participantes
   - Cuándo: Inmediatamente después de borrar
   - Contenido: Aviso de cancelación

### Desactivar notificaciones

Actualmente, las notificaciones están **siempre activas** para garantizar la coordinación entre usuarios.

### Problemas con notificaciones

- **No me llegan emails:**
  1. Revisá tu carpeta de **spam/correo no deseado**
  2. Agregá `noreply@emailjs.com` a tus contactos
  3. Verificá que tu email sea correcto en tu perfil

- **Recibo notificaciones duplicadas:**
  - El sistema tiene anti-duplicado de 24 horas
  - Si persiste, contactá al administrador

---

## Preguntas Frecuentes

### General

**¿Es gratis usar Activá?**
Sí, Activá es completamente gratuito.

**¿Necesito instalar una app?**
No, Activá funciona directamente desde tu navegador web.

**¿Puedo usar Activá desde el celular?**
Sí, la plataforma es responsive y funciona en cualquier dispositivo.

### Cuenta y Perfil

**¿Puedo cambiar mi email?**
No, tu email es tu identificador único y no se puede modificar.

**¿Cómo cambio mi contraseña?**
Usá la función "¿Olvidaste tu contraseña?" desde la página de login.

**¿Puedo eliminar mi cuenta?**
Actualmente no hay función de auto-eliminación. Contactá al administrador.

### Eventos

**¿Puedo crear eventos pasados?**
No, solo se permiten eventos con fecha y hora futura.

**¿Qué pasa si nadie se une a mi evento?**
El evento permanecerá activo hasta que lo borres o pase su fecha.

**¿Puedo aumentar los cupos después de crear el evento?**
Sí, podés editar el evento y aumentar el "Máximo de personas".

**¿Puedo reducir los cupos?**
Sí, pero no podés poner menos cupos que participantes actuales.

**¿Puedo cambiar la fecha de un evento?**
Sí, editá el evento y cambiá la fecha (debe seguir siendo futura).

**¿Qué pasa si llego tarde a mi propio evento?**
El evento se desactivará automáticamente 1 hora después de su hora de inicio.

### Participación

**¿Puedo unirme a múltiples eventos el mismo día?**
Sí, no hay límite de eventos simultáneos.

**¿Puedo salir de un evento después de unirme?**
Sí, pero solo antes de que comience. Después ya no podés salir.

**¿El organizador puede expulsarme de un evento?**
No, actualmente solo vos podés salir voluntariamente.

### Valoraciones

**¿Puedo valorar mis propios eventos?**
No, solo podés valorar eventos a los que participaste como invitado.

**¿Puedo cambiar mi valoración?**
Actualmente no. Una vez enviada, la valoración es definitiva.

**¿Los demás ven mi valoración individual?**
No, solo se muestra el promedio general y la cantidad de votos.

### Notificaciones

**¿Por qué no me llegan notificaciones?**
- Revisá tu carpeta de spam
- Verificá que tu email sea correcto
- La cuota de envío puede estar agotada (esperar reset mensual)

**¿Puedo elegir qué notificaciones recibir?**
Actualmente no, todas las notificaciones están activas por defecto.

---

## Soporte Técnico

### Contacto

- **Email de soporte:** activaapp.oficial@gmail.com
- **GitHub:** https://github.com/yelenmar/tfi-activa

### Reportar un problema

Si encontrás un error o bug:
1. Abrí la consola del navegador (F12)
2. Copiá los mensajes de error
3. Enviá un email detallando:
   - Qué estabas haciendo
   - Qué esperabas que pasara
   - Qué pasó en realidad
   - Los mensajes de error de la consola

---

## Notas de Versión

**Versión actual:** 1.0  
**Última actualización:** 18 de noviembre de 2025

### Características implementadas:
- ✅ Registro y login con verificación por email
- ✅ Creación y gestión de eventos deportivos
- ✅ Sistema de participación con cupos limitados
- ✅ Gestión de favoritos
- ✅ Perfil de usuario personalizable
- ✅ Historial de eventos (creados, unidos, finalizados)
- ✅ Sistema de valoraciones con estrellas
- ✅ Notificaciones automáticas por email
- ✅ Buscador en tiempo real
- ✅ Sistema de paginación de eventos
- ✅ Edición y cancelación de eventos
- ✅ Links de grupo para coordinación
- ✅ Responsive design (mobile, tablet, desktop)

---

**¡Gracias por usar Activá! 🏃‍♂️⚽🏀🎾**

Organizá, participá y disfrutá de eventos deportivos con tu comunidad.
