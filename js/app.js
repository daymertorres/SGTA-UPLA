/* ============================================
   SGTA-UPLA — App Utilities
   Shared functions, icons, auth, and UI helpers
   ============================================ */

/**
 * SVG Icons (Lucide-compatible paths)
 * Each icon returns an SVG string
 */
const Icons = {
  'home': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  'users': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  'user-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>',
  'bar-chart-3': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
  'settings': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  'log-out': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
  'bell': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  'search': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  'menu': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>',
  'x': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  'graduation-cap': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>',
  'shield': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
  'user-check': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>',
  'user-cog': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/><path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="m21.7 16.4-.9-.3"/><path d="m15.2 13.9-.9-.3"/><path d="m16.6 18.7.3-.9"/><path d="m19.1 12.2.3-.9"/><path d="m19.6 18.7-.4-1"/><path d="m16.8 12.3-.4-1"/><path d="m14.3 16.6 1-.4"/><path d="m20.7 13.8 1-.4"/></svg>',
  'trending-up': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  'book-open': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  'calendar': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
  'calendar-check': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>',
  'clock': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  'check-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
  'file-text': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  'message-square': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  'alert-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
  'user-plus': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>',
  'map-pin': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  'plus': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  'mail': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  'lock': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  'chevron-down': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  'chevron-left': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  'chevron-right': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  'phone': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  'trash-2': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
  'edit': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  'eye': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  'eye-off': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>',
  'download': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
  'refresh': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>'
};

/**
 * Get SVG icon by name
 */
function icon(name) {
  return Icons[name] || '';
}

/**
 * Get initials from a full name
 */
function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').filter(n => n.length > 0).map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

/**
 * Get badge class based on status/role
 */
function getBadgeClass(value) {
  const map = {
    'Activo': 'badge-green',
    'Inactivo': 'badge-gray',
    'Completada': 'badge-green',
    'Finalizada': 'badge-green',
    'Confirmada': 'badge-green',
    'Aceptada': 'badge-green',
    'Programada': 'badge-blue',
    'Pendiente': 'badge-amber',
    'Cancelada': 'badge-red',
    'Rechazada': 'badge-red',
    'Aprobada': 'badge-green',
    'Tutor': 'badge-green',
    'Delegado': 'badge-purple',
    'Estudiante Delegado': 'badge-purple',
    'Administrador': 'badge-blue',
    'Estudiante': 'badge-blue',
    'Alta': 'badge-red',
    'Media': 'badge-amber',
    'Baja': 'badge-blue',
    'Excelente': 'badge-green',
    'Bueno': 'badge-blue',
    'Nuevo': 'badge-blue'
  };
  return map[value] || 'badge-gray';
}

/**
 * Navigate between sections (show/hide)
 */
function navigateSection(sectionId, menuItems) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  // Show target section
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active');

  // Update menu active state
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === sectionId);
  });
}

/**
 * Toggle sidebar collapse
 */
function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggle-sidebar');
  const mainWrapper = document.querySelector('.main-wrapper');

  if (!toggleBtn || !sidebar) return;

  // Create backdrop for mobile if not present
  let backdrop = document.getElementById('mobile-sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'mobile-sidebar-backdrop';
    backdrop.className = 'mobile-sidebar-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
      toggleBtn.innerHTML = icon('menu');
    });
  }

  const handleResize = () => {
    if (window.innerWidth <= 1024) {
      if (!sidebar.classList.contains('mobile-open')) {
        toggleBtn.innerHTML = icon('menu');
      }
      if (mainWrapper) mainWrapper.style.marginLeft = '0px';
    } else {
      backdrop.classList.remove('active');
      sidebar.classList.remove('mobile-open');
      const isCollapsed = sidebar.classList.contains('collapsed');
      toggleBtn.innerHTML = isCollapsed ? icon('menu') : icon('x');
      if (mainWrapper) {
        mainWrapper.style.marginLeft = isCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';
      }
    }
  };

  window.addEventListener('resize', handleResize);
  handleResize();

  toggleBtn.addEventListener('click', () => {
    if (window.innerWidth <= 1024) {
      const isOpen = sidebar.classList.toggle('mobile-open');
      backdrop.classList.toggle('active', isOpen);
      toggleBtn.innerHTML = isOpen ? icon('x') : icon('menu');
    } else {
      sidebar.classList.toggle('collapsed');
      const isCollapsed = sidebar.classList.contains('collapsed');
      toggleBtn.innerHTML = isCollapsed ? icon('menu') : icon('x');
      if (mainWrapper) {
        mainWrapper.style.marginLeft = isCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';
      }
    }
  });
}

/**
 * Setup menu navigation
 */
function setupNavigation() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('mobile-sidebar-backdrop');
  const toggleBtn = document.getElementById('toggle-sidebar');

  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const sectionId = item.dataset.section;
      navigateSection(sectionId);

      // Auto close sidebar on mobile when navigating
      if (window.innerWidth <= 1024 && sidebar && sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
        if (backdrop) backdrop.classList.remove('active');
        if (toggleBtn) toggleBtn.innerHTML = icon('menu');
      }
    });
  });
}

/**
 * Setup logout with Firebase Auth
 */
function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOutUser();
        window.location.href = 'index.html';
      } catch (err) {
        console.error('Error al cerrar sesión:', err);
        localStorage.removeItem('sgta_session');
        window.location.href = 'index.html';
      }
    });
  }
}

/**
 * Check authentication using Firebase Auth + Firestore role validation
 * Returns the user data from Firestore or redirects
 * @param {string} requiredRole - Rol requerido para acceder
 * @returns {Object|null} Datos del usuario
 */
function checkAuth(requiredRole) {
  // Verificar sesión local primero (para carga rápida)
  const session = JSON.parse(localStorage.getItem('sgta_session') || 'null');
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }

  // Verificar rol
  if (requiredRole && session.role !== requiredRole) {
    redirectByRole(session.role);
    return null;
  }

  // Verificación async de Firebase Auth (en background)
  if (typeof onAuthChange === 'function') {
    onAuthChange((firebaseUser) => {
      if (!firebaseUser) {
        // Firebase Auth no tiene sesión, limpiar y redirigir
        localStorage.removeItem('sgta_session');
        window.location.href = 'index.html';
      }
    });
  }

  return session;
}

/**
 * Redirigir según rol del usuario
 * @param {string} role
 */
function redirectByRole(role) {
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

/**
 * Setup user info in header (name, avatar, role)
 * @param {Object} session - Session data
 */
function setupUserInfo(session) {
  if (!session) return;

  // Actualizar nombre
  const nameEl = document.querySelector('.user-name');
  if (nameEl) nameEl.textContent = session.nombre || session.email || 'Usuario';

  // Actualizar rol
  const roleEl = document.querySelector('.user-role');
  if (roleEl) roleEl.textContent = session.role || '';

  // Actualizar avatar con iniciales
  const avatarEl = document.querySelector('.user-avatar');
  if (avatarEl) {
    const initials = getInitials(session.nombre || session.email);
    avatarEl.innerHTML = `<span>${initials}</span>`;
  }

  // Actualizar sidebar brand text si tiene ciclo
  if (session.ciclo) {
    const brandSubtext = document.querySelector('.sidebar-brand-text p');
    if (brandSubtext && session.role === 'Estudiante Delegado') {
      brandSubtext.textContent = `Delegado - Ciclo ${session.ciclo}`;
    }
  }
}

/**
 * Mostrar overlay de carga global
 * @param {string} message - Mensaje opcional
 */
function showLoader(message = 'Cargando...') {
  let loader = document.getElementById('global-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.className = 'global-loader';
    loader.innerHTML = `
      <div class="loader-content">
        <div class="loader-spinner"></div>
        <p class="loader-text">${Validators.sanitize(message)}</p>
      </div>
    `;
    document.body.appendChild(loader);
  } else {
    const textEl = loader.querySelector('.loader-text');
    if (textEl) textEl.textContent = message;
    loader.style.display = 'flex';
  }
}

/**
 * Ocultar overlay de carga global
 */
function hideLoader() {
  const loader = document.getElementById('global-loader');
  if (loader) loader.style.display = 'none';
}

/**
 * Deshabilitar/habilitar un botón con estado de carga
 * @param {HTMLButtonElement} btn
 * @param {boolean} loading
 * @param {string} loadingText
 */
function setButtonLoading(btn, loading, loadingText = 'Procesando...') {
  if (!btn) return;
  if (loading) {
    btn._originalText = btn.textContent;
    btn.textContent = loadingText;
    btn.disabled = true;
    btn.classList.add('btn-loading');
  } else {
    btn.textContent = btn._originalText || btn.textContent;
    btn.disabled = false;
    btn.classList.remove('btn-loading');
  }
}

/**
 * Formatear fecha Firestore timestamp a string legible
 * @param {Object|string} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
  if (!timestamp) return '-';
  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    date = new Date(timestamp);
  }
  if (isNaN(date.getTime())) return timestamp;
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Setup search functionality for tables
 * @param {string} inputId - ID del input de búsqueda
 * @param {string} tbodyId - ID del tbody a filtrar
 */
function setupTableSearch(inputId, tbodyId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });
}

/**
 * Render pagination controls
 * @param {{ currentPage: number, totalPages: number, onPageChange: Function }} config
 * @returns {string} HTML de paginación
 */
function renderPagination(config) {
  const { currentPage, totalPages, containerId } = config;
  if (totalPages <= 1) return '';

  let pages = '';
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) {
    pages += `<button class="pagination-btn ${i === currentPage ? 'pagination-active' : ''}" data-page="${i}">${i}</button>`;
  }

  return `
    <div class="pagination" id="${containerId || 'pagination'}">
      <button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''}>
        ${icon('chevron-left')}
      </button>
      ${pages}
      <button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>
        ${icon('chevron-right')}
      </button>
      <span class="pagination-info">Página ${currentPage} de ${totalPages}</span>
    </div>
  `;
}

/**
 * Common initialization for all dashboard pages
 */
function initDashboard() {
  setupSidebar();
  setupNavigation();
  setupLogout();
}

/**
 * SEED DEMO DATA — Carga masiva de Estudiantes Delegados, Tutores, Compañeros y Tutorías
 */
window.seedDemoData = async function() {
  if (!confirm('¿Deseas poblar la base de datos de Firestore con múltiples Estudiantes Delegados, Tutores, Compañeros de Salón y Tutorías de prueba?')) {
    return;
  }

  try {
    Notifications.info('⏳ Generando y guardando datos de prueba en Firestore... por favor espera unos segundos.');

    const delegadosData = [
      { nombre: 'Carlos Mendoza Ríos', email: 'carlos.mendoza@upla.edu.pe', rol: 'Estudiante Delegado', ciclo: 'VI', estado: 'Activo' },
      { nombre: 'Lucía Fernández Gómez', email: 'lucia.fernandez@upla.edu.pe', rol: 'Estudiante Delegado', ciclo: 'IV', estado: 'Activo' },
      { nombre: 'Kevin Torres Salazar', email: 'kevin.torres@upla.edu.pe', rol: 'Estudiante Delegado', ciclo: 'VIII', estado: 'Activo' },
      { nombre: 'Valeria Rojas Flores', email: 'valeria.rojas@upla.edu.pe', rol: 'Estudiante Delegado', ciclo: 'V', estado: 'Activo' },
      { nombre: 'Diego Paredes Castro', email: 'diego.paredes@upla.edu.pe', rol: 'Estudiante Delegado', ciclo: 'VII', estado: 'Activo' },
      { nombre: 'Sofía Vargas Ortiz', email: 'sofia.vargas@upla.edu.pe', rol: 'Estudiante Delegado', ciclo: 'IX', estado: 'Activo' }
    ];

    const tutoresData = [
      { nombre: 'Dr. Jorge Álvarez Ramírez', email: 'jorge.alvarez@upla.edu.pe', rol: 'Tutor', especialidad: 'Matemáticas y Cálculo Avanzado', estado: 'Activo' },
      { nombre: 'Mg. Elena Cárdenas Silva', email: 'elena.cardenas@upla.edu.pe', rol: 'Tutor', especialidad: 'Ingeniería de Software y Arquitectura', estado: 'Activo' },
      { nombre: 'Ing. Roberto Quispe Mamani', email: 'roberto.quispe@upla.edu.pe', rol: 'Tutor', especialidad: 'Base de Datos y Cloud Computing', estado: 'Activo' },
      { nombre: 'Dra. Patricia Huamán López', email: 'patricia.huaman@upla.edu.pe', rol: 'Tutor', especialidad: 'Física General y Aplicada', estado: 'Activo' },
      { nombre: 'Mg. Fernando Benavides Cruz', email: 'fernando.benavides@upla.edu.pe', rol: 'Tutor', especialidad: 'Algoritmos y Estructura de Datos', estado: 'Activo' },
      { nombre: 'Ing. Mariana Solís Ramos', email: 'mariana.solis@upla.edu.pe', rol: 'Tutor', especialidad: 'Inteligencia Artificial y Python', estado: 'Activo' }
    ];

    const delegadosGuardados = [];
    for (const del of delegadosData) {
      del.uid = 'del_' + Math.random().toString(36).substring(2, 9);
      del.fechaRegistro = new Date().toISOString();
      const ref = await addDocument('usuarios', del);
      delegadosGuardados.push({ ...del, id: ref ? ref.id : del.uid });
    }

    const tutoresGuardados = [];
    for (const tut of tutoresData) {
      tut.uid = 'tut_' + Math.random().toString(36).substring(2, 9);
      tut.fechaRegistro = new Date().toISOString();
      const ref = await addDocument('usuarios', tut);
      tutoresGuardados.push({ ...tut, id: ref ? ref.id : tut.uid });
    }

    // Compañeros por cada Delegado (Aislamiento total por delegado)
    const nombresCompaneros = [
      ['Mateo García', 'Camila Torres', 'Adrián Navarro', 'Jimena López', 'Raúl Castro', 'Gabriela Ruiz', 'Esteban Poma'],
      ['Gabriel Silva', 'Mariana Cruz', 'Daniel Quispe', 'Andrea Poma', 'Joaquín Santos', 'Paula Herrera', 'Sebastián Mora'],
      ['Ricardo Miranda', 'Juliana Bravo', 'Esteban Ramos', 'Martina Peña', 'Hernán Díaz', 'Lorena León', 'Guillermo Vega'],
      ['Rodrigo Salas', 'Claudia Mendoza', 'Felipe Ortiz', 'Rosa Guzmán', 'Emilio Rivas', 'Victoria Flores', 'Hugo Sánchez'],
      ['Ignacio Soto', 'Daniela Ríos', 'Bruno Campos', 'Alejandra Paz', 'Marco Tulio', 'Ximena Córdoba', 'Óscar Linares'],
      ['Manuel Arce', 'Natalia Vera', 'Andrés Cueva', 'Inés Morales', 'Héctor Franco', 'Mónica Peña', 'Enrique Silva']
    ];

    for (let i = 0; i < delegadosGuardados.length; i++) {
      const del = delegadosGuardados[i];
      const listaNombres = nombresCompaneros[i] || nombresCompaneros[0];
      for (let j = 0; j < listaNombres.length; j++) {
        const compData = {
          codigo: `202${i+1}100${j+1}`,
          nombre: listaNombres[j],
          email: `${listaNombres[j].toLowerCase().replace(/\s+/g, '.')}@upla.edu.pe`,
          ciclo: del.ciclo || 'VI',
          delegadoId: del.uid,
          delegadoNombre: del.nombre,
          asistencias: Math.floor(Math.random() * 8) + 2,
          faltas: Math.floor(Math.random() * 2),
          justificaciones: Math.floor(Math.random() * 2),
          totalSesiones: 10,
          createdAt: new Date().toISOString()
        };
        await addDocument('estudiantes_salon', compData);
      }
    }

    // Tutorías variadas (Aceptadas, Finalizadas, Pendientes, Canceladas)
    const materiasPorTutor = [
      'Cálculo Multivariable', 'Diseño de Sistemas Web', 'Normalización SQL Avanzada',
      'Electromagnetismo y Mecánica', 'Árboles y Grafos C++', 'Redes Neuronales Deep Learning'
    ];

    for (let i = 0; i < 14; i++) {
      const delIndex = i % delegadosGuardados.length;
      const tutIndex = (i * 2 + 1) % tutoresGuardados.length;
      const del = delegadosGuardados[delIndex];
      const tut = tutoresGuardados[tutIndex];
      const materia = materiasPorTutor[tutIndex] || 'Asesoría Académica General';

      const estados = ['Aceptada', 'Finalizada', 'Pendiente', 'Aceptada', 'Finalizada', 'Cancelada'];
      const tutoriaData = {
        estudiante: del.nombre,
        estudianteId: del.uid,
        delegadoId: del.uid,
        ciclo: del.ciclo || 'VI',
        tutor: tut.nombre,
        tutorId: tut.uid,
        materia: materia,
        fecha: `2026-07-${10 + (i % 15)}`,
        hora: `${9 + (i % 8)}:00`,
        duracion: '1h',
        ubicacion: i % 2 === 0 ? 'Virtual - Google Meet' : `Aula ${201 + i} - Campus Principal`,
        estado: estados[i % estados.length],
        createdAt: new Date().toISOString()
      };
      await addDocument('tutorias', tutoriaData);
    }

    Notifications.success('🎉 ¡Datos de prueba cargados exitosamente! Se agregaron 6 Delegados, 6 Tutores, 42 Compañeros y 14 Tutorías.');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (err) {
    console.error('Error durante la carga de datos (seed):', err);
    Notifications.error('Hubo un error al generar los datos de prueba en Firestore.');
  }
};
