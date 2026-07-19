/* ============================================
   SGTA-UPLA — Servicio de Email
   Integración con EmailJS para envío automático
   ============================================ */

/**
 * INSTRUCCIONES DE CONFIGURACIÓN DE EmailJS:
 * 
 * 1. Crea una cuenta en https://www.emailjs.com/
 * 2. Crea un servicio de email (Gmail, Outlook, etc.)
 * 3. Crea plantillas para cada tipo de correo
 * 4. Copia tu Public Key, Service ID y Template IDs
 * 5. Reemplaza los valores en EMAILJS_CONFIG abajo
 */

const EmailService = (() => {
  'use strict';

  // Configuración de EmailJS - Credenciales Reales Configuradas
  const EMAILJS_CONFIG = {
    publicKey: 'U1ymuH3SW9hy9OlTL',
    serviceId: 'service_7hun8cq',
    templates: {
      registro: 'template_registro',
      recuperacion: 'template_recuperacion',
      nuevaTutoria: 'template_nueva_tutoria',
      cambioHorario: 'template_cambio_horario',
      cancelacion: 'template_cancelacion',
      aceptacion: 'template_aceptacion',
      recordatorio: 'template_recordatorio',
      finalizacion: 'template_finalizacion',
      verificacionDispositivo: 'template_zycytx5'
    }
  };

  let initialized = false;

  /**
   * Verificar si EmailJS está configurado
   */
  function isConfigured() {
    return Boolean(EMAILJS_CONFIG.publicKey) &&
      EMAILJS_CONFIG.publicKey !== 'TU_PUBLIC_KEY' &&
      Boolean(EMAILJS_CONFIG.serviceId) &&
      EMAILJS_CONFIG.serviceId !== 'TU_SERVICE_ID' &&
      typeof emailjs !== 'undefined';
  }

  /**
   * Inicializar EmailJS
   */
  function init() {
    if (initialized) return;
    if (typeof emailjs === 'undefined') {
      console.warn('EmailJS SDK no cargado. Los correos no se enviarán.');
      return;
    }
    if (!EMAILJS_CONFIG.publicKey || EMAILJS_CONFIG.publicKey === 'TU_PUBLIC_KEY') {
      console.warn('EmailJS no configurado. Edita js/email-service.js');
      return;
    }

    try {
      emailjs.init(EMAILJS_CONFIG.publicKey);
      initialized = true;
      console.log('✅ EmailJS inicializado correctamente');
    } catch (err) {
      console.error('Error inicializando EmailJS:', err);
    }
  }

  /**
   * Enviar email genérico
   * @param {string} templateKey - Key de la plantilla en EMAILJS_CONFIG.templates
   * @param {Object} params - Parámetros para la plantilla
   * @returns {Promise<Object>}
   */
  async function sendEmail(templateKey, params) {
    if (!isConfigured()) {
      console.warn(`EmailJS no configurado o SDK faltante. No se pudo enviar "${templateKey}".`);
      return { success: false, error: 'EmailJS no configurado' };
    }

    if (!initialized) {
      init();
    }

    const templateId = EMAILJS_CONFIG.templates[templateKey];
    if (!templateId) {
      console.warn(`Template "${templateKey}" no encontrado`);
      return { success: false, error: 'Template no encontrado' };
    }

    const destEmail = params.to_email || params.email || params.to || params.correo || '';

    try {
      await emailjs.send(EMAILJS_CONFIG.serviceId, templateId, {
        ...params,
        to_email: destEmail,
        email: destEmail,
        to: destEmail,
        correo: destEmail,
        recipient: destEmail,
        sistema_nombre: 'SGTA-UPLA',
        sistema_url: window.location.origin,
        fecha_envio: new Date().toLocaleDateString('es-PE', {
          day: 'numeric', month: 'long', year: 'numeric'
        }),
        hora_envio: new Date().toLocaleTimeString('es-PE', {
          hour: '2-digit', minute: '2-digit'
        })
      }, EMAILJS_CONFIG.publicKey);
      console.log(`✅ Email "${templateKey}" enviado exitosamente a ${params.to_email}`);
      return { success: true };
    } catch (err) {
      const status = err.status || err.code || 'Desconocido';
      const text = err.text || err.message || (typeof err === 'string' ? err : JSON.stringify(err));
      console.error(`Error enviando email "${templateKey}" [HTTP ${status}]: ${text}`, err);
      return { success: false, error: err, status: status, text: text };
    }
  }

  /* ============================================
     Funciones específicas de cada tipo de correo
     ============================================ */

  /**
   * Email de registro de usuario
   */
  async function sendRegistro(data) {
    return sendEmail('registro', {
      to_email: data.email,
      to_name: data.nombre,
      rol: data.rol,
      message: `Tu cuenta ha sido creada en SGTA-UPLA con el rol de ${data.rol}. Ya puedes acceder al sistema con tu correo y contraseña.`
    });
  }

  /**
   * Email de recuperación de contraseña
   */
  async function sendRecuperacion(data) {
    return sendEmail('recuperacion', {
      to_email: data.email,
      to_name: data.nombre || 'Usuario',
      message: 'Se ha enviado un enlace de recuperación de contraseña a tu correo a través de Firebase Authentication.'
    });
  }

  /**
   * Email de nueva tutoría programada
   */
  async function sendNuevaTutoria(data) {
    return sendEmail('nuevaTutoria', {
      to_email: data.email,
      to_name: data.nombre,
      tutor: data.tutor,
      estudiante: data.estudiante,
      materia: data.materia,
      fecha: data.fecha,
      hora: data.hora,
      ubicacion: data.ubicacion || 'Virtual',
      message: `Se ha programado una nueva tutoría de ${data.materia} para el ${data.fecha} a las ${data.hora}.`
    });
  }

  /**
   * Email de cambio de horario
   */
  async function sendCambioHorario(data) {
    return sendEmail('cambioHorario', {
      to_email: data.email,
      to_name: data.nombre,
      materia: data.materia,
      fecha_anterior: data.fechaAnterior,
      hora_anterior: data.horaAnterior,
      fecha_nueva: data.fechaNueva,
      hora_nueva: data.horaNueva,
      message: `La tutoría de ${data.materia} ha sido reprogramada del ${data.fechaAnterior} al ${data.fechaNueva} a las ${data.horaNueva}.`
    });
  }

  /**
   * Email de cancelación de tutoría
   */
  async function sendCancelacion(data) {
    return sendEmail('cancelacion', {
      to_email: data.email,
      to_name: data.nombre,
      materia: data.materia,
      fecha: data.fecha,
      hora: data.hora,
      motivo: data.motivo || 'No especificado',
      message: `La tutoría de ${data.materia} del ${data.fecha} a las ${data.hora} ha sido cancelada.`
    });
  }

  /**
   * Email de aceptación de solicitud
   */
  async function sendAceptacion(data) {
    return sendEmail('aceptacion', {
      to_email: data.email,
      to_name: data.nombre,
      tutor: data.tutor,
      materia: data.materia,
      fecha: data.fecha,
      hora: data.hora,
      ubicacion: data.ubicacion || 'Virtual',
      message: `Tu solicitud de tutoría de ${data.materia} ha sido aceptada. La sesión será el ${data.fecha} a las ${data.hora}.`
    });
  }

  /**
   * Email de recordatorio (24h o 1h antes)
   */
  async function sendRecordatorio(data) {
    return sendEmail('recordatorio', {
      to_email: data.email,
      to_name: data.nombre,
      materia: data.materia,
      fecha: data.fecha,
      hora: data.hora,
      ubicacion: data.ubicacion || 'Virtual',
      tiempo_restante: data.tiempoRestante || '24 horas',
      message: `Recordatorio: Tienes una tutoría de ${data.materia} ${data.tiempoRestante} (${data.fecha} a las ${data.hora}).`
    });
  }

  /**
   * Email de finalización de tutoría
   */
  async function sendFinalizacion(data) {
    return sendEmail('finalizacion', {
      to_email: data.email,
      to_name: data.nombre,
      tutor: data.tutor,
      materia: data.materia,
      fecha: data.fecha,
      observaciones: data.observaciones || 'Sin observaciones',
      message: `La tutoría de ${data.materia} del ${data.fecha} ha sido finalizada.`
    });
  }

  /**
   * Email de verificación de dispositivo nuevo
   */
  async function sendVerificacionDispositivo(data) {
    return sendEmail('verificacionDispositivo', {
      to_email: data.email,
      to_name: data.nombre || 'Usuario',
      codigo_otp: data.codigo,
      codigo: data.codigo,
      otp: data.codigo,
      passcode: data.codigo,
      code: data.codigo,
      dispositivo_info: data.dispositivo || 'Navegador Web / Dispositivo Nuevo',
      message: `Hemos detectado un inicio de sesión desde un nuevo dispositivo. Tu código de verificación de 6 dígitos es: ${data.codigo}. Si no intentaste iniciar sesión, por favor cambia tu contraseña de inmediato.`
    });
  }

  // API pública
  return {
    init,
    isConfigured,
    sendEmail,
    sendRegistro,
    sendRecuperacion,
    sendNuevaTutoria,
    sendCambioHorario,
    sendCancelacion,
    sendAceptacion,
    sendRecordatorio,
    sendFinalizacion,
    sendVerificacionDispositivo
  };
})();

// Inicialización automática de EmailJS al cargar el script o DOM
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => EmailService.init());
  } else {
    EmailService.init();
  }
}
