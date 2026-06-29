/* ============================================
   SGTA-UPLA — Admin Dashboard Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  const session = checkAuth('Administrador');
  if (!session) return;

  // Insert header icons
  document.getElementById('sidebar-icon').innerHTML = icon('shield');
  document.getElementById('logout-icon').innerHTML = icon('log-out');
  document.getElementById('toggle-sidebar').innerHTML = icon('x');
  document.getElementById('search-icon').innerHTML = icon('search');
  document.getElementById('bell-icon').innerHTML = icon('bell');
  document.getElementById('user-avatar-icon').innerHTML = icon('shield');

  // Build sidebar menu
  const menuItems = [
    { icon: 'home', label: 'Inicio', section: 'inicio', badge: null },
    { icon: 'users', label: 'Gestión de Usuarios', section: 'gestion-usuarios', badge: null },
    { icon: 'user-circle', label: 'Tutores', section: 'tutores', badge: 12 },
    { icon: 'user-check', label: 'Delegados', section: 'delegados', badge: 10 },
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

  // Load dynamic data from Firestore
  initAdminData();
});

async function initAdminData() {
  if (!firebaseReady) {
    console.warn("Firebase no inicializado, los datos no cargarán de la nube.");
    return;
  }
  
  await loadAdminUsers();
  await loadAdminTutorias();
  await loadAdminTutores();
  await loadAdminDelegados();
}

async function loadAdminTutores() {
  const tbody = document.getElementById('admin-tutores-list');
  if (!tbody) return;

  try {
    const tutores = await queryCollection('usuarios', 'rol', '==', 'Tutor');
    
    // Update stats
    const statElement = document.getElementById('stat-tutores-activos');
    if (statElement) {
      statElement.innerText = tutores.filter(t => t.estado === 'Activo').length;
    }

    if (tutores.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No hay tutores.</td></tr>';
      return;
    }

    tbody.innerHTML = tutores.map(tutor => {
      const materias = tutor.materias || [];
      const materiasHtml = materias.slice(0, 2).map(m => `<span class="tag tag-blue">${m}</span>`).join('');
      const extra = materias.length > 2 ? `<span class="tag tag-gray">+${materias.length - 2}</span>` : '';
      
      return `
        <tr>
          <td>
            <div class="user-cell">
              <div class="avatar-md" style="background:linear-gradient(135deg,var(--green-400),var(--green-500))">${icon('graduation-cap')}</div>
              <span class="text-gray-900">${tutor.nombre}</span>
            </div>
          </td>
          <td class="text-gray-600">${tutor.especialidad || 'General'}</td>
          <td><div class="tags">${materiasHtml}${extra}</div></td>
          <td class="text-gray-900">${tutor.tutorias || 0}</td>
          <td class="text-gray-900">${tutor.estudiantes || 0}</td>
          <td><span class="badge ${getBadgeClass(tutor.estado)}">${tutor.estado}</span></td>
          <td><button class="link-btn">Ver Detalles</button></td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error("Error cargando tutores:", error);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error al cargar tutores.</td></tr>';
  }
}

async function loadAdminTutorias() {
  const tbody = document.getElementById('admin-tutorias-list');
  if (!tbody) return;

  try {
    const tutorias = await getCollection('tutorias');
    if (tutorias.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No hay tutorías.</td></tr>';
      return;
    }

    tbody.innerHTML = tutorias.map(t => `
      <tr>
        <td class="text-gray-600">#${t.id.substring(0,6)}</td>
        <td class="text-gray-900">${t.estudiante || t.student || '-'}</td>
        <td class="text-gray-900">${t.tutor}</td>
        <td class="text-gray-600">${t.materia || t.subject}</td>
        <td class="text-gray-600">${t.fecha || t.requestedDate || '-'}</td>
        <td class="text-gray-600">${t.hora || t.time || '-'}</td>
        <td class="text-gray-600">${t.ciclo || '-'}</td>
        <td><span class="badge ${getBadgeClass(t.estado)}">${t.estado}</span></td>
      </tr>
    `).join('');
  } catch (error) {
    console.error("Error cargando tutorías:", error);
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Error al cargar tutorías.</td></tr>';
  }
}

async function loadAdminUsers() {
  const tbody = document.getElementById('admin-users-list');
  if (!tbody) return;

  try {
    const users = await getCollection('usuarios');
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No hay usuarios.</td></tr>';
      return;
    }

    window.adminUsersList = users; // Cache for editing

    tbody.innerHTML = users.map(user => {
      const roleBadge = getBadgeClass(user.rol);
      // We pass the user id to the edit function
      return `
        <tr>
          <td class="text-gray-600">#${user.id.substring(0,6)}</td>
          <td>
            <div class="user-cell">
              <div class="mini-avatar"><span>${getInitials(user.nombre)}</span></div>
              <span class="text-gray-900">${user.nombre}</span>
            </div>
          </td>
          <td class="text-gray-600">${user.email}</td>
          <td><span class="badge ${roleBadge}">${user.rol}</span></td>
          <td class="text-gray-600">${user.ciclo || '-'}</td>
          <td><span class="badge badge-green">${user.estado}</span></td>
          <td class="text-gray-900">${user.tutorias || 0}</td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button class="link-btn" onclick="openUserModal('${user.id}')" title="Editar">${icon('settings')}</button>
              <button class="link-btn" style="color: #ef4444;" onclick="deleteUser('${user.id}')" title="Eliminar">${icon('trash-2')}</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error("Error cargando usuarios:", error);
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Error al cargar usuarios.</td></tr>';
  }
}

/* Modal Functions for Users */
window.openUserModal = function(userId = null) {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('user-form');
  
  form.reset();
  document.getElementById('user-id').value = '';

  if (userId && window.adminUsersList) {
    title.innerText = 'Editar Usuario';
    const user = window.adminUsersList.find(u => u.id === userId);
    if (user) {
      document.getElementById('user-id').value = user.id;
      document.getElementById('user-name').value = user.nombre;
      document.getElementById('user-email').value = user.email;
      document.getElementById('user-password').value = user.password || '';
      document.getElementById('user-password').required = false;
      document.getElementById('user-password').placeholder = "Dejar en blanco para no cambiar";
      document.getElementById('user-role').value = user.rol;
      document.getElementById('user-ciclo').value = user.ciclo || '';
      document.getElementById('user-state').value = user.estado;
      
      // Don't allow changing email if editing, just as a safety measure for this mock
      document.getElementById('user-email').disabled = true;
    }
  } else {
    title.innerText = 'Crear Usuario';
    document.getElementById('user-email').disabled = false;
    document.getElementById('user-password').required = true;
    document.getElementById('user-password').placeholder = "Requerido para nuevos usuarios";
  }

  overlay.classList.add('active');
};

window.closeUserModal = function() {
  document.getElementById('modal-overlay').classList.remove('active');
};

window.saveUser = async function() {
  const btn = document.getElementById('btn-save-user');
  const form = document.getElementById('user-form');
  
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const id = document.getElementById('user-id').value;
  const nombre = document.getElementById('user-name').value;
  const email = document.getElementById('user-email').value;
  const password = document.getElementById('user-password').value;
  const rol = document.getElementById('user-role').value;
  const ciclo = document.getElementById('user-ciclo').value;
  const estado = document.getElementById('user-state').value;

  const data = { nombre, email, rol, ciclo, estado };
  if (password.trim() !== '') {
    data.password = password;
  }

  const oldText = btn.innerText;
  btn.innerText = 'Guardando...';
  btn.disabled = true;

  try {
    if (id) {
      // Update
      await updateDocument('usuarios', id, data);
      alert('Usuario actualizado exitosamente');
    } else {
      // Create
      await addDocument('usuarios', data, email); // using email as document ID
      alert('Usuario creado exitosamente');
    }
    closeUserModal();
    loadAdminUsers(); // Refresh table
  } catch (err) {
    console.error('Error saving user:', err);
    alert('Error al guardar el usuario');
  } finally {
    btn.innerText = oldText;
    btn.disabled = false;
  }
};

window.deleteUser = async function(id) {
  if (confirm("¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.")) {
    try {
      await deleteDocument('usuarios', id);
      alert("Usuario eliminado correctamente.");
      loadAdminUsers(); // Refresh table
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      alert("Ocurrió un error al intentar eliminar al usuario.");
    }
  }
};
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
}

/* ---------- INICIO ---------- */
function buildInicio() {
  const statsHtml = [].map(stat => `
    <div class="stat-card hover-lift">
      <div class="stat-card-top">
        <div class="stat-icon ${stat.color}">${icon(stat.icon)}</div>
        <div class="stat-trend">${icon('trending-up')}<span>${stat.trend}</span></div>
      </div>
      <p class="stat-value">${stat.value}</p>
      <p class="stat-label">${stat.label}</p>
    </div>
  `).join('');

  const mgmtHtml = [].map(item => `
    <div class="mgmt-card">
      <div class="mgmt-card-header">
        <div class="stat-icon ${item.color}">${icon(item.icon)}</div>
        <div>
          <h3>${item.role}</h3>
          <p class="text-sm text-gray-500">Gestión de ${item.role.toLowerCase()}</p>
        </div>
      </div>
      <div class="mgmt-card-stats">
        <div class="mgmt-stat"><span class="text-gray-600">Total:</span><span>${item.count}</span></div>
        <div class="mgmt-stat"><span class="text-gray-600">Activos:</span><span class="text-green-600">${item.active}</span></div>
        <div class="mgmt-stat"><span class="text-gray-600">Pendientes:</span><span class="text-amber-600">${item.pending}</span></div>
      </div>
      <button class="btn btn-gray btn-full mt-4">Gestionar ${item.role}</button>
    </div>
  `).join('');

  const activityHtml = [].map(a => `
    <div class="activity-item">
      <div class="avatar-md" style="background:linear-gradient(135deg,var(--blue-400),var(--blue-600))">
        <span class="text-white text-xs">${getInitials(a.user)}</span>
      </div>
      <div class="activity-content">
        <p class="text-sm text-gray-900">${a.user}</p>
        <p class="text-sm text-gray-600">${a.action}</p>
        <div class="activity-meta">
          <span class="text-xs text-gray-400">${a.time}</span>
          <span class="badge badge-blue">${a.type}</span>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <div id="inicio" class="section active">
      <div class="section-header">
        <h1>Panel de Administración</h1>
        <p>Gestión completa del sistema de tutorías</p>
      </div>
      <div class="stats-grid">${statsHtml}</div>
      <div class="grid-3 mb-6">${mgmtHtml}</div>
      <div class="grid-2">
        <div class="card">
          <div class="card-body">
            <h2 class="mb-4">Actividad Reciente del Sistema</h2>
            <div class="activity-list">${activityHtml}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-body">
            <h2 class="mb-4">Acciones Rápidas</h2>
            <div class="quick-actions">
              <button class="quick-action-btn qa-blue">${icon('user-cog')}<p>Crear Usuario</p></button>
              <button class="quick-action-btn qa-green">${icon('user-circle')}<p>Asignar Tutor</p></button>
              <button class="quick-action-btn qa-purple">${icon('shield')}<p>Asignar Delegado</p></button>
              <button class="quick-action-btn qa-amber">${icon('bar-chart-3')}<p>Ver Reportes</p></button>
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
            <select class="filter-select">
              <option>Todos los Roles</option>
              <option>Tutores</option>
              <option>Delegados</option>
              <option>Estudiantes</option>
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
        <div class="card"><div class="card-body"><div class="flex items-center gap-4 mb-3"><div class="stat-icon bg-blue-500">${icon('book-open')}</div><div><p class="text-2xl text-gray-900">97</p><p class="text-sm text-gray-600">Tutorías del Mes</p></div></div></div></div>
        <div class="card"><div class="card-body"><div class="flex items-center gap-4 mb-3"><div class="stat-icon bg-purple-500">${icon('users')}</div><div><p class="text-2xl text-gray-900">64</p><p class="text-sm text-gray-600">Estudiantes Atendidos</p></div></div></div></div>
      </div>
      <div class="card">
        <div class="card-header">
          <h2>Lista de Tutores</h2>
          <button class="btn btn-blue">Asignar Nuevo Tutor</button>
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
          <button class="btn btn-blue">Asignar Delegado</button>
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
            <p class="text-gray-900">${d.nombre}</p>
            <p class="text-sm text-purple-600">Ciclo ${d.ciclo || 'VIII'}</p>
          </div>
        </div>
        <div class="delegado-stats">
          <div class="delegado-stat"><span class="text-gray-600">Email:</span><span class="text-gray-900" style="font-size: 0.8rem">${d.email}</span></div>
          <div class="delegado-stat"><span class="text-gray-600">Tutorías Asistidas:</span><span class="text-gray-900">${d.tutorias || 0}</span></div>
          <div class="delegado-stat"><span class="text-gray-600">Estado:</span><span class="${d.estado === 'Activo' ? 'text-green-600' : 'text-amber-600'}">${d.estado}</span></div>
        </div>
        <button class="btn btn-purple-soft btn-full">Ver Detalles</button>
      </div>
    `).join('');
  } catch (error) {
    console.error("Error cargando delegados:", error);
    container.innerHTML = '<div style="padding: 2rem; text-align: center; color: red; grid-column: span 3;">Error al cargar delegados.</div>';
  }
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
            <select class="filter-select"><option>Todos los Estados</option><option>Programada</option><option>Completada</option><option>Cancelada</option></select>
          </div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>ID</th><th>Estudiante</th><th>Tutor</th><th>Materia</th><th>Fecha</th><th>Hora</th><th>Ciclo</th><th>Estado</th></tr></thead>
            <tbody id="admin-tutorias-list">
              <tr><td colspan="8" style="text-align: center; padding: 2rem;">Cargando tutorías...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/* ---------- REPORTES ---------- */
function buildReportes() {
  const reportsHtml = [].map(r => `
    <div class="report-item">
      <div class="report-inner">
        <div class="report-left">
          <div class="report-icon">${icon('bar-chart-3')}</div>
          <div>
            <p class="text-gray-900">${r.nombre}</p>
            <p class="text-sm text-gray-600">Generado el ${r.fecha}</p>
            <div class="report-meta">
              <span>${r.tutorias} tutorías</span><span>•</span>
              <span>${r.tutores} tutores</span><span>•</span>
              <span>${r.estudiantes} estudiantes</span>
            </div>
          </div>
        </div>
        <div class="report-right">
          <span class="badge badge-purple">${r.tipo}</span>
          <button class="btn btn-blue-soft">Descargar PDF</button>
        </div>
      </div>
    </div>
  `).join('');

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
            <div><label class="form-label">Tipo de Reporte</label><select class="form-select"><option>Mensual</option><option>Semanal</option><option>Por Ciclo</option><option>Por Tutor</option><option>Por Materia</option></select></div>
            <div><label class="form-label">Período</label><input type="month" class="form-input" value="2026-05"></div>
            <button class="btn btn-blue btn-full">Generar Reporte</button>
          </div>
        </div></div>
        <div class="info-card-blue">
          <h3>Estadísticas Generales</h3>
          <div class="space-y-3">
            <div class="info-stat"><span class="info-stat-label">Total Tutorías (Mayo):</span><span class="info-stat-value">89</span></div>
            <div class="info-stat"><span class="info-stat-label">Tasa de Asistencia:</span><span class="info-stat-value">92%</span></div>
            <div class="info-stat"><span class="info-stat-label">Promedio por Estudiante:</span><span class="info-stat-value">3.2</span></div>
            <div class="info-stat"><span class="info-stat-label">Satisfacción:</span><span class="info-stat-value">4.7/5</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Reportes Generados</h2></div>
        ${reportsHtml}
      </div>
    </div>
  `;
}

/* ---------- CALENDARIO ---------- */
function buildCalendario() {
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dayNamesHtml = daysOfWeek.map(d => `<div>${d}</div>`).join('');

  let calendarCells = '';
  for (let i = 0; i < 35; i++) {
    const day = i - 2;
    const isCurrentMonth = day >= 1 && day <= 31;
    const isToday = day === 19;
    const hasTutorias = isCurrentMonth && [].includes(day);
    const count = hasTutorias ? Math.floor(Math.random() * 5) + 1 : 0;

    let cls = 'calendar-cell';
    if (!isCurrentMonth) cls += ' empty';
    else if (isToday) cls += ' today';

    calendarCells += `<div class="${cls}">`;
    if (isCurrentMonth) {
      calendarCells += `<div class="day-number">${day}</div>`;
      if (hasTutorias) {
        calendarCells += `<div class="calendar-tutoria-tag">${count} tutoría${count > 1 ? 's' : ''}</div>`;
      }
    }
    calendarCells += `</div>`;
  }

  const todayHtml = [].map(t => `
    <div class="today-item">
      <div class="today-item-top">
        <span class="text-sm font-medium text-gray-900">${t.time}</span>
        <span class="badge badge-blue">${t.sala}</span>
      </div>
      <p class="text-sm text-gray-900 mb-1">${t.materia}</p>
      <div class="today-item-detail">
        <span>👨‍🏫 ${t.tutor}</span>
        <span>👨‍🎓 ${t.student}</span>
      </div>
    </div>
  `).join('');

  const salasHtml = [].map(s => {
    const barColor = s.ocupacion >= 80 ? 'progress-fill-red' : s.ocupacion >= 50 ? 'progress-fill-amber' : 'progress-fill-green';
    return `
      <div class="room-item">
        <div class="room-header">
          <span class="text-sm text-gray-900">${s.sala}</span>
          <span class="text-xs text-gray-600">${s.ocupacion}% ocupado</span>
        </div>
        <div class="progress-bar progress-bar-bg mb-2"><div class="progress-fill ${barColor}" style="width:${s.ocupacion}%"></div></div>
        <p class="text-xs text-gray-600">Próxima disponibilidad: ${s.disponible}</p>
      </div>
    `;
  }).join('');

  return `
    <div id="calendario" class="section">
      <div class="section-header">
        <h1>Calendario Global de Tutorías</h1>
        <p>Visualización completa de todas las tutorías programadas</p>
      </div>
      <div class="grid-4 mb-6">
        <div class="card"><div class="card-body"><p class="text-sm text-gray-600 mb-1">Hoy</p><p class="text-2xl text-gray-900">8</p><p class="text-xs text-gray-500">tutorías</p></div></div>
        <div class="card"><div class="card-body"><p class="text-sm text-gray-600 mb-1">Esta Semana</p><p class="text-2xl text-gray-900">24</p><p class="text-xs text-gray-500">tutorías</p></div></div>
        <div class="card"><div class="card-body"><p class="text-sm text-gray-600 mb-1">Este Mes</p><p class="text-2xl text-gray-900">89</p><p class="text-xs text-gray-500">tutorías</p></div></div>
        <div class="card"><div class="card-body"><p class="text-sm text-gray-600 mb-1">Pendientes</p><p class="text-2xl text-amber-600">12</p><p class="text-xs text-gray-500">sin confirmar</p></div></div>
      </div>
      <div class="card mb-6">
        <div class="card-header">
          <div class="flex items-center gap-4">
            <h2>Mayo 2026</h2>
            <div class="calendar-nav">
              <button class="calendar-nav-btn">${icon('chevron-left')}</button>
              <button class="calendar-nav-btn">${icon('chevron-right')}</button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <select class="filter-select"><option>Todos los Tutores</option><option>Dr. Carlos Mendoza</option><option>Ing. Ana Suárez</option><option>Dr. Roberto Díaz</option></select>
            <select class="filter-select"><option>Todos los Ciclos</option><option>Ciclo VIII</option><option>Ciclo VII</option><option>Ciclo VI</option></select>
          </div>
        </div>
        <div class="card-body">
          <div class="calendar-day-names">${dayNamesHtml}</div>
          <div class="calendar-grid">${calendarCells}</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h2>Tutorías de Hoy (19 de Mayo)</h2></div>
          ${todayHtml}
        </div>
        <div class="space-y-6">
          <div class="card"><div class="card-body">
            <h2 class="mb-4">Disponibilidad de Salas</h2>
            <div class="space-y-3">${salasHtml}</div>
          </div></div>
          <div class="info-card-blue">
            <h3>Estadísticas Semanales</h3>
            <div class="space-y-3">
              <div class="info-stat"><span class="info-stat-label">Tutorías Programadas:</span><span class="info-stat-value">24</span></div>
              <div class="info-stat"><span class="info-stat-label">Tutorías Completadas:</span><span class="info-stat-value">18</span></div>
              <div class="info-stat"><span class="info-stat-label">Tasa de Asistencia:</span><span class="info-stat-value">92%</span></div>
            </div>
          </div>
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
            <div><label class="form-label">Nombre del Sistema</label><input type="text" class="form-input" value="SGTA-UPLA"></div>
            <div><label class="form-label">Año Académico</label><input type="text" class="form-input" value="2026"></div>
            <div><label class="form-label">Ciclos Activos</label><input type="number" class="form-input" value="10"></div>
          </div>
        </div></div>
        <div class="card"><div class="card-body">
          <h3 class="mb-4">Límites del Sistema</h3>
          <div class="space-y-4">
            <div><label class="form-label">Máximo Tutores</label><input type="number" class="form-input" value="50"></div>
            <div><label class="form-label">Tutorías por Estudiante/Mes</label><input type="number" class="form-input" value="8"></div>
            <div><label class="form-label">Estudiantes por Tutor</label><input type="number" class="form-input" value="20"></div>
          </div>
        </div></div>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button class="btn btn-gray btn-lg">Cancelar</button>
        <button class="btn btn-blue btn-lg">Guardar Cambios</button>
      </div>
    </div>
  `;
}
