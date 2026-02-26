document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Firebase
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        checkAuthState();
    }

    setupNavigation();
    setupModal();
    fetchEntregas();
    fetchMisEntregas();

    // Sincronizar cierre de sesión entre múltiples pestañas
    window.addEventListener('storage', (e) => {
        if (e.key === 'usuario' && !e.newValue) {
            console.log("🔄 Sesión cerrada en otra pestaña detectada. Redirigiendo...");
            window.location.href = "Login_Nuevo.html";
        }
    });
});

function checkAuthState() {
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            console.log("🚫 No hay sesión activa, redirigiendo al login...");
            localStorage.removeItem('usuario');
            window.location.href = "Login_Nuevo.html";
        } else {
            console.log("✅ Sesión activa detectada para:", user.email);
            // Sincronizar localStorage con los datos de Firebase
            const userData = {
                matricula: user.email,
                rol: "ADMIN",
                nombre: user.displayName || user.email.split('@')[0],
                uid: user.uid
            };
            localStorage.setItem('usuario', JSON.stringify(userData));

            checkSession();
        }
    });
}

const API_URL = 'https://backend-entregas-dlfs.onrender.com';



// La variable global 'usuario' ha sido eliminada para evitar datos obsoletos.
// Ahora cada función obtiene el usuario directamente de localStorage.

function checkSession() {
    const welcomeMsg = document.getElementById('welcome-msg');
    const usuarioActual = JSON.parse(localStorage.getItem('usuario'));

    if (!usuarioActual || usuarioActual.matricula === "Invitado") {
        console.log("🚫 Usuario no autorizado o Invitado. Redirigiendo...");
        localStorage.removeItem('usuario');
        window.location.href = "Login_Nuevo.html";
        return;
    }

    if (welcomeMsg) {
        welcomeMsg.innerText = `Bienvenido, ${usuarioActual.matricula}`;
    }
}

function setupNavigation() {
    const links = document.querySelectorAll('.sidebar .menu-item');
    const sections = document.querySelectorAll('.content-section');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.id === 'btn-logout') {
                logout();
                return;
            }
            e.preventDefault();

            // Activar link
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Mostrar sección
            const sectionId = link.getAttribute('data-section');
            sections.forEach(s => s.style.display = 'none');
            const targetSection = document.getElementById(sectionId);
            if (targetSection) targetSection.style.display = 'block';
        });
    });
}

function setupModal() {
    const btnNueva = document.getElementById('btn-nueva-entrega');
    const modal = document.getElementById('modal-nueva-entrega');
    const btnClose = document.getElementById('close-modal');
    const btnCancel = document.getElementById('btn-cancelar');
    const form = document.getElementById('form-nueva-entrega');

    if (btnNueva && modal) {
        btnNueva.addEventListener('click', () => {
            // Se permite crear entregas como Invitado
            modal.style.display = 'flex';

            // Restringir fecha a HOY o futuro
            const fechaInput = document.getElementById('fecha_entrega');
            if (fechaInput) {
                const today = new Date().toISOString().split('T')[0];
                fechaInput.min = today;
            }
        });
    }

    const closeModal = () => {
        if (modal) modal.style.display = 'none';
        if (form) form.reset();
    };

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    // Cerrar al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Submit del formulario
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const materia = document.getElementById('materia').value;
            const tarea = document.getElementById('tarea').value;
            const fecha_entrega = document.getElementById('fecha_entrega').value;
            const archivoInput = document.getElementById('archivo');

            const formData = new FormData();
            const usuarioActual = JSON.parse(localStorage.getItem('usuario'));
            if (!usuarioActual) return;
            formData.append('matricula', usuarioActual.matricula);
            formData.append('materia', materia);
            formData.append('tarea', tarea);
            formData.append('fecha_entrega', fecha_entrega);
            formData.append('estado', "REVISADO");

            if (archivoInput.files[0]) {
                formData.append('archivo', archivoInput.files[0]);
            }

            try {
                // Indicador visual de carga
                const btnSubmit = e.target.querySelector('button[type="submit"]');
                const originalText = btnSubmit.innerText;
                btnSubmit.innerText = "Enviando...";
                btnSubmit.disabled = true;

                const response = await fetch(`${API_URL}/api/entregas`, {
                    method: 'POST',
                    body: formData
                });

                btnSubmit.innerText = originalText;
                btnSubmit.disabled = false;

                if (response.ok) {
                    alert("Entrega creada exitosamente");
                    closeModal();
                    fetchEntregas();
                    fetchMisEntregas();
                } else {
                    const errElem = await response.json();
                    alert("Error: " + (errElem.error || errElem.message));
                }
            } catch (error) {
                console.error("Error al crear entrega:", error);
                alert("Error de conexión. Si el servidor estaba inactivo, puede tardar unos segundos en responder. Intenta de nuevo.");
            }
        });
    }
}

function logout() {
    console.log("🚪 Cerrando sesión...");
    localStorage.removeItem('usuario');

    if (typeof firebase !== 'undefined') {
        firebase.auth().signOut().then(() => {
            window.location.href = "Login_Nuevo.html";
        }).catch((error) => {
            console.error("Error al cerrar sesión en Firebase:", error);
            window.location.href = "Login_Nuevo.html";
        });
    } else {
        window.location.href = "Login_Nuevo.html";
    }
}

async function fetchEntregas() {
    console.log("🚀 Obteniendo entregas desde Render...");
    try {
        const response = await fetch(`${API_URL}/api/entregas`);

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const entregas = await response.json();
        console.log("📦 Datos recibidos:", entregas);
        renderEntregas(entregas, 'entregas-body', true);
        renderTareasPendientes(entregas);
    } catch (error) {
        console.error("❌ Error al cargar entregas:", error);
        const tbody = document.getElementById('entregas-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ff6b6b;">
                No se pudo conectar con el servidor.<br>
                <small>Si el servidor estaba inactivo (Render), puede tardar hasta 1 minuto en "despertar". 
                Por favor, espera un momento y recarga la página.</small>
            </td></tr>`;
        }
    }
}

async function fetchMisEntregas() {
    const usuarioActual = JSON.parse(localStorage.getItem('usuario'));
    if (!usuarioActual) return;
    try {
        console.log(`📡 Obteniendo entregas para: ${usuarioActual.matricula}`);



        const response = await fetch(`${API_URL}/api/entregas?matricula=${usuarioActual.matricula}`);
        if (!response.ok) throw new Error('Error al obtener mis entregas');

        let entregas = await response.json();


        const historial = entregas.filter(e => e.estado !== 'REVISADO');

        renderEntregas(historial, 'mis-entregas-body', false);
    } catch (error) {
        console.error("Error fetchMisEntregas:", error);
    }
}

function renderEntregas(entregas, elementId, showUser) {
    const tbody = document.getElementById(elementId);
    if (!tbody) return;
    tbody.innerHTML = '';

    if (entregas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay entregas registradas</td></tr>';
        return;
    }

    entregas.forEach(entrega => {
        const fila = document.createElement('tr');
        const fecha = new Date(entrega.fecha_entrega).toLocaleDateString('es-ES', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
        const estadoClass = entrega.estado ? entrega.estado.toLowerCase() : 'enviado';

        let userColumn = showUser ? `<td>${entrega.matricula || 'Desc.'}</td>` : '';

        fila.innerHTML = `
            <td>${entrega.materia}</td>
            <td>${entrega.tarea}</td>
            <td>${fecha}</td>
            <td><span class="status ${estadoClass}">${entrega.estado || 'ENVIADO'}</span></td>
            ${userColumn}
            <td>
                <a href="${entrega.archivo_url}" target="_blank" style="color: var(--accent); text-decoration: none; margin-right: 10px;">
                    Ver archivo
                </a>
                <button onclick="eliminarEntrega('${entrega._id}')" style="background-color: #ff4d4d; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8rem;">
                    Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

function renderTareasPendientes(entregas) {
    const container = document.getElementById('tareas-container');
    if (!container) return;
    container.innerHTML = '';



    let misPendientes = [];
    const usuarioActual = JSON.parse(localStorage.getItem('usuario'));
    if (usuarioActual) {



        misPendientes = entregas.filter(e =>
            e.matricula === usuarioActual.matricula &&
            e.estado === 'REVISADO'
        );
    } else {

        misPendientes = entregas.filter(e => e.estado === 'REVISADO').slice(0, 3);
    }

    if (misPendientes.length === 0) {
        container.innerHTML = '<p>No tienes tareas pendientes.</p>';
        return;
    }

    misPendientes.forEach(entrega => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style = "background: var(--bg-card); padding: 25px; border-radius: 15px; border: 1px solid var(--border); width: 100%; max-width: 320px; transition: 0.3s; display: flex; flex-direction: column;";

        const fecha = new Date(entrega.fecha_entrega).toLocaleDateString('es-ES');

        card.innerHTML = `
            <div style="flex-grow: 1;">
                <h4 style="margin-top: 0; color: var(--primary); font-size: 1.2rem; margin-bottom: 10px;">${entrega.materia}</h4>
                <p style="color: var(--text-main); margin-bottom: 15px; font-size: 0.95rem;">${entrega.tarea}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="font-size: 0.8em; color: var(--text-muted);">Vence: ${fecha}</span>
                    <span class="status ${entrega.estado ? entrega.estado.toLowerCase() : 'enviado'}">${entrega.estado || 'ENVIADO'}</span>
                </div>
            </div>
            <button onclick="marcarComoEntregada('${entrega._id}')" class="btn btn-primary" style="width: 100%; padding: 10px; font-size: 0.9rem;">
                Marcar como Entregada
            </button>
        `;
        container.appendChild(card);
    });
}

async function marcarComoEntregada(id) {
    if (!confirm("¿Deseas marcar esta tarea como entregada?")) return;

    try {
        const response = await fetch(`${API_URL}/api/entregas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'ENTREGADO' })
        });

        if (response.ok) {
            alert("Tarea actualizada correctamente");
            fetchEntregas();
            fetchMisEntregas();
        } else {
            alert("Error al actualizar la tarea");
        }
    } catch (error) {
        console.error("Error al actualizar tarea:", error);
        alert("Error de conexión");
    }
}

async function eliminarEntrega(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar esta tarea permanentemente?")) return;

    try {
        const response = await fetch(`${API_URL}/api/entregas/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert("Tarea eliminada correctamente");
            fetchEntregas();
            fetchMisEntregas();
        } else {
            const err = await response.json();
            alert("Error al eliminar: " + (err.error || err.message));
        }
    } catch (error) {
        console.error("Error al eliminar tarea:", error);
        alert("Error de conexión al intentar eliminar.");
    }
}
