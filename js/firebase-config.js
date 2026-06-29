/* ============================================
   SGTA-UPLA — Firebase Configuration
   Ready for Firestore integration
   ============================================ */

/**
 * INSTRUCCIONES PARA CONFIGURAR FIREBASE:
 * 
 * 1. Ve a https://console.firebase.google.com/
 * 2. Crea un nuevo proyecto o selecciona uno existente
 * 3. En la consola, ve a Configuración del proyecto > General
 * 4. En "Tus apps", haz clic en el ícono de Web (</>)
 * 5. Registra tu app y copia la configuración
 * 6. Reemplaza los valores de firebaseConfig abajo
 * 7. En la consola de Firebase, ve a Firestore Database
 * 8. Crea una base de datos (modo de prueba para desarrollo)
 */

// TODO: Reemplaza estos valores con tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDyWSQjYq_FIbeyWt07eNw9_g6caYEFGZU",
  authDomain: "gestion-de-tutorias-3309e.firebaseapp.com",
  projectId: "gestion-de-tutorias-3309e",
  storageBucket: "gestion-de-tutorias-3309e.firebasestorage.app",
  messagingSenderId: "1009234670519",
  appId: "1:1009234670519:web:8e99e8653ce36cb9636e32",
  measurementId: "G-89FVMD0F01"
};

// Estado de Firebase
let firebaseApp = null;
let db = null;
let firebaseReady = false;

/**
 * Inicializar Firebase
 * Llama esta función cuando Firebase SDK esté cargado
 */
function initFirebase() {
  try {
    // Verificar que Firebase SDK está disponible
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK no encontrado. Usando datos locales.');
      return false;
    }

    // Verificar que la configuración es válida
    if (firebaseConfig.apiKey === "TU_API_KEY_AQUI") {
      console.warn('Firebase no configurado. Usando datos locales.');
      console.info('Para configurar Firebase, edita js/firebase-config.js');
      return false;
    }

    // Inicializar Firebase
    firebaseApp = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseReady = true;
    console.log('✅ Firebase inicializado correctamente');
    return true;
  } catch (error) {
    console.error('Error al inicializar Firebase:', error);
    return false;
  }
}

/* ============================================
   Funciones Helper para Firestore
   ============================================ */

/**
 * Obtener todos los documentos de una colección
 * @param {string} collectionName - Nombre de la colección
 * @returns {Promise<Array>} Array de documentos
 * 
 * Ejemplo de uso:
 *   const usuarios = await getCollection('usuarios');
 */
async function getCollection(collectionName) {
  if (!firebaseReady) {
    console.warn(`Firebase no disponible. Retornando datos mock para: ${collectionName}`);
    return [];
  }

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
 * @param {string} collectionName - Nombre de la colección
 * @param {string} docId - ID del documento
 * @returns {Promise<Object|null>}
 * 
 * Ejemplo de uso:
 *   const usuario = await getDocument('usuarios', 'abc123');
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
 * @param {string} collectionName - Nombre de la colección
 * @param {Object} data - Datos del documento
 * @returns {Promise<string|null>} ID del documento creado
 * 
 * Ejemplo de uso:
 *   const id = await addDocument('tutorias', { tutor: 'Dr. Mendoza', ... });
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
      console.log(`Documento creado en ${collectionName} con ID específico: ${docId}`);
      return docId;
    } else {
      const docRef = await db.collection(collectionName).add(payload);
      console.log(`Documento creado en ${collectionName} con ID autogenerado: ${docRef.id}`);
      return docRef.id;
    }
  } catch (error) {
    console.error(`Error al crear documento en ${collectionName}:`, error);
    return null;
  }
}

/**
 * Actualizar un documento existente
 * @param {string} collectionName - Nombre de la colección
 * @param {string} docId - ID del documento
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<boolean>}
 * 
 * Ejemplo de uso:
 *   await updateDocument('usuarios', 'abc123', { estado: 'Inactivo' });
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
    return false;
  }
}

/**
 * Eliminar un documento
 * @param {string} collectionName - Nombre de la colección
 * @param {string} docId - ID del documento
 * @returns {Promise<boolean>}
 * 
 * Ejemplo de uso:
 *   await deleteDocument('tutorias', 'abc123');
 */
async function deleteDocument(collectionName, docId) {
  if (!firebaseReady) return false;

  try {
    await db.collection(collectionName).doc(docId).delete();
    console.log(`Documento ${docId} eliminado de ${collectionName}`);
    return true;
  } catch (error) {
    console.error(`Error al eliminar documento ${docId}:`, error);
    return false;
  }
}

/**
 * Consultar documentos con filtros
 * @param {string} collectionName - Nombre de la colección
 * @param {string} field - Campo a filtrar
 * @param {string} operator - Operador (==, >, <, >=, <=, array-contains)
 * @param {*} value - Valor a comparar
 * @returns {Promise<Array>}
 * 
 * Ejemplo de uso:
 *   const activos = await queryCollection('usuarios', 'estado', '==', 'Activo');
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

/* ============================================
   Colecciones sugeridas para Firestore:
   
   - usuarios          (tutores, delegados, estudiantes, admins)
   - tutorias           (sesiones programadas/completadas)
   - solicitudes        (solicitudes de tutoría)
   - reportes           (reportes generados)
   - materias           (catálogo de materias)
   - configuracion      (settings del sistema)
   - mensajes           (comunicación interna)
   ============================================ */
