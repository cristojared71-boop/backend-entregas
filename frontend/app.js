document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    setupNavigation();
    setupModal();
    fetchEntregas();
    fetchMisEntregas();

    // Sincronizar cierre de sesión entre pestañas
    window.addEventListener('storage', (e) => {
        if (e.key === 'usuario' && !e.newValue) {
            window.location.href = "Login_Nuevo.html";
        }
    });
});

// Configuración de API
// IMPORTANTE: Forzamos el uso de Render para que los archivos se suban a la nube
// y la App Android pueda verlos. Si usas localhost, la App no verá los archivos.
const API_URL = 'https://backend-entregas-dlfs.onrender.com';

/* 
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://backend-entregas-dlfs.onrender.com';
*/

let usuario = null;

try {
    usuario = JSON.parse(localStorage.getItem('usuario'));
} catch (e) {
    console.error("Error parsing user from localStorage", e);
    localStorage.removeItem('usuario');
}

function checkSession() {
    const welcomeMsg = document.getElementById('welcome-msg');
    if (!usuario || usuario.matricula === "Invitado") {
        if (welcomeMsg) welcomeMsg.innerText = "Bienvenido, Invitado";
        return;
    }

    if (welcomeMsg) {
        welcomeMsg.innerText = `Bienvenido, ${usuario.matricula}`;
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
            formData.append('matricula', usuario.matricula);
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
                    body: formData // No enviamos headers, fetch lo hace automáticamente para FormData
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
    localStorage.removeItem('usuario');
    // Redirigir a la pantalla de bienvenida (anteriormente login)
    window.location.href = "Login_Nuevo.html";
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
    if (!usuario) return;
    try {
        console.log(`📡 Obteniendo entregas para: ${usuario.matricula}`);
        // Filtrar por matrícula en la API
        const response = await fetch(`${API_URL}/api/entregas?matricula=${usuario.matricula}`);
        if (!response.ok) throw new Error('Error al obtener mis entregas');

        let entregas = await response.json();

        // Filtrar para el historial: TODO lo que NO sea REVISADO (nuestro nuevo "Pendiente")
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
                <a href="${entrega.archivo_url}" target="_blank" style="color: var(--accent); text-decoration: none;">
                    Ver archivo
                </a>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

function renderTareasPendientes(entregas) {
    const container = document.getElementById('tareas-container');
    if (!container) return;
    container.innerHTML = '';

    // Filtrar entregas del usuario actual que NO estén 'APROBADO' o 'REVISADO' (Logica de ejemplo)
    // O si quieres mostrar TODAS las pendientes del sistema, quita el filtro de usuario.
    // Asumiremos que "Tareas Pendientes" son las del usuario logueado.

    let misPendientes = [];
    if (usuario) {
        // Solo tareas del usuario que estén REVISADO (Usamos REVISADO como "Pendiente" para que Render lo acepte)
        misPendientes = entregas.filter(e =>
            e.matricula === usuario.matricula &&
            e.estado === 'REVISADO'
        );
    } else {
        // Si es invitado, mostrar algunas de ejemplo que estén REVISADO
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
