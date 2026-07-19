/* ============================================
   SGTA-UPLA — Validaciones de Formularios
   Módulo reutilizable de validación y sanitización
   ============================================ */

const Validators = (() => {
  'use strict';

  /**
   * Sanitizar texto para prevenir XSS
   * @param {string} str - Texto a sanitizar
   * @returns {string} Texto sanitizado
   */
  function sanitize(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str.trim();
    return div.innerHTML;
  }

  /**
   * Limpiar espacios innecesarios (múltiples espacios, inicio/fin)
   * @param {string} str
   * @returns {string}
   */
  function cleanSpaces(str) {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/\s+/g, ' ');
  }

  /**
   * Validar que un campo no esté vacío
   * @param {string} value
   * @param {string} fieldName - Nombre del campo para el mensaje
   * @returns {{ valid: boolean, message: string }}
   */
  function required(value, fieldName = 'Este campo') {
    const clean = typeof value === 'string' ? value.trim() : value;
    if (!clean || clean === '') {
      return { valid: false, message: `${fieldName} es obligatorio.` };
    }
    return { valid: true, message: '' };
  }

  /**
   * Validar formato de email
   * @param {string} email
   * @returns {{ valid: boolean, message: string }}
   */
  function email(email) {
    const req = required(email, 'El correo');
    if (!req.valid) return req;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      return { valid: false, message: 'Ingresa un correo electrónico válido.' };
    }
    return { valid: true, message: '' };
  }

  /**
   * Validar fortaleza de contraseña
   * Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número
   * @param {string} password
   * @returns {{ valid: boolean, message: string }}
   */
  function password(password) {
    const req = required(password, 'La contraseña');
    if (!req.valid) return req;

    if (password.length < 8) {
      return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres.' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'La contraseña debe contener al menos una mayúscula.' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'La contraseña debe contener al menos una minúscula.' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'La contraseña debe contener al menos un número.' };
    }
    return { valid: true, message: '' };
  }

  /**
   * Validar que dos contraseñas coincidan
   * @param {string} pass1
   * @param {string} pass2
   * @returns {{ valid: boolean, message: string }}
   */
  function passwordsMatch(pass1, pass2) {
    if (pass1 !== pass2) {
      return { valid: false, message: 'Las contraseñas no coinciden.' };
    }
    return { valid: true, message: '' };
  }

  /**
   * Validar fecha (no pasada, dentro de rango razonable)
   * @param {string} dateStr - Formato YYYY-MM-DD
   * @param {{ allowPast?: boolean, maxDaysAhead?: number }} options
   * @returns {{ valid: boolean, message: string }}
   */
  function date(dateStr, options = {}) {
    const req = required(dateStr, 'La fecha');
    if (!req.valid) return req;

    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) {
      return { valid: false, message: 'Ingresa una fecha válida.' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!options.allowPast && d < today) {
      return { valid: false, message: 'La fecha no puede ser anterior a hoy.' };
    }

    const maxDays = options.maxDaysAhead || 365;
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + maxDays);
    if (d > maxDate) {
      return { valid: false, message: `La fecha no puede ser mayor a ${maxDays} días en el futuro.` };
    }

    return { valid: true, message: '' };
  }

  /**
   * Validar horario (formato HH:MM, rango válido)
   * @param {string} timeStr - Formato HH:MM
   * @param {{ minHour?: number, maxHour?: number }} options
   * @returns {{ valid: boolean, message: string }}
   */
  function time(timeStr, options = {}) {
    const req = required(timeStr, 'La hora');
    if (!req.valid) return req;

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(timeStr)) {
      return { valid: false, message: 'Ingresa una hora válida (HH:MM).' };
    }

    const [hours] = timeStr.split(':').map(Number);
    const minHour = options.minHour ?? 7;
    const maxHour = options.maxHour ?? 21;

    if (hours < minHour || hours >= maxHour) {
      return { valid: false, message: `La hora debe estar entre ${minHour}:00 y ${maxHour}:00.` };
    }

    return { valid: true, message: '' };
  }

  /**
   * Validar número dentro de rango
   * @param {number|string} value
   * @param {{ min?: number, max?: number, fieldName?: string }} options
   * @returns {{ valid: boolean, message: string }}
   */
  function numberRange(value, options = {}) {
    const fieldName = options.fieldName || 'El valor';
    const num = Number(value);

    if (isNaN(num)) {
      return { valid: false, message: `${fieldName} debe ser un número válido.` };
    }

    if (options.min !== undefined && num < options.min) {
      return { valid: false, message: `${fieldName} no puede ser menor a ${options.min}.` };
    }

    if (options.max !== undefined && num > options.max) {
      return { valid: false, message: `${fieldName} no puede ser mayor a ${options.max}.` };
    }

    return { valid: true, message: '' };
  }

  /**
   * Validar que no contenga caracteres especiales (solo letras, números, espacios, acentos)
   * @param {string} value
   * @param {string} fieldName
   * @returns {{ valid: boolean, message: string }}
   */
  function noSpecialChars(value, fieldName = 'Este campo') {
    const req = required(value, fieldName);
    if (!req.valid) return req;

    // Permite letras (incluyendo acentos), números, espacios, puntos y guiones
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.\-]+$/;
    if (!regex.test(value.trim())) {
      return { valid: false, message: `${fieldName} contiene caracteres no permitidos.` };
    }
    return { valid: true, message: '' };
  }

  /**
   * Validar select (que tenga un valor seleccionado)
   * @param {string} value
   * @param {string} fieldName
   * @returns {{ valid: boolean, message: string }}
   */
  function selectRequired(value, fieldName = 'Esta opción') {
    if (!value || value === '' || value === 'Seleccionar...' || value.startsWith('Seleccionar')) {
      return { valid: false, message: `${fieldName} es obligatorio.` };
    }
    return { valid: true, message: '' };
  }

  /* ============================================
     Funciones de UI para mostrar/limpiar errores
     ============================================ */

  /**
   * Mostrar error inline debajo de un campo
   * @param {HTMLElement} inputEl - El campo de input
   * @param {string} message - Mensaje de error
   */
  function showFieldError(inputEl, message) {
    clearFieldError(inputEl);
    if (!inputEl) return;

    inputEl.classList.add('input-error');

    const errorEl = document.createElement('span');
    errorEl.className = 'field-error-msg';
    errorEl.textContent = message;

    // Insertar después del input-wrapper o después del input directo
    const wrapper = inputEl.closest('.input-wrapper') || inputEl.closest('.form-group');
    if (wrapper) {
      wrapper.parentNode.insertBefore(errorEl, wrapper.nextSibling);
    } else {
      inputEl.parentNode.insertBefore(errorEl, inputEl.nextSibling);
    }
  }

  /**
   * Limpiar error de un campo
   * @param {HTMLElement} inputEl
   */
  function clearFieldError(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove('input-error');

    const wrapper = inputEl.closest('.input-wrapper') || inputEl.closest('.form-group');
    const parent = wrapper ? wrapper.parentNode : inputEl.parentNode;
    const existingError = parent.querySelector('.field-error-msg');
    if (existingError) existingError.remove();
  }

  /**
   * Limpiar todos los errores de un formulario
   * @param {HTMLFormElement} formEl
   */
  function clearFormErrors(formEl) {
    if (!formEl) return;
    formEl.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    formEl.querySelectorAll('.field-error-msg').forEach(el => el.remove());
  }

  /**
   * Validar un formulario completo con reglas
   * @param {Array<{ element: HTMLElement, rules: Array<{ validator: Function, args?: Array }> }>} fields
   * @returns {boolean} true si todo es válido
   */
  function validateForm(fields) {
    let allValid = true;

    fields.forEach(({ element, rules }) => {
      clearFieldError(element);
      const value = element.value;

      for (const rule of rules) {
        const args = rule.args || [];
        const result = rule.validator(value, ...args);
        if (!result.valid) {
          showFieldError(element, result.message);
          allValid = false;
          break; // Solo mostrar primer error por campo
        }
      }
    });

    return allValid;
  }

  /**
   * Verificar duplicado en Firestore
   * @param {string} collection - Nombre de la colección
   * @param {string} field - Campo a verificar
   * @param {*} value - Valor a buscar
   * @param {string|null} excludeId - ID a excluir (para edición)
   * @returns {Promise<{ valid: boolean, message: string }>}
   */
  async function checkDuplicate(collection, field, value, excludeId = null) {
    if (!window.firebaseReady || !window.db) {
      return { valid: true, message: '' }; // Skip si no hay Firebase
    }

    try {
      const snapshot = await window.db.collection(collection)
        .where(field, '==', value)
        .get();

      const docs = snapshot.docs.filter(doc => doc.id !== excludeId);
      if (docs.length > 0) {
        return { valid: false, message: `Ya existe un registro con este valor.` };
      }
      return { valid: true, message: '' };
    } catch (error) {
      console.error('Error verificando duplicado:', error);
      return { valid: true, message: '' }; // No bloquear si hay error de red
    }
  }

  // API pública
  return {
    sanitize,
    cleanSpaces,
    required,
    email,
    password,
    passwordsMatch,
    date,
    time,
    numberRange,
    noSpecialChars,
    selectRequired,
    showFieldError,
    clearFieldError,
    clearFormErrors,
    validateForm,
    checkDuplicate
  };
})();
