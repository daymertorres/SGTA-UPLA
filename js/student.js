/* ============================================
   SGTA-UPLA — Student Dashboard Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  const session = checkAuth('Estudiante Delegado');
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
    { icon: 'calendar', label: 'Mis Tutorías', section: 'mis-tutorias', badge: null },
    { icon: 'file-text', label: 'Solicitar Tutoría', section: 'solicitar', badge: null },
    { icon: 'users', label: 'Mis Compañeros', section: 'companeros', badge: null },
    { icon: 'bar-chart-3', label: 'Mis Reportes', section: 'mis-reportes', badge: null },
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
    ${buildStudentInicio()}
    ${buildStudentTutorias()}
    ${buildSolicitar()}
    ${buildCompaneros()}
    ${buildMisReportes()}
    ${buildStudentConfig()}
  `;

  initDashboard();
  initStudentEvents(session);
});

function initStudentEvents(session) {
  const form = document.getElementById('solicitud-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const btn = document.getElementById('sol-submit');
      const oldText = btn.innerText;
      btn.innerText = "Enviando...";
      btn.disabled = true;
      
      const tutor = document.getElementById('sol-tutor').value;
      const materia = document.getElementById('sol-materia').value;
      const fecha = document.getElementById('sol-fecha').value;
      const hora = document.getElementById('sol-hora').value;
      
      const data = {
        student: session.nombre || session.email,
        subject: materia,
        tutor: tutor,
        requestedDate: fecha,
        time: hora,
        priority: "Media",
        ciclo: session.ciclo || "VIII",
        estado: "Pendiente"
      };

      try {
        if (firebaseReady) {
          await addDocument('solicitudes', data);
          alert("¡Solicitud enviada exitosamente a Firestore!");
          loadSolicitudes(session); // reload list
        } else {
          alert("Modo offline: Solicitud simulada (no se guardó).");
        }
        form.reset();
      } catch (err) {
        console.error(err);
        alert("Error al enviar solicitud.");
      } finally {
        btn.innerText = oldText;
        btn.disabled = false;
      }
    });
  }

  // Load actual requests from Firestore
  if (firebaseReady) {
    loadSolicitudes(session);
    loadStudentTutorias(session);
    loadStudentCompaneros(session);
  }
}

async function loadStudentTutorias(session) {
  const tbody = document.getElementById('student-tutorias-list');
  if (!tbody) return;

  try {
    const studentName = session.nombre || session.email;
    const tutorias = await queryCollection('tutorias', 'estudiante', '==', studentName);
    
    // Fallback search by 'student' field just in case
    let todas = tutorias;
    if (tutorias.length === 0) {
      todas = await queryCollection('tutorias', 'student', '==', studentName);
    }

    if (todas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No tienes tutorías.</td></tr>';
      return;
    }

    tbody.innerHTML = todas.map(s => `
      <tr>
        <td class="text-gray-600">#${s.id.substring(0,6)}</td>
        <td class="text-gray-900">${s.tutor}</td>
        <td class="text-gray-600">${s.materia || s.subject}</td>
        <td class="text-gray-600">${s.fecha || s.requestedDate || '-'}</td>
        <td class="text-gray-600">${s.hora || s.time || '-'}</td>
        <td class="text-gray-600">${s.location || 'Virtual'}</td>
        <td><span class="badge ${getBadgeClass(s.estado)}">${s.estado}</span></td>
        <td><button class="link-btn">Ver Detalles</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("Error cargando tutorías", err);
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Error.</td></tr>';
  }
}

async function loadStudentCompaneros(session) {
  const tbody = document.getElementById('student-companeros-list');
  if (!tbody) return;

  try {
    const students = await queryCollection('usuarios', 'rol', '==', 'Estudiante Delegado');
    if (students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No hay compañeros en el sistema.</td></tr>';
      return;
    }

    tbody.innerHTML = students.map(c => `
      <tr>
        <td><div class="user-cell"><div class="mini-avatar purple"><span>${getInitials(c.nombre)}</span></div><span class="text-gray-900">${c.nombre}</span></div></td>
        <td class="text-gray-600">${c.email}</td>
        <td class="text-gray-600">${c.ciclo || 'VIII'}</td>
        <td class="text-gray-900">${c.tutorias || 0}</td>
        <td class="text-gray-600">Estudiante</td>
        <td><button class="link-btn flex items-center gap-1">${icon('mail')} Contactar</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("Error cargando compañeros", err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error.</td></tr>';
  }
}

async function loadSolicitudes(session) {
  const container = document.getElementById('solicitudes-list');
  if (!container) return;

  try {
    const studentName = session.nombre || session.email;
    const reqs = await queryCollection('solicitudes', 'student', '==', studentName);
    
    if (reqs.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500">No tienes solicitudes activas.</p>';
      return;
    }

    container.innerHTML = reqs.map(s => `
      <div class="solicitud-item">
        <p class="text-sm text-gray-900 mb-1">${s.tutor}</p>
        <p class="text-xs text-gray-600 mb-2">${s.subject}</p>
        <p class="text-xs text-gray-500 mb-2">${s.requestedDate} a las ${s.time}</p>
        <span class="badge ${getBadgeClass(s.estado)}">${s.estado}</span>
      </div>
    `).join('');
  } catch (err) {
    console.error("Error cargando solicitudes", err);
  }
}

function buildStudentInicio() {
  const statsHtml = [].map(s => `
    <div class="stat-card hover-lift">
      <div class="stat-card-top">
        <div class="stat-icon ${s.color}">${icon(s.icon)}</div>
      </div>
      <p class="stat-value">${s.value}</p>
      <p class="stat-label">${s.label}</p>
    </div>
  `).join('');

  const sessionsHtml = [].slice(0, 3).map(s => `
    <div class="session-item">
      <div class="session-top">
        <div class="session-user">
          <div class="avatar-lg" style="background:linear-gradient(135deg,var(--green-400),var(--green-500))">${icon('graduation-cap')}</div>
          <div><p class="text-gray-900">${s.tutor}</p><p class="text-sm text-gray-600">${s.subject}</p></div>
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

  const tutorsHtml = [].slice(0, 3).map(t => `
    <div class="tutor-card">
      <div class="tutor-card-top">
        <div class="tutor-card-user">
          <div class="avatar-md" style="background:linear-gradient(135deg,var(--blue-400),var(--blue-600))"><span class="text-white text-xs">${getInitials(t.name)}</span></div>
          <div><p class="text-gray-900">${t.name}</p><p class="text-xs text-gray-500">${t.subjects.slice(0, 2).join(', ')}</p></div>
        </div>
        <span class="badge ${t.availability === 'Disponible' ? 'badge-green' : 'badge-gray'}">${t.availability}</span>
      </div>
      <button class="btn btn-blue-soft btn-full mt-2">Solicitar Tutoría</button>
    </div>
  `).join('');

  return `
    <div id="inicio" class="section active">
      <div class="section-header"><h1>Bienvenida, María</h1><p>Panel de Estudiante Delegado - Ciclo VIII</p></div>
      <div class="stats-grid">${statsHtml}</div>
      <div class="grid-2-1">
        <div class="space-y-6">
          <div class="card">
            <div class="card-header"><h2>Mis Próximas Tutorías</h2><button class="btn btn-blue">${icon('plus')} Solicitar Tutoría</button></div>
            ${sessionsHtml}
          </div>
          <div class="card"><div class="card-body">
            <h2 class="mb-4">Tutores Disponibles</h2>
            <div class="space-y-3">${tutorsHtml}</div>
          </div></div>
        </div>
        <div class="space-y-6">
          <div class="card"><div class="card-body">
            <h2 class="mb-4">Mi Ciclo</h2>
            <div class="cycle-info">
              <div class="cycle-header">
                <div class="cycle-icon">${icon('users')}</div>
                <div><p class="text-gray-900">Ciclo VIII</p><p class="text-sm text-gray-600">Ingeniería de Sistemas</p></div>
              </div>
              <div class="cycle-stats">
                <div class="cycle-stat"><span class="text-gray-600">Total Estudiantes:</span><span class="text-gray-900">28</span></div>
                <div class="cycle-stat"><span class="text-gray-600">Delegado:</span><span class="text-purple-600">Tú</span></div>
              </div>
            </div>
            <button class="btn btn-gray btn-full">Ver Compañeros</button>
          </div></div>
          <div class="card"><div class="card-body">
            <h2 class="mb-4">Progreso del Semestre</h2>
            <div class="space-y-4">
              <div class="progress-wrapper">
                <div class="progress-header"><span class="text-gray-600">Tutorías Asistidas</span><span class="text-gray-900">12/15</span></div>
                <div class="progress-bar progress-bar-bg"><div class="progress-fill progress-fill-green" style="width:80%"></div></div>
              </div>
              <div class="progress-wrapper">
                <div class="progress-header"><span class="text-gray-600">Materias con Tutoría</span><span class="text-gray-900">4/6</span></div>
                <div class="progress-bar progress-bar-bg"><div class="progress-fill progress-fill-blue" style="width:67%"></div></div>
              </div>
            </div>
          </div></div>
          <div class="reminder-card">
            ${icon('alert-circle')}
            <h3>Recordatorio</h3>
            <p>Tienes una tutoría de Cálculo Diferencial hoy a las 10:00 AM en la Sala 201</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildStudentTutorias() {
  return `
    <div id="mis-tutorias" class="section">
      <div class="section-header"><h1>Mis Tutorías</h1><p>Historial y tutorías programadas</p></div>
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-4"><h2>Registro de Tutorías</h2><select class="filter-select"><option>Todas</option><option>Confirmadas</option><option>Pendientes</option><option>Completadas</option></select></div>
          <button class="btn btn-blue">Solicitar Nueva</button>
        </div>
        <div class="table-wrapper"><table><thead><tr><th>ID</th><th>Tutor</th><th>Materia</th><th>Fecha</th><th>Hora</th><th>Ubicación</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="student-tutorias-list"><tr><td colspan="8" style="text-align:center;padding:2rem;">Cargando tutorías...</td></tr></tbody></table></div>
      </div>
    </div>
  `;
}

function buildSolicitar() {
  const tutorOpts = [].map(t => `<option>${t.name}</option>`).join('');

  const solHtml = [].map(s => `
    <div class="solicitud-item">
      <p class="text-sm text-gray-900 mb-1">${s.tutor}</p>
      <p class="text-xs text-gray-600 mb-2">${s.materia}</p>
      <span class="badge ${getBadgeClass(s.estado)}">${s.estado}</span>
    </div>
  `).join('');

  const availHtml = [].filter(t => t.availability === 'Disponible').map(t => `
    <div class="tutor-available-item"><div class="tutor-available-dot"></div><span class="text-sm text-gray-900">${t.name}</span></div>
  `).join('');

  return `
    <div id="solicitar" class="section">
      <div class="section-header"><h1>Solicitar Nueva Tutoría</h1><p>Completa el formulario para solicitar apoyo académico</p></div>
      <div class="grid-2-1">
        <div class="card"><div class="card-body p-8">
          <form id="solicitud-form" class="form-grid">
            <div class="form-grid-2">
              <div><label class="form-label">Tutor</label><select id="sol-tutor" class="form-select" required><option value="">Seleccionar tutor...</option>${tutorOpts}</select></div>
              <div><label class="form-label">Materia</label><select id="sol-materia" class="form-select" required><option value="">Seleccionar materia...</option><option>Cálculo Diferencial</option><option>Cálculo Integral</option><option>Álgebra Lineal</option><option>Programación Java</option><option>Base de Datos</option></select></div>
            </div>
            <div class="form-grid-2">
              <div><label class="form-label">Fecha Preferida</label><input type="date" id="sol-fecha" class="form-input" required></div>
              <div><label class="form-label">Hora Preferida</label><input type="time" id="sol-hora" class="form-input" required></div>
            </div>
            <div><label class="form-label">Modalidad</label><select id="sol-mod" class="form-select"><option>Presencial</option><option>Virtual</option></select></div>
            <div><label class="form-label">Descripción del Tema</label><textarea id="sol-desc" class="form-textarea" placeholder="Describe los temas específicos en los que necesitas ayuda..." required></textarea></div>
            <div class="form-actions">
              <button type="button" class="btn btn-gray btn-lg">Cancelar</button>
              <button type="submit" id="sol-submit" class="btn btn-blue btn-lg">Enviar Solicitud</button>
            </div>
          </form>
        </div></div>
        <div class="space-y-6">
          <div class="info-box">
            <h3>Mis Solicitudes Activas</h3>
            <div id="solicitudes-list" class="space-y-3">${solHtml}</div>
          </div>
          <div class="card"><div class="card-body">
            <h3 class="mb-3">Tutores Disponibles</h3>
            <div class="space-y-2">${availHtml}</div>
          </div></div>
        </div>
      </div>
    </div>
  `;
}

function buildCompaneros() {
  return `
    <div id="companeros" class="section">
      <div class="section-header"><h1>Compañeros del Ciclo VIII</h1><p>Estudiantes de tu ciclo y su progreso</p></div>
      <div class="card">
        <div class="card-header"><h2>28 Estudiantes - Ciclo VIII</h2></div>
        <div class="table-wrapper"><table><thead><tr><th>Nombre</th><th>Email</th><th>Ciclo</th><th>Tutorías</th><th>Rol</th><th>Contacto</th></tr></thead><tbody id="student-companeros-list"><tr><td colspan="6" style="text-align:center;padding:2rem;">Cargando compañeros...</td></tr></tbody></table></div>
      </div>
    </div>
  `;
}

function buildMisReportes() {
  const historyHtml = [].map(m => {
    const sessions = Math.floor(Math.random() * 5) + 1;
    return `
      <div class="history-item">
        <div class="history-left">${icon('book-open')}<span class="text-gray-900">${m}</span></div>
        <div class="history-right">
          <span class="text-sm text-gray-600">${sessions} sesiones</span>
          <button class="link-btn">Ver Detalles</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div id="mis-reportes" class="section">
      <div class="section-header"><h1>Mis Reportes</h1><p>Estadísticas y progreso académico</p></div>
      <div class="grid-2 mb-6">
        <div class="card"><div class="card-body">
          <h3 class="mb-4">Resumen del Semestre</h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center"><span class="text-gray-600">Tutorías Completadas:</span><span class="text-2xl text-gray-900">12</span></div>
            <div class="flex justify-between items-center"><span class="text-gray-600">Asistencia:</span><span class="text-2xl text-green-600">80%</span></div>
            <div class="flex justify-between items-center"><span class="text-gray-600">Materias con Apoyo:</span><span class="text-2xl text-gray-900">4/6</span></div>
          </div>
        </div></div>
        <div class="info-card-blue">
          <h3>Rendimiento General</h3>
          <div class="space-y-3">
            <div class="progress-wrapper">
              <div class="progress-header" style="color:#bfdbfe"><span>Progreso Global</span><span style="color:#fff">75%</span></div>
              <div class="progress-bar progress-bar-bg-white"><div class="progress-fill progress-fill-amber" style="width:75%"></div></div>
            </div>
            <div class="progress-wrapper">
              <div class="progress-header" style="color:#bfdbfe"><span>Objetivo del Ciclo</span><span style="color:#fff">15 Tutorías</span></div>
              <div class="progress-bar progress-bar-bg-white"><div class="progress-fill progress-fill-white" style="width:80%"></div></div>
            </div>
          </div>
        </div>
      </div>
      <div class="card"><div class="card-body">
        <h3 class="mb-4">Historial de Tutorías por Materia</h3>
        <div class="space-y-3">${historyHtml}</div>
      </div></div>
    </div>
  `;
}

function buildStudentConfig() {
  return `
    <div id="configuracion" class="section">
      <div class="section-header"><h1>Configuración</h1><p>Ajusta tu perfil y preferencias</p></div>
      <div class="grid-2">
        <div class="card"><div class="card-body">
          <h3 class="mb-4">Información Personal</h3>
          <div class="space-y-4">
            <div><label class="form-label">Nombre Completo</label><input type="text" class="form-input" value="María García Torres"></div>
            <div><label class="form-label">Email Institucional</label><input type="email" class="form-input" value="mgarcia@upla.edu.pe"></div>
            <div><label class="form-label">Ciclo Académico</label><input type="text" class="form-input" value="VIII" disabled></div>
          </div>
        </div></div>
        <div class="card"><div class="card-body">
          <h3 class="mb-4">Preferencias de Notificación</h3>
          <div class="space-y-4">
            <div class="checkbox-row"><label class="text-sm text-gray-700">Notificaciones por Email</label><input type="checkbox" checked></div>
            <div class="checkbox-row"><label class="text-sm text-gray-700">Recordatorios de Tutorías</label><input type="checkbox" checked></div>
            <div class="checkbox-row"><label class="text-sm text-gray-700">Actualizaciones del Sistema</label><input type="checkbox"></div>
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
