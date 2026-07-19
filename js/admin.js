/* ============================================
   SGTA-UPLA — Admin Dashboard Logic
   Full CRUD, search, filter, pagination, real-time
   ============================================ */

/* ---------- GLOBAL STATE ---------- */
let adminUsersCache = [];
let adminTutoriasCache = [];
let adminCurrentPage = { users: 1, tutorias: 1 };
const PAGE_SIZE = 10;

/* ---------- INITIALIZATION ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  EmailService.init();
  const session = checkAuth('Administrador');
  if (!session) return;

  // Insert header icons
  document.getElementById('sidebar-icon').innerHTML = icon('shield');
  document.getElementById('logout-icon').innerHTML = icon('log-out');
  document.getElementById('toggle-sidebar').innerHTML = icon('x');
  document.getElementById('search-icon').innerHTML = icon('search');
  document.getElementById('bell-icon').innerHTML = icon('bell');
  document.getElementById('user-avatar-icon').innerHTML = icon('shield');

  // Setup user info from session
  setupUserInfo(session);

  // Build sidebar menu
  const menuItems = [
    { icon: 'home', label: 'Inicio', section: 'inicio', badge: null },
    { icon: 'users', label: 'Gestión de Usuarios', section: 'gestion-usuarios', badge: null },
    { icon: 'user-circle', label: 'Tutores', section: 'tutores', badge: null },
    { icon: 'user-check', label: 'Delegados', section: 'delegados', badge: null },
    { icon: 'book-open', label: 'Tutorías', section: 'tutorias', badge: null },
    { icon: 'bar-chart-3', label: 'Reportes', section: 'reportes', badge: null },
    { icon: 'calendar', label: 'Calendario Global', section: 'calendario', badge: null },
    { icon: 'settings', label: 'Configuración', section: 'configuracion', badge: null }
  ];

  const menuEl = document.getElementById('sidebar-menu');
  menuItems.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.className = `menu-item${idx === 0 ? ' active' : ''}`;
    btn.dataset.section = item.section;
    btn.innerHTML = `
      ${icon(item.icon)}
      <span class="menu-label">${item.label}</span>
      ${item.badge ? `<span class="menu-badge">${item.badge}</span>` : ''}
    `;
    menuEl.appendChild(btn);
  });

  // Build all sections
  buildAllSections();

  // Initialize dashboard behaviors
  initDashboard();

  // Setup notifications
  if (session.uid) {
    Notifications.setupNotificationButton(session.uid);
  }

  // Setup global search
  setupGlobalSearch();

  // Load dynamic data from Firestore
  initAdminData();
});

/* ---------- GLOBAL SEARCH ---------- */
function setupGlobalSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    if (query.length < 2) return;

    // Search across visible table
    const activeSection = document.querySelector('.section.active');
    if (!activeSection) return;

    const rows = activeSection.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });
}

/* ---------- DATA LOADING ---------- */
async function initAdminData() {
  if (!firebaseReady) {
    console.warn("Firebase no inicializado, los datos no cargarán de la nube.");
    return;
  }
  
  showLoader('Cargando datos del sistema...');
  try {
    await Promise.all([
      loadDashboardData(),
      loadAdminUsers(),
      loadAdminTutorias(),
      loadAdminTutores(),
      loadAdminDelegados()
    ]);
  } catch (err) {
    console.error('Error cargando datos:', err);
    Notifications.error('Error al cargar los datos del sistema.');
  } finally {
    hideLoader();
  }
}

/* ============================================
   CRUD: USUARIOS
   ============================================ */

async function loadAdminUsers(filterRole = null) {
  const tbody = document.getElementById('admin-users-list');
  if (!tbody) return;

  try {
    let users;
    if (filterRole && filterRole !== 'Todos los Roles') {
      const roleMap = {
        'Tutores': 'Tutor',
        'Delegados': 'Estudiante Delegado',
        'Estudiantes': 'Estudiante Delegado',
        'Administradores': 'Administrador'
      };
      const firestoreRole = roleMap[filterRole] || filterRole;
      users = await queryCollection('usuarios', 'rol', '==', firestoreRole);
    } else {
      users = await getCollection('usuarios');
    }

    adminUsersCache = users;

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No hay usuarios registrados.</td></tr>';
      updatePagination('users', 0);
      return;
    }

    // Paginación
    const totalPages = Math.ceil(users.length / PAGE_SIZE);
    const page = Math.min(adminCurrentPage.users, totalPages);
    adminCurrentPage.users = page;
    const start = (page - 1) * PAGE_SIZE;
    const paged = users.slice(start, start + PAGE_SIZE);

    tbody.innerHTML = paged.map(user => {
      const roleBadge = getBadgeClass(user.rol);
      const estadoBadge = getBadgeClass(user.estado);
      return `
        <tr>
          <td class="text-gray-600">#${user.id.substring(0,6)}</td>
          <td>
            <div class="user-cell">
              <div class="mini-avatar"><span>${getInitials(user.nombre)}</span></div>
              <span class="text-gray-900">${Validators.sanitize(user.nombre)}</span>
            </div>
          </td>
          <td class="text-gray-600">${Validators.sanitize(user.email)}</td>
          <td><span class="badge ${roleBadge}">${user.rol}</span></td>
          <td class="text-gray-600">${user.ciclo || '-'}</td>
          <td><span class="badge ${estadoBadge}">${user.estado}</span></td>
          <td class="text-gray-900">${user.tutorias || 0}</td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button class="link-btn" onclick="openUserModal('${user.id}')" title="Editar">${icon('edit')}</button>
              <button class="link-btn" style="color: #ef4444;" onclick="confirmDeleteUser('${user.id}', '${Validators.sanitize(user.nombre)}')" title="Eliminar">${icon('trash-2')}</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Render pagination
    updatePagination('users', totalPages);

  } catch (error) {
    console.error("Error cargando usuarios:", error);
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Error al cargar usuarios.</td></tr>';
  }
}

function updatePagination(type, totalPages) {
  const containerId = `pagination-${type}`;
  const container = document.getElementById(containerId);
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = renderPagination({
    currentPage: adminCurrentPage[type],
    totalPages,
    containerId
  });

  // Attach page change events
  container.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page);
      if (page >= 1 && page <= totalPages) {
        adminCurrentPage[type] = page;
        if (type === 'users') loadAdminUsers();
        if (type === 'tutorias') loadAdminTutorias();
      }
    });
  });
}

/* Modal Functions for Users */
window.openUserModal = function(userId = null) {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('user-form');
  
  Validators.clearFormErrors(form);
  document.getElementById('user-id').value = '';

  const toggleBtn = document.getElementById('toggle-user-password');
  const passwordInput = document.getElementById('user-password');
  if (toggleBtn && passwordInput && !toggleBtn._hasToggleListener) {
    toggleBtn.innerHTML = icon('eye');
    toggleBtn.addEventListener('click', () => {
      const isPass = passwordInput.type === 'password';
      passwordInput.type = isPass ? 'text' : 'password';
      toggleBtn.innerHTML = isPass ? icon('eye-off') : icon('eye');
    });
    toggleBtn._hasToggleListener = true;
  }

  if (userId && adminUsersCache.length > 0) {
    title.innerText = 'Editar Usuario';
    const user = adminUsersCache.find(u => u.id === userId);
    if (user) {
      document.getElementById('user-id').value = user.id;
      document.getElementById('user-name').value = user.nombre || '';
      document.getElementById('user-email').value = user.email || '';
      document.getElementById('user-password').value = '';
      document.getElementById('user-password').required = false;
      document.getElementById('user-password').placeholder = "Dejar en blanco para no cambiar";
      document.getElementById('user-role').value = user.rol || 'Estudiante Delegado';
      document.getElementById('user-ciclo').value = user.ciclo || '';
      document.getElementById('user-especialidad').value = user.especialidad || '';
      document.getElementById('user-state').value = user.estado || 'Activo';
      
      document.getElementById('user-email').disabled = true;
    }
  } else {
    title.innerText = 'Crear Usuario';
    document.getElementById('user-email').disabled = false;
    document.getElementById('user-password').required = true;
    document.getElementById('user-password').placeholder = "Mínimo 8 caracteres";
  }

  const roleSelect = document.getElementById('user-role');
  const updateRoleUI = () => {
    const r = roleSelect.value;
    const cicloIn = document.getElementById('user-ciclo');
    const espIn = document.getElementById('user-especialidad');
    if (r === 'Tutor') {
      espIn.placeholder = "Ej: Matemáticas (* Obligatorio)";
      espIn.style.borderColor = "var(--blue-500)";
      cicloIn.placeholder = "No aplica";
    } else if (r === 'Estudiante Delegado') {
      cicloIn.placeholder = "Ej: VIII (* Obligatorio)";
      cicloIn.style.borderColor = "var(--blue-500)";
      espIn.placeholder = "No aplica";
    } else {
      cicloIn.placeholder = "Opcional";
      espIn.placeholder = "Opcional";
    }
  };
  roleSelect.onchange = updateRoleUI;
  updateRoleUI();

  overlay.classList.add('active');
};

window.closeUserModal = function() {
  document.getElementById('modal-overlay').classList.remove('active');
};

window.saveUser = async function() {
  const btn = document.getElementById('btn-save-user');
  const form = document.getElementById('user-form');
  
  Validators.clearFormErrors(form);

  const id = document.getElementById('user-id').value;
  const nombreInput = document.getElementById('user-name');
  const emailInput = document.getElementById('user-email');
  const passwordInput = document.getElementById('user-password');
  const rolSelect = document.getElementById('user-role');
  const cicloInput = document.getElementById('user-ciclo');
  const especialidadInput = document.getElementById('user-especialidad');
  const estadoSelect = document.getElementById('user-state');

  // Validaciones
  const fields = [
    { element: nombreInput, rules: [
      { validator: Validators.noSpecialChars, args: ['El nombre'] }
    ]},
    { element: rolSelect, rules: [
      { validator: Validators.required, args: ['El rol'] }
    ]}
  ];

  if (!id) {
    // Solo validar email y password en creación
    fields.push(
      { element: emailInput, rules: [{ validator: Validators.email }] },
      { element: passwordInput, rules: [{ validator: Validators.password }] }
    );
  }

  if (!Validators.validateForm(fields)) return;

  const rolVal = rolSelect.value;
  if (rolVal === 'Tutor' && !especialidadInput.value.trim()) {
    Validators.showFieldError(especialidadInput, 'La especialidad es obligatoria para un Tutor.');
    Notifications.warning('Para crear o actualizar un Tutor, debes ingresar obligatoriamente su especialidad.');
    return;
  } else {
    Validators.clearFieldError(especialidadInput);
  }

  if (rolVal === 'Estudiante Delegado' && !cicloInput.value.trim()) {
    Validators.showFieldError(cicloInput, 'El ciclo es obligatorio para un Estudiante Delegado.');
    Notifications.warning('Para crear o actualizar un Estudiante Delegado, debes ingresar obligatoriamente su ciclo.');
    return;
  } else {
    Validators.clearFieldError(cicloInput);
  }

  // Verificar duplicado de email en creación
  if (!id) {
    const dupCheck = await Validators.checkDuplicate('usuarios', 'email', emailInput.value.trim());
    if (!dupCheck.valid) {
      Validators.showFieldError(emailInput, 'Ya existe un usuario con este correo.');
      return;
    }
  }

  setButtonLoading(btn, true, 'Guardando...');

  const nombre = Validators.cleanSpaces(nombreInput.value);
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const rol = rolSelect.value;
  const ciclo = Validators.cleanSpaces(cicloInput.value);
  const especialidad = Validators.cleanSpaces(especialidadInput.value);
  const estado = estadoSelect.value;

  const data = { nombre, email, rol, ciclo, especialidad, estado };

  try {
    if (id) {
      // Update en Firestore
      await updateDocument('usuarios', id, data);
      Notifications.success('Usuario actualizado exitosamente.');
    } else {
      // Crear en Firebase Auth + Firestore
      let uid = null;
      try {
        uid = await createUserWithoutSignIn(email, password);
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-in-use') {
          Validators.showFieldError(emailInput, 'Este correo ya está registrado en el sistema de autenticación.');
          setButtonLoading(btn, false);
          return;
        }
        throw authErr;
      }

      // Guardar en Firestore con el UID como ID del documento
      data.uid = uid;
      data.tutorias = 0;
      data.materias = [];
      data.photoURL = '';
      await addDocument('usuarios', data, uid);

      // Enviar email de bienvenida
      EmailService.sendRegistro({ email, nombre, rol });

      // Crear notificación
      Notifications.createNotification({
        userId: uid,
        titulo: 'Bienvenido a SGTA-UPLA',
        mensaje: `Tu cuenta ha sido creada con el rol de ${rol}.`,
        tipo: 'sistema'
      });

      Notifications.success('Usuario creado exitosamente.');
    }

    closeUserModal();
    await loadAdminUsers();
    await loadDashboardData();

  } catch (err) {
    console.error('Error saving user:', err);
    Notifications.error('Error al guardar el usuario: ' + (err.message || 'Error desconocido'));
  } finally {
    setButtonLoading(btn, false);
  }
};

window.confirmDeleteUser = function(id, nombre) {
  Notifications.confirm(
    'Eliminar Usuario',
    `¿Estás seguro de que deseas eliminar a "${nombre}"? Esta acción no se puede deshacer.`,
    async () => {
      try {
        await deleteDocument('usuarios', id);
        Notifications.success('Usuario eliminado correctamente.');
        await loadAdminUsers();
        await loadDashboardData();
      } catch (error) {
        console.error("Error al eliminar usuario:", error);
        Notifications.error('Error al eliminar el usuario.');
      }
    },
    { confirmText: 'Eliminar', type: 'danger' }
  );
};

/* ============================================
   CRUD: TUTORÍAS
   ============================================ */

async function loadAdminTutorias(filterEstado = null) {
  const tbody = document.getElementById('admin-tutorias-list');
  if (!tbody) return;

  try {
    let tutorias;
    if (filterEstado && filterEstado !== 'Todos los Estados') {
      tutorias = await queryCollection('tutorias', 'estado', '==', filterEstado);
    } else {
      tutorias = await getCollection('tutorias');
    }

    adminTutoriasCache = tutorias;

    if (tutorias.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem;">No hay tutorías registradas.</td></tr>';
      updatePagination('tutorias', 0);
      return;
    }

    // Paginación
    const totalPages = Math.ceil(tutorias.length / PAGE_SIZE);
    const page = Math.min(adminCurrentPage.tutorias, totalPages);
    adminCurrentPage.tutorias = page;
    const start = (page - 1) * PAGE_SIZE;
    const paged = tutorias.slice(start, start + PAGE_SIZE);

    tbody.innerHTML = paged.map(t => `
      <tr>
        <td class="text-gray-600">#${t.id.substring(0,6)}</td>
        <td class="text-gray-900">${Validators.sanitize(t.estudiante || t.student || '-')}</td>
        <td class="text-gray-900">${Validators.sanitize(t.tutor || '-')}</td>
        <td class="text-gray-600">${Validators.sanitize(t.materia || t.subject || '-')}</td>
        <td class="text-gray-600">${t.fecha || t.requestedDate || '-'}</td>
        <td class="text-gray-600">${t.hora || t.time || '-'}</td>
        <td class="text-gray-600">${t.ciclo || '-'}</td>
        <td><span class="badge ${getBadgeClass(t.estado)}">${t.estado}</span></td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            <button class="link-btn" onclick="openTutoriaModal('${t.id}')" title="Editar">${icon('edit')}</button>
            <button class="link-btn" style="color: #ef4444;" onclick="confirmDeleteTutoria('${t.id}')" title="Eliminar">${icon('trash-2')}</button>
          </div>
        </td>
      </tr>
    `).join('');

    updatePagination('tutorias', totalPages);
  } catch (error) {
    console.error("Error cargando tutorías:", error);
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: red;">Error al cargar tutorías.</td></tr>';
  }
}

/* Modal de Tutoría */
window.openTutoriaModal = async function(tutoriaId = null) {
  const overlay = document.getElementById('tutoria-modal-overlay');
  const title = document.getElementById('tutoria-modal-title');
  const form = document.getElementById('tutoria-form');

  Validators.clearFormErrors(form);
  form.reset();
  document.getElementById('tutoria-id').value = '';

  // Cargar opciones dinámicas
  await loadTutoriaSelectOptions();

  if (tutoriaId) {
    title.innerText = 'Editar Tutoría';
    const t = adminTutoriasCache.find(x => x.id === tutoriaId);
    if (t) {
      document.getElementById('tutoria-id').value = t.id;
      document.getElementById('tutoria-materia').value = t.materia || t.subject || '';
      document.getElementById('tutoria-fecha').value = t.fecha || t.requestedDate || '';
      document.getElementById('tutoria-hora').value = t.hora || t.time || '';
      document.getElementById('tutoria-duracion').value = t.duracion || '1 hora';
      document.getElementById('tutoria-ubicacion').value = t.ubicacion || t.location || 'Virtual';
      document.getElementById('tutoria-estado').value = t.estado || 'Pendiente';
      document.getElementById('tutoria-observaciones').value = t.observaciones || '';

      // Seleccionar estudiante y tutor
      const estSelect = document.getElementById('tutoria-estudiante');
      const tutSelect = document.getElementById('tutoria-tutor');
      const estName = t.estudiante || t.student || '';
      const tutName = t.tutor || '';

      for (let o of estSelect.options) { if (o.value === estName) o.selected = true; }
      for (let o of tutSelect.options) { if (o.value === tutName) o.selected = true; }
    }
  } else {
    title.innerText = 'Crear Tutoría';
  }

  overlay.classList.add('active');
};

async function loadTutoriaSelectOptions() {
  const estSelect = document.getElementById('tutoria-estudiante');
  const tutSelect = document.getElementById('tutoria-tutor');

  // Cargar estudiantes
  const students = await queryCollection('usuarios', 'rol', '==', 'Estudiante Delegado');
  estSelect.innerHTML = '<option value="">Seleccionar estudiante...</option>' +
    students.map(s => `<option value="${Validators.sanitize(s.nombre)}">${Validators.sanitize(s.nombre)}</option>`).join('');

  // Cargar tutores
  const tutors = await queryCollection('usuarios', 'rol', '==', 'Tutor');
  tutSelect.innerHTML = '<option value="">Seleccionar tutor...</option>' +
    tutors.map(t => `<option value="${Validators.sanitize(t.nombre)}">${Validators.sanitize(t.nombre)}</option>`).join('');
}

window.closeTutoriaModal = function() {
  document.getElementById('tutoria-modal-overlay').classList.remove('active');
};

window.saveTutoria = async function() {
  const btn = document.getElementById('btn-save-tutoria');
  const form = document.getElementById('tutoria-form');

  Validators.clearFormErrors(form);

  const id = document.getElementById('tutoria-id').value;
  const estudianteSelect = document.getElementById('tutoria-estudiante');
  const tutorSelect = document.getElementById('tutoria-tutor');
  const materiaInput = document.getElementById('tutoria-materia');
  const fechaInput = document.getElementById('tutoria-fecha');
  const horaInput = document.getElementById('tutoria-hora');

  const isValid = Validators.validateForm([
    { element: estudianteSelect, rules: [{ validator: Validators.selectRequired, args: ['El estudiante'] }] },
    { element: tutorSelect, rules: [{ validator: Validators.selectRequired, args: ['El tutor'] }] },
    { element: materiaInput, rules: [{ validator: Validators.required, args: ['La materia'] }] },
    { element: fechaInput, rules: [{ validator: Validators.date, args: [{ allowPast: !!id }] }] },
    { element: horaInput, rules: [{ validator: Validators.time }] }
  ]);

  if (!isValid) return;

  setButtonLoading(btn, true, 'Guardando...');

  const data = {
    estudiante: estudianteSelect.value,
    tutor: tutorSelect.value,
    materia: Validators.cleanSpaces(materiaInput.value),
    fecha: fechaInput.value,
    hora: horaInput.value,
    duracion: document.getElementById('tutoria-duracion').value,
    ubicacion: document.getElementById('tutoria-ubicacion').value,
    estado: document.getElementById('tutoria-estado').value,
    observaciones: document.getElementById('tutoria-observaciones').value.trim()
  };

  try {
    if (id) {
      const oldTutoria = adminTutoriasCache.find(t => t.id === id);
      await updateDocument('tutorias', id, data);

      // Si cambió de estado, enviar notificaciones
      if (oldTutoria && oldTutoria.estado !== data.estado) {
        notifyTutoriaStateChange(data, oldTutoria.estado);
      }

      Notifications.success('Tutoría actualizada exitosamente.');
    } else {
      const newId = await addDocument('tutorias', data);
      
      // Notificaciones
      notifyNewTutoria(data);

      Notifications.success('Tutoría creada exitosamente.');
    }

    closeTutoriaModal();
    await loadAdminTutorias();
    await loadDashboardData();
  } catch (err) {
    console.error('Error saving tutoría:', err);
    Notifications.error('Error al guardar la tutoría.');
  } finally {
    setButtonLoading(btn, false);
  }
};

window.confirmDeleteTutoria = function(id) {
  Notifications.confirm(
    'Eliminar Tutoría',
    '¿Estás seguro de que deseas eliminar esta tutoría? Esta acción no se puede deshacer.',
    async () => {
      try {
        await deleteDocument('tutorias', id);
        Notifications.success('Tutoría eliminada correctamente.');
        await loadAdminTutorias();
        await loadDashboardData();
      } catch (err) {
        Notifications.error('Error al eliminar la tutoría.');
      }
    },
    { confirmText: 'Eliminar', type: 'danger' }
  );
};

/* ---------- NOTIFICATIONS FOR TUTORÍAS ---------- */
async function notifyNewTutoria(data) {
  // Buscar IDs de usuario
  const students = await queryCollection('usuarios', 'nombre', '==', data.estudiante);
  const tutors = await queryCollection('usuarios', 'nombre', '==', data.tutor);

  if (students.length > 0) {
    Notifications.createNotification({
      userId: students[0].id,
      titulo: 'Nueva tutoría programada',
      mensaje: `Se ha programado una tutoría de ${data.materia} con ${data.tutor} para el ${data.fecha} a las ${data.hora}.`,
      tipo: 'tutoria',
      link: 'mis-tutorias'
    });
    EmailService.sendNuevaTutoria({
      email: students[0].email, nombre: students[0].nombre,
      tutor: data.tutor, estudiante: data.estudiante,
      materia: data.materia, fecha: data.fecha, hora: data.hora, ubicacion: data.ubicacion
    });
  }

  if (tutors.length > 0) {
    Notifications.createNotification({
      userId: tutors[0].id,
      titulo: 'Nueva tutoría asignada',
      mensaje: `Se te ha asignado una tutoría de ${data.materia} con ${data.estudiante} para el ${data.fecha}.`,
      tipo: 'tutoria',
      link: 'mis-tutorias'
    });
  }
}

async function notifyTutoriaStateChange(data, oldEstado) {
  const students = await queryCollection('usuarios', 'nombre', '==', data.estudiante);
  const tutors = await queryCollection('usuarios', 'nombre', '==', data.tutor);

  const stateMessages = {
    'Aceptada': `Tu tutoría de ${data.materia} ha sido aceptada.`,
    'Rechazada': `Tu tutoría de ${data.materia} ha sido rechazada.`,
    'Cancelada': `La tutoría de ${data.materia} del ${data.fecha} ha sido cancelada.`,
    'Finalizada': `La tutoría de ${data.materia} del ${data.fecha} ha sido finalizada.`
  };

  const msg = stateMessages[data.estado] || `El estado de tu tutoría de ${data.materia} cambió a: ${data.estado}`;

  [students, tutors].forEach(users => {
    if (users.length > 0) {
      Notifications.createNotification({
        userId: users[0].id,
        titulo: `Tutoría ${data.estado}`,
        mensaje: msg,
        tipo: 'tutoria'
      });
    }
  });

  // Emails para estados importantes
  if (students.length > 0) {
    if (data.estado === 'Aceptada') {
      EmailService.sendAceptacion({
        email: students[0].email, nombre: students[0].nombre,
        tutor: data.tutor, materia: data.materia, fecha: data.fecha, hora: data.hora
      });
    } else if (data.estado === 'Cancelada') {
      EmailService.sendCancelacion({
        email: students[0].email, nombre: students[0].nombre,
        materia: data.materia, fecha: data.fecha, hora: data.hora
      });
    } else if (data.estado === 'Finalizada') {
      EmailService.sendFinalizacion({
        email: students[0].email, nombre: students[0].nombre,
        tutor: data.tutor, materia: data.materia, fecha: data.fecha,
        observaciones: data.observaciones
      });
    }
  }
}

/* ============================================
   TUTORES & DELEGADOS (Read + Stats)
   ============================================ */

async function loadAdminTutores() {
  const tbody = document.getElementById('admin-tutores-list');
  if (!tbody) return;

  try {
    const tutores = await queryCollection('usuarios', 'rol', '==', 'Tutor');
    const allTutorias = await getCollection('tutorias');
    
    // Update stats
    const statEl = document.getElementById('stat-tutores-activos');
    if (statEl) statEl.innerText = tutores.filter(t => t.estado === 'Activo').length;

    const statTutoriasMes = document.getElementById('stat-tutorias-mes-tutores');
    if (statTutoriasMes) statTutoriasMes.innerText = allTutorias.length;

    const statEstudiantesAtendidos = document.getElementById('stat-estudiantes-atendidos');
    if (statEstudiantesAtendidos) {
      const uniqueStudents = new Set(allTutorias.map(t => t.estudiante || t.student).filter(Boolean));
      statEstudiantesAtendidos.innerText = uniqueStudents.size;
    }

    if (tutores.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No hay tutores registrados.</td></tr>';
      return;
    }

    tbody.innerHTML = tutores.map(tutor => {
      const materias = tutor.materias || [];
      const materiasHtml = materias.slice(0, 2).map(m => `<span class="tag tag-blue">${Validators.sanitize(m)}</span>`).join('');
      const extra = materias.length > 2 ? `<span class="tag tag-gray">+${materias.length - 2}</span>` : '';
      const tutorTutorias = allTutorias.filter(t => t.tutor === tutor.nombre);
      const tutorStudents = new Set(tutorTutorias.map(t => t.estudiante || t.student).filter(Boolean));

      return `
        <tr>
          <td>
            <div class="user-cell">
              <div class="avatar-md" style="background:linear-gradient(135deg,var(--green-400),var(--green-500))">${icon('graduation-cap')}</div>
              <span class="text-gray-900">${Validators.sanitize(tutor.nombre)}</span>
            </div>
          </td>
          <td class="text-gray-600">${Validators.sanitize(tutor.especialidad || 'General')}</td>
          <td><div class="tags">${materiasHtml}${extra}</div></td>
          <td class="text-gray-900">${tutorTutorias.length}</td>
          <td class="text-gray-900">${tutorStudents.size}</td>
          <td><span class="badge ${getBadgeClass(tutor.estado)}">${tutor.estado}</span></td>
          <td>
            <button class="link-btn" onclick="openUserModal('${tutor.id}')">Editar</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error("Error cargando tutores:", error);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error al cargar tutores.</td></tr>';
  }
}

async function loadAdminDelegados() {
  const container = document.getElementById('admin-delegados-list');
  if (!container) return;

  try {
    const delegados = await queryCollection('usuarios', 'rol', '==', 'Estudiante Delegado');
    
    if (delegados.length === 0) {
      container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666; grid-column: span 3;">No hay delegados asignados.</div>';
      return;
    }

    container.innerHTML = delegados.map(d => `
      <div class="delegado-card">
        <div class="delegado-header">
          <div class="avatar-lg" style="background:linear-gradient(135deg,var(--purple-400),var(--purple-600))">${icon('shield')}</div>
          <div>
            <p class="text-gray-900">${Validators.sanitize(d.nombre)}</p>
            <p class="text-sm text-purple-600">Ciclo ${d.ciclo || 'N/A'}</p>
          </div>
        </div>
        <div class="delegado-stats">
          <div class="delegado-stat"><span class="text-gray-600">Email:</span><span class="text-gray-900" style="font-size: 0.8rem">${Validators.sanitize(d.email)}</span></div>
          <div class="delegado-stat"><span class="text-gray-600">Tutorías:</span><span class="text-gray-900">${d.tutorias || 0}</span></div>
          <div class="delegado-stat"><span class="text-gray-600">Estado:</span><span class="${d.estado === 'Activo' ? 'text-green-600' : 'text-amber-600'}">${d.estado}</span></div>
        </div>
        <button class="btn btn-purple-soft btn-full" onclick="openUserModal('${d.id}')">Editar</button>
      </div>
    `).join('');
  } catch (error) {
    console.error("Error cargando delegados:", error);
    container.innerHTML = '<div style="padding: 2rem; text-align: center; color: red; grid-column: span 3;">Error al cargar delegados.</div>';
  }
}

/* ============================================
   DASHBOARD DATA (Real from Firestore)
   ============================================ */
async function loadDashboardData() {
  try {
    const [allUsers, allTutorias] = await Promise.all([
      getCollection('usuarios'),
      getCollection('tutorias')
    ]);

    const tutores = allUsers.filter(u => u.rol === 'Tutor');
    const delegados = allUsers.filter(u => u.rol === 'Estudiante Delegado');
    const admins = allUsers.filter(u => u.rol === 'Administrador');

    const tutoresActivos = tutores.filter(u => u.estado === 'Activo').length;
    const tutoresPendientes = tutores.filter(u => u.estado !== 'Activo').length;
    const delegadosActivos = delegados.filter(u => u.estado === 'Activo').length;
    const delegadosPendientes = delegados.filter(u => u.estado !== 'Activo').length;
    const adminsActivos = admins.filter(u => u.estado === 'Activo').length;
    const adminsPendientes = admins.filter(u => u.estado !== 'Activo').length;

    // Count tutorías del mes actual
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const tutoriasDelMes = allTutorias.filter(t => {
      if (t.fecha) {
        const d = new Date(t.fecha);
        if (!isNaN(d.getTime())) return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }
      if (t.createdAt && t.createdAt.toDate) {
        const d = t.createdAt.toDate();
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }
      return false;
    }).length;

    const tutoriasCount = tutoriasDelMes > 0 ? tutoriasDelMes : allTutorias.length;

    // Update stat cards
    const setEl = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.innerText = value;
    };

    setEl('dash-total-users', allUsers.length);
    setEl('dash-tutores-activos', tutoresActivos);
    setEl('dash-delegados', delegados.length);
    setEl('dash-tutorias-mes', tutoriasCount);

    // Update trend badges
    const setTrend = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `${icon('trending-up')}<span>${text}</span>`;
    };

    setTrend('dash-trend-users', `+${allUsers.length}`);
    setTrend('dash-trend-tutores', `+${tutoresActivos}`);
    setTrend('dash-trend-delegados', `${delegadosActivos}/${delegados.length}`);
    setTrend('dash-trend-tutorias', `+${tutoriasCount}`);

    // Management cards
    setEl('mgmt-tutores-total', tutores.length);
    setEl('mgmt-tutores-activos', tutoresActivos);
    setEl('mgmt-tutores-pendientes', tutoresPendientes);
    setEl('mgmt-delegados-total', delegados.length);
    setEl('mgmt-delegados-activos', delegadosActivos);
    setEl('mgmt-delegados-pendientes', delegadosPendientes);
    setEl('mgmt-admins-total', admins.length);
    setEl('mgmt-admins-activos', adminsActivos);
    setEl('mgmt-admins-pendientes', adminsPendientes);

    // Update sidebar badges
    document.querySelectorAll('.menu-item').forEach(btn => {
      const section = btn.dataset.section;
      let badge = btn.querySelector('.menu-badge');
      const createBadge = (count) => {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'menu-badge';
          btn.appendChild(badge);
        }
        badge.innerText = count;
      };
      if (section === 'tutores') createBadge(tutores.length);
      if (section === 'delegados') createBadge(delegados.length);
    });

    // Load recent activity
    loadRecentActivity(allUsers, allTutorias);

    // Update reportes stats
    setEl('report-total-tutorias', allTutorias.length);
    const completadas = allTutorias.filter(t => t.estado === 'Finalizada' || t.estado === 'Completada');
    const asistencia = allTutorias.length > 0 ? Math.round((completadas.length / allTutorias.length) * 100) : 0;
    setEl('report-asistencia', asistencia + '%');
    const uniqueStudentsAll = new Set(allTutorias.map(t => t.estudiante || t.student).filter(Boolean));
    const promedio = uniqueStudentsAll.size > 0 ? (allTutorias.length / uniqueStudentsAll.size).toFixed(1) : 0;
    setEl('report-promedio', promedio);

    // Calendario stats
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];
    const tutoriasHoy = allTutorias.filter(t => t.fecha === todayStr).length;
    setEl('cal-hoy', tutoriasHoy);
    setEl('cal-mes', tutoriasCount);
    const pendientes = allTutorias.filter(t => t.estado === 'Pendiente').length;
    setEl('cal-pendientes', pendientes);

  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

function loadRecentActivity(allUsers, allTutorias) {
  const container = document.getElementById('dash-activity-list');
  if (!container) return;

  const activities = [];

  allUsers.forEach(user => {
    let dateObj = null;
    if (user.createdAt && user.createdAt.toDate) dateObj = user.createdAt.toDate();
    else if (user.createdAt) dateObj = new Date(user.createdAt);

    let actionText = '';
    if (user.rol === 'Tutor') actionText = 'Nuevo tutor registrado';
    else if (user.rol === 'Estudiante Delegado') actionText = `Delegado asignado al Ciclo ${user.ciclo || 'N/A'}`;
    else if (user.rol === 'Administrador') actionText = 'Administrador del sistema';
    else actionText = `Usuario registrado como ${user.rol}`;

    activities.push({
      user: user.nombre, action: actionText,
      time: dateObj ? getRelativeTime(dateObj) : 'Sin fecha',
      type: user.rol === 'Estudiante Delegado' ? 'Delegado' : user.rol,
      timestamp: dateObj ? dateObj.getTime() : 0,
      badgeClass: getBadgeClassForRole(user.rol)
    });
  });

  allTutorias.forEach(t => {
    let dateObj = null;
    if (t.createdAt && t.createdAt.toDate) dateObj = t.createdAt.toDate();
    else if (t.fecha) dateObj = new Date(t.fecha);

    activities.push({
      user: t.tutor || 'Tutor',
      action: `Tutoría de ${t.materia || t.subject || 'materia'} - ${t.estado || 'Programada'}`,
      time: dateObj ? getRelativeTime(dateObj) : t.fecha || 'Sin fecha',
      type: 'Tutoría', timestamp: dateObj ? dateObj.getTime() : 0,
      badgeClass: 'badge-blue'
    });
  });

  activities.sort((a, b) => b.timestamp - a.timestamp);
  const recent = activities.slice(0, 6);

  if (recent.length === 0) {
    container.innerHTML = `
      <div class="activity-item">
        <div class="avatar-md" style="background:var(--gray-200)"></div>
        <div class="activity-content"><p class="text-sm text-gray-400">No hay actividad reciente.</p></div>
      </div>
    `;
    return;
  }

  container.innerHTML = recent.map(a => `
    <div class="activity-item">
      <div class="avatar-md" style="background:linear-gradient(135deg,var(--blue-400),var(--blue-600))">
        <span class="text-white text-xs">${getInitials(a.user)}</span>
      </div>
      <div class="activity-content">
        <p class="text-sm text-gray-900">${Validators.sanitize(a.user)}</p>
        <p class="text-sm text-gray-600">${Validators.sanitize(a.action)}</p>
        <div class="activity-meta">
          <span class="text-xs text-gray-400">${a.time}</span>
          <span class="badge ${a.badgeClass}">${a.type}</span>
        </div>
      </div>
    </div>
  `).join('');
}

/* Helpers */
function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Hace un momento';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getBadgeClassForRole(rol) {
  const map = { 'Tutor': 'badge-green', 'Estudiante Delegado': 'badge-purple', 'Administrador': 'badge-blue' };
  return map[rol] || 'badge-gray';
}

/* ============================================
   CONFIGURATION - Save/Load
   ============================================ */

window.saveConfig = async function() {
  const btn = document.getElementById('btn-save-config');
  setButtonLoading(btn, true, 'Guardando...');

  try {
    const data = {
      nombreSistema: document.getElementById('config-nombre').value.trim(),
      anioAcademico: document.getElementById('config-anio').value.trim(),
      ciclosActivos: parseInt(document.getElementById('config-ciclos').value) || 10,
      maxTutores: parseInt(document.getElementById('config-max-tutores').value) || 50,
      tutoriasPorEstudiante: parseInt(document.getElementById('config-tut-est').value) || 8,
      estudiantesPorTutor: parseInt(document.getElementById('config-est-tut').value) || 20
    };

    await db.collection('configuracion').doc('general').set(data, { merge: true });
    Notifications.success('Configuración guardada exitosamente.');
  } catch (err) {
    console.error('Error guardando config:', err);
    Notifications.error('Error al guardar la configuración.');
  } finally {
    setButtonLoading(btn, false);
  }
};

async function loadConfig() {
  try {
    const doc = await getDocument('configuracion', 'general');
    if (doc) {
      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
      setVal('config-nombre', doc.nombreSistema || 'SGTA-UPLA');
      setVal('config-anio', doc.anioAcademico || new Date().getFullYear());
      setVal('config-ciclos', doc.ciclosActivos || 10);
      setVal('config-max-tutores', doc.maxTutores || 50);
      setVal('config-tut-est', doc.tutoriasPorEstudiante || 8);
      setVal('config-est-tut', doc.estudiantesPorTutor || 20);
    }
  } catch (err) {
    console.error('Error loading config:', err);
  }
}

/* ============================================
   BUILD ALL SECTIONS
   ============================================ */
function buildAllSections() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    ${buildInicio()}
    ${buildGestionUsuarios()}
    ${buildTutores()}
    ${buildDelegados()}
    ${buildTutorias()}
    ${buildReportes()}
    ${buildCalendario()}
    ${buildConfiguracion()}
  `;

  // Setup filter selects after DOM is built
  setupFilterSelects();

  // Load config
  if (firebaseReady) loadConfig();
}

function setupFilterSelects() {
  // Users role filter
  const usersFilter = document.getElementById('filter-users-role');
  if (usersFilter) {
    usersFilter.addEventListener('change', () => {
      adminCurrentPage.users = 1;
      loadAdminUsers(usersFilter.value);
    });
  }

  // Tutorías state filter
  const tutoriasFilter = document.getElementById('filter-tutorias-estado');
  if (tutoriasFilter) {
    tutoriasFilter.addEventListener('change', () => {
      adminCurrentPage.tutorias = 1;
      loadAdminTutorias(tutoriasFilter.value);
    });
  }
}

/* ---------- INICIO ---------- */
function buildInicio() {
  return `
    <div id="inicio" class="section active">
      <div class="section-header">
        <h1>Panel de Administración</h1>
        <p>Gestión completa del sistema de tutorías</p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card hover-lift">
          <div class="stat-card-top">
            <div class="stat-icon bg-blue-500">${icon('users')}</div>
            <div class="stat-trend" id="dash-trend-users">${icon('trending-up')}<span>--</span></div>
          </div>
          <p class="stat-value" id="dash-total-users">...</p>
          <p class="stat-label">Total Usuarios</p>
        </div>
        <div class="stat-card hover-lift">
          <div class="stat-card-top">
            <div class="stat-icon bg-green-500">${icon('user-circle')}</div>
            <div class="stat-trend" id="dash-trend-tutores">${icon('trending-up')}<span>--</span></div>
          </div>
          <p class="stat-value" id="dash-tutores-activos">...</p>
          <p class="stat-label">Tutores Activos</p>
        </div>
        <div class="stat-card hover-lift">
          <div class="stat-card-top">
            <div class="stat-icon bg-purple-500">${icon('shield')}</div>
            <div class="stat-trend" id="dash-trend-delegados">${icon('trending-up')}<span>--</span></div>
          </div>
          <p class="stat-value" id="dash-delegados">...</p>
          <p class="stat-label">Delegados</p>
        </div>
        <div class="stat-card hover-lift">
          <div class="stat-card-top">
            <div class="stat-icon bg-amber-500">${icon('book-open')}</div>
            <div class="stat-trend" id="dash-trend-tutorias">${icon('trending-up')}<span>--</span></div>
          </div>
          <p class="stat-value" id="dash-tutorias-mes">...</p>
          <p class="stat-label">Tutorías del Mes</p>
        </div>
      </div>

      <!-- Management Cards -->
      <div class="grid-3 mb-6">
        <div class="mgmt-card">
          <div class="mgmt-card-header">
            <div class="stat-icon bg-green-500">${icon('user-circle')}</div>
            <div><h3>Tutores</h3><p class="text-sm text-gray-500">Gestión de tutores</p></div>
          </div>
          <div class="mgmt-card-stats">
            <div class="mgmt-stat"><span class="text-gray-600">Total:</span><span id="mgmt-tutores-total">...</span></div>
            <div class="mgmt-stat"><span class="text-gray-600">Activos:</span><span class="text-green-600" id="mgmt-tutores-activos">...</span></div>
            <div class="mgmt-stat"><span class="text-gray-600">Pendientes:</span><span class="text-amber-600" id="mgmt-tutores-pendientes">...</span></div>
          </div>
          <button class="btn btn-gray btn-full mt-4" onclick="navigateSection('tutores')">Gestionar Tutores</button>
        </div>
        <div class="mgmt-card">
          <div class="mgmt-card-header">
            <div class="stat-icon bg-purple-500">${icon('shield')}</div>
            <div><h3>Delegados</h3><p class="text-sm text-gray-500">Gestión de delegados</p></div>
          </div>
          <div class="mgmt-card-stats">
            <div class="mgmt-stat"><span class="text-gray-600">Total:</span><span id="mgmt-delegados-total">...</span></div>
            <div class="mgmt-stat"><span class="text-gray-600">Activos:</span><span class="text-green-600" id="mgmt-delegados-activos">...</span></div>
            <div class="mgmt-stat"><span class="text-gray-600">Pendientes:</span><span class="text-amber-600" id="mgmt-delegados-pendientes">...</span></div>
          </div>
          <button class="btn btn-gray btn-full mt-4" onclick="navigateSection('delegados')">Gestionar Delegados</button>
        </div>
        <div class="mgmt-card">
          <div class="mgmt-card-header">
            <div class="stat-icon bg-blue-500">${icon('user-cog')}</div>
            <div><h3>Administradores</h3><p class="text-sm text-gray-500">Gestión de administradores</p></div>
          </div>
          <div class="mgmt-card-stats">
            <div class="mgmt-stat"><span class="text-gray-600">Total:</span><span id="mgmt-admins-total">...</span></div>
            <div class="mgmt-stat"><span class="text-gray-600">Activos:</span><span class="text-green-600" id="mgmt-admins-activos">...</span></div>
            <div class="mgmt-stat"><span class="text-gray-600">Pendientes:</span><span class="text-amber-600" id="mgmt-admins-pendientes">...</span></div>
          </div>
          <button class="btn btn-gray btn-full mt-4" onclick="navigateSection('gestion-usuarios')">Gestionar Administradores</button>
        </div>
      </div>

      <!-- Activity + Quick Actions -->
      <div class="grid-2">
        <div class="card">
          <div class="card-body">
            <h2 class="mb-4">Actividad Reciente del Sistema</h2>
            <div class="activity-list" id="dash-activity-list">
              <div class="activity-item">
                <div class="avatar-md" style="background:var(--gray-200)"></div>
                <div class="activity-content"><p class="text-sm text-gray-400">Cargando actividad reciente...</p></div>
              </div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-body">
            <h2 class="mb-4">Acciones Rápidas</h2>
            <div class="quick-actions">
              <button class="quick-action-btn qa-blue" onclick="openUserModal()">${icon('user-cog')}<p>Crear Usuario</p></button>
              <button class="quick-action-btn qa-green" onclick="navigateSection('tutores')">${icon('user-circle')}<p>Ver Tutores</p></button>
              <button class="quick-action-btn qa-purple" onclick="openTutoriaModal()">${icon('book-open')}<p>Nueva Tutoría</p></button>
              <button class="quick-action-btn qa-amber" onclick="navigateSection('reportes')">${icon('bar-chart-3')}<p>Ver Reportes</p></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ---------- GESTIÓN DE USUARIOS ---------- */
function buildGestionUsuarios() {
  return `
    <div id="gestion-usuarios" class="section">
      <div class="section-header">
        <h1>Gestión de Usuarios</h1>
        <p>Administrar todos los usuarios del sistema</p>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-4">
            <h2>Lista de Usuarios</h2>
            <select class="filter-select" id="filter-users-role">
              <option>Todos los Roles</option>
              <option>Tutores</option>
              <option>Delegados</option>
              <option>Administradores</option>
            </select>
          </div>
          <button class="btn btn-blue" onclick="openUserModal()">${icon('user-cog')} Crear Usuario</button>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Nombre Completo</th><th>Email</th><th>Rol</th><th>Ciclo</th><th>Estado</th><th>Tutorías</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody id="admin-users-list">
              <tr><td colspan="8" style="text-align: center; padding: 2rem;">Cargando usuarios...</td></tr>
            </tbody>
          </table>
        </div>
        <div id="pagination-users"></div>
      </div>
    </div>
  `;
}

/* ---------- TUTORES ---------- */
function buildTutores() {
  return `
    <div id="tutores" class="section">
      <div class="section-header">
        <h1>Gestión de Tutores</h1>
        <p>Administrar tutores y sus asignaciones</p>
      </div>
      <div class="grid-3 mb-6">
        <div class="card"><div class="card-body"><div class="flex items-center gap-4 mb-3"><div class="stat-icon bg-green-500">${icon('user-circle')}</div><div><p class="text-2xl text-gray-900" id="stat-tutores-activos">...</p><p class="text-sm text-gray-600">Tutores Activos</p></div></div></div></div>
        <div class="card"><div class="card-body"><div class="flex items-center gap-4 mb-3"><div class="stat-icon bg-blue-500">${icon('book-open')}</div><div><p class="text-2xl text-gray-900" id="stat-tutorias-mes-tutores">...</p><p class="text-sm text-gray-600">Tutorías del Mes</p></div></div></div></div>
        <div class="card"><div class="card-body"><div class="flex items-center gap-4 mb-3"><div class="stat-icon bg-purple-500">${icon('users')}</div><div><p class="text-2xl text-gray-900" id="stat-estudiantes-atendidos">...</p><p class="text-sm text-gray-600">Estudiantes Atendidos</p></div></div></div></div>
      </div>
      <div class="card">
        <div class="card-header">
          <h2>Lista de Tutores</h2>
          <button class="btn btn-blue" onclick="openUserModal()">Asignar Nuevo Tutor</button>
        </div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Tutor</th><th>Especialidad</th><th>Materias</th><th>Tutorías</th><th>Estudiantes</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody id="admin-tutores-list">
              <tr><td colspan="7" style="text-align: center; padding: 2rem;">Cargando tutores...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/* ---------- DELEGADOS ---------- */
function buildDelegados() {
  return `
    <div id="delegados" class="section">
      <div class="section-header">
        <h1>Gestión de Delegados</h1>
        <p>Administrar estudiantes delegados por ciclo</p>
      </div>
      <div class="card">
        <div class="card-header">
          <h2>Delegados Asignados</h2>
          <button class="btn btn-blue" onclick="openUserModal()">Asignar Delegado</button>
        </div>
        <div class="card-body">
          <div class="grid-3" id="admin-delegados-list">
            <div style="padding: 2rem; text-align: center; color: #666; grid-column: span 3;">Cargando delegados...</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ---------- TUTORÍAS ---------- */
function buildTutorias() {
  return `
    <div id="tutorias" class="section">
      <div class="section-header">
        <h1>Gestión de Tutorías</h1>
        <p>Todas las tutorías del sistema</p>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-4">
            <h2>Registro de Tutorías</h2>
            <select class="filter-select" id="filter-tutorias-estado">
              <option>Todos los Estados</option>
              <option>Pendiente</option>
              <option>Aceptada</option>
              <option>Finalizada</option>
              <option>Cancelada</option>
              <option>Rechazada</option>
            </select>
          </div>
          <button class="btn btn-blue" onclick="openTutoriaModal()">${icon('plus')} Nueva Tutoría</button>
        </div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>ID</th><th>Estudiante</th><th>Tutor</th><th>Materia</th><th>Fecha</th><th>Hora</th><th>Ciclo</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody id="admin-tutorias-list">
              <tr><td colspan="9" style="text-align: center; padding: 2rem;">Cargando tutorías...</td></tr>
            </tbody>
          </table>
        </div>
        <div id="pagination-tutorias"></div>
      </div>
    </div>
  `;
}

/* ---------- REPORTES ---------- */
function buildReportes() {
  return `
    <div id="reportes" class="section">
      <div class="section-header">
        <h1>Reportes del Sistema</h1>
        <p>Generar y visualizar reportes estadísticos</p>
      </div>
      <div class="grid-2 mb-6">
        <div class="card"><div class="card-body">
          <h3 class="mb-4">Generar Nuevo Reporte</h3>
          <div class="space-y-3">
            <div><label class="form-label">Tipo de Reporte</label><select class="form-select" id="report-type"><option>Mensual</option><option>Semanal</option><option>Por Ciclo</option><option>Por Tutor</option><option>Por Materia</option></select></div>
            <div><label class="form-label">Período</label><input type="month" class="form-input" id="report-period" value="${new Date().toISOString().substring(0,7)}"></div>
            <button class="btn btn-blue btn-full" onclick="generateReport()">Generar Reporte</button>
          </div>
        </div></div>
        <div class="info-card-blue">
          <h3>Estadísticas Generales</h3>
          <div class="space-y-3">
            <div class="info-stat"><span class="info-stat-label">Total Tutorías:</span><span class="info-stat-value" id="report-total-tutorias">...</span></div>
            <div class="info-stat"><span class="info-stat-label">Tasa de Finalización:</span><span class="info-stat-value" id="report-asistencia">...</span></div>
            <div class="info-stat"><span class="info-stat-label">Promedio por Estudiante:</span><span class="info-stat-value" id="report-promedio">...</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Resultados del Reporte</h2></div>
        <div class="card-body" id="report-results">
          <p class="text-sm text-gray-500" style="text-align:center; padding: 2rem;">Selecciona un tipo de reporte y haz clic en "Generar Reporte".</p>
        </div>
      </div>
    </div>
  `;
}

/* Report generation */
window.generateReport = async function() {
  const type = document.getElementById('report-type').value;
  const period = document.getElementById('report-period').value;
  const container = document.getElementById('report-results');

  container.innerHTML = '<p class="text-sm text-gray-500" style="text-align:center; padding: 2rem;">Generando reporte...</p>';

  try {
    const allTutorias = await getCollection('tutorias');
    const allUsers = await getCollection('usuarios');

    let reportData = allTutorias;

    // Filter by period if applicable
    if (period) {
      const [year, month] = period.split('-').map(Number);
      reportData = allTutorias.filter(t => {
        if (t.fecha) {
          const d = new Date(t.fecha);
          if (!isNaN(d.getTime())) return d.getMonth() + 1 === month && d.getFullYear() === year;
        }
        return true;
      });
    }

    const completadas = reportData.filter(t => t.estado === 'Finalizada' || t.estado === 'Completada').length;
    const canceladas = reportData.filter(t => t.estado === 'Cancelada').length;
    const pendientes = reportData.filter(t => t.estado === 'Pendiente').length;
    const aceptadas = reportData.filter(t => t.estado === 'Aceptada').length;

    container.innerHTML = `
      <div class="grid-4 mb-6">
        <div style="text-align:center;padding:1rem;">
          <p class="text-2xl text-gray-900">${reportData.length}</p>
          <p class="text-sm text-gray-600">Total</p>
        </div>
        <div style="text-align:center;padding:1rem;">
          <p class="text-2xl text-green-600">${completadas}</p>
          <p class="text-sm text-gray-600">Finalizadas</p>
        </div>
        <div style="text-align:center;padding:1rem;">
          <p class="text-2xl text-amber-600">${pendientes + aceptadas}</p>
          <p class="text-sm text-gray-600">En Proceso</p>
        </div>
        <div style="text-align:center;padding:1rem;">
          <p class="text-2xl text-red-500">${canceladas}</p>
          <p class="text-sm text-gray-600">Canceladas</p>
        </div>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Estudiante</th><th>Tutor</th><th>Materia</th><th>Fecha</th><th>Estado</th></tr></thead>
          <tbody>
            ${reportData.length > 0 ? reportData.slice(0, 20).map(t => `
              <tr>
                <td class="text-gray-900">${Validators.sanitize(t.estudiante || t.student || '-')}</td>
                <td class="text-gray-900">${Validators.sanitize(t.tutor || '-')}</td>
                <td class="text-gray-600">${Validators.sanitize(t.materia || t.subject || '-')}</td>
                <td class="text-gray-600">${t.fecha || '-'}</td>
                <td><span class="badge ${getBadgeClass(t.estado)}">${t.estado}</span></td>
              </tr>
            `).join('') : '<tr><td colspan="5" style="text-align:center;padding:2rem;">No hay datos para este período.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    Notifications.success('Reporte generado exitosamente.');
  } catch (err) {
    console.error('Error generando reporte:', err);
    container.innerHTML = '<p class="text-sm" style="color:red;text-align:center;padding:2rem;">Error al generar el reporte.</p>';
  }
};

/* ---------- CALENDARIO ---------- */
function buildCalendario() {
  const now = new Date();
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const currentMonthName = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dayNamesHtml = daysOfWeek.map(d => `<div>${d}</div>`).join('');

  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();

  let calendarCells = '';
  for (let i = 0; i < 42; i++) {
    const day = i - firstDay + 1;
    const isCurrentMonth = day >= 1 && day <= daysInMonth;
    const isToday = day === today;

    let cls = 'calendar-cell';
    if (!isCurrentMonth) cls += ' empty';
    else if (isToday) cls += ' today';

    calendarCells += `<div class="${cls}">`;
    if (isCurrentMonth) {
      calendarCells += `<div class="day-number">${day}</div>`;
    }
    calendarCells += `</div>`;
  }

  return `
    <div id="calendario" class="section">
      <div class="section-header">
        <h1>Calendario Global de Tutorías</h1>
        <p>Visualización completa de todas las tutorías programadas</p>
      </div>
      <div class="grid-4 mb-6">
        <div class="card"><div class="card-body"><p class="text-sm text-gray-600 mb-1">Hoy</p><p class="text-2xl text-gray-900" id="cal-hoy">0</p><p class="text-xs text-gray-500">tutorías</p></div></div>
        <div class="card"><div class="card-body"><p class="text-sm text-gray-600 mb-1">Este Mes</p><p class="text-2xl text-gray-900" id="cal-mes">0</p><p class="text-xs text-gray-500">tutorías</p></div></div>
        <div class="card"><div class="card-body"><p class="text-sm text-gray-600 mb-1">Pendientes</p><p class="text-2xl text-amber-600" id="cal-pendientes">0</p><p class="text-xs text-gray-500">sin confirmar</p></div></div>
        <div class="card"><div class="card-body"><p class="text-sm text-gray-600 mb-1">Finalizadas</p><p class="text-2xl text-green-600" id="cal-finalizadas">0</p><p class="text-xs text-gray-500">completadas</p></div></div>
      </div>
      <div class="card mb-6">
        <div class="card-header">
          <h2>${currentMonthName}</h2>
        </div>
        <div class="card-body">
          <div class="calendar-day-names">${dayNamesHtml}</div>
          <div class="calendar-grid">${calendarCells}</div>
        </div>
      </div>
    </div>
  `;
}

/* ---------- CONFIGURACIÓN ---------- */
function buildConfiguracion() {
  return `
    <div id="configuracion" class="section">
      <div class="section-header">
        <h1>Configuración del Sistema</h1>
        <p>Ajustes generales y administración</p>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-body">
          <h3 class="mb-4">Configuración General</h3>
          <div class="space-y-4">
            <div><label class="form-label">Nombre del Sistema</label><input type="text" id="config-nombre" class="form-input" value="SGTA-UPLA"></div>
            <div><label class="form-label">Año Académico</label><input type="text" id="config-anio" class="form-input" value="${new Date().getFullYear()}"></div>
            <div><label class="form-label">Ciclos Activos</label><input type="number" id="config-ciclos" class="form-input" value="10"></div>
          </div>
        </div></div>
        <div class="card"><div class="card-body">
          <h3 class="mb-4">Límites del Sistema</h3>
          <div class="space-y-4">
            <div><label class="form-label">Máximo Tutores</label><input type="number" id="config-max-tutores" class="form-input" value="50"></div>
            <div><label class="form-label">Tutorías por Estudiante/Mes</label><input type="number" id="config-tut-est" class="form-input" value="8"></div>
            <div><label class="form-label">Estudiantes por Tutor</label><input type="number" id="config-est-tut" class="form-input" value="20"></div>
          </div>
        </div></div>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button class="btn btn-gray btn-lg">Cancelar</button>
        <button class="btn btn-blue btn-lg" id="btn-save-config" onclick="saveConfig()">Guardar Cambios</button>
      </div>
    </div>
  `;
}
