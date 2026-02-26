// Configuración de Firebase Web App
const firebaseConfig = {
    apiKey: "AIzaSyAo8Aamm3sIotnMs4jm1i-9Czshqn_FBSs",
    authDomain: "entregasescolares-a806d.firebaseapp.com",
    projectId: "entregasescolares-a806d",
    storageBucket: "entregasescolares-a806d.firebasestorage.app",
    messagingSenderId: "632381503519",
    appId: "1:632381503519:web:eaee711060e42e48c2bd2a"
};

// Exportar para usar en otros archivos si fuera necesario (aunque usaremos CDN en el HTML)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
}
