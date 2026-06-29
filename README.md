# SGTA-UPLA

**Sistema de Gestión de Tutorías Académicas**  
Universidad Peruana Los Andes – Facultad de Ingeniería

## Descripción

Sistema web para la gestión integral de tutorías académicas con tres roles de usuario:
- **Administrador**: Gestión completa de usuarios, tutores, delegados, tutorías, reportes y calendario.
- **Tutor**: Gestión de sesiones, estudiantes asignados, solicitudes y mensajes.
- **Estudiante Delegado**: Solicitud de tutorías, seguimiento de progreso y contacto con compañeros.

## Tecnologías

- **HTML5** — Estructura semántica
- **CSS3** (Vanilla) — Estilos con diseño moderno, responsive y variables CSS
- **JavaScript** (Vanilla ES6+) — Lógica de la aplicación sin dependencias
- **Firebase Firestore** — Base de datos (preparado para integración)

## Cómo ejecutar localmente

### Opción 1: Abrir directamente
Abre `index.html` en tu navegador.

### Opción 2: Live Server (recomendado)
Si usas VS Code, instala la extensión **Live Server** y haz clic derecho en `index.html` → "Open with Live Server".

### Opción 3: Servidor Python
```bash
python -m http.server 8000
```
Luego abre `http://localhost:8000` en tu navegador.

## Desplegar en GitHub Pages

1. Sube este repositorio a GitHub
2. Ve a **Settings** → **Pages**
3. En "Source", selecciona la rama `main` y la carpeta `/ (root)`
4. Haz clic en **Save**
5. Tu sitio estará disponible en `https://tu-usuario.github.io/SGTA-UPLA/`

## Configurar Firebase Firestore

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Activa Firestore Database (modo de prueba)
3. Registra una app web en la consola
4. Copia la configuración
5. Edita `js/firebase-config.js` y reemplaza los valores de `firebaseConfig`
6. Descomenta las etiquetas de script de Firebase SDK en los HTML si es necesario

## Estructura del Proyecto

```
SGTA-UPLA/
├── index.html          ← Login
├── admin.html          ← Dashboard Administrador
├── tutor.html          ← Dashboard Tutor
├── student.html        ← Dashboard Estudiante Delegado
├── css/
│   └── styles.css      ← Estilos globales
├── js/
│   ├── app.js          ← Utilidades compartidas e iconos SVG
│   ├── login.js        ← Lógica del login
│   ├── admin.js        ← Lógica del panel admin
│   ├── tutor.js        ← Lógica del panel tutor
│   ├── student.js      ← Lógica del panel estudiante
│   ├── data.js         ← Datos de demostración
│   └── firebase-config.js ← Configuración de Firebase
├── README.md
└── .gitignore
```

## Credenciales de prueba

El sistema usa datos mock. Para ingresar, usa cualquier email y contraseña, y selecciona el rol deseado.

## Licencia

Proyecto académico — Universidad Peruana Los Andes