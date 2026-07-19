/* ============================================
   SGTA-UPLA — Sistema de Notificaciones
   Toast UI + Notificaciones in-app con Firestore
   ============================================ */

const Notifications = (() => {
  'use strict';

  let toastContainer = null;

  /* ============================================
     TOAST NOTIFICATIONS (UI)
     ============================================ */

  /**
   * Inicializar contenedor de toasts
   */
  function initToastContainer() {
    if (toastContainer) return;
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  /**
   * Mostrar un toast notification
   * @param {string} message - Mensaje a mostrar
   * @param {'success'|'error'|'warning'|'info'} type - Tipo de toast
   * @param {number} duration - Duración en ms (por defecto 4000)
   */
  function showToast(message, type = 'info', duration = 4000) {
    initToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
      error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-message">${Validators.sanitize(message)}</div>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    toastContainer.appendChild(toast);

    // Trigger animación de entrada
    requestAnimationFrame(() => toast.classList.add('toast-show'));

    // Auto-remover
    setTimeout(() => {
      toast.classList.remove('toast-show');
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Atajos
  function success(message, duration) { showToast(message, 'success', duration); }
  function error(message, duration) { showToast(message, 'error', duration); }
  function warning(message, duration) { showToast(message, 'warning', duration); }
  function info(message, duration) { showToast(message, 'info', duration); }

  /* ============================================
     CONFIRMATION MODAL
     ============================================ */

  /**
   * Mostrar modal de confirmación
   * @param {string} title - Título del modal
   * @param {string} message - Mensaje descriptivo
   * @param {Function} onConfirm - Callback al confirmar
   * @param {{ confirmText?: string, cancelText?: string, type?: string }} options
   */
  function confirm(title, message, onConfirm, options = {}) {
    const confirmText = options.confirmText || 'Confirmar';
    const cancelText = options.cancelText || 'Cancelar';
    const type = options.type || 'danger'; // 'danger', 'warning', 'info'

    // Remover modal existente si hay
    const existing = document.getElementById('confirm-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'confirm-modal-overlay';
    overlay.className = 'confirm-modal-overlay';

    const btnClass = type === 'danger' ? 'btn-red' : type === 'warning' ? 'btn-amber' : 'btn-blue';

    overlay.innerHTML = `
      <div class="confirm-modal">
        <div class="confirm-modal-header">
          <h3>${Validators.sanitize(title)}</h3>
        </div>
        <div class="confirm-modal-body">
          <p>${Validators.sanitize(message)}</p>
        </div>
        <div class="confirm-modal-footer">
          <button class="btn btn-gray" id="confirm-cancel">${cancelText}</button>
          <button class="btn ${btnClass}" id="confirm-ok">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    // Event listeners
    const cancelBtn = overlay.querySelector('#confirm-cancel');
    const okBtn = overlay.querySelector('#confirm-ok');

    const close = () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
    };

    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    okBtn.addEventListener('click', async () => {
      okBtn.disabled = true;
      okBtn.textContent = 'Procesando...';
      try {
        await onConfirm();
      } catch (err) {
        console.error('Error en confirmación:', err);
        error('Ocurrió un error al procesar la acción.');
      }
      close();
    });
  }

  /* ============================================
     IN-APP NOTIFICATIONS (Firestore)
     ============================================ */

  /**
   * Crear una notificación en Firestore
   * @param {Object} data - Datos de la notificación
   * @param {string} data.userId - ID del usuario destino
   * @param {string} data.titulo - Título
   * @param {string} data.mensaje - Mensaje
   * @param {'tutoria'|'solicitud'|'sistema'|'asistencia'} data.tipo - Tipo
   * @param {string} [data.link] - Sección a navegar
   * @returns {Promise<string|null>} ID de la notificación
   */
  async function createNotification(data) {
    if (!window.firebaseReady || !window.db) return null;

    try {
      const docRef = await window.db.collection('notificaciones').add({
        userId: data.userId,
        titulo: data.titulo,
        mensaje: data.mensaje,
        tipo: data.tipo || 'sistema',
        link: data.link || '',
        leida: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } catch (err) {
      console.error('Error creando notificación:', err);
      return null;
    }
  }

  /**
   * Obtener notificaciones de un usuario
   * @param {string} userId
   * @param {number} limit - Máximo de notificaciones
   * @returns {Promise<Array>}
   */
  async function getNotifications(userId, limit = 20) {
    if (!window.firebaseReady || !window.db) return [];

    try {
      const snapshot = await window.db.collection('notificaciones')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.error('Error obteniendo notificaciones:', err);
      return [];
    }
  }

  /**
   * Escuchar notificaciones en tiempo real
   * @param {string} userId
   * @param {Function} callback - Función que recibe el array de notificaciones
   * @returns {Function} Función para cancelar el listener
   */
  function listenNotifications(userId, callback) {
    if (!window.firebaseReady || !window.db) return () => {};

    return window.db.collection('notificaciones')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .onSnapshot(snapshot => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(notifications);
      }, err => {
        console.error('Error en listener de notificaciones:', err);
      });
  }

  /**
   * Marcar una notificación como leída
   * @param {string} notifId
   */
  async function markAsRead(notifId) {
    if (!window.firebaseReady || !window.db) return;

    try {
      await window.db.collection('notificaciones').doc(notifId).update({
        leida: true
      });
    } catch (err) {
      console.error('Error marcando notificación:', err);
    }
  }

  /**
   * Marcar todas las notificaciones de un usuario como leídas
   * @param {string} userId
   */
  async function markAllAsRead(userId) {
    if (!window.firebaseReady || !window.db) return;

    try {
      const snapshot = await window.db.collection('notificaciones')
        .where('userId', '==', userId)
        .where('leida', '==', false)
        .get();

      const batch = window.db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { leida: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('Error marcando todas como leídas:', err);
    }
  }

  /**
   * Renderizar panel de notificaciones dropdown
   * @param {Array} notifications
   * @returns {string} HTML del panel
   */
  function renderNotificationPanel(notifications) {
    if (!notifications || notifications.length === 0) {
      return `
        <div class="notif-panel">
          <div class="notif-panel-header">
            <h3>Notificaciones</h3>
          </div>
          <div class="notif-panel-empty">
            <p>No tienes notificaciones</p>
          </div>
        </div>
      `;
    }

    const unread = notifications.filter(n => !n.leida).length;
    const items = notifications.slice(0, 10).map(n => {
      const timeStr = n.createdAt && n.createdAt.toDate
        ? getRelativeTimeShort(n.createdAt.toDate())
        : 'Ahora';

      const typeIcons = {
        tutoria: '📚',
        solicitud: '📋',
        sistema: '⚙️',
        asistencia: '✅'
      };

      return `
        <div class="notif-item ${n.leida ? '' : 'notif-unread'}" data-id="${n.id}" data-link="${n.link || ''}">
          <div class="notif-item-icon">${typeIcons[n.tipo] || '🔔'}</div>
          <div class="notif-item-content">
            <p class="notif-item-title">${Validators.sanitize(n.titulo)}</p>
            <p class="notif-item-msg">${Validators.sanitize(n.mensaje)}</p>
            <span class="notif-item-time">${timeStr}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="notif-panel">
        <div class="notif-panel-header">
          <h3>Notificaciones ${unread > 0 ? `(${unread})` : ''}</h3>
          ${unread > 0 ? '<button class="notif-mark-all" id="notif-mark-all-btn">Marcar todas como leídas</button>' : ''}
        </div>
        <div class="notif-panel-list">${items}</div>
      </div>
    `;
  }

  /**
   * Configurar botón de notificaciones en header
   * @param {string} userId
   */
  function setupNotificationButton(userId) {
    const btn = document.querySelector('.notification-btn');
    if (!btn) return;

    let panelOpen = false;
    let panelEl = null;
    let unsubscribe = null;

    // Listener en tiempo real
    unsubscribe = listenNotifications(userId, (notifications) => {
      const unread = notifications.filter(n => !n.leida).length;
      const dot = btn.querySelector('.notification-dot');
      if (dot) {
        dot.style.display = unread > 0 ? 'block' : 'none';
        dot.textContent = unread > 9 ? '9+' : (unread > 0 ? unread : '');
      }

      // Actualizar panel si está abierto
      if (panelOpen && panelEl) {
        panelEl.innerHTML = renderNotificationPanel(notifications);
        attachNotifPanelEvents(panelEl, userId, notifications);
      }
    });

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();

      if (panelOpen && panelEl) {
        panelEl.remove();
        panelEl = null;
        panelOpen = false;
        return;
      }

      const notifications = await getNotifications(userId);

      panelEl = document.createElement('div');
      panelEl.className = 'notif-panel-container';
      panelEl.innerHTML = renderNotificationPanel(notifications);
      btn.parentElement.appendChild(panelEl);
      panelOpen = true;

      attachNotifPanelEvents(panelEl, userId, notifications);

      // Cerrar al hacer clic fuera
      const closeHandler = (ev) => {
        if (!panelEl.contains(ev.target) && ev.target !== btn) {
          panelEl.remove();
          panelEl = null;
          panelOpen = false;
          document.removeEventListener('click', closeHandler);
        }
      };
      setTimeout(() => document.addEventListener('click', closeHandler), 100);
    });
  }

  /**
   * Adjuntar eventos al panel de notificaciones
   */
  function attachNotifPanelEvents(panelEl, userId, notifications) {
    // Marcar todas como leídas
    const markAllBtn = panelEl.querySelector('#notif-mark-all-btn');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', async () => {
        await markAllAsRead(userId);
        success('Todas las notificaciones marcadas como leídas');
      });
    }

    // Click en notificación individual
    panelEl.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', async () => {
        const notifId = item.dataset.id;
        const link = item.dataset.link;

        // Marcar como leída
        await markAsRead(notifId);
        item.classList.remove('notif-unread');

        // Navegar a la sección si hay link
        if (link && typeof navigateSection === 'function') {
          navigateSection(link);
          panelEl.remove();
        }
      });
    });
  }

  /**
   * Tiempo relativo corto
   */
  function getRelativeTimeShort(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  }

  // API pública
  return {
    showToast,
    success,
    error,
    warning,
    info,
    confirm,
    createNotification,
    getNotifications,
    listenNotifications,
    markAsRead,
    markAllAsRead,
    setupNotificationButton,
    renderNotificationPanel
  };
})();
