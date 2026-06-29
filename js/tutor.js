/* ============================================
   SGTA-UPLA — Tutor Dashboard Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  const session = checkAuth('Tutor');
  if (!session) return;

  // Icons
  document.getElementById('sidebar-icon').innerHTML = icon('graduation-cap');
  document.getElementById('logout-icon').innerHTML = icon('log-out');
  document.getElementById('toggle-sidebar').innerHTML = icon('x');
  document.getElementById('search-icon').innerHTML = icon('search');
  document.getElementById('bell-icon').innerHTML = icon('bell');

  // Menu
  const menuItems = [
    { icon: 'home', label: 'Inicio', section: 'inicio', badge: null },
    { icon: 'calendar', label: 'Mis Tutorías', section: 'mis-tutorias', badge: 5 },
    { icon: 'calendar-check', label: 'Programar Tutoría', section: 'programar', badge: null },
    { icon: 'users', label: 'Mis Estudiantes', section: 'mis-estudiantes', badge: null },
    { icon: 'file-text', label: 'Solicitudes', section: 'solicitudes', badge: 3 },
    { icon: 'message-square', label: 'Mensajes', section: 'mensajes', badge: 2 },
    { icon: 'settings', label: 'Configuración', section: 'configuracion', badge: null }
  ];

  const menuEl = document.getElementById('sidebar-menu');
  menuItems.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.className = `menu-item${idx === 0 ? ' active' : ''}`;
    btn.dataset.section = item.section;
    btn.innerHTML = `${icon(item.icon)}<span class="menu-label">${item.label}</span>${item.badge ? `<span class="menu-badge">${item.badge}</span>` : ''}`;
    menuEl.appendChild(btn);
  });

  document.getElementById('main-content').innerHTML = `
    ${buildTutorInicio()}
    ${buildMisTutorias()}
    ${buildProgramar()}
    ${buildMisEstudiantes()}
    ${buildSolicitudes()}
    ${buildMensajes()}
    ${buildTutorConfig()}
  `;

  initDashboard();

  // Load dynamic data from Firestore
  initTutorData(session);
});

async function initTutorData(session) {
  if (!firebaseReady) {
    console.warn("Firebase no inicializado, los datos no cargarán de la nube.");
    return;
  }
  
  const tutorName = session.nombre || session.email;
  await loadTutorTutorias(tutorName);
  await loadTutorEstudiantes(tutorName);
  await loadTutorSolicitudes(tutorName);
}

async function loadTutorTutorias(tutorName) {
  const tbody = document.getElementById('tutor-tutorias-list');
  if (!tbody) return;

  try {
    const tutorias = await queryCollection('tutorias', 'tutor', '==', tutorName);
    if (tutorias.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No tienes tutorías.</td></tr>';
      return;
    }

    tbody.innerHTML = tutorias.map(s => `
      <tr>
        <td class="text-gray-600">#${s.id.substring(0,6)}</td>
        <td class="text-gray-900">${s.estudiante || s.student || '-'}</td>
        <td class="text-gray-600">${s.materia || s.subject}</td>
        <td class="text-gray-600">${s.fecha || s.requestedDate || '-'}</td>
        <td class="text-gray-600">${s.hora || s.time || '-'}</td>
        <td class="text-gray-600">${s.location || 'Virtual'}</td>
        <td><span class="badge ${getBadgeClass(s.estado)}">${s.estado}</span></td>
        <td><button class="link-btn">Ver Detalles</button></td>
      </tr>
    `).join('');
  } catch (error) {
    console.error("Error cargando tutorías:", error);
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Error al cargar tutorías.</td></tr>';
  }
}

async function loadTutorEstudiantes(tutorName) {
  const tbody = document.getElementById('tutor-estudiantes-list');
  if (!tbody) return;

  try {
    // In a real scenario, there'd be a relation or array. For now, fetch all students
    const students = await queryCollection('usuarios', 'rol', '==', 'Estudiante Delegado');
    if (students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No hay estudiantes asignados.</td></tr>';
      return;
    }

    tbody.innerHTML = students.map(s => {
      const attClass = 'badge-green';
      return `
        <tr>
          <td><div class="user-cell"><div class="mini-avatar purple"><span>${getInitials(s.nombre)}</span></div><span class="text-gray-900">${s.nombre}</span></div></td>
          <td class="text-gray-600">${s.ciclo || '-'}</td>
          <td class="text-gray-600">${s.email}</td>
          <td class="text-gray-900">${s.tutorias || 0}</td>
          <td><span class="badge ${attClass}">100%</span></td>
          <td class="text-gray-600">-</td>
          <td><button class="link-btn">Ver Historial</button></td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error("Error cargando estudiantes:", error);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error al cargar estudiantes.</td></tr>';
  }
}

async function loadTutorSolicitudes(tutorName) {
  const container = document.getElementById('tutor-solicitudes-list');
  const countEl = document.getElementById('tutor-solicitudes-count');
  if (!container) return;

  try {
    const solicitudes = await queryCollection('solicitudes', 'tutor', '==', tutorName);
    const pendientes = solicitudes.filter(s => s.estado === 'Pendiente');
    
    if (countEl) countEl.innerText = pendientes.length;

    if (pendientes.length === 0) {
      container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">No hay solicitudes pendientes.</div>';
      return;
    }

    container.innerHTML = pendientes.map(r => `
      <div class="request-item" style="padding:1.5rem">
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-4">
            <div class="avatar-lg" style="background:linear-gradient(135deg,var(--blue-400),var(--blue-600))"><span class="text-white text-sm">${getInitials(r.student)}</span></div>
            <div>
              <p class="text-gray-900 mb-1">${r.student}</p>
              <p class="text-sm text-gray-600 mb-2">${r.subject}</p>
              <div class="flex items-center gap-3 text-sm text-gray-600">
                <div class="session-meta-item">${icon('calendar')}<span>${r.requestedDate}</span></div>
                <span>•</span>
                <div class="session-meta-item">${icon('clock')}<span>${r.time}</span></div>
                <span>•</span>
                <span>Ciclo ${r.ciclo || '-'}</span>
              </div>
            </div>
          </div>
          <span class="badge ${getBadgeClass(r.priority || 'Media')}">Prioridad ${r.priority || 'Media'}</span>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-green-soft">✓ Aceptar Solicitud</button>
          <button class="btn btn-red-soft">✗ Rechazar</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error("Error cargando solicitudes:", error);
    container.innerHTML = '<div style="color:red; text-align:center;">Error al cargar solicitudes</div>';
  }
}

function buildTutorInicio() {
  const statsHtml = [].map(s => `
    <div class="stat-card hover-lift">
      <div class="stat-card-top">
        <div class="stat-icon ${s.color}">${icon(s.icon)}</div>
        <div class="stat-trend">${icon('trending-up')}<span>${s.trend}</span></div>
      </div>
      <p class="stat-value">${s.value}</p>
      <p class="stat-label">${s.label}</p>
    </div>
  `).join('');

  const sessionsHtml = [].slice(0, 3).map(s => `
    <div class="session-item">
      <div class="session-top">
        <div class="session-user">
          <div class="avatar-lg" style="background:linear-gradient(135deg,var(--blue-400),var(--blue-600))"><span class="text-white text-sm">${getInitials(s.student)}</span></div>
          <div><p class="text-gray-900">${s.student}</p><p class="text-sm text-gray-600">${s.subject}</p></div>
        </div>
        <span class="badge ${getBadgeClass(s.status)}">${s.status}</span>
      </div>
      <div class="session-meta">
        <div class="session-meta-item">${icon('calendar')}<span>${s.date}</span></div>
        <div class="session-meta-item">${icon('clock')}<span>${s.time}</span></div>
        <div class="session-meta-item">${icon('map-pin')}<span>${s.location}</span></div>
      </div>
    </div>
  `).join('');

  const requestsHtml = [].map(r => `
    <div class="request-item">
      <div class="request-top">
        <div><p class="text-gray-900 mb-1">${r.student}</p><p class="text-sm text-gray-600 mb-2">${r.subject}</p>
          <div class="request-info"><span>${r.requestedDate}</span><span>•</span><span>${r.time}</span><span>•</span><span>Ciclo ${r.ciclo}</span></div>
        </div>
        <span class="badge ${getBadgeClass(r.priority)}">${r.priority}</span>
      </div>
      <div class="request-actions">
        <button class="btn btn-green-soft flex-1">Aceptar</button>
        <button class="btn btn-red-soft flex-1">Rechazar</button>
      </div>
    </div>
  `).join('');

  const subjectsHtml = [].map(s => `
    <div class="subject-item">${icon('book-open')}<span class="text-sm text-gray-900">${s}</span></div>
  `).join('');

  return `
    <div id="inicio" class="section active">
      <div class="section-header"><h1>Panel de Tutor</h1><p>Gestiona tus tutorías y estudiantes asignados</p></div>
      <div class="stats-grid">${statsHtml}</div>
      <div class="grid-2-1">
        <div class="space-y-6">
          <div class="card">
            <div class="card-header"><h2>Mis Próximas Tutorías</h2><button class="btn btn-blue">${icon('user-plus')} Nueva Tutoría</button></div>
            ${sessionsHtml}
          </div>
          <div class="card">
            <div class="card-header"><h2>Solicitudes Pendientes de Aprobación</h2></div>
            ${requestsHtml}
          </div>
        </div>
        <div class="space-y-6">
          <div class="card"><div class="card-body">
            <h2 class="mb-4">Mi Disponibilidad</h2>
            <div class="availability-card"><p class="text-sm text-gray-900 mb-1">Lunes a Viernes</p><p class="text-xs text-gray-600">9:00 AM - 5:00 PM</p></div>
            <button class="btn btn-gray btn-full">Editar Horario</button>
          </div></div>
          <div class="card"><div class="card-body">
            <h2 class="mb-4">Materias que Imparto</h2>
            <div class="space-y-2">${subjectsHtml}</div>
          </div></div>
          <div class="info-card-blue">
            <h3>Rendimiento del Mes</h3>
            <p class="text-3xl mb-1">24</p>
            <p class="text-sm mb-4" style="color:#bfdbfe">Tutorías completadas</p>
            <div class="progress-bar progress-bar-bg-white"><div class="progress-fill progress-fill-amber" style="width:75%"></div></div>
            <p class="text-xs mt-2" style="color:#bfdbfe">75% del objetivo mensual</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildMisTutorias() {
  return `
    <div id="mis-tutorias" class="section">
      <div class="section-header"><h1>Mis Tutorías</h1><p>Todas tus sesiones programadas y completadas</p></div>
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-4"><h2>Registro de Tutorías</h2><select class="filter-select"><option>Todas</option><option>Confirmadas</option><option>Pendientes</option><option>Completadas</option></select></div>
          <button class="btn btn-blue">Programar Nueva</button>
        </div>
        <div class="table-wrapper"><table><thead><tr><th>ID</th><th>Estudiante</th><th>Materia</th><th>Fecha</th><th>Horario</th><th>Ubicación</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="tutor-tutorias-list"><tr><td colspan="8" style="text-align:center;padding:2rem;">Cargando tutorías...</td></tr></tbody></table></div>
      </div>
    </div>
  `;
}

function buildProgramar() {
  const studOpts = [].map(s => `<option>${s.nombre}</option>`).join('');
  return `
    <div id="programar" class="section">
      <div class="section-header"><h1>Programar Nueva Tutoría</h1><p>Crea una nueva sesión de tutoría</p></div>
      <div style="max-width:42rem;margin:0 auto">
        <div class="card"><div class="card-body p-8">
          <form class="form-grid">
            <div class="form-grid-2">
              <div><label class="form-label">Estudiante</label><select class="form-select"><option>Seleccionar estudiante...</option>${studOpts}</select></div>
              <div><label class="form-label">Materia</label><select class="form-select"><option>Seleccionar materia...</option><option>Cálculo Diferencial</option><option>Cálculo Integral</option><option>Álgebra Lineal</option><option>Ecuaciones Diferenciales</option></select></div>
            </div>
            <div class="form-grid-2">
              <div><label class="form-label">Fecha</label><input type="date" class="form-input"></div>
              <div><label class="form-label">Hora de Inicio</label><input type="time" class="form-input"></div>
            </div>
            <div class="form-grid-2">
              <div><label class="form-label">Duración</label><select class="form-select"><option>30 minutos</option><option>1 hora</option><option>1.5 horas</option><option>2 horas</option></select></div>
              <div><label class="form-label">Ubicación</label><select class="form-select"><option>Virtual</option><option>Sala 201</option><option>Sala 305</option><option>Laboratorio 3</option></select></div>
            </div>
            <div><label class="form-label">Notas / Temario</label><textarea class="form-textarea" placeholder="Describe los temas a tratar en esta sesión..."></textarea></div>
            <div class="form-actions">
              <button type="button" class="btn btn-gray btn-lg">Cancelar</button>
              <button type="submit" class="btn btn-blue btn-lg">Programar Tutoría</button>
            </div>
          </form>
        </div></div>
      </div>
    </div>
  `;
}

function buildMisEstudiantes() {
  return `
    <div id="mis-estudiantes" class="section">
      <div class="section-header"><h1>Mis Estudiantes</h1><p>Estudiantes asignados y su progreso</p></div>
      <div class="card">
        <div class="card-header"><h2>Lista de Estudiantes Asignados</h2></div>
        <div class="table-wrapper"><table><thead><tr><th>Estudiante</th><th>Ciclo</th><th>Email</th><th>Tutorías</th><th>Asistencia</th><th>Última Tutoría</th><th>Acciones</th></tr></thead><tbody id="tutor-estudiantes-list"><tr><td colspan="7" style="text-align:center;padding:2rem;">Cargando estudiantes...</td></tr></tbody></table></div>
      </div>
    </div>
  `;
}

function buildSolicitudes() {
  return `
    <div id="solicitudes" class="section">
      <div class="section-header"><h1>Solicitudes de Tutoría</h1><p>Gestiona las solicitudes pendientes</p></div>
      <div class="card">
        <div class="card-header"><h2>Solicitudes Pendientes (<span id="tutor-solicitudes-count">...</span>)</h2></div>
        <div id="tutor-solicitudes-list"><div style="padding:2rem;text-align:center;">Cargando...</div></div>
      </div>
    </div>
  `;
}

function buildMensajes() {
  const msgsHtml = [].map(m => `
    <div class="message-item${m.unread ? ' unread' : ''}">
      <div class="message-inner">
        <div class="avatar-lg" style="background:linear-gradient(135deg,var(--blue-400),var(--blue-600))"><span class="text-white text-xs">${getInitials(m.from)}</span></div>
        <div class="message-body">
          <div class="message-header">
            <p class="${m.unread ? 'font-semibold' : ''} text-gray-900">${m.from}</p>
            <span class="text-xs text-gray-500">${m.time}</span>
          </div>
          <p class="text-sm text-gray-600">${m.message}</p>
          ${m.unread ? '<span class="badge badge-blue mt-2">Nuevo</span>' : ''}
        </div>
      </div>
    </div>
  `).join('');

  return `
    <div id="mensajes" class="section">
      <div class="section-header"><h1>Mensajes</h1><p>Comunicación con estudiantes y coordinadores</p></div>
      <div class="card">
        <div class="card-header"><h2>Bandeja de Entrada</h2></div>
        ${msgsHtml}
      </div>
    </div>
  `;
}

function buildTutorConfig() {
  return `
    <div id="configuracion" class="section">
      <div class="section-header"><h1>Configuración</h1><p>Ajusta tus preferencias y disponibilidad</p></div>
      <div class="grid-2">
        <div class="card"><div class="card-body">
          <h3 class="mb-4">Información Personal</h3>
          <div class="space-y-4">
            <div><label class="form-label">Nombre Completo</label><input type="text" class="form-input" value="Dr. Carlos Mendoza"></div>
            <div><label class="form-label">Email</label><input type="email" class="form-input" value="cmendoza@upla.edu.pe"></div>
            <div><label class="form-label">Especialidad</label><input type="text" class="form-input" value="Matemáticas"></div>
          </div>
        </div></div>
        <div class="card"><div class="card-body">
          <h3 class="mb-4">Horario de Disponibilidad</h3>
          <div class="space-y-4">
            <div><label class="form-label">Días Disponibles</label><select class="form-select"><option>Lunes a Viernes</option><option>Lunes a Sábado</option><option>Personalizado</option></select></div>
            <div><label class="form-label">Hora de Inicio</label><input type="time" class="form-input" value="09:00"></div>
            <div><label class="form-label">Hora de Fin</label><input type="time" class="form-input" value="17:00"></div>
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
