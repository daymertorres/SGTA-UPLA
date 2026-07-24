/* ============================================
   SGTA-UPLA — Tutor Dashboard Logic
   Full CRUD, solicitudes, programar, messages
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  EmailService.init();
  const session = checkAuth('Tutor');
  if (!session) return;

  // Icons
  document.getElementById('sidebar-icon').innerHTML = icon('graduation-cap');
  document.getElementById('logout-icon').innerHTML = icon('log-out');
  document.getElementById('toggle-sidebar').innerHTML = icon('x');
  document.getElementById('search-icon').innerHTML = icon('search');
  document.getElementById('bell-icon').innerHTML = icon('bell');

  // Setup user info
  setupUserInfo(session);

  // Setup global search
  if (typeof window.setupGlobalSearch === 'function') {
    window.setupGlobalSearch();
  }

  // Menu
  const menuItems = [
    { icon: 'home', label: 'Inicio', section: 'inicio', badge: null },
    { icon: 'calendar', label: 'Mis Tutorías', section: 'mis-tutorias', badge: null },
    { icon: 'calendar-check', label: 'Programar Tutoría', section: 'programar', badge: null },
    { icon: 'users', label: 'Mis Estudiantes', section: 'mis-estudiantes', badge: null },
    { icon: 'file-text', label: 'Solicitudes', section: 'solicitudes', badge: null },

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
    ${buildTutorInicio(session)}
    ${buildMisTutorias()}
    ${buildProgramar()}
    ${buildMisEstudiantes()}
    ${buildSolicitudes()}

    ${buildTutorConfig(session)}
  `;

  initDashboard();

  // Setup notifications
  if (session.uid) Notifications.setupNotificationButton(session.uid);

  // Load data
  initTutorData(session);
});

async function initTutorData(session) {
  if (!firebaseReady) return;
  
  showLoader('Cargando tus datos...');
  try {
    const tutorName = session.nombre || session.email;
    await Promise.all([
      loadTutorDashboard(tutorName),
      loadTutorTutorias(tutorName),
      loadTutorEstudiantes(tutorName),
      loadTutorSolicitudes(tutorName),

    ]);

    // Load tutor materias for programar form
    await loadTutorSelectOptions();
  } catch (err) {
    console.error('Error loading tutor data:', err);
  } finally {
    hideLoader();
  }
}

/* ---------- DASHBOARD ---------- */
async function loadTutorDashboard(tutorName) {
  try {
    const tutorias = await queryCollection('tutorias', 'tutor', '==', tutorName);
    const solicitudes = await queryCollection('solicitudes', 'tutor', '==', tutorName);
    const pendientes = solicitudes.filter(s => s.estado === 'Pendiente');
    const completadas = tutorias.filter(t => t.estado === 'Finalizada' || t.estado === 'Completada');
    const uniqueStudents = new Set(tutorias.map(t => t.estudiante || t.student).filter(Boolean));

    // Update stats
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setEl('tutor-stat-tutorias', tutorias.length);
    setEl('tutor-stat-completadas', completadas.length);
    setEl('tutor-stat-estudiantes', uniqueStudents.size);
    setEl('tutor-stat-solicitudes', pendientes.length);

    // Update sidebar badge
    document.querySelectorAll('.menu-item').forEach(btn => {
      if (btn.dataset.section === 'solicitudes') {
        let badge = btn.querySelector('.menu-badge');
        if (pendientes.length > 0) {
          if (!badge) { badge = document.createElement('span'); badge.className = 'menu-badge'; btn.appendChild(badge); }
          badge.innerText = pendientes.length;
        } else if (badge) badge.remove();
      }
      if (btn.dataset.section === 'mis-tutorias') {
        let badge = btn.querySelector('.menu-badge');
        if (tutorias.length > 0) {
          if (!badge) { badge = document.createElement('span'); badge.className = 'menu-badge'; btn.appendChild(badge); }
          badge.innerText = tutorias.length;
        }
      }
    });

    // Render upcoming sessions
    const upcoming = tutorias.filter(t => t.estado === 'Pendiente' || t.estado === 'Aceptada').slice(0, 3);
    const sessionsContainer = document.getElementById('tutor-upcoming-sessions');
    if (sessionsContainer) {
      if (upcoming.length === 0) {
        sessionsContainer.innerHTML = '<p class="text-sm text-gray-500" style="padding:1.5rem;">No tienes tutorías próximas.</p>';
      } else {
        sessionsContainer.innerHTML = upcoming.map(s => `
          <div class="session-item">
            <div class="session-top">
              <div class="session-user">
                <div class="avatar-lg" style="background:linear-gradient(135deg,var(--blue-400),var(--blue-600))"><span class="text-white text-sm">${getInitials(s.estudiante || s.student || '??')}</span></div>
                <div><p class="text-gray-900">${Validators.sanitize(s.estudiante || s.student || '-')}</p><p class="text-sm text-gray-600">${Validators.sanitize(s.materia || s.subject || '-')}</p></div>
              </div>
              <span class="badge ${getBadgeClass(s.estado)}">${s.estado}</span>
            </div>
            <div class="session-meta">
              <div class="session-meta-item">${icon('calendar')}<span>${s.fecha || s.requestedDate || '-'}</span></div>
              <div class="session-meta-item">${icon('clock')}<span>${s.hora || s.time || '-'}</span></div>
              <div class="session-meta-item">${icon('map-pin')}<span>${s.ubicacion || s.location || 'Virtual'}</span></div>
            </div>
          </div>
        `).join('');
      }
    }

    // Render pending requests on dashboard
    const reqContainer = document.getElementById('tutor-dash-requests');
    if (reqContainer) {
      const topPending = pendientes.slice(0, 3);
      if (topPending.length === 0) {
        reqContainer.innerHTML = '<p class="text-sm text-gray-500" style="padding:1.5rem;">No tienes solicitudes pendientes.</p>';
      } else {
        reqContainer.innerHTML = topPending.map(r => `
          <div class="request-item">
            <div class="request-top">
              <div><p class="text-gray-900 mb-1">${Validators.sanitize(r.student)}</p><p class="text-sm text-gray-600 mb-2">${Validators.sanitize(r.subject)}</p>
                <div class="request-info"><span>${r.requestedDate}</span><span>•</span><span>${r.time}</span></div>
              </div>
              <span class="badge ${getBadgeClass(r.priority || 'Media')}">${r.priority || 'Media'}</span>
            </div>
            <div class="request-actions">
              <button class="btn btn-green-soft flex-1" onclick="acceptSolicitud('${r.id}')">Aceptar</button>
              <button class="btn btn-red-soft flex-1" onclick="rejectSolicitud('${r.id}')">Rechazar</button>
            </div>
          </div>
        `).join('');
      }
    }

    // Tutor rendimiento
    const rendEl = document.getElementById('tutor-rendimiento');
    if (rendEl) rendEl.innerText = completadas.length;
    const rendBar = document.getElementById('tutor-rend-bar');
    if (rendBar) {
      const pct = tutorias.length > 0 ? Math.round((completadas.length / Math.max(tutorias.length, 30)) * 100) : 0;
      rendBar.style.width = pct + '%';
    }

    // Materias del tutor
    const userData = session => queryCollection('usuarios', 'nombre', '==', session);
    const tutorData = await queryCollection('usuarios', 'nombre', '==', tutorName);
    if (tutorData.length > 0) {
      const materias = tutorData[0].materias || [];
      const matsContainer = document.getElementById('tutor-materias-list');
      if (matsContainer) {
        matsContainer.innerHTML = materias.length > 0
          ? materias.map(s => `<div class="subject-item">${icon('book-open')}<span class="text-sm text-gray-900">${Validators.sanitize(s)}</span></div>`).join('')
          : '<p class="text-sm text-gray-500">No hay materias asignadas.</p>';
      }

      // Disponibilidad
      const dispContainer = document.getElementById('tutor-disponibilidad');
      if (dispContainer) {
        const disp = tutorData[0].disponibilidad || {};
        dispContainer.innerHTML = `<p class="text-sm text-gray-900 mb-1">${disp.dias || 'Lunes a Viernes'}</p><p class="text-xs text-gray-600">${disp.horaInicio || '9:00'} - ${disp.horaFin || '17:00'}</p>`;
      }
    }
  } catch (err) {
    console.error('Error loading tutor dashboard:', err);
  }
}

/* ---------- MIS TUTORÍAS ---------- */
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
        <td class="text-gray-900">${Validators.sanitize(s.estudiante || s.student || '-')}</td>
        <td class="text-gray-600">${Validators.sanitize(s.materia || s.subject || '-')}</td>
        <td class="text-gray-600">${s.fecha || s.requestedDate || '-'}</td>
        <td class="text-gray-600">${s.hora || s.time || '-'}</td>
        <td class="text-gray-600">${s.ubicacion || s.location || 'Virtual'}</td>
        <td><span class="badge ${getBadgeClass(s.estado)}">${s.estado}</span></td>
        <td>
          <div style="display:flex;gap:0.5rem;align-items:center;">
            <button class="link-btn" onclick="openTutorTutoriaModal('${s.id}')" title="Editar">${icon('edit')}</button>
            ${s.estado !== 'Cancelada' ? `<button class="link-btn" style="color:var(--blue-600);font-weight:600;display:inline-flex;align-items:center;gap:0.25rem;" onclick="openAsistenciaSalonModal('${s.id}', '${Validators.sanitize(s.ciclo || '')}')" title="Asistencia de Salón">📋 Asistencia</button>` : ''}
            ${s.estado === 'Aceptada' ? `<button class="link-btn" style="color:var(--green-600);" onclick="finalizarTutoria('${s.id}')" title="Finalizar">✓</button>` : ''}
            ${s.estado !== 'Cancelada' && s.estado !== 'Finalizada' ? `<button class="link-btn" style="color:var(--red-500);" onclick="cancelarTutoria('${s.id}')" title="Cancelar">✗</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error("Error cargando tutorías:", error);
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Error al cargar tutorías.</td></tr>';
  }
}

window.finalizarTutoria = function(id) {
  Notifications.confirm('Finalizar Tutoría', '¿Deseas marcar esta tutoría como finalizada?', async () => {
    await updateDocument('tutorias', id, { estado: 'Finalizada', asistencia: true });
    Notifications.success('Tutoría finalizada.');
    const session = JSON.parse(localStorage.getItem('sgta_session'));
    await loadTutorTutorias(session.nombre || session.email);
  }, { confirmText: 'Finalizar', type: 'info' });
};

window.cancelarTutoria = function(id) {
  Notifications.confirm('Cancelar Tutoría', '¿Estás seguro de cancelar esta tutoría?', async () => {
    await updateDocument('tutorias', id, { estado: 'Cancelada' });
    Notifications.success('Tutoría cancelada.');
    const session = JSON.parse(localStorage.getItem('sgta_session'));
    await loadTutorTutorias(session.nombre || session.email);
  }, { confirmText: 'Cancelar Tutoría', type: 'danger' });
};

/* ---------- PROGRAMAR TUTORÍA (Modal) ---------- */
async function loadTutorSelectOptions() {
  const estSelect = document.getElementById('tt-estudiante');
  if (!estSelect) return;
  const students = await queryCollection('usuarios', 'rol', '==', 'Estudiante Delegado');
  estSelect.innerHTML = '<option value="">Seleccionar estudiante...</option>' +
    students.map(s => `<option value="${Validators.sanitize(s.nombre)}">${Validators.sanitize(s.nombre)}</option>`).join('');
}

window.openTutorTutoriaModal = function(tutoriaId = null) {
  const overlay = document.getElementById('tutor-tutoria-modal');
  const title = document.getElementById('tutor-modal-title');
  const form = document.getElementById('tutor-tutoria-form');
  Validators.clearFormErrors(form);
  form.reset();
  document.getElementById('tt-id').value = '';

  if (tutoriaId) {
    title.innerText = 'Editar Tutoría';
    // Buscar datos
    (async () => {
      const t = await getDocument('tutorias', tutoriaId);
      if (t) {
        document.getElementById('tt-id').value = t.id;
        document.getElementById('tt-estudiante').value = t.estudiante || t.student || '';
        document.getElementById('tt-materia').value = t.materia || t.subject || '';
        document.getElementById('tt-fecha').value = t.fecha || t.requestedDate || '';
        document.getElementById('tt-hora').value = t.hora || t.time || '';
        document.getElementById('tt-duracion').value = t.duracion || '1 hora';
        document.getElementById('tt-ubicacion').value = t.ubicacion || t.location || 'Virtual';
        document.getElementById('tt-notas').value = t.observaciones || '';
      }
    })();
  } else {
    title.innerText = 'Programar Tutoría';
  }

  overlay.classList.add('active');
};

window.closeTutorTutoriaModal = function() {
  document.getElementById('tutor-tutoria-modal').classList.remove('active');
};

window.saveTutorTutoria = async function() {
  const btn = document.getElementById('btn-save-tt');
  const form = document.getElementById('tutor-tutoria-form');
  Validators.clearFormErrors(form);

  const isValid = Validators.validateForm([
    { element: document.getElementById('tt-estudiante'), rules: [{ validator: Validators.selectRequired, args: ['El estudiante'] }] },
    { element: document.getElementById('tt-materia'), rules: [{ validator: Validators.selectRequired, args: ['La materia'] }] },
    { element: document.getElementById('tt-fecha'), rules: [{ validator: Validators.date }] },
    { element: document.getElementById('tt-hora'), rules: [{ validator: Validators.time }] }
  ]);

  if (!isValid) return;
  setButtonLoading(btn, true, 'Guardando...');

  const session = JSON.parse(localStorage.getItem('sgta_session'));
  const id = document.getElementById('tt-id').value;
  const data = {
    estudiante: document.getElementById('tt-estudiante').value,
    tutor: session.nombre || session.email,
    tutorId: session.uid || '',
    materia: document.getElementById('tt-materia').value,
    fecha: document.getElementById('tt-fecha').value,
    hora: document.getElementById('tt-hora').value,
    duracion: document.getElementById('tt-duracion').value,
    ubicacion: document.getElementById('tt-ubicacion').value,
    observaciones: document.getElementById('tt-notas').value.trim(),
    estado: id ? undefined : 'Pendiente'
  };

  // Remove undefined fields
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

  try {
    if (id) {
      await updateDocument('tutorias', id, data);
      Notifications.success('Tutoría actualizada.');
    } else {
      await addDocument('tutorias', data);

      // Notificar al estudiante
      const students = await queryCollection('usuarios', 'nombre', '==', data.estudiante);
      if (students.length > 0) {
        Notifications.createNotification({
          userId: students[0].id, titulo: 'Nueva tutoría programada',
          mensaje: `${data.tutor} ha programado una tutoría de ${data.materia} para el ${data.fecha} a las ${data.hora}.`,
          tipo: 'tutoria', link: 'mis-tutorias'
        });
        EmailService.sendNuevaTutoria({
          email: students[0].email, nombre: students[0].nombre,
          tutor: data.tutor, estudiante: data.estudiante,
          materia: data.materia, fecha: data.fecha, hora: data.hora, ubicacion: data.ubicacion
        });
      }
      Notifications.success('Tutoría programada exitosamente.');
    }

    closeTutorTutoriaModal();
    const tutorName = session.nombre || session.email;
    await loadTutorTutorias(tutorName);
    await loadTutorDashboard(tutorName);
  } catch (err) {
    console.error('Error saving tutoría:', err);
    Notifications.error('Error al guardar la tutoría.');
  } finally {
    setButtonLoading(btn, false);
  }
};

/* ---------- ESTUDIANTES ---------- */
async function loadTutorEstudiantes(tutorName) {
  const tbody = document.getElementById('tutor-estudiantes-list');
  if (!tbody) return;

  try {
    const tutorias = await queryCollection('tutorias', 'tutor', '==', tutorName);
    const studentNames = [...new Set(tutorias.map(t => t.estudiante || t.student).filter(Boolean))];

    if (studentNames.length === 0) {
      const allStudents = await queryCollection('usuarios', 'rol', '==', 'Estudiante Delegado');
      if (allStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No hay estudiantes.</td></tr>';
        return;
      }
      renderStudentRows(tbody, allStudents, tutorias);
      return;
    }

    const students = await queryCollection('usuarios', 'rol', '==', 'Estudiante Delegado');
    const assignedStudents = students.filter(s => studentNames.includes(s.nombre));
    if (assignedStudents.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No hay estudiantes asignados.</td></tr>';
      return;
    }
    renderStudentRows(tbody, assignedStudents, tutorias);
  } catch (error) {
    console.error("Error cargando estudiantes:", error);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Error al cargar estudiantes.</td></tr>';
  }
}

function renderStudentRows(tbody, students, tutorias) {
  tbody.innerHTML = students.map(s => {
    const sTutorias = tutorias.filter(t => (t.estudiante || t.student) === s.nombre);
    const lastTutoria = sTutorias.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0];

    return `
      <tr>
        <td><div class="user-cell"><div class="mini-avatar purple"><span>${getInitials(s.nombre)}</span></div><span class="text-gray-900">${Validators.sanitize(s.nombre)}</span></div></td>
        <td class="text-gray-600">${s.ciclo || '-'}</td>
        <td class="text-gray-600">${Validators.sanitize(s.email)}</td>
        <td class="text-gray-900">${sTutorias.length}</td>
        <td class="text-gray-600">${lastTutoria ? lastTutoria.fecha || '-' : '-'}</td>
      </tr>
    `;
  }).join('');
}

/* ---------- ASISTENCIA DE SALÓN (Modal para Tutor) ---------- */
window.openAsistenciaSalonModal = async function(tutoriaId = null, ciclo = '') {
  const overlay = document.getElementById('asistencia-salon-modal');
  if (!overlay) return;

  document.getElementById('asist-tutoria-id').value = tutoriaId || '';
  const cicloFilter = document.getElementById('asist-ciclo-filter');
  const cicloLbl = document.getElementById('asist-ciclo-lbl');
  const modeLbl = document.getElementById('asist-mode-lbl');
  const matTitle = document.getElementById('asist-materia-title');
  const delSub = document.getElementById('asist-delegado-sub');

  window._savedAsistenciaMap = {};
  window._currentTutoria = null;
  let targetCiclo = ciclo;

  if (tutoriaId) {
    try {
      const tutoria = await getDocument('tutorias', tutoriaId);
      if (tutoria) {
        window._currentTutoria = tutoria;
        if (!targetCiclo && tutoria.ciclo) targetCiclo = tutoria.ciclo;
        if (tutoria.listaAsistenciaSalon && Array.isArray(tutoria.listaAsistenciaSalon)) {
          tutoria.listaAsistenciaSalon.forEach(item => {
            window._savedAsistenciaMap[item.id || item.codigo] = item.estado || (item.asistio ? 'Asistencia' : 'Falta');
          });
        }
        if (matTitle) matTitle.innerText = tutoria.materia || tutoria.subject || 'Sesión de Tutoría';
        if (delSub) delSub.innerText = `🧑‍🎓 Delegado/Estudiante: ${tutoria.estudiante || tutoria.student || 'N/A'}`;
        if (modeLbl) {
          if (tutoria.asistencia === true) {
            modeLbl.innerText = 'ℹ️ Modo Actualización: Registrando cambios sobre historial guardado (Sin duplicar sesiones)';
            modeLbl.style.color = 'var(--amber-600)';
          } else {
            modeLbl.innerText = '✨ Modo Registro Inicial: Se sumará +1 sesión a los estudiantes de la lista';
            modeLbl.style.color = 'var(--green-600)';
          }
        }
      }
    } catch (e) {
      console.warn('No se pudieron cargar datos previos de la tutoría:', e);
    }
  } else {
    if (matTitle) matTitle.innerText = 'Asistencia Rápida de Salón';
    if (delSub) delSub.innerText = '🧑‍🎓 Seleccione el ciclo a filtrar';
    if (modeLbl) {
      modeLbl.innerText = '✨ Modo Registro Rápido';
      modeLbl.style.color = 'var(--blue-600)';
    }
  }

  if (cicloFilter) {
    cicloFilter.value = targetCiclo || '';
  }
  if (cicloLbl) {
    cicloLbl.innerText = targetCiclo ? `Ciclo ${targetCiclo}` : 'Todos los ciclos';
  }

  overlay.classList.add('active');
  await window.loadAsistenciaSalonList(targetCiclo || '');
};

window.closeAsistenciaSalonModal = function() {
  const overlay = document.getElementById('asistencia-salon-modal');
  if (overlay) overlay.classList.remove('active');
};

window.updateLiveAsistenciaCounters = function() {
  const list = window._currentAsistSalonList || [];
  let asists = 0, faltas = 0, justs = 0;
  list.forEach((_, idx) => {
    const radio = document.querySelector(`input[name="asist_${idx}"]:checked`);
    if (!radio || radio.value === 'Asistencia') asists++;
    else if (radio.value === 'Falta') faltas++;
    else if (radio.value === 'Justificación') justs++;
  });
  const elA = document.getElementById('live-asist-count');
  const elF = document.getElementById('live-falta-count');
  const elJ = document.getElementById('live-just-count');
  if (elA) elA.innerText = `🟢 Presentes: ${asists}`;
  if (elF) elF.innerText = `🔴 Faltas: ${faltas}`;
  if (elJ) elJ.innerText = `🟡 Justificados: ${justs}`;
};

window.selectAsistOption = function(idx, option) {
  const labels = document.querySelectorAll(`.asist-row-${idx} .asist-opt-label`);
  labels.forEach(lbl => {
    lbl.style.fontWeight = '500';
    lbl.style.boxShadow = 'none';
    if (lbl.dataset.val === 'Asistencia') {
      lbl.style.background = 'var(--green-50)';
      lbl.style.color = 'var(--green-700)';
      lbl.style.borderColor = 'var(--green-200)';
    } else if (lbl.dataset.val === 'Falta') {
      lbl.style.background = 'var(--red-50)';
      lbl.style.color = 'var(--red-700)';
      lbl.style.borderColor = 'var(--red-200)';
    } else {
      lbl.style.background = 'var(--yellow-50)';
      lbl.style.color = 'var(--yellow-700)';
      lbl.style.borderColor = 'var(--yellow-200)';
    }
  });

  const selectedLbl = document.querySelector(`.asist-row-${idx} .asist-opt-label[data-val="${option}"]`);
  if (selectedLbl) {
    selectedLbl.style.fontWeight = '700';
    selectedLbl.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.4)';
    if (option === 'Asistencia') {
      selectedLbl.style.background = 'var(--green-600)';
      selectedLbl.style.color = '#fff';
      selectedLbl.style.borderColor = 'var(--green-700)';
    } else if (option === 'Falta') {
      selectedLbl.style.background = 'var(--red-600)';
      selectedLbl.style.color = '#fff';
      selectedLbl.style.borderColor = 'var(--red-700)';
    } else {
      selectedLbl.style.background = 'var(--yellow-500)';
      selectedLbl.style.color = '#fff';
      selectedLbl.style.borderColor = 'var(--yellow-600)';
    }
  }
  window.updateLiveAsistenciaCounters();
};

window.setAllAsistencia = function(estado) {
  const list = window._currentAsistSalonList || [];
  list.forEach((_, idx) => {
    const radio = document.querySelector(`input[name="asist_${idx}"][value="${estado}"]`);
    if (radio) {
      radio.checked = true;
      selectAsistOption(idx, estado);
    }
  });
  window.updateLiveAsistenciaCounters();
};

window.loadAsistenciaSalonList = async function(ciclo = '') {
  const tbody = document.getElementById('asist-salon-list');
  const cicloLbl = document.getElementById('asist-ciclo-lbl');
  if (!tbody) return;

  if (cicloLbl) {
    cicloLbl.innerText = ciclo ? `Ciclo ${ciclo}` : 'Todos los ciclos';
  }
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;">Cargando estudiantes del salón...</td></tr>';

  try {
    let list = await getCollection('estudiantes_salon');

    // Blindaje de aislamiento por Delegado/Salón ("cada delegado tiene su propio salón y estudiantes, no deben cruzarse")
    if (window._currentTutoria) {
      const t = window._currentTutoria;
      list = list.filter(c => {
        const matchDelegado = (t.estudianteId && c.delegadoId === t.estudianteId) ||
                              (t.delegadoId && c.delegadoId === t.delegadoId) ||
                              (t.estudiante && c.delegadoNombre && c.delegadoNombre.toLowerCase().trim() === t.estudiante.toLowerCase().trim());
        if (matchDelegado) return true;
        if (t.ciclo && c.ciclo === t.ciclo) {
          if (t.estudianteId || t.delegadoId) {
            return c.delegadoId === t.estudianteId || c.delegadoId === t.delegadoId;
          }
          return true;
        }
        return false;
      });
    } else if (ciclo) {
      list = list.filter(c => c.ciclo === ciclo);
    }

    window._currentAsistSalonList = list;

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;"><p class="text-sm text-gray-500">No hay estudiantes registrados en el salón del Delegado para esta tutoría.</p></td></tr>';
      window.updateLiveAsistenciaCounters();
      return;
    }

    const savedMap = window._savedAsistenciaMap || {};

    tbody.innerHTML = list.map((c, idx) => {
      const savedEstado = savedMap[c.id] || savedMap[c.codigo] || 'Asistencia';
      return `
        <tr class="asist-row-${idx}">
          <td><strong class="text-gray-900">${Validators.sanitize(c.codigo || 'N/A')}</strong></td>
          <td>${Validators.sanitize(c.nombre)}</td>
          <td><span class="badge badge-info">${Validators.sanitize(c.ciclo || 'N/A')}</span></td>
          <td>
            <div style="display:flex; gap:0.4rem; flex-wrap:wrap; align-items:center;">
              <label class="asist-opt-label" data-val="Asistencia" onclick="selectAsistOption(${idx}, 'Asistencia')" style="cursor:pointer; display:inline-flex; align-items:center; gap:0.25rem; background:${savedEstado === 'Asistencia' ? 'var(--green-600)' : 'var(--green-50)'}; border:1px solid ${savedEstado === 'Asistencia' ? 'var(--green-700)' : 'var(--green-200)'}; padding:0.25rem 0.6rem; border-radius:99px; font-size:0.75rem; color:${savedEstado === 'Asistencia' ? '#fff' : 'var(--green-700)'}; font-weight:${savedEstado === 'Asistencia' ? '700' : '500'}; transition:all 0.15s ease; ${savedEstado === 'Asistencia' ? 'box-shadow:0 0 0 2px rgba(59,130,246,0.4);' : ''}">
                <input type="radio" name="asist_${idx}" value="Asistencia" ${savedEstado === 'Asistencia' ? 'checked' : ''} style="display:none;" onchange="updateLiveAsistenciaCounters()"> ✅ Asistencia
              </label>
              <label class="asist-opt-label" data-val="Falta" onclick="selectAsistOption(${idx}, 'Falta')" style="cursor:pointer; display:inline-flex; align-items:center; gap:0.25rem; background:${savedEstado === 'Falta' ? 'var(--red-600)' : 'var(--red-50)'}; border:1px solid ${savedEstado === 'Falta' ? 'var(--red-700)' : 'var(--red-200)'}; padding:0.25rem 0.6rem; border-radius:99px; font-size:0.75rem; color:${savedEstado === 'Falta' ? '#fff' : 'var(--red-700)'}; font-weight:${savedEstado === 'Falta' ? '700' : '500'}; transition:all 0.15s ease; ${savedEstado === 'Falta' ? 'box-shadow:0 0 0 2px rgba(59,130,246,0.4);' : ''}">
                <input type="radio" name="asist_${idx}" value="Falta" ${savedEstado === 'Falta' ? 'checked' : ''} style="display:none;" onchange="updateLiveAsistenciaCounters()"> ❌ Falta
              </label>
              <label class="asist-opt-label" data-val="Justificación" onclick="selectAsistOption(${idx}, 'Justificación')" style="cursor:pointer; display:inline-flex; align-items:center; gap:0.25rem; background:${savedEstado === 'Justificación' ? 'var(--yellow-500)' : 'var(--yellow-50)'}; border:1px solid ${savedEstado === 'Justificación' ? 'var(--yellow-600)' : 'var(--yellow-200)'}; padding:0.25rem 0.6rem; border-radius:99px; font-size:0.75rem; color:${savedEstado === 'Justificación' ? '#fff' : 'var(--yellow-700)'}; font-weight:${savedEstado === 'Justificación' ? '700' : '500'}; transition:all 0.15s ease; ${savedEstado === 'Justificación' ? 'box-shadow:0 0 0 2px rgba(59,130,246,0.4);' : ''}">
                <input type="radio" name="asist_${idx}" value="Justificación" ${savedEstado === 'Justificación' ? 'checked' : ''} style="display:none;" onchange="updateLiveAsistenciaCounters()"> 📝 Justificado
              </label>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    window.updateLiveAsistenciaCounters();
  } catch (err) {
    console.error('Error al cargar lista de asistencia:', err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:red;">Error al cargar estudiantes.</td></tr>';
  }
};

window.saveAsistenciaSalon = async function() {
  const btn = document.getElementById('btn-save-asist-salon');
  const tutoriaId = document.getElementById('asist-tutoria-id').value;
  const list = window._currentAsistSalonList || [];
  const isUpdate = (window._currentTutoria && window._currentTutoria.asistencia === true);

  if (list.length === 0) {
    Notifications.warning('No hay estudiantes en la lista para registrar.');
    return;
  }

  setButtonLoading(btn, true, isUpdate ? 'Actualizando...' : 'Guardando...');

  try {
    const listaAsistencia = [];
    const updates = [];
    const savedMap = window._savedAsistenciaMap || {};

    list.forEach((est, idx) => {
      const radio = document.querySelector(`input[name="asist_${idx}"]:checked`);
      const estado = radio ? radio.value : 'Asistencia';
      const asistio = (estado === 'Asistencia');
      const falta = (estado === 'Falta');
      const justificado = (estado === 'Justificación');

      listaAsistencia.push({
        id: est.id,
        codigo: est.codigo || '',
        nombre: est.nombre,
        email: est.email || '',
        estado: estado,
        asistio: asistio,
        justificado: justificado,
        fecha: new Date().toISOString()
      });

      const asistenciasActual = est.asistencias || 0;
      const faltasActual = est.faltas || 0;
      const justificacionesActual = est.justificaciones || 0;
      const totalActual = est.totalSesiones || 0;

      if (!isUpdate) {
        // Primera vez registrando en esta tutoría: se suma +1 sesión y +1 al estado elegido
        updates.push(
          updateDocument('estudiantes_salon', est.id, {
            asistencias: asistio ? asistenciasActual + 1 : asistenciasActual,
            faltas: falta ? faltasActual + 1 : faltasActual,
            justificaciones: justificado ? justificacionesActual + 1 : justificacionesActual,
            totalSesiones: totalActual + 1
          })
        );
      } else {
        // Modo Actualización ("ya no debe dejar registrar mas, simplemente actualizar")
        // Calculamos la diferencia del estado anterior vs el nuevo sin alterar totalSesiones
        const prevEstado = savedMap[est.id] || savedMap[est.codigo] || null;
        if (prevEstado !== estado) {
          let newAsist = asistenciasActual;
          let newFaltas = faltasActual;
          let newJust = justificacionesActual;

          // Restar de la categoría anterior
          if (prevEstado === 'Asistencia') newAsist = Math.max(0, newAsist - 1);
          else if (prevEstado === 'Falta') newFaltas = Math.max(0, newFaltas - 1);
          else if (prevEstado === 'Justificación') newJust = Math.max(0, newJust - 1);

          // Sumar a la nueva categoría
          if (estado === 'Asistencia') newAsist++;
          else if (estado === 'Falta') newFaltas++;
          else if (estado === 'Justificación') newJust++;

          updates.push(
            updateDocument('estudiantes_salon', est.id, {
              asistencias: newAsist,
              faltas: newFaltas,
              justificaciones: newJust,
              totalSesiones: totalActual
            })
          );
        }
      }
    });

    if (tutoriaId) {
      updates.push(updateDocument('tutorias', tutoriaId, {
        estado: 'Finalizada',
        asistencia: true,
        listaAsistenciaSalon: listaAsistencia,
        fechaAsistencia: new Date().toISOString()
      }));
    }

    await Promise.all(updates);
    Notifications.success(isUpdate ? '¡Asistencia de salón actualizada correctamente sin duplicar sesiones!' : '¡Asistencia de salón registrada y guardada exitosamente en Firestore!');
    closeAsistenciaSalonModal();

    const session = JSON.parse(localStorage.getItem('sgta_session'));
    await loadTutorTutorias(session.nombre || session.email);
    await loadTutorEstudiantes(session.nombre || session.email);
  } catch (err) {
    console.error('Error al guardar asistencia de salón:', err);
    Notifications.error('Error al guardar asistencia en la base de datos.');
  } finally {
    setButtonLoading(btn, false);
  }
};

/* ---------- SOLICITUDES ---------- */
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
              <p class="text-gray-900 mb-1">${Validators.sanitize(r.student)}</p>
              <p class="text-sm text-gray-600 mb-2">${Validators.sanitize(r.subject)}</p>
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
          <button class="btn btn-green-soft" onclick="acceptSolicitud('${r.id}')">✓ Aceptar Solicitud</button>
          <button class="btn btn-red-soft" onclick="rejectSolicitud('${r.id}')">✗ Rechazar</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error("Error cargando solicitudes:", error);
    container.innerHTML = '<div style="color:red; text-align:center;">Error al cargar solicitudes</div>';
  }
}

window.acceptSolicitud = async function(solId) {
  try {
    const sol = await getDocument('solicitudes', solId);
    if (!sol) return;

    // Actualizar solicitud
    await updateDocument('solicitudes', solId, { estado: 'Aceptada' });

    // Crear tutoría
    const session = JSON.parse(localStorage.getItem('sgta_session'));
    await addDocument('tutorias', {
      estudiante: sol.student,
      tutor: session.nombre || session.email,
      materia: sol.subject,
      fecha: sol.requestedDate,
      hora: sol.time,
      ubicacion: 'Virtual',
      estado: 'Aceptada',
      ciclo: sol.ciclo || ''
    });

    // Notificar y email
    const students = await queryCollection('usuarios', 'nombre', '==', sol.student);
    if (students.length > 0) {
      Notifications.createNotification({
        userId: students[0].id,
        titulo: 'Solicitud aceptada',
        mensaje: `Tu solicitud de tutoría de ${sol.subject} ha sido aceptada.`,
        tipo: 'solicitud', link: 'mis-tutorias'
      });
      EmailService.sendAceptacion({
        email: students[0].email, nombre: students[0].nombre,
        tutor: session.nombre, materia: sol.subject, fecha: sol.requestedDate, hora: sol.time
      });
    }

    Notifications.success('Solicitud aceptada y tutoría creada.');
    const tutorName = session.nombre || session.email;
    await loadTutorSolicitudes(tutorName);
    await loadTutorDashboard(tutorName);
  } catch (err) {
    console.error('Error aceptando solicitud:', err);
    Notifications.error('Error al aceptar la solicitud.');
  }
};

window.rejectSolicitud = function(solId) {
  Notifications.confirm('Rechazar Solicitud', '¿Estás seguro de rechazar esta solicitud?', async () => {
    try {
      const sol = await getDocument('solicitudes', solId);
      await updateDocument('solicitudes', solId, { estado: 'Rechazada' });

      if (sol) {
        const students = await queryCollection('usuarios', 'nombre', '==', sol.student);
        if (students.length > 0) {
          Notifications.createNotification({
            userId: students[0].id,
            titulo: 'Solicitud rechazada',
            mensaje: `Tu solicitud de tutoría de ${sol.subject} ha sido rechazada.`,
            tipo: 'solicitud'
          });
        }
      }

      Notifications.success('Solicitud rechazada.');
      const session = JSON.parse(localStorage.getItem('sgta_session'));
      await loadTutorSolicitudes(session.nombre || session.email);
      await loadTutorDashboard(session.nombre || session.email);
    } catch (err) {
      Notifications.error('Error al rechazar la solicitud.');
    }
  }, { confirmText: 'Rechazar', type: 'danger' });
};

/* ---------- MENSAJES ---------- */
async function loadTutorMensajes(session) {
  const container = document.getElementById('tutor-mensajes-list');
  if (!container) return;

  try {
    const msgs = await queryCollectionMulti('mensajes', [
      { field: 'toId', operator: '==', value: session.uid || '' }
    ], { orderBy: 'createdAt', orderDir: 'desc', limitTo: 10 });

    if (msgs.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500" style="padding:2rem;text-align:center;">No tienes mensajes.</p>';
      return;
    }

    container.innerHTML = msgs.map(m => `
      <div class="message-item${m.read ? '' : ' unread'}">
        <div class="message-inner">
          <div class="avatar-lg" style="background:linear-gradient(135deg,var(--blue-400),var(--blue-600))"><span class="text-white text-xs">${getInitials(m.from || 'U')}</span></div>
          <div class="message-body">
            <div class="message-header">
              <p class="${m.read ? '' : 'font-semibold'} text-gray-900">${Validators.sanitize(m.from || 'Usuario')}</p>
              <span class="text-xs text-gray-500">${m.createdAt && m.createdAt.toDate ? m.createdAt.toDate().toLocaleDateString('es-PE') : ''}</span>
            </div>
            <p class="text-sm text-gray-600">${Validators.sanitize(m.message || '')}</p>
            ${!m.read ? '<span class="badge badge-blue mt-2">Nuevo</span>' : ''}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading messages:', err);
  }
}

/* ---------- CONFIGURACIÓN ---------- */
window.saveTutorConfig = async function() {
  const btn = document.getElementById('btn-save-tutor-config');
  setButtonLoading(btn, true, 'Guardando...');

  const session = JSON.parse(localStorage.getItem('sgta_session'));
  const userId = session.uid;
  if (!userId) { setButtonLoading(btn, false); return; }

  try {
    await updateDocument('usuarios', userId, {
      nombre: document.getElementById('tutor-cfg-nombre').value.trim(),
      especialidad: document.getElementById('tutor-cfg-especialidad').value.trim(),
      disponibilidad: {
        dias: document.getElementById('tutor-cfg-dias').value,
        horaInicio: document.getElementById('tutor-cfg-hora-inicio').value,
        horaFin: document.getElementById('tutor-cfg-hora-fin').value
      }
    });

    // Actualizar sesión local
    session.nombre = document.getElementById('tutor-cfg-nombre').value.trim();
    localStorage.setItem('sgta_session', JSON.stringify(session));
    setupUserInfo(session);

    Notifications.success('Configuración guardada exitosamente.');
  } catch (err) {
    Notifications.error('Error al guardar la configuración.');
  } finally {
    setButtonLoading(btn, false);
  }
};

/* ============================================
   BUILD SECTIONS
   ============================================ */

function buildTutorInicio(session) {
  return `
    <div id="inicio" class="section active">
      <div class="section-header"><h1>Panel de Tutor</h1><p>Gestiona tus tutorías y estudiantes asignados</p></div>
      <div class="stats-grid">
        <div class="stat-card hover-lift"><div class="stat-card-top"><div class="stat-icon bg-blue-500">${icon('book-open')}</div></div><p class="stat-value" id="tutor-stat-tutorias">...</p><p class="stat-label">Total Tutorías</p></div>
        <div class="stat-card hover-lift"><div class="stat-card-top"><div class="stat-icon bg-green-500">${icon('check-circle')}</div></div><p class="stat-value" id="tutor-stat-completadas">...</p><p class="stat-label">Completadas</p></div>
        <div class="stat-card hover-lift"><div class="stat-card-top"><div class="stat-icon bg-purple-500">${icon('users')}</div></div><p class="stat-value" id="tutor-stat-estudiantes">...</p><p class="stat-label">Estudiantes</p></div>
        <div class="stat-card hover-lift"><div class="stat-card-top"><div class="stat-icon bg-amber-500">${icon('file-text')}</div></div><p class="stat-value" id="tutor-stat-solicitudes">...</p><p class="stat-label">Solicitudes</p></div>
      </div>
      <div class="grid-2-1">
        <div class="space-y-6">
          <div class="card"><div class="card-header"><h2>Mis Próximas Tutorías</h2><button class="btn btn-blue" onclick="openTutorTutoriaModal()">${icon('user-plus')} Nueva Tutoría</button></div><div id="tutor-upcoming-sessions"><p class="text-sm text-gray-500" style="padding:1.5rem;">Cargando...</p></div></div>
          <div class="card"><div class="card-header"><h2>Solicitudes Pendientes</h2></div><div id="tutor-dash-requests"><p class="text-sm text-gray-500" style="padding:1.5rem;">Cargando...</p></div></div>
        </div>
        <div class="space-y-6">
          <div class="card"><div class="card-body"><h2 class="mb-4">Mi Disponibilidad</h2><div class="availability-card" id="tutor-disponibilidad"><p class="text-sm text-gray-900 mb-1">Lunes a Viernes</p><p class="text-xs text-gray-600">9:00 AM - 5:00 PM</p></div><button class="btn btn-gray btn-full" onclick="navigateSection('configuracion')">Editar Horario</button></div></div>
          <div class="card"><div class="card-body"><h2 class="mb-4">Materias que Imparto</h2><div class="space-y-2" id="tutor-materias-list"><p class="text-sm text-gray-500">Cargando...</p></div></div></div>
          <div class="info-card-blue"><h3>Rendimiento del Mes</h3><p class="text-3xl mb-1" id="tutor-rendimiento">...</p><p class="text-sm mb-4" style="color:#bfdbfe">Tutorías completadas</p><div class="progress-bar progress-bar-bg-white"><div class="progress-fill progress-fill-amber" id="tutor-rend-bar" style="width:0%"></div></div></div>
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
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div class="flex items-center gap-4"><h2>Registro de Tutorías</h2></div>
          <div style="display:flex; gap:0.75rem;">
            <button class="btn btn-blue" onclick="openTutorTutoriaModal()">Programar Nueva</button>
          </div>
        </div>
        <div class="table-wrapper"><table><thead><tr><th>ID</th><th>Estudiante</th><th>Materia</th><th>Fecha</th><th>Horario</th><th>Modalidad o Ubicación</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="tutor-tutorias-list"><tr><td colspan="8" style="text-align:center;padding:2rem;">Cargando tutorías...</td></tr></tbody></table></div>
      </div>
    </div>
  `;
}

function buildProgramar() {
  return `
    <div id="programar" class="section">
      <div class="section-header"><h1>Programar Nueva Tutoría</h1><p>Crea una nueva sesión de tutoría</p></div>
      <div style="text-align:center;padding:3rem;">
        <p class="text-gray-600 mb-4">Usa el botón de abajo para abrir el formulario de programación.</p>
        <button class="btn btn-blue btn-lg" onclick="openTutorTutoriaModal()">${icon('calendar-check')} Programar Tutoría</button>
      </div>
    </div>
  `;
}

function buildMisEstudiantes() {
  return `
    <div id="mis-estudiantes" class="section">
      <div class="section-header"><h1>Mis Estudiantes</h1><p>Estudiantes asignados y su progreso</p></div>
      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <h2>Lista de Estudiantes Asignados</h2>
        </div>
        <div class="table-wrapper"><table><thead><tr><th>Estudiante</th><th>Ciclo</th><th>Email</th><th>Tutorías</th><th>Última Tutoría</th></tr></thead><tbody id="tutor-estudiantes-list"><tr><td colspan="5" style="text-align:center;padding:2rem;">Cargando estudiantes...</td></tr></tbody></table></div>
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
  return `
    <div id="mensajes" class="section">
      <div class="section-header"><h1>Mensajes</h1><p>Comunicación con estudiantes y coordinadores</p></div>
      <div class="card">
        <div class="card-header"><h2>Bandeja de Entrada</h2></div>
        <div id="tutor-mensajes-list"><p class="text-sm text-gray-500" style="padding:2rem;text-align:center;">Cargando mensajes...</p></div>
      </div>
    </div>
  `;
}

function buildTutorConfig(session) {
  return `
    <div id="configuracion" class="section">
      <div class="section-header"><h1>Configuración</h1><p>Ajusta tus preferencias y disponibilidad</p></div>
      <div class="grid-2">
        <div class="card"><div class="card-body">
          <h3 class="mb-4">Información Personal</h3>
          <div class="space-y-4">
            <div><label class="form-label">Nombre Completo</label><input type="text" id="tutor-cfg-nombre" class="form-input" value="${Validators.sanitize(session.nombre || '')}"></div>
            <div><label class="form-label">Email</label><input type="email" class="form-input" value="${Validators.sanitize(session.email || '')}" disabled></div>
            <div><label class="form-label">Especialidad</label><input type="text" id="tutor-cfg-especialidad" class="form-input" value=""></div>
          </div>
        </div></div>
        <div class="card"><div class="card-body">
          <h3 class="mb-4">Horario de Disponibilidad</h3>
          <div class="space-y-4">
            <div><label class="form-label">Días Disponibles</label><select id="tutor-cfg-dias" class="form-select"><option>Lunes a Viernes</option><option>Lunes a Sábado</option><option>Personalizado</option></select></div>
            <div><label class="form-label">Hora de Inicio</label><input type="time" id="tutor-cfg-hora-inicio" class="form-input" value="09:00"></div>
            <div><label class="form-label">Hora de Fin</label><input type="time" id="tutor-cfg-hora-fin" class="form-input" value="17:00"></div>
          </div>
        </div></div>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button class="btn btn-gray btn-lg">Cancelar</button>
        <button class="btn btn-blue btn-lg" id="btn-save-tutor-config" onclick="saveTutorConfig()">Guardar Cambios</button>
      </div>
    </div>
  `;
}
