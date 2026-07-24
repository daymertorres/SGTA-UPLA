/* ============================================
   SGTA-UPLA — Student Dashboard Logic
   Tutorías, solicitudes, compañeros, reportes
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  EmailService.init();
  const session = checkAuth('Estudiante Delegado');
  if (!session) return;

  // Icons
  document.getElementById('sidebar-icon').innerHTML = icon('shield');
  document.getElementById('logout-icon').innerHTML = icon('log-out');
  document.getElementById('toggle-sidebar').innerHTML = icon('x');
  document.getElementById('search-icon').innerHTML = icon('search');
  document.getElementById('bell-icon').innerHTML = icon('bell');

  // User info
  setupUserInfo(session);

  // Menu
  const menuItems = [
    { icon: 'home', label: 'Inicio', section: 'inicio' },
    { icon: 'calendar', label: 'Mis Tutorías', section: 'mis-tutorias' },
    { icon: 'calendar-check', label: 'Solicitar Tutoría', section: 'solicitar' },
    { icon: 'users', label: 'Compañeros', section: 'companeros' },
    { icon: 'bar-chart-3', label: 'Mis Reportes', section: 'mis-reportes' },
    { icon: 'settings', label: 'Configuración', section: 'configuracion' }
  ];

  const menuEl = document.getElementById('sidebar-menu');
  menuItems.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.className = `menu-item${idx === 0 ? ' active' : ''}`;
    btn.dataset.section = item.section;
    btn.innerHTML = `${icon(item.icon)}<span class="menu-label">${item.label}</span>`;
    menuEl.appendChild(btn);
  });

  document.getElementById('main-content').innerHTML = `
    ${buildStudentInicio(session)}
    ${buildMisTutoriasStudent()}
    ${buildSolicitarTutoria()}
    ${buildCompaneros()}
    ${buildMisReportes()}
    ${buildStudentConfig(session)}
  `;

  initDashboard();

  if (session.uid) Notifications.setupNotificationButton(session.uid);

  initStudentData(session);
});

async function initStudentData(session) {
  if (!firebaseReady) return;

  showLoader('Cargando tus datos...');
  try {
    const studentName = session.nombre || session.email;
    await Promise.all([
      loadStudentDashboard(studentName, session),
      loadStudentTutorias(studentName),
      loadStudentSolicitudes(studentName),
      loadCompaneros(session),
      loadStudentReportes(studentName),
      loadAvailableTutors()
    ]);
  } catch (err) {
    console.error('Error loading student data:', err);
  } finally {
    hideLoader();
  }
}

/* ---------- DASHBOARD ---------- */
async function loadStudentDashboard(studentName, session) {
  try {
    const tutorias = await queryCollection('tutorias', 'estudiante', '==', studentName);
    const solicitudes = await queryCollection('solicitudes', 'student', '==', studentName);

    const completadas = tutorias.filter(t => t.estado === 'Finalizada' || t.estado === 'Completada');
    const pendientes = tutorias.filter(t => t.estado === 'Pendiente' || t.estado === 'Aceptada');
    const uniqueTutors = new Set(tutorias.map(t => t.tutor).filter(Boolean));
    const materias = new Set(tutorias.map(t => t.materia || t.subject).filter(Boolean));

    // Stats
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setEl('st-stat-tutorias', tutorias.length);
    setEl('st-stat-completadas', completadas.length);
    setEl('st-stat-tutores', uniqueTutors.size);
    setEl('st-stat-materias', materias.size);

    // Próximas tutorías
    const upcoming = pendientes.slice(0, 3);
    const upEl = document.getElementById('st-upcoming-list');
    if (upEl) {
      if (upcoming.length === 0) {
        upEl.innerHTML = '<p class="text-sm text-gray-500" style="padding:1.5rem;">No tienes tutorías próximas.</p>';
      } else {
        upEl.innerHTML = upcoming.map(s => `
          <div class="session-item">
            <div class="session-top">
              <div class="session-user">
                <div class="avatar-lg" style="background:linear-gradient(135deg,var(--green-400),var(--green-500))"><span class="text-white text-sm">${getInitials(s.tutor || '??')}</span></div>
                <div><p class="text-gray-900">${Validators.sanitize(s.tutor || '-')}</p><p class="text-sm text-gray-600">${Validators.sanitize(s.materia || s.subject || '-')}</p></div>
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

    // Tutores disponibles on dashboard
    const tutors = await queryCollection('usuarios', 'rol', '==', 'Tutor');
    const activeTutors = tutors.filter(t => t.estado === 'Activo');
    const tutorsEl = document.getElementById('st-tutors-list');
    if (tutorsEl) {
      if (activeTutors.length === 0) {
        tutorsEl.innerHTML = '<p class="text-sm text-gray-500">No hay tutores disponibles.</p>';
      } else {
        tutorsEl.innerHTML = activeTutors.slice(0, 4).map(t => `
          <div class="tutor-mini-card">
            <div class="avatar-lg" style="background:linear-gradient(135deg,var(--green-400),var(--green-600))">${icon('graduation-cap')}</div>
            <div><p class="text-sm text-gray-900">${Validators.sanitize(t.nombre)}</p><p class="text-xs text-gray-600">${Validators.sanitize(t.especialidad || 'General')}</p></div>
            <button class="btn btn-blue-soft text-xs" onclick="requestTutor('${Validators.sanitize(t.nombre)}')">Solicitar</button>
          </div>
        `).join('');
      }
    }

    // Progreso
    const progressEl = document.getElementById('st-progress-bar');
    if (progressEl) {
      const pct = tutorias.length > 0 ? Math.round((completadas.length / Math.max(tutorias.length, 10)) * 100) : 0;
      progressEl.style.width = pct + '%';
    }
    setEl('st-progress-text', `${completadas.length}/${tutorias.length} tutorías completadas`);

    // Recordatorio
    const remEl = document.getElementById('st-reminder');
    if (remEl && upcoming.length > 0) {
      const next = upcoming[0];
      remEl.innerHTML = `<p class="text-sm text-gray-900 mb-1">${Validators.sanitize(next.materia || next.subject || '-')}</p><p class="text-xs text-gray-600">${next.fecha || '-'} a las ${next.hora || next.time || '-'}</p><p class="text-xs text-gray-600">con ${Validators.sanitize(next.tutor || '-')}</p>`;
    } else if (remEl) {
      remEl.innerHTML = '<p class="text-sm text-gray-500">No hay tutorías próximas.</p>';
    }

    // Ciclo info
    setEl('st-ciclo', session.ciclo || 'N/A');
    setEl('st-ciclo-tutorias', tutorias.length);

  } catch (err) {
    console.error('Error loading student dashboard:', err);
  }
}

/* ---------- MIS TUTORÍAS ---------- */
async function loadStudentTutorias(studentName) {
  const tbody = document.getElementById('st-tutorias-list');
  if (!tbody) return;

  try {
    const tutorias = await queryCollection('tutorias', 'estudiante', '==', studentName);
    window.studentTutoriasCache = tutorias;

    if (tutorias.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No tienes tutorías.</td></tr>';
      return;
    }

    tbody.innerHTML = tutorias.map(s => `
      <tr>
        <td class="text-gray-600">#${s.id.substring(0,6)}</td>
        <td class="text-gray-900">${Validators.sanitize(s.tutor || '-')}</td>
        <td class="text-gray-600">${Validators.sanitize(s.materia || s.subject || '-')}</td>
        <td class="text-gray-600">${s.fecha || s.requestedDate || '-'}</td>
        <td class="text-gray-600">${s.hora || s.time || '-'}</td>
        <td><span class="badge ${getBadgeClass(s.estado)}">${s.estado}</span></td>
        <td><button class="link-btn" onclick="viewStudentTutoriaDetails('${s.id}')">Detalles</button></td>
      </tr>
    `).join('');
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error al cargar tutorías.</td></tr>';
  }
}

/* ---------- SOLICITAR TUTORÍA ---------- */
async function loadAvailableTutors() {
  const select = document.getElementById('sol-tutor');
  if (!select) return;

  const tutors = await queryCollection('usuarios', 'rol', '==', 'Tutor');
  const active = tutors.filter(t => t.estado === 'Activo');
  select.innerHTML = '<option value="">Seleccionar tutor...</option>' +
    active.map(t => `<option value="${Validators.sanitize(t.nombre)}">${Validators.sanitize(t.nombre)} — ${Validators.sanitize(t.especialidad || 'General')}</option>`).join('');
}

async function loadStudentSolicitudes(studentName) {
  const container = document.getElementById('st-solicitudes-list');
  if (!container) return;

  try {
    const solicitudes = await queryCollection('solicitudes', 'student', '==', studentName);

    if (solicitudes.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500" style="padding:2rem;text-align:center;">No has enviado solicitudes aún.</p>';
      return;
    }

    container.innerHTML = solicitudes.map(s => `
      <div class="request-item" style="padding:1rem;">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-gray-900 mb-1">${Validators.sanitize(s.subject)}</p>
            <p class="text-sm text-gray-600">Tutor: ${Validators.sanitize(s.tutor)}</p>
            <p class="text-sm text-gray-600">${s.requestedDate} a las ${s.time}</p>
          </div>
          <span class="badge ${getBadgeClass(s.estado)}">${s.estado}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p class="text-sm" style="color:red;">Error al cargar solicitudes.</p>';
  }
}

window.submitSolicitud = async function() {
  const btn = document.getElementById('btn-submit-sol');
  const session = JSON.parse(localStorage.getItem('sgta_session'));

  const tutorSelect = document.getElementById('sol-tutor');
  const materiaSelect = document.getElementById('sol-materia');
  const fechaInput = document.getElementById('sol-fecha');
  const horaInput = document.getElementById('sol-hora');
  const prioridadSelect = document.getElementById('sol-prioridad');
  const descEl = document.getElementById('sol-descripcion');

  const isValid = Validators.validateForm([
    { element: tutorSelect, rules: [{ validator: Validators.selectRequired, args: ['El tutor'] }] },
    { element: materiaSelect, rules: [{ validator: Validators.selectRequired, args: ['La materia'] }] },
    { element: fechaInput, rules: [{ validator: Validators.date }] },
    { element: horaInput, rules: [{ validator: Validators.time }] }
  ]);

  if (!isValid) return;
  setButtonLoading(btn, true, 'Enviando...');

  try {
    const data = {
      student: session.nombre || session.email,
      studentId: session.uid || '',
      tutor: tutorSelect.value,
      subject: materiaSelect.value,
      requestedDate: fechaInput.value,
      time: horaInput.value,
      priority: prioridadSelect.value,
      descripcion: (descEl ? descEl.value.trim() : ''),
      ciclo: session.ciclo || '',
      estado: 'Pendiente'
    };

    await addDocument('solicitudes', data);

    // Notificar al tutor
    const tutors = await queryCollection('usuarios', 'nombre', '==', data.tutor);
    if (tutors.length > 0) {
      Notifications.createNotification({
        userId: tutors[0].id,
        titulo: 'Nueva solicitud de tutoría',
        mensaje: `${data.student} ha solicitado una tutoría de ${data.subject} para el ${data.requestedDate}.`,
        tipo: 'solicitud',
        link: 'solicitudes'
      });
      EmailService.sendNuevaTutoria({
        email: tutors[0].email, nombre: tutors[0].nombre,
        tutor: data.tutor, estudiante: data.student,
        materia: data.subject, fecha: data.requestedDate, hora: data.time
      });
    }

    Notifications.success('Solicitud enviada exitosamente.');

    // Reset form
    tutorSelect.value = '';
    materiaSelect.value = '';
    fechaInput.value = '';
    horaInput.value = '';
    if (descEl) descEl.value = '';

    await loadStudentSolicitudes(session.nombre || session.email);
  } catch (err) {
    console.error('Error submitting solicitud:', err);
    Notifications.error('Error al enviar la solicitud.');
  } finally {
    setButtonLoading(btn, false);
  }
};

/* ---------- COMPAÑEROS ---------- */
async function loadCompaneros(session) {
  await Promise.all([
    loadCompanerosSalon(session),
    loadCompanerosDelegados(session)
  ]);
}

async function loadCompanerosSalon(session) {
  const tbody = document.getElementById('st-salon-table-body');
  if (!tbody) return;

  try {
    // Buscar compañeros estrictamente del delegado (aislamiento por salón)
    let list = [];
    if (session.uid) {
      list = await queryCollection('estudiantes_salon', 'delegadoId', '==', session.uid);
    }
    // Para compatibilidad con registros creados antes sin delegadoId
    if (list.length === 0 && session.ciclo) {
      const allCiclo = await queryCollection('estudiantes_salon', 'ciclo', '==', session.ciclo);
      list = allCiclo.filter(c => !c.delegadoId || c.delegadoId === session.uid);
    }

    window._companerosSalonCache = list;

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="padding:2rem;text-align:center;"><p class="text-sm text-gray-500">Aún no has agregado compañeros a tu salón. Haz clic en "+ Agregar Compañero de Salón".</p></td></tr>';
      return;
    }

    tbody.innerHTML = list.map(c => {
      const asist = c.asistencias || 0;
      const total = c.totalSesiones || 0;
      const pct = total > 0 ? Math.round((asist / total) * 100) : 0;
      return `
        <tr>
          <td><strong class="text-gray-900">${Validators.sanitize(c.codigo || 'N/A')}</strong></td>
          <td>${Validators.sanitize(c.nombre)}</td>
          <td>${Validators.sanitize(c.email)}</td>
          <td><span class="badge badge-info">${Validators.sanitize(c.ciclo || session.ciclo || 'N/A')}</span></td>
          <td>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <span style="font-weight:600;color:${pct >= 70 ? 'var(--green-600)' : 'var(--red-500)'};">${pct}%</span>
              <span class="text-sm text-gray-500">(${asist}/${total})</span>
            </div>
          </td>
          <td>
            <div style="display:flex;gap:0.5rem;">
              <button class="link-btn" onclick="openCompaneroModal('${c.id}')" title="Editar">${icon('edit')}</button>
              <button class="link-btn" style="color:var(--red-500);" onclick="deleteCompanero('${c.id}')" title="Eliminar">${icon('trash-2')}</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error cargando compañeros de salón:', err);
    tbody.innerHTML = '<tr><td colspan="6" style="color:red;text-align:center;">Error al cargar compañeros.</td></tr>';
  }
}

async function loadCompanerosDelegados(session) {
  const container = document.getElementById('st-companeros-list');
  if (!container) return;

  try {
    const allStudents = await queryCollection('usuarios', 'rol', '==', 'Estudiante Delegado');
    const companeros = allStudents.filter(s => s.nombre !== session.nombre);

    if (companeros.length === 0) {
      container.innerHTML = '<div style="padding:2rem;text-align:center;grid-column:span 3;"><p class="text-sm text-gray-500">No se encontraron otros delegados.</p></div>';
      return;
    }

    container.innerHTML = companeros.map(c => `
      <div class="delegado-card">
        <div class="delegado-header">
          <div class="avatar-lg" style="background:linear-gradient(135deg,var(--blue-400),var(--blue-600))"><span class="text-white text-sm">${getInitials(c.nombre)}</span></div>
          <div>
            <p class="text-gray-900">${Validators.sanitize(c.nombre)}</p>
            <p class="text-sm text-gray-600">Ciclo ${c.ciclo || 'N/A'}</p>
          </div>
        </div>
        <div class="delegado-stats">
          <div class="delegado-stat"><span class="text-gray-600">Email:</span><span class="text-gray-900" style="font-size:0.75rem;">${Validators.sanitize(c.email)}</span></div>
          <div class="delegado-stat"><span class="text-gray-600">Estado:</span><span class="${c.estado === 'Activo' ? 'text-green-600' : ''}">${c.estado || 'Activo'}</span></div>
        </div>
        <button class="btn btn-blue-soft btn-full" onclick="Notifications.info('Función de contacto disponible próximamente')">Contactar</button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p style="color:red;">Error al cargar otros delegados.</p>';
  }
}

window.openCompaneroModal = function(id = null) {
  const overlay = document.getElementById('companero-modal-overlay');
  const title = document.getElementById('companero-modal-title');
  const form = document.getElementById('companero-form');
  Validators.clearFormErrors(form);
  form.reset();
  document.getElementById('comp-id').value = '';

  const session = JSON.parse(localStorage.getItem('sgta_session'));
  document.getElementById('comp-ciclo').value = session.ciclo || '';

  if (id && window._companerosSalonCache) {
    title.innerText = 'Editar Compañero de Salón';
    const comp = window._companerosSalonCache.find(c => c.id === id);
    if (comp) {
      document.getElementById('comp-id').value = comp.id;
      document.getElementById('comp-codigo').value = comp.codigo || '';
      document.getElementById('comp-nombre').value = comp.nombre || '';
      document.getElementById('comp-email').value = comp.email || '';
      document.getElementById('comp-ciclo').value = comp.ciclo || session.ciclo || '';
    }
  } else {
    title.innerText = 'Agregar Compañero de Salón';
  }

  overlay.classList.add('active');
};

window.closeCompaneroModal = function() {
  document.getElementById('companero-modal-overlay').classList.remove('active');
};

window.saveCompanero = async function() {
  const form = document.getElementById('companero-form');
  const btn = document.getElementById('btn-save-comp');
  Validators.clearFormErrors(form);

  const id = document.getElementById('comp-id').value;
  const codigoInput = document.getElementById('comp-codigo');
  const nombreInput = document.getElementById('comp-nombre');
  const emailInput = document.getElementById('comp-email');
  const cicloInput = document.getElementById('comp-ciclo');

  const fields = [
    { element: codigoInput, rules: [{ validator: Validators.required, args: ['El código de alumno'] }] },
    { element: nombreInput, rules: [{ validator: Validators.required, args: ['El nombre completo'] }] },
    { element: emailInput, rules: [{ validator: Validators.email }] }
  ];

  if (!Validators.validateForm(fields)) return;

  const session = JSON.parse(localStorage.getItem('sgta_session'));
  const data = {
    codigo: codigoInput.value.trim(),
    nombre: nombreInput.value.trim(),
    email: emailInput.value.trim(),
    ciclo: cicloInput.value.trim() || session.ciclo || 'General',
    delegadoId: session.uid || '',
    delegadoNombre: session.nombre || session.email,
    updatedAt: new Date().toISOString()
  };

  setButtonLoading(btn, true, 'Guardando...');
  try {
    if (id) {
      await updateDocument('estudiantes_salon', id, data);
      Notifications.success('Compañero actualizado.');
    } else {
      data.asistencias = 0;
      data.totalSesiones = 0;
      data.createdAt = new Date().toISOString();
      await addDocument('estudiantes_salon', data);
      Notifications.success('Compañero agregado al salón.');
    }
    closeCompaneroModal();
    await loadCompanerosSalon(session);
  } catch (err) {
    console.error('Error al guardar compañero:', err);
    Notifications.error('Error al guardar en la base de datos.');
  } finally {
    setButtonLoading(btn, false);
  }
};

window.deleteCompanero = function(id) {
  Notifications.confirm('Eliminar Compañero', '¿Estás seguro de eliminar a este estudiante de la lista de tu salón?', async () => {
    await deleteDocument('estudiantes_salon', id);
    Notifications.success('Compañero eliminado.');
    const session = JSON.parse(localStorage.getItem('sgta_session'));
    await loadCompanerosSalon(session);
  }, { confirmText: 'Eliminar', type: 'danger' });
};


/* ---------- MIS REPORTES ---------- */
async function loadStudentReportes(studentName) {
  try {
    const tutorias = await queryCollection('tutorias', 'estudiante', '==', studentName);
    const completadas = tutorias.filter(t => t.estado === 'Finalizada' || t.estado === 'Completada');
    const canceladas = tutorias.filter(t => t.estado === 'Cancelada');
    const asistPct = tutorias.length > 0 ? Math.round((completadas.length / tutorias.length) * 100) : 0;
    const materias = [...new Set(tutorias.map(t => t.materia || t.subject).filter(Boolean))];

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setEl('report-st-total', tutorias.length);
    setEl('report-st-asistencia', asistPct + '%');
    setEl('report-st-completadas', completadas.length);
    setEl('report-st-canceladas', canceladas.length);

    // Historial por materia
    const histEl = document.getElementById('st-hist-materias');
    if (histEl) {
      if (materias.length === 0) {
        histEl.innerHTML = '<p class="text-sm text-gray-500" style="text-align:center;">No hay datos de materias.</p>';
      } else {
        histEl.innerHTML = `
          <table><thead><tr><th>Materia</th><th>Total</th><th>Completadas</th><th>Tasa</th></tr></thead>
          <tbody>${materias.map(m => {
            const matTut = tutorias.filter(t => (t.materia || t.subject) === m);
            const matComp = matTut.filter(t => t.estado === 'Finalizada' || t.estado === 'Completada');
            const tasa = matTut.length > 0 ? Math.round((matComp.length / matTut.length) * 100) : 0;
            return `<tr><td class="text-gray-900">${Validators.sanitize(m)}</td><td class="text-gray-600">${matTut.length}</td><td class="text-green-600">${matComp.length}</td><td><span class="badge ${tasa >= 80 ? 'badge-green' : tasa >= 50 ? 'badge-amber' : 'badge-red'}">${tasa}%</span></td></tr>`;
          }).join('')}</tbody></table>
        `;
      }
    }
  } catch (err) {
    console.error('Error loading student reports:', err);
  }
}

/* ---------- CONFIGURACIÓN ---------- */
window.saveStudentConfig = async function() {
  const btn = document.getElementById('btn-save-st-config');
  setButtonLoading(btn, true, 'Guardando...');

  const session = JSON.parse(localStorage.getItem('sgta_session'));
  const userId = session.uid;
  if (!userId) { setButtonLoading(btn, false); return; }

  try {
    const newName = document.getElementById('st-cfg-nombre').value.trim();
    await updateDocument('usuarios', userId, {
      nombre: newName,
      ciclo: document.getElementById('st-cfg-ciclo').value.trim()
    });

    session.nombre = newName;
    session.ciclo = document.getElementById('st-cfg-ciclo').value.trim();
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

function buildStudentInicio(session) {
  return `
    <div id="inicio" class="section active">
      <div class="section-header"><h1>Panel de Estudiante Delegado</h1><p>Tu centro de tutorías académicas</p></div>
      <div class="stats-grid">
        <div class="stat-card hover-lift"><div class="stat-card-top"><div class="stat-icon bg-blue-500">${icon('book-open')}</div></div><p class="stat-value" id="st-stat-tutorias">...</p><p class="stat-label">Total Tutorías</p></div>
        <div class="stat-card hover-lift"><div class="stat-card-top"><div class="stat-icon bg-green-500">${icon('check-circle')}</div></div><p class="stat-value" id="st-stat-completadas">...</p><p class="stat-label">Completadas</p></div>
        <div class="stat-card hover-lift"><div class="stat-card-top"><div class="stat-icon bg-purple-500">${icon('user-circle')}</div></div><p class="stat-value" id="st-stat-tutores">...</p><p class="stat-label">Tutores</p></div>
        <div class="stat-card hover-lift"><div class="stat-card-top"><div class="stat-icon bg-amber-500">${icon('bar-chart-3')}</div></div><p class="stat-value" id="st-stat-materias">...</p><p class="stat-label">Materias</p></div>
      </div>
      <div class="grid-2-1">
        <div class="space-y-6">
          <div class="card"><div class="card-header"><h2>Mis Próximas Tutorías</h2><button class="btn btn-blue" onclick="navigateSection('solicitar')">Solicitar Nueva</button></div><div id="st-upcoming-list"><p class="text-sm text-gray-500" style="padding:1.5rem;">Cargando...</p></div></div>
          <div class="card"><div class="card-header"><h2>Tutores Disponibles</h2></div><div class="card-body"><div class="space-y-3" id="st-tutors-list"><p class="text-sm text-gray-500">Cargando...</p></div></div></div>
        </div>
        <div class="space-y-6">
          <div class="info-card-blue"><h3>Ciclo ${session.ciclo || 'N/A'}</h3><p class="text-3xl mb-1" id="st-ciclo-tutorias">...</p><p class="text-sm mb-4" style="color:#bfdbfe">Tutorías realizadas</p><div class="progress-bar progress-bar-bg-white"><div class="progress-fill progress-fill-amber" id="st-progress-bar" style="width:0%"></div></div><p class="text-xs mt-2" style="color:#93c5fd" id="st-progress-text">Cargando...</p></div>
          <div class="card"><div class="card-body"><h2 class="mb-2">Próximo Recordatorio</h2><div id="st-reminder"><p class="text-sm text-gray-500">Cargando...</p></div></div></div>
        </div>
      </div>
    </div>
  `;
}

function buildMisTutoriasStudent() {
  return `
    <div id="mis-tutorias" class="section">
      <div class="section-header"><h1>Mis Tutorías</h1><p>Historial de todas tus sesiones de tutoría</p></div>
      <div class="card">
        <div class="card-header"><h2>Historial de Tutorías</h2><button class="btn btn-blue" onclick="navigateSection('solicitar')">Solicitar Tutoría</button></div>
        <div class="table-wrapper"><table><thead><tr><th>ID</th><th>Tutor</th><th>Materia</th><th>Fecha</th><th>Hora</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="st-tutorias-list"><tr><td colspan="7" style="text-align:center;padding:2rem;">Cargando tutorías...</td></tr></tbody></table></div>
      </div>
    </div>
  `;
}

function buildSolicitarTutoria() {
  return `
    <div id="solicitar" class="section">
      <div class="section-header"><h1>Solicitar Tutoría</h1><p>Envía una solicitud a un tutor disponible</p></div>
      <div class="grid-2">
        <div class="card"><div class="card-body">
          <h3 class="mb-4">Nueva Solicitud</h3>
          <form id="sol-form" class="space-y-4" onsubmit="event.preventDefault();">
            <div><label class="form-label">Tutor</label><select id="sol-tutor" class="form-select"><option value="">Seleccionar tutor...</option></select></div>
            <div><label class="form-label">Materia</label><select id="sol-materia" class="form-select"><option value="">Seleccionar materia...</option><option>Cálculo Diferencial</option><option>Cálculo Integral</option><option>Álgebra Lineal</option><option>Ecuaciones Diferenciales</option><option>Programación Java</option><option>Base de Datos</option></select></div>
            <div><label class="form-label">Fecha Preferida</label><input type="date" id="sol-fecha" class="form-input"></div>
            <div><label class="form-label">Hora Preferida</label><input type="time" id="sol-hora" class="form-input"></div>
            <div><label class="form-label">Prioridad</label><select id="sol-prioridad" class="form-select"><option>Baja</option><option selected>Media</option><option>Alta</option></select></div>
            <div><label class="form-label">Descripción (opcional)</label><textarea id="sol-descripcion" class="form-textarea" placeholder="Describe los temas que necesitas..."></textarea></div>
            <button class="btn btn-blue btn-full" id="btn-submit-sol" onclick="submitSolicitud()">Enviar Solicitud</button>
          </form>
        </div></div>
        <div class="space-y-6">
          <div class="card"><div class="card-header"><h3>Mis Solicitudes</h3></div><div id="st-solicitudes-list"><p class="text-sm text-gray-500" style="padding:2rem;text-align:center;">Cargando...</p></div></div>
        </div>
      </div>
    </div>
  `;
}

function buildCompaneros() {
  return `
    <div id="companeros" class="section">
      <div class="section-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Compañeros de Mi Salón y Delegados</h1>
          <p>Gestiona la lista de estudiantes de tu salón para control de asistencia de tutorías</p>
        </div>
        <button class="btn btn-blue" onclick="openCompaneroModal()">+ Agregar Compañero de Salón</button>
      </div>

      <!-- Tabla de Compañeros del Salón del Delegado -->
      <div class="card mb-6">
        <div class="card-header">
          <h2>Estudiantes de Mi Salón (Ciclo)</h2>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Código / DNI</th>
                  <th>Nombre Completo</th>
                  <th>Correo</th>
                  <th>Ciclo</th>
                  <th>Asistencia</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="st-salon-table-body">
                <tr><td colspan="6" style="padding:2rem;text-align:center;"><p class="text-sm text-gray-500">Cargando compañeros del salón...</p></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Otros Estudiantes Delegados -->
      <h3 class="mb-4 text-gray-900 font-semibold" style="font-size:1.125rem;">Otros Estudiantes Delegados del Sistema</h3>
      <div class="card"><div class="card-body"><div class="grid-3" id="st-companeros-list"><div style="padding:2rem;text-align:center;grid-column:span 3;"><p class="text-sm text-gray-500">Cargando otros delegados...</p></div></div></div></div>

      <!-- Modal para crear/editar compañero de salón -->
      <div id="companero-modal-overlay" class="forgot-modal-overlay">
        <div class="forgot-modal" style="max-width:500px;">
          <h3 id="companero-modal-title">Agregar Compañero de Salón</h3>
          <p>Los estudiantes agregados aparecerán en la lista de asistencia del Tutor.</p>
          <form id="companero-form" onsubmit="event.preventDefault(); saveCompanero();">
            <input type="hidden" id="comp-id">
            <div class="form-group">
              <label class="form-label">Código de Alumno / DNI</label>
              <input type="text" id="comp-codigo" class="form-input" placeholder="Ej: 2021100123" required>
            </div>
            <div class="form-group">
              <label class="form-label">Nombre Completo</label>
              <input type="text" id="comp-nombre" class="form-input" placeholder="Ej: Juan Pérez" required>
            </div>
            <div class="form-group">
              <label class="form-label">Correo Institucional / Personal</label>
              <input type="email" id="comp-email" class="form-input" placeholder="estudiante@upla.edu.pe" required>
            </div>
            <div class="form-group">
              <label class="form-label">Ciclo / Salón</label>
              <input type="text" id="comp-ciclo" class="form-input" placeholder="Ej: VIII">
            </div>
          </form>
          <div class="form-actions mt-4">
            <button type="button" class="btn btn-gray" onclick="closeCompaneroModal()">Cancelar</button>
            <button type="button" class="btn btn-blue" id="btn-save-comp" onclick="saveCompanero()">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildMisReportes() {
  return `
    <div id="mis-reportes" class="section">
      <div class="section-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Mis Reportes</h1>
          <p>Estadísticas de tu actividad académica</p>
        </div>
        <button class="btn btn-blue" onclick="downloadStudentReportPDF()">Descargar PDF</button>
      </div>
      <div id="student-report-content" style="background:#fff; padding:1rem; border-radius:8px;">
        <h2 style="text-align:center; margin-bottom:1.5rem; display:none;" id="st-report-title">Reporte Académico - SGTA-UPLA</h2>
        <div class="grid-4 mb-6">
          <div class="card"><div class="card-body"><p class="text-sm text-gray-600 mb-1">Total Tutorías</p><p class="text-2xl text-gray-900" id="report-st-total">...</p></div></div>
          <div class="card"><div class="card-body"><p class="text-sm text-gray-600 mb-1">Asistencia</p><p class="text-2xl text-green-600" id="report-st-asistencia">...</p></div></div>
          <div class="card"><div class="card-body"><p class="text-sm text-gray-600 mb-1">Completadas</p><p class="text-2xl text-blue-600" id="report-st-completadas">...</p></div></div>
          <div class="card"><div class="card-body"><p class="text-sm text-gray-600 mb-1">Canceladas</p><p class="text-2xl text-red-500" id="report-st-canceladas">...</p></div></div>
        </div>
        <div class="card"><div class="card-header"><h2>Historial por Materia</h2></div><div class="card-body" id="st-hist-materias"><p class="text-sm text-gray-500" style="text-align:center;">Cargando...</p></div></div>
      </div>
    </div>
  `;
}

function buildStudentConfig(session) {
  return `
    <div id="configuracion" class="section">
      <div class="section-header"><h1>Configuración</h1><p>Ajusta tu perfil y preferencias</p></div>
      <div class="grid-2">
        <div class="card"><div class="card-body">
          <h3 class="mb-4">Información Personal</h3>
          <div class="space-y-4">
            <div><label class="form-label">Nombre Completo</label><input type="text" id="st-cfg-nombre" class="form-input" value="${Validators.sanitize(session.nombre || '')}"></div>
            <div><label class="form-label">Email</label><input type="email" class="form-input" value="${Validators.sanitize(session.email || '')}" disabled></div>
            <div><label class="form-label">Ciclo Actual</label><input type="text" id="st-cfg-ciclo" class="form-input" value="${session.ciclo || ''}" placeholder="Ej: VIII"></div>
          </div>
        </div></div>
        <div class="card"><div class="card-body">
          <h3 class="mb-4">Preferencias de Notificación</h3>
          <div class="space-y-3">
            <div class="remember-row"><input type="checkbox" id="pref-email" checked><label for="pref-email">Recibir notificaciones por email</label></div>
            <div class="remember-row"><input type="checkbox" id="pref-inapp" checked><label for="pref-inapp">Notificaciones en la app</label></div>
            <div class="remember-row"><input type="checkbox" id="pref-reminder" checked><label for="pref-reminder">Recordatorio 24h antes</label></div>
          </div>
        </div></div>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button class="btn btn-gray btn-lg">Cancelar</button>
        <button class="btn btn-blue btn-lg" id="btn-save-st-config" onclick="saveStudentConfig()">Guardar Cambios</button>
      </div>
    </div>
  `;
}

window.requestTutor = function(tutorName) {
  navigateSection('solicitar');
  setTimeout(() => {
    const select = document.getElementById('sol-tutor');
    if (select) {
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === tutorName) {
          select.selectedIndex = i;
          break;
        }
      }
    }
  }, 100);
};

window.viewStudentTutoriaDetails = function(id) {
  if (!window.studentTutoriasCache) return;
  const t = window.studentTutoriasCache.find(x => x.id === id);
  if (t) {
    const modal = document.getElementById('tutoria-detalles-modal');
    const body = document.getElementById('tutoria-detalles-body');
    if (modal && body) {
      body.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--gray-200); padding-bottom:0.5rem;">
             <span class="text-sm text-gray-500">Tutor:</span>
             <span class="text-gray-900 font-semibold">${Validators.sanitize(t.tutor || '-')}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--gray-200); padding-bottom:0.5rem;">
             <span class="text-sm text-gray-500">Materia:</span>
             <span class="text-gray-900 font-semibold">${Validators.sanitize(t.materia || t.subject || '-')}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--gray-200); padding-bottom:0.5rem;">
             <span class="text-sm text-gray-500">Fecha y Hora:</span>
             <span class="text-gray-900">${t.fecha || t.requestedDate || '-'} a las ${t.hora || t.time || '-'}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--gray-200); padding-bottom:0.5rem;">
             <span class="text-sm text-gray-500">Modalidad o Ubicación:</span>
             <span class="text-gray-900">${t.ubicacion || t.location || 'Virtual'}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--gray-200); padding-bottom:0.5rem;">
             <span class="text-sm text-gray-500">Estado:</span>
             <span class="badge ${getBadgeClass(t.estado)}">${t.estado}</span>
          </div>
          <div style="margin-top: 0.5rem;">
             <span class="text-sm text-gray-500 block mb-2">Observaciones:</span>
             <p class="text-sm text-gray-900 bg-gray-50" style="padding: 1rem; border-radius: 0.5rem; min-height: 60px;">
                ${Validators.sanitize(t.observaciones || 'Ninguna observación registrada.')}
             </p>
          </div>
        </div>
      `;
      modal.classList.add('active');
    }
  }
};

window.closeStudentTutoriaDetails = function() {
  const modal = document.getElementById('tutoria-detalles-modal');
  if (modal) {
    modal.classList.remove('active');
  }
};

window.downloadStudentReportPDF = function() {
  const element = document.getElementById('student-report-content');
  if (!element) return;
  
  // Show title temporarily for PDF
  const title = document.getElementById('st-report-title');
  if (title) title.style.display = 'block';

  const opt = {
    margin:       0.5,
    filename:     'mi_reporte_sgta.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(element).save().then(() => {
    if (title) title.style.display = 'none';
  });
};

