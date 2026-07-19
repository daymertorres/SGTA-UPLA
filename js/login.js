/* ============================================
   SGTA-UPLA — Login Page Logic
   Firebase Auth integration
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

  // Initialize Firebase
  initFirebase();

  // Toggle Password visibility
  const toggleBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');
  if (toggleBtn && passwordInput) {
    toggleBtn.innerHTML = icon('eye');
    toggleBtn.addEventListener('click', () => {
      const isPass = passwordInput.type === 'password';
      passwordInput.type = isPass ? 'text' : 'password';
      toggleBtn.innerHTML = isPass ? icon('eye-off') : icon('eye');
    });
  }

  // Check if already logged in via Firebase Auth
  if (auth) {
    onAuthChange(async (firebaseUser) => {
      if (window._isLoggingIn) return; // Evitar que onAuthChange redirija durante el envío del formulario de login
      if (firebaseUser) {
        // Ya autenticado, verificar sesión local
        const session = JSON.parse(localStorage.getItem('sgta_session') || 'null');
        if (session && session.role) {
          redirectByRole(session.role);
          return;
        }
        // Si hay auth pero no sesión local, reconstruir sesión
        const userData = await getUserData(firebaseUser.uid, firebaseUser.email);
        if (userData) {
          localStorage.setItem('sgta_session', JSON.stringify({
            uid: firebaseUser.uid,
            email: userData.email,
            nombre: userData.nombre,
            role: userData.rol,
            ciclo: userData.ciclo || '',
            photoURL: userData.photoURL || '',
            loginTime: new Date().toISOString()
          }));
          redirectByRole(userData.rol);
        }
      }
    });
  } else {
    // Fallback: verificar sesión local
    const session = JSON.parse(localStorage.getItem('sgta_session') || 'null');
    if (session) {
      redirectByRole(session.role);
      return;
    }
  }

  // Handle form submit
  const form = document.getElementById('login-form');
  const btnSubmit = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Limpiar errores previos
    Validators.clearFormErrors(form);

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const roleSelect = document.getElementById('role');

    const emailVal = emailInput.value.trim();
    const passwordVal = passwordInput.value;
    const selectedRole = roleSelect.value;

    // Validaciones frontend
    const isValid = Validators.validateForm([
      {
        element: emailInput,
        rules: [
          { validator: Validators.email }
        ]
      },
      {
        element: passwordInput,
        rules: [
          { validator: Validators.required, args: ['La contraseña'] }
        ]
      }
    ]);

    if (!isValid) return;

    // Loading state
    setButtonLoading(btnSubmit, true, 'Verificando...');
    window._isLoggingIn = true;

    try {
      if (!firebaseReady || !auth) {
        // Fallback sin Firebase Auth - solo para desarrollo
        Notifications.warning('Modo offline: Firebase Auth no disponible.');
        const role = selectedRole;
        localStorage.setItem('sgta_session', JSON.stringify({
          email: emailVal,
          nombre: emailVal.split('@')[0],
          role,
          loginTime: new Date().toISOString()
        }));
        redirectByRole(role);
        return;
      }

      // Firebase Auth: iniciar sesión
      const firebaseUser = await signIn(emailVal, passwordVal);

      // Obtener datos del usuario de Firestore
      const userData = await getUserData(firebaseUser.uid, firebaseUser.email);

      if (!userData) {
        Notifications.error('Tu cuenta de autenticación no tiene un perfil en el sistema. Contacta al administrador.');
        await signOutUser();
        setButtonLoading(btnSubmit, false);
        return;
      }

      // Verificar que el usuario está activo
      if (userData.estado !== 'Activo') {
        Notifications.error('Tu cuenta no está activa. Contacta al administrador.');
        await signOutUser();
        setButtonLoading(btnSubmit, false);
        return;
      }

      // Verificar que el rol seleccionado coincide con Firestore
      if (userData.rol !== selectedRole) {
        Notifications.error('Seleccione correctamente su rol.');
        Validators.showFieldError(roleSelect, `Seleccione correctamente su rol. Tu rol asignado es: ${userData.rol}`);
        await signOutUser();
        setButtonLoading(btnSubmit, false);
        window._isLoggingIn = false;
        return;
      }

      // Verificar si el dispositivo está autorizado para este usuario
      const deviceKey = 'sgta_auth_device_' + firebaseUser.uid;
      const isAuthorized = localStorage.getItem(deviceKey) === 'true';

      if (!isAuthorized) {
        // Es un dispositivo nuevo o no verificado
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        window._pendingDeviceVerification = {
          uid: firebaseUser.uid,
          otp: otp,
          userData: userData,
          expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutos
        };

        // Guardar código en Firestore por seguridad y auditoría
        try {
          await db.collection('usuarios').doc(userData.id).update({
            codigoVerificacionDispositivo: {
              codigo: otp,
              expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
            }
          });
        } catch (e) {
          console.warn('No se pudo guardar código OTP en Firestore, procediendo en memoria:', e);
        }

        // Enviar correo con código de verificación
        const emailResult = await EmailService.sendVerificacionDispositivo({
          email: userData.email,
          nombre: userData.nombre,
          codigo: otp,
          dispositivo: navigator.userAgent
        });

        document.getElementById('device-email-display').textContent = userData.email;
        document.getElementById('device-otp-input').value = '';
        const modalOverlay = document.getElementById('device-modal-overlay');
        modalOverlay.classList.add('active');

        if (emailResult && emailResult.success) {
          Notifications.info('Dispositivo nuevo detectado. Hemos enviado un código de 6 dígitos a tu correo.');
        } else {
          const detail = (emailResult && emailResult.text) ? ` (${emailResult.text})` : '';
          Notifications.error(`Error de EmailJS al enviar el código${detail}. Verifica que el Template y Service ID estén guardados en tu cuenta.`);
        }

        setButtonLoading(btnSubmit, false);
        window._isLoggingIn = false;
        return;
      }

      // Guardar sesión local para carga rápida
      localStorage.setItem('sgta_session', JSON.stringify({
        uid: firebaseUser.uid,
        email: userData.email,
        nombre: userData.nombre,
        role: userData.rol,
        ciclo: userData.ciclo || '',
        photoURL: userData.photoURL || '',
        loginTime: new Date().toISOString()
      }));

      Notifications.success('¡Inicio de sesión exitoso!');
      window._isLoggingIn = false;

      // Redirigir después de un breve delay para que se vea el toast
      setTimeout(() => redirectByRole(userData.rol), 500);

    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      window._isLoggingIn = false;

      // Traducir errores de Firebase Auth
      const errorMessages = {
        'auth/user-not-found': 'No existe una cuenta con este correo electrónico.',
        'auth/wrong-password': 'La contraseña es incorrecta.',
        'auth/invalid-email': 'El formato del correo electrónico no es válido.',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
        'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde.',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
        'auth/invalid-credential': 'Credenciales inválidas. Verifica tu correo y contraseña.',
        'auth/invalid-login-credentials': 'Correo o contraseña incorrectos.'
      };

      const message = errorMessages[error.code] || 'Error al iniciar sesión. Inténtalo de nuevo.';
      Notifications.error(message);
      setButtonLoading(btnSubmit, false);
    }
  });

  // Setup forgot password
  setupForgotPassword();

  // Setup device verification
  setupDeviceVerification();
});

/**
 * Configurar funcionalidad de recuperar contraseña
 */
function setupForgotPassword() {
  const forgotLink = document.querySelector('.login-forgot a');
  if (!forgotLink) return;

  forgotLink.addEventListener('click', (e) => {
    e.preventDefault();

    const overlay = document.getElementById('forgot-modal-overlay');
    if (overlay) {
      overlay.classList.add('active');
    }
  });

  // Botón cancelar del modal
  const cancelBtn = document.getElementById('forgot-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      document.getElementById('forgot-modal-overlay').classList.remove('active');
    });
  }

  // Botón enviar del modal
  const sendBtn = document.getElementById('forgot-send');
  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      const emailInput = document.getElementById('forgot-email');
      const emailVal = emailInput.value.trim();

      // Validar email
      const result = Validators.email(emailVal);
      if (!result.valid) {
        Validators.showFieldError(emailInput, result.message);
        return;
      }
      Validators.clearFieldError(emailInput);

      setButtonLoading(sendBtn, true, 'Enviando...');

      try {
        if (db) {
          const checkSnapshot = await db.collection('usuarios').where('email', '==', emailVal).limit(1).get();
          if (checkSnapshot.empty) {
            Validators.showFieldError(emailInput, 'Este correo institucional no se encuentra registrado en nuestra base de datos.');
            setButtonLoading(sendBtn, false);
            return;
          }
        }
        if (auth) {
          await resetPassword(emailVal);
        }
        // Enviar email de notificación (en paralelo, no bloquea)
        EmailService.sendRecuperacion({ email: emailVal });

        Notifications.success('Se ha enviado un enlace de recuperación a tu correo.');
        document.getElementById('forgot-modal-overlay').classList.remove('active');
        emailInput.value = '';
      } catch (error) {
        console.error('Error al enviar email de recuperación:', error);
        if (error.code === 'auth/user-not-found') {
          Notifications.error('No existe una cuenta con este correo.');
        } else {
          Notifications.error('Error al enviar el correo. Inténtalo de nuevo.');
        }
      } finally {
        setButtonLoading(sendBtn, false);
      }
    });
  }
}

/**
 * Configurar verificación de dispositivo nuevo mediante OTP
 */
function setupDeviceVerification() {
  const cancelBtn = document.getElementById('device-cancel');
  const verifyBtn = document.getElementById('device-verify');
  const overlay = document.getElementById('device-modal-overlay');

  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      overlay.classList.remove('active');
      await signOutUser();
      Notifications.warning('Inicio de sesión cancelado.');
    });
  }

  if (verifyBtn) {
    verifyBtn.addEventListener('click', () => {
      const otpInput = document.getElementById('device-otp-input');
      const enteredOtp = otpInput.value.trim();
      const pending = window._pendingDeviceVerification;

      if (!pending) {
        Notifications.error('No hay una verificación pendiente. Intenta iniciar sesión nuevamente.');
        overlay.classList.remove('active');
        return;
      }

      if (Date.now() > pending.expiresAt) {
        Validators.showFieldError(otpInput, 'El código ha expirado. Inicia sesión nuevamente.');
        return;
      }

      if (enteredOtp !== pending.otp) {
        Validators.showFieldError(otpInput, 'Código de verificación incorrecto.');
        return;
      }

      Validators.clearFieldError(otpInput);

      // Autorizar dispositivo en localStorage para futuros accesos
      const deviceKey = 'sgta_auth_device_' + pending.uid;
      localStorage.setItem(deviceKey, 'true');

      // Guardar sesión y redirigir
      const userData = pending.userData;
      localStorage.setItem('sgta_session', JSON.stringify({
        uid: pending.uid,
        email: userData.email,
        nombre: userData.nombre,
        role: userData.rol,
        ciclo: userData.ciclo || '',
        photoURL: userData.photoURL || '',
        loginTime: new Date().toISOString()
      }));

      overlay.classList.remove('active');
      Notifications.success('Dispositivo verificado y autorizado con éxito.');
      setTimeout(() => redirectByRole(userData.rol), 500);
    });
  }
}
