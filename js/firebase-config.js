/* ============================================
   SGTA-UPLA — Firebase Configuration
   Auth + Firestore + Storage
   ============================================ */

/**
 * INSTRUCCIONES PARA CONFIGURAR FIREBASE:
 * 
 * 1. Ve a https://console.firebase.google.com/
 * 2. Selecciona tu proyecto
 * 3. Habilita Authentication > Email/Password
 * 4. Habilita Firestore Database
 * 5. Habilita Storage (opcional, para fotos)
 * 6. La configuración ya está lista abajo
 */

const firebaseConfig = {
  apiKey: "AIzaSyDyWSQjYq_FIbeyWt07eNw9_g6caYEFGZU",
  authDomain: "gestion-de-tutorias-3309e.firebaseapp.com",
  projectId: "gestion-de-tutorias-3309e",
  storageBucket: "gestion-de-tutorias-3309e.firebasestorage.app",
  messagingSenderId: "1009234670519",
  appId: "1:1009234670519:web:8e99e8653ce36cb9636e32",
  measurementId: "G-89FVMD0F01"
};

// Estado global de Firebase
let firebaseApp = null;
let db = null;
let auth = null;
let storage = null;
let firebaseReady = false;

// Hacer accesibles globalmente
window.firebaseReady = false;
window.db = null;

/**
 * Inicializar Firebase (App + Firestore + Auth + Storage)
 * @returns {boolean} true si se inicializó correctamente
 */
function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK no encontrado.');
      return false;
    }

    if (firebaseConfig.apiKey === "TU_API_KEY_AQUI") {
      console.warn('Firebase no configurado. Edita js/firebase-config.js');
      return false;
    }

    // Evitar re-inicialización
    if (firebase.apps.length > 0) {
      firebaseApp = firebase.apps[0];
    } else {
      firebaseApp = firebase.initializeApp(firebaseConfig);
    }

    // Firestore
    db = firebase.firestore();
    window.db = db;

    // Auth (si SDK está cargado)
    if (firebase.auth) {
      auth = firebase.auth();
      // Persistencia: mantener sesión
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .catch(err => console.warn('Error configurando persistencia:', err));
    }

    // Storage (si SDK está cargado)
    if (firebase.storage) {
      storage = firebase.storage();
    }

    firebaseReady = true;
    window.firebaseReady = true;
    console.log('✅ Firebase inicializado correctamente');
    return true;
  } catch (error) {
    console.error('Error al inicializar Firebase:', error);
    return false;
  }
}

/* ============================================
   AUTHENTICATION FUNCTIONS
   ============================================ */

/**
 * Iniciar sesión con email y contraseña
 * @param {string} email
 * @param {string} password
 * @returns {Promise<firebase.User>}
 */
async function signIn(email, password) {
  if (!auth) throw new Error('Firebase Auth no disponible');
  const userCredential = await auth.signInWithEmailAndPassword(email, password);
  return userCredential.user;
}

/**
 * Crear cuenta de usuario
 * @param {string} email
 * @param {string} password
 * @returns {Promise<firebase.User>}
 */
async function createUser(email, password) {
  if (!auth) throw new Error('Firebase Auth no disponible');
  const userCredential = await auth.createUserWithEmailAndPassword(email, password);
  return userCredential.user;
}

/**
 * Crear cuenta sin cambiar la sesión actual (para que admin cree usuarios)
 * Usa una segunda instancia temporal de Firebase
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string>} UID del nuevo usuario
 */
async function createUserWithoutSignIn(email, password) {
  if (!auth) throw new Error('Firebase Auth no disponible');

  // Crear app secundaria temporal
  const secondaryApp = firebase.initializeApp(firebaseConfig, 'secondary-' + Date.now());
  try {
    const secondaryAuth = secondaryApp.auth();
    const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;
    await secondaryAuth.signOut();
    return uid;
  } finally {
    await secondaryApp.delete();
  }
}

/**
 * Cerrar sesión
 */
async function signOutUser() {
  if (!auth) return;
  localStorage.removeItem('sgta_session');
  await auth.signOut();
}

/**
 * Enviar email de recuperación de contraseña
 * @param {string} email
 */
async function resetPassword(email) {
  if (!auth) throw new Error('Firebase Auth no disponible');
  await auth.sendPasswordResetEmail(email);
}

/**
 * Obtener usuario autenticado actual
 * @returns {firebase.User|null}
 */
function getCurrentAuthUser() {
  return auth ? auth.currentUser : null;
}

/**
 * Escuchar cambios de autenticación
 * @param {Function} callback - Recibe (user) o null
 * @returns {Function} Unsubscribe
 */
function onAuthChange(callback) {
  if (!auth) return () => {};
  return auth.onAuthStateChanged(callback);
}

/**
 * Obtener datos completos del usuario (Auth + Firestore)
 * @param {string} uid - UID del usuario de Firebase Auth
 * @param {string|null} email - Email del usuario (opcional para fallback)
 * @returns {Promise<Object|null>}
 */
async function getUserData(uid, email = null) {
  if (!firebaseReady || !db) return null;

  try {
    // Buscar primero por UID como ID del documento
    let doc = await db.collection('usuarios').doc(uid).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }

    // Fallback: buscar por campo uid
    const snapshot = await db.collection('usuarios')
      .where('uid', '==', uid)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      return { id: d.id, ...d.data() };
    }

    // Fallback adicional: buscar por email y vincular automáticamente el UID si se encuentra
    if (email) {
      const emailSnapshot = await db.collection('usuarios')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!emailSnapshot.empty) {
        const d = emailSnapshot.docs[0];
        // Enlazar automáticamente el nuevo UID a este documento existente en Firestore
        await db.collection('usuarios').doc(d.id).update({ uid: uid });
        return { id: d.id, ...d.data(), uid: uid };
      }
    }

    return null;
  } catch (error) {
    console.error('Error obteniendo datos de usuario:', error);
    return null;
  }
}

/* ============================================
   STORAGE FUNCTIONS
   ============================================ */

/**
 * Subir archivo a Firebase Storage
 * @param {File} file - Archivo a subir
 * @param {string} path - Ruta en Storage (ej: 'photos/user123.jpg')
 * @returns {Promise<string>} URL de descarga
 */
async function uploadFile(file, path) {
  if (!storage) throw new Error('Firebase Storage no disponible');

  const storageRef = storage.ref(path);
  const snapshot = await storageRef.put(file);
  return await snapshot.ref.getDownloadURL();
}

/**
 * Obtener URL de un archivo en Storage
 * @param {string} path
 * @returns {Promise<string>}
 */
async function getFileURL(path) {
  if (!storage) throw new Error('Firebase Storage no disponible');
  return await storage.ref(path).getDownloadURL();
}

/* ============================================
   FIRESTORE HELPER FUNCTIONS
   ============================================ */

/**
 * Obtener todos los documentos de una colección
 * @param {string} collectionName
 * @returns {Promise<Array>}
 */
async function getCollection(collectionName) {
  if (!firebaseReady) return [];

  try {
    const snapshot = await db.collection(collectionName).get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error al obtener colección ${collectionName}:`, error);
    return [];
  }
}

/**
 * Obtener un documento por su ID
 * @param {string} collectionName
 * @param {string} docId
 * @returns {Promise<Object|null>}
 */
async function getDocument(collectionName, docId) {
  if (!firebaseReady) return null;

  try {
    const doc = await db.collection(collectionName).doc(docId).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error(`Error al obtener documento ${docId}:`, error);
    return null;
  }
}

/**
 * Agregar un nuevo documento a una colección
 * @param {string} collectionName
 * @param {Object} data
 * @param {string|null} docId - ID específico o auto-generado
 * @returns {Promise<string|null>} ID del documento creado
 */
async function addDocument(collectionName, data, docId = null) {
  if (!firebaseReady) {
    console.warn('Firebase no disponible');
    return null;
  }

  try {
    const payload = {
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (docId) {
      await db.collection(collectionName).doc(docId).set(payload);
      console.log(`Documento creado en ${collectionName} con ID: ${docId}`);
      return docId;
    } else {
      const docRef = await db.collection(collectionName).add(payload);
      console.log(`Documento creado en ${collectionName} con ID: ${docRef.id}`);
      return docRef.id;
    }
  } catch (error) {
    console.error(`Error al crear documento en ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Actualizar un documento existente
 * @param {string} collectionName
 * @param {string} docId
 * @param {Object} data
 * @returns {Promise<boolean>}
 */
async function updateDocument(collectionName, docId, data) {
  if (!firebaseReady) return false;

  try {
    await db.collection(collectionName).doc(docId).update({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Documento ${docId} actualizado en ${collectionName}`);
    return true;
  } catch (error) {
    console.error(`Error al actualizar documento ${docId}:`, error);
    throw error;
  }
}

/**
 * Eliminar un documento
 * @param {string} collectionName
 * @param {string} docId
 * @returns {Promise<boolean>}
 */
async function deleteDocument(collectionName, docId) {
  if (!firebaseReady) return false;

  try {
    await db.collection(collectionName).doc(docId).delete();
    console.log(`Documento ${docId} eliminado de ${collectionName}`);
    return true;
  } catch (error) {
    console.error(`Error al eliminar documento ${docId}:`, error);
    throw error;
  }
}

/**
 * Consultar documentos con un filtro
 * @param {string} collectionName
 * @param {string} field
 * @param {string} operator - ==, >, <, >=, <=, array-contains
 * @param {*} value
 * @returns {Promise<Array>}
 */
async function queryCollection(collectionName, field, operator, value) {
  if (!firebaseReady) return [];

  try {
    const snapshot = await db.collection(collectionName)
      .where(field, operator, value)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error en consulta a ${collectionName}:`, error);
    return [];
  }
}

/**
 * Consultar con múltiples filtros
 * @param {string} collectionName
 * @param {Array<{field: string, operator: string, value: *}>} filters
 * @param {{ orderBy?: string, orderDir?: string, limitTo?: number }} options
 * @returns {Promise<Array>}
 */
async function queryCollectionMulti(collectionName, filters = [], options = {}) {
  if (!firebaseReady) return [];

  try {
    let query = db.collection(collectionName);

    filters.forEach(f => {
      query = query.where(f.field, f.operator, f.value);
    });

    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDir || 'asc');
    }

    if (options.limitTo) {
      query = query.limit(options.limitTo);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error en consulta multi a ${collectionName}:`, error);
    return [];
  }
}

/**
 * Obtener colección con paginación
 * @param {string} collectionName
 * @param {{ pageSize?: number, lastDoc?: Object, orderBy?: string, orderDir?: string, filters?: Array }} options
 * @returns {Promise<{ data: Array, lastDoc: Object|null, hasMore: boolean }>}
 */
async function getCollectionPaginated(collectionName, options = {}) {
  if (!firebaseReady) return { data: [], lastDoc: null, hasMore: false };

  const pageSize = options.pageSize || 10;
  const orderByField = options.orderBy || 'createdAt';
  const orderDir = options.orderDir || 'desc';

  try {
    let query = db.collection(collectionName);

    // Aplicar filtros
    if (options.filters && options.filters.length > 0) {
      options.filters.forEach(f => {
        query = query.where(f.field, f.operator, f.value);
      });
    }

    query = query.orderBy(orderByField, orderDir);

    // Cursor de paginación
    if (options.lastDoc) {
      query = query.startAfter(options.lastDoc);
    }

    query = query.limit(pageSize + 1); // +1 para saber si hay más

    const snapshot = await query.get();
    const docs = snapshot.docs;
    const hasMore = docs.length > pageSize;

    const data = docs.slice(0, pageSize).map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const lastDoc = data.length > 0 ? docs[data.length - 1] : null;

    return { data, lastDoc, hasMore };
  } catch (error) {
    console.error(`Error en paginación de ${collectionName}:`, error);
    return { data: [], lastDoc: null, hasMore: false };
  }
}

/**
 * Escuchar cambios en una colección en tiempo real
 * @param {string} collectionName
 * @param {Function} callback - Recibe array de documentos
 * @param {Array<{field: string, operator: string, value: *}>} filters
 * @returns {Function} Unsubscribe function
 */
function listenCollection(collectionName, callback, filters = []) {
  if (!firebaseReady) return () => {};

  let query = db.collection(collectionName);

  filters.forEach(f => {
    query = query.where(f.field, f.operator, f.value);
  });

  return query.onSnapshot(snapshot => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(data);
  }, error => {
    console.error(`Error en listener de ${collectionName}:`, error);
  });
}

/**
 * Ejecutar operación en batch (múltiples escrituras atómicas)
 * @param {Function} operations - Recibe el objeto batch
 * @returns {Promise<void>}
 */
async function batchOperation(operations) {
  if (!firebaseReady) return;

  const batch = db.batch();
  await operations(batch, db);
  await batch.commit();
}

/* ============================================
   Colecciones de Firestore:
   
   - usuarios          (todos los usuarios del sistema)
   - tutorias           (sesiones de tutoría)
   - solicitudes        (solicitudes de tutoría)
   - notificaciones     (notificaciones in-app)
   - mensajes           (comunicación interna)
   - configuracion      (settings del sistema)
   ============================================ */
