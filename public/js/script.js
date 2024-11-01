// #region Constants and Utilities
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('toast');
    const toast = new bootstrap.Toast(toastEl, {
        delay: 3000
    });
    
    toastEl.querySelector('.toast-body').textContent = message;
    toastEl.classList.remove('bg-success', 'bg-danger', 'bg-warning');
    
    switch(type) {
        case 'success':
            toastEl.classList.add('bg-success');
            break;
        case 'error':
            toastEl.classList.add('bg-danger');
            break;
        case 'warning':
            toastEl.classList.add('bg-warning');
            break;
    }
    
    toast.show();
}
// #endregion

// #region Authentication and User Management
const setAuthToken = (token) => localStorage.setItem(TOKEN_KEY, token);
const getAuthToken = () => localStorage.getItem(TOKEN_KEY);
const setUserData = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));
const getUserData = () => {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
};
const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};

const checkAuth = () => {
    const token = getAuthToken();
    if (!token) {
        handleNotAuthenticated();
        return false;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            clearAuth();
            handleNotAuthenticated();
            showToast('Tu sesión ha expirado', 'warning');
            return false;
        }
        handleAuthenticated();
        return true;
    } catch (error) {
        console.error('Error al verificar token:', error);
        clearAuth();
        handleNotAuthenticated();
        return false;
    }
};

function handleAuthenticated() {
    document.querySelectorAll('.auth-only').forEach(el => {
        el.style.display = 'block';
    });
    document.querySelectorAll('.no-auth-only').forEach(el => {
        el.style.display = 'none';
    });
    
    const userData = getUserData();
    if (userData) {
        const userFullNameEl = document.getElementById('userFullName');
        if (userFullNameEl) {
            userFullNameEl.textContent = `${userData.first_name} ${userData.last_name}`;
        }
    }
}

function handleNotAuthenticated() {
    document.querySelectorAll('.auth-only').forEach(el => {
        el.style.display = 'none';
    });
    document.querySelectorAll('.no-auth-only').forEach(el => {
        el.style.display = 'block';
    });
}
// #endregion

// #region API Calls
/**
 * Obtiene los schedules desde el servidor
 * @returns {Promise<Array>} Array de schedules
 */
async function fetchSchedules() {
    try {
        const response = await fetch('/api/schedules/schedule-cards', { 
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al obtener schedules:', error);
        showToast('Error al cargar los eventos', 'error');
        return [];
    }
}

/**
 * Actualiza la capacidad de un evento específico
 * @param {string} scheduleId - ID del schedule
 */
async function updateEventCapacity(scheduleId) {
    try {
        const response = await fetch(`/api/inscriptions/available-spots/${scheduleId}`);
        const data = await response.json();
        
        const card = document.querySelector(`[data-schedule-id="${scheduleId}"]`);
        if (card) {
            const spotsElement = card.querySelector('.available-spots');
            if (spotsElement) {
                spotsElement.textContent = `Cupos disponibles: ${data.availableSpots}`;
            }
        }
    } catch (error) {
        console.error('Error al actualizar cupos:', error);
        showToast('Error al actualizar cupos disponibles', 'error');
    }
}

/**
 * Muestra un modal cuando el usuario no tiene inscripciones
 */
function showNoInscriptionsModal() {
    const modalHTML = `
        <div class="modal fade" id="noInscriptionsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content bg-dark text-white">
                    <div class="modal-header">
                        <h5 class="modal-title">Inscripciones</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center">
                        <div class="mb-3">
                            <i class="fas fa-calendar-times fa-3x text-danger mb-3"></i>
                        </div>
                        <h5>No tienes inscripciones activas</h5>
                        <p class="text-muted">Explora los eventos disponibles y inscríbete en los que te interesen.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('noInscriptionsModal'));
    
    const modalElement = document.getElementById('noInscriptionsModal');
    modalElement.addEventListener('hidden.bs.modal', function () {
        this.remove();
        document.body.classList.remove('modal-open');
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
    });

    modal.show();
}

/**
 * Crea el HTML para el modal de inscripciones
 * @param {Array} inscriptions - Array de inscripciones
 * @returns {string} HTML del modal
 */
function createInscriptionsModalHTML(inscriptions) {
    return `
        <div class="modal fade" id="inscriptionsModal" tabindex="-1" aria-labelledby="inscriptionsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content bg-dark text-white">
                    <div class="modal-header">
                        <h5 class="modal-title" id="inscriptionsModalLabel">
                            Mis Inscripciones
                            <span class="badge bg-danger ms-2">${inscriptions.length}</span>
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            ${inscriptions.map(inscription => `
                                <div class="col-12 mb-3">
                                    <div class="card bg-secondary">
                                        <div class="card-body">
                                            <h5 class="card-title text-danger">${inscription.event_name}</h5>
                                            <div class="card-text">
                                                <div class="mb-2">
                                                    <small>
                                                        <strong>Hora:</strong> ${inscription.event_time || 'No disponible'}<br>
                                                        <strong>Ubicación:</strong> ${inscription.location}<br>
                                                        <strong>Tipo:</strong> ${inscription.type}
                                                    </small>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onclick="cancelInscription('${inscription.schedule_id}')" 
                                                    class="btn btn-danger btn-sm w-100">
                                                    Cancelar Inscripción
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
// #endregion

// #region Events and Event Handlers
function initializeEventListeners() {
    // Login button
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
        });
    }

    // Register button
    const registerBtn = document.getElementById("registerBtn");
    if (registerBtn) {
        registerBtn.addEventListener("click", () => {
            const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
            registerModal.show();
        });
    }

    // Logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            clearAuth();
            handleNotAuthenticated();
            showToast('Sesión cerrada exitosamente', 'success');
        });
    }

    // Login form
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const email = document.getElementById("loginEmail").value;
            const password = document.getElementById("loginPassword").value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    setAuthToken(data.token);
                    setUserData(data.user);
                    handleAuthenticated();
                    const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                    if (loginModal) {
                        loginModal.hide();
                    }
                    showToast('Inicio de sesión exitoso', 'success');
                } else {
                    showToast(data.message || 'Error en el inicio de sesión', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Error al intentar iniciar sesión', 'error');
            }
        });
    }

    // Register form
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const formData = {
                first_name: document.getElementById("firstName").value,
                last_name: document.getElementById("lastName").value,
                email: document.getElementById("email").value,
                password: document.getElementById("password").value,
                confirmPassword: document.getElementById("confirmPassword").value,
                school: document.getElementById("school").value,
                year: document.getElementById("year").value,
                course: document.getElementById("course").value
            };

            if (formData.password !== formData.confirmPassword) {
                showToast('Las contraseñas no coinciden', 'error');
                return;
            }

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                });

                const data = await response.json();

                if (response.ok) {
                    setAuthToken(data.token);
                    setUserData(data.user);
                    handleAuthenticated();
                    const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                    if (registerModal) {
                        registerModal.hide();
                    }
                    showToast('Registro exitoso', 'success');
                } else {
                    showToast(data.message || 'Error en el registro', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Error al intentar registrarse', 'error');
            }
        });
    }

    // Filters
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            filters.eventType = e.target.value;
            loadSchedules();
        });
    }

    const capacityFilter = document.getElementById('capacityFilter');
    if (capacityFilter) {
        capacityFilter.addEventListener('change', (e) => {
            filters.capacity = e.target.value;
            loadSchedules();
        });
    }
}

// #endregion

// #region Cards and Display
/**
 * Crea una card de evento
 * @param {Object} schedule - Datos del schedule
 * @returns {string} HTML de la card
 */
// Modificar la función createEventCard para usar availableSpots
function createEventCard(schedule) {
    const availableSpots = schedule.availableSpots ?? 
        (schedule.capacity - (schedule.currentInscriptions || 0));
    const isAvailable = availableSpots > 0;
    
    return `
        <div class="col-12 col-md-6 col-lg-4" data-schedule-id="${schedule.scheduleId}">
            <div class="card bg-dark text-white h-100 border-secondary hover-border-danger">
                <div class="position-relative">
                    <img 
                        src="${schedule.event.photo || 'https://via.placeholder.com/400x300'}"
                        class="card-img-top"
                        alt="${schedule.event.name}"
                        style="height: 200px; object-fit: cover;"
                    >
                    <div class="position-absolute top-0 end-0 bg-danger text-white px-3 py-1">
                        ${schedule.event.type}
                    </div>
                </div>
                
                <div class="card-body">
                    <h5 class="card-title text-danger">${schedule.event.name}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${schedule.event.type}</h6>
                    <p class="card-text">${schedule.event.description}</p>
                    
                    <div class="mb-3">
                        <p class="mb-1"><small><strong>Autor:</strong> ${schedule.event.author}</small></p>
                        <p class="mb-1"><small><strong>Ubicación:</strong> ${schedule.event.location}</small></p>
                        <p class="mb-1"><small><strong>Duración:</strong> ${schedule.event.duration}</small></p>
                        <p class="mb-1 available-spots">
                            <small>
                                <strong>Cupos disponibles:</strong> 
                                <span class="badge bg-${isAvailable ? 'success' : 'danger'}">
                                    ${availableSpots}
                                </span>
                            </small>
                        </p>
                    </div>

                    <button
                        onclick="handleInscription('${schedule.scheduleId}')"
                        class="btn w-100 ${isAvailable ? 'btn-danger' : 'btn-secondary'}"
                        ${!isAvailable ? 'disabled' : ''}
                    >
                        ${isAvailable ? 'INSCRIBIRSE' : 'AGOTADO'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Agrupa los schedules por horario
 * @param {Array} schedules - Array de schedules
 * @returns {Object} Schedules agrupados por horario
 */
function groupSchedulesByTime(schedules) {
    const sortedSchedules = schedules.sort((a, b) => {
        return new Date('1970/01/01 ' + a.startTime) - new Date('1970/01/01 ' + b.startTime);
    });

    const groupedSchedules = {};
    sortedSchedules.forEach(schedule => {
        const time = schedule.startTime.slice(0, 5); // Obtener HH:mm
        if (!groupedSchedules[time]) {
            groupedSchedules[time] = [];
        }
        groupedSchedules[time].push(schedule);
    });

    return groupedSchedules;
}
// #endregion

// #region Inscriptions Management
/**
 * Maneja el proceso de inscripción a un evento
 * @param {string} scheduleId - ID del schedule
 */
// Modificar handleInscription para actualizar los cupos inmediatamente
// Modificar la función handleInscription
async function handleInscription(scheduleId) {
    try {
        const token = getAuthToken();
        if (!token) {
            showToast('Debe iniciar sesión para inscribirse', 'warning');
            return;
        }

        // Verificar cupos disponibles antes de intentar la inscripción
        const availableSpots = await fetchAvailableSpots(scheduleId);
        if (availableSpots === null || availableSpots <= 0) {
            showToast('No hay cupos disponibles', 'warning');
            return;
        }

        const response = await fetch('/api/inscriptions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ scheduleId })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Inscripción exitosa', 'success');
            
            // Actualizar el cupo disponible específico
            const newSpots = await fetchAvailableSpots(scheduleId);
            
            // Actualizar la UI con el nuevo valor
            const card = document.querySelector(`[data-schedule-id="${scheduleId}"]`);
            if (card) {
                const spotsElement = card.querySelector('.available-spots small');
                if (spotsElement) {
                    const isAvailable = newSpots > 0; // Ahora isAvailable está definido correctamente
                    spotsElement.innerHTML = `
                        <strong>Cupos disponibles:</strong> 
                        <span class="badge bg-${isAvailable ? 'success' : 'danger'}">
                            ${newSpots}
                        </span>
                    `;
                }

                // Actualizar el botón
                const button = card.querySelector('button');
                if (button) {
                    button.className = `btn w-100 ${newSpots > 0 ? 'btn-danger' : 'btn-secondary'}`;
                    button.disabled = newSpots <= 0;
                    button.textContent = newSpots > 0 ? 'INSCRIBIRSE' : 'AGOTADO';
                }
            }
        } else {
            showToast(data.message || 'Error en la inscripción', 'error');
        }
    } catch (error) {
        console.error('Error en la inscripción:', error);
        showToast('Error al procesar la inscripción', 'error');
    }
}

/**
 * Muestra las inscripciones del usuario
 */
async function showUserInscriptions() {
    try {
        const token = getAuthToken();
        if (!token) {
            showToast('Debe iniciar sesión para ver sus inscripciones', 'warning');
            return;
        }

        let existingModal = document.getElementById('inscriptionsModal');
        if (existingModal) existingModal.remove();
        const existingBackdrop = document.querySelector('.modal-backdrop');
        if (existingBackdrop) existingBackdrop.remove();

        const response = await fetch('/api/inscriptions/user', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.inscriptions || data.inscriptions.length === 0) {
            showNoInscriptionsModal();
            return;
        }

        const sortedInscriptions = [...data.inscriptions].sort((a, b) => {
            return new Date('1970/01/01 ' + (a.event_time || '00:00')) - 
                   new Date('1970/01/01 ' + (b.event_time || '00:00'));
        });

        const modalHTML = createInscriptionsModalHTML(sortedInscriptions);
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modalElement = document.getElementById('inscriptionsModal');
        const modal = new bootstrap.Modal(modalElement);
        
        modalElement.addEventListener('hidden.bs.modal', function () {
            this.remove();
            document.body.classList.remove('modal-open');
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
        });

        modal.show();

    } catch (error) {
        console.error('Error al obtener inscripciones:', error);
        showToast('Error al cargar las inscripciones: ' + error.message, 'error');
    }
}
// Función para obtener todos los cupos disponibles actuales
async function fetchAllAvailableSpots() {
    try {
        const response = await fetch('/api/inscriptions/all-available-spots', {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al obtener cupos disponibles:', error);
        return null;
    }
}
// Función para obtener los cupos disponibles
async function fetchAvailableSpots(scheduleId) {
    try {
        const response = await fetch(`/api/inscriptions/available-spots/${scheduleId}`);
        if (!response.ok) {
            throw new Error('Error al obtener cupos disponibles');
        }
        const data = await response.json();
        return data.availableSpots;
    } catch (error) {
        console.error('Error al obtener cupos:', error);
        return null;
    }
}
/**
 * Cancela una inscripción
 * @param {string} scheduleId - ID del schedule
 */
// Modificar la función cancelInscription
async function cancelInscription(scheduleId) {
    if (!confirm('¿Estás seguro de que deseas cancelar esta inscripción?')) {
        return;
    }

    try {
        const token = getAuthToken();
        const response = await fetch(`/api/inscriptions/${scheduleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al cancelar la inscripción');
        }

        showToast('Inscripción cancelada exitosamente', 'success');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('inscriptionsModal'));
        if (modal) modal.hide();
        
        // Actualizar la vista después de cancelar
        await loadSchedules();
        await showUserInscriptions();
        
    } catch (error) {
        console.error('Error al cancelar la inscripción:', error);
        showToast(error.message || 'Error al cancelar la inscripción', 'error');
    }
}

// #endregion

// #region Filters and Visualization
const filters = {
    searchTerm: ''
};

/**
 * Filtra los schedules según el término de búsqueda
 * @param {Array} schedules - Array de schedules
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Array} Schedules filtrados
 */
function filterSchedules(schedules, searchTerm) {
    if (!searchTerm) return schedules;
    
    return schedules.filter(schedule => 
        schedule.event.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );
}

/**
 * Formatea la hora para mostrar AM/PM
 * @param {string} time - Hora en formato HH:mm
 * @returns {string} Hora formateada
 */
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
}

/**
 * Agrupa los schedules por horario de inicio
 * @param {Array} schedules - Array de schedules
 * @returns {Object} Schedules agrupados por horario
 */
function groupSchedulesByTime(schedules) {
    const sortedSchedules = schedules.sort((a, b) => {
        return new Date('1970/01/01 ' + a.startTime) - new Date('1970/01/01 ' + b.startTime);
    });

    const groupedSchedules = {};
    sortedSchedules.forEach(schedule => {
        const time = schedule.startTime.slice(0, 5); // Obtener HH:mm
        if (!groupedSchedules[time]) {
            groupedSchedules[time] = [];
        }
        groupedSchedules[time].push(schedule);
    });

    return groupedSchedules;
}

/**
 * Crea el encabezado de tiempo con estilo de tarjeta
 * @param {string} time - Hora del grupo
 * @returns {string} HTML del encabezado
 */
function createTimeHeader(time) {
    return `
        <div class="card bg-primary text-white mb-4 w-auto d-inline-block">
            <div class="card-body py-2 px-4">
                <h3 class="card-title mb-0 text-center">
                    <i class="fas fa-clock me-2"></i>${formatTime(time)}
                </h3>
            </div>
        </div>
    `;
}

/**
 * Carga y muestra los schedules filtrados
 */

// Modificar la función loadSchedules
async function loadSchedules() {
    try {
        // Obtener los schedules
        const schedules = await fetchSchedules();
        console.log('Schedules originales:', schedules);

        // Obtener los cupos disponibles para cada schedule
        const schedulesWithSpots = await Promise.all(
            schedules.map(async schedule => {
                const availableSpots = await fetchAvailableSpots(schedule.scheduleId);
                return {
                    ...schedule,
                    availableSpots: availableSpots !== null ? availableSpots : 
                        (schedule.capacity - (schedule.currentInscriptions || 0))
                };
            })
        );

        console.log('Schedules con cupos actualizados:', schedulesWithSpots);
        
        // Filtrar y agrupar los schedules
        const filteredSchedules = filterSchedules(schedulesWithSpots, filters.searchTerm);
        const groupedSchedules = groupSchedulesByTime(filteredSchedules);
        
        // Renderizar los schedules
        const eventsGrid = document.getElementById('eventsGrid');
        eventsGrid.innerHTML = '';

        if (Object.keys(groupedSchedules).length === 0) {
            eventsGrid.innerHTML = `
                <div class="col-12 text-center text-white">
                    <h4>No se encontraron eventos</h4>
                </div>
            `;
            return;
        }

        // Mostrar eventos agrupados por tiempo
        Object.entries(groupedSchedules).forEach(([time, schedules]) => {
            const timeSection = document.createElement('div');
            timeSection.className = 'col-12 mb-5';
            
            timeSection.innerHTML = `
                <div class="mb-4">
                    ${createTimeHeader(time)}
                </div>
                <div class="row g-4">
                    ${schedules.map(schedule => createEventCard(schedule)).join('')}
                </div>
            `;
            
            eventsGrid.appendChild(timeSection);
        });
    } catch (error) {
        console.error('Error al cargar schedules:', error);
        showToast('Error al cargar los eventos', 'error');
    }
}

// Inicializar event listeners para el filtro de búsqueda
function initializeFilterListeners() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    console.log('Inicializando listener de búsqueda'); // Debug

    // Búsqueda en tiempo real con debounce
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            console.log('Valor de búsqueda:', e.target.value); // Debug
            filters.searchTerm = e.target.value.trim();
            loadSchedules();
        }, 300);
    });
}

// Asegurarse de que se inicialicen los listeners cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Cargado - Inicializando filtros'); // Debug
    initializeFilterListeners();
    loadSchedules();
});
// #endregion

// #region Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar toasts
    document.querySelectorAll('.toast').forEach(toastEl => {
        new bootstrap.Toast(toastEl);
    });

    // Verificar autenticación
    checkAuth();

    // Inicializar event listeners
    initializeEventListeners();

    // Cargar datos iniciales
    loadSchedules();
});
// #endregion