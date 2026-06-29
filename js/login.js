/* ============================================
   SGTA-UPLA — Login Page Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Insert icons
  document.getElementById('login-icon-grad').innerHTML = icon('graduation-cap');
  document.getElementById('card-icon-grad').innerHTML = icon('graduation-cap');
  document.getElementById('feature-icon-1').innerHTML = icon('users');
  document.getElementById('feature-icon-2').innerHTML = icon('book-open');
  document.getElementById('icon-mail').innerHTML = icon('mail');
  document.getElementById('icon-lock').innerHTML = icon('lock');
  document.getElementById('icon-chevron').innerHTML = icon('chevron-down');

  // Initialize Firebase (optional)
  initFirebase();

  // Check if already logged in
  const session = JSON.parse(localStorage.getItem('sgta_session') || 'null');
  if (session) {
    redirectToDashboard(session.role);
    return;
  }

  // Handle form submit
  const form = document.getElementById('login-form');
  const btnSubmit = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Simulate loading
    const originalText = btnSubmit.innerText;
    btnSubmit.innerText = "Verificando...";
    btnSubmit.disabled = true;

    try {
      if (!firebaseReady) {
        // Fallback to local data matching
        alert("Modo offline: usando roles seleccionados.");
        const role = document.getElementById('role').value;
        localStorage.setItem('sgta_session', JSON.stringify({ email, role, loginTime: new Date().toISOString() }));
        redirectToDashboard(role);
        return;
      }

      // Query Firestore
      const user = await getDocument('usuarios', email);
      
      if (!user) {
        alert("Usuario no encontrado en la base de datos.");
        btnSubmit.innerText = originalText;
        btnSubmit.disabled = false;
        return;
      }

      if (user.estado !== 'Activo') {
        alert("Tu cuenta no está activa.");
        btnSubmit.innerText = originalText;
        btnSubmit.disabled = false;
        return;
      }

      const selectedRole = document.getElementById('role').value;
      if (user.rol !== selectedRole) {
        alert(`El rol seleccionado no coincide con el de tu cuenta (${user.rol}).`);
        btnSubmit.innerText = originalText;
        btnSubmit.disabled = false;
        return;
      }

      if (!user.password || user.password !== password) {
        alert("Contraseña incorrecta o usuario sin contraseña asignada.");
        btnSubmit.innerText = originalText;
        btnSubmit.disabled = false;
        return;
      }

      // Store session using DB info
      localStorage.setItem('sgta_session', JSON.stringify({
        email: user.email,
        nombre: user.nombre,
        role: user.rol,
        ciclo: user.ciclo,
        loginTime: new Date().toISOString()
      }));

      // Redirect based on actual role from DB
      redirectToDashboard(user.rol);
    } catch (error) {
      console.error(error);
      alert("Error al iniciar sesión.");
      btnSubmit.innerText = originalText;
      btnSubmit.disabled = false;
    }
  });
});

function redirectToDashboard(role) {
  switch (role) {
    case 'Administrador':
      window.location.href = 'admin.html';
      break;
    case 'Tutor':
      window.location.href = 'tutor.html';
      break;
    case 'Estudiante Delegado':
    default:
      window.location.href = 'student.html';
      break;
  }
}
