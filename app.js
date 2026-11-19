// ================== CONFIGURACIÓN ==================
// Pegá acá la URL base de tu proyecto de MockAPI (sin barra final)
// Plan gratis de MockAPI = 2 recursos por proyecto, por eso usamos 2 proyectos:
const API_USERS_CARS = 'https://6afe3bc83a0e70bc8d533390.mockapi.io'; // users y cars
const API_RENTALS = 'https://6afe3e2c3a0e70bc8d5334b5.mockapi.io';    // rentals
const baseDe = (recurso) => (recurso.startsWith('rentals') ? API_RENTALS : API_USERS_CARS);

const ESTADOS_AUTO = ['Disponible', 'Alquilado', 'En reparación'];
const ESTADOS_RESERVA = ['Activa', 'Finalizada', 'Cancelada'];

// ================== API (fetch + async/await) ==================
const pedir = async (recurso, metodo = 'GET', datos) => {
  const res = await fetch(`${baseDe(recurso)}/${recurso}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: datos ? JSON.stringify(datos) : undefined,
  });
  if (res.status === 404 && metodo === 'GET') return []; 
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
};
const api = {
  listar: (r) => pedir(r),
  crear: (r, d) => pedir(r, 'POST', d),
  editar: (r, id, d) => pedir(`${r}/${id}`, 'PUT', d),
  borrar: (r, id) => pedir(`${r}/${id}`, 'DELETE'),
};

// ================== UTILIDADES ==================
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoy = () => {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
};
const money = (n) => '$' + Number(n).toLocaleString('es-AR');
const opciones = (lista, sel) => lista.map((o) => `<option ${o === sel ? 'selected' : ''}>${o}</option>`).join('');

const aviso = (msg, tipo = 'success') => {
  const d = document.createElement('div');
  d.className = `alert alert-${tipo} shadow`;
  d.textContent = msg;
  $('#alertas').appendChild(d);
  setTimeout(() => d.remove(), 3500);
};

// ================== SESIÓN Y ROLES ==================
const getSesion = () => JSON.parse(localStorage.getItem('sesion') || 'null');
const setSesion = (u) => localStorage.setItem('sesion', JSON.stringify({ id: u.id, nombre: u.nombre, email: u.email, role: u.role }));
const cerrarSesion = () => { localStorage.removeItem('sesion'); irA('login'); };

// Cada ruta define qué roles pueden verla (null = sin sesión)
const RUTAS = {
  login:          { roles: [null],                 vista: vistaLogin },
  registro:       { roles: [null],                 vista: vistaRegistro },
  catalogo:       { roles: ['USUARIO'],            vista: vistaCatalogo },
  misreservas:    { roles: ['USUARIO'],            vista: vistaMisReservas },
  adminautos:     { roles: ['ADMIN'],              vista: vistaAdminAutos },
  adminreservas:  { roles: ['ADMIN'],              vista: vistaAdminReservas },
  adminusuarios:  { roles: ['ADMIN'],              vista: vistaAdminUsuarios },
  dashboard:      { roles: ['ADMIN'],              vista: vistaDashboard },
};
const MENUS = {
  null:    [['login', 'Ingresar'], ['registro', 'Registrarse']],
  USUARIO: [['catalogo', 'Catálogo'], ['misreservas', 'Mis reservas']],
  ADMIN:   [['dashboard', 'Dashboard'], ['adminautos', 'Autos'], ['adminreservas', 'Reservas'], ['adminusuarios', 'Usuarios']],
};
const inicioDe = (rol) => ({ null: 'login', USUARIO: 'catalogo', ADMIN: 'dashboard' }[rol]);

function irA(ruta) { location.hash = ruta; }

function renderMenu() {
  const s = getSesion();
  const rol = s ? s.role : null;
  $('#nav').innerHTML = MENUS[rol].map(([r, t]) => `<li class="nav-item"><a class="nav-link" href="#${r}">${t}</a></li>`).join('')
    + (s ? `<li class="nav-item"><span class="navbar-text mx-2">${esc(s.nombre)} (${s.role})</span></li>
            <li class="nav-item"><button class="btn btn-outline-light btn-sm" id="btnSalir">Cerrar sesión</button></li>` : '');
  $('#btnSalir')?.addEventListener('click', cerrarSesion);
}

// Router con protección de rutas por rol
async function router() {
  const s = getSesion();
  const rol = s ? s.role : null;
  let ruta = location.hash.slice(1) || inicioDe(rol);
  if (!RUTAS[ruta] || !RUTAS[ruta].roles.includes(rol)) { ruta = inicioDe(rol); location.hash = ruta; }
  renderMenu();
  $('#app').innerHTML = '<div class="text-center my-5"><div class="spinner-border"></div></div>';
  try { await RUTAS[ruta].vista(); } catch (e) { $('#app').innerHTML = `<div class="alert alert-danger">No se pudo conectar con la API. Revisá la URL en app.js. (${esc(e.message)})</div>`; }
}
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

// ================== LOGIN / REGISTRO ==================
async function vistaLogin() {
  $('#app').innerHTML = `
    <div class="card auth-box"><div class="card-body">
      <img src="img/logo.png" alt="Logo AutoRent" class="d-block mx-auto mb-3" height="60">
      <h4 class="mb-3">Iniciar sesión</h4>
      <input id="lEmail" type="email" class="form-control mb-2" placeholder="Email">
      <input id="lPass" type="password" class="form-control mb-3" placeholder="Contraseña">
      <button id="lBtn" class="btn btn-primary w-100">Ingresar</button>
      <p class="mt-3 mb-0 text-center">¿No tenés cuenta? <a href="#registro">Registrate</a></p>
    </div></div>`;
  $('#lBtn').addEventListener('click', async () => {
    const email = $('#lEmail').value.trim().toLowerCase();
    const pass = $('#lPass').value;
    if (!email || !pass) return aviso('Completá email y contraseña', 'warning');
   try {
    const users = await api.listar('users');
    const u = users.find((x) => x.email.toLowerCase() === email && x.password === pass);

    if (!u) return aviso('Email o contraseña incorrectos', 'danger');

    setSesion(u);
    irA(inicioDe(u.role));
    router();
}   catch (error) {
    aviso('No se pudo iniciar sesión. Revisá la conexión.', 'danger');
}
  });
}

async function vistaRegistro() {
  $('#app').innerHTML = `
    <div class="card auth-box"><div class="card-body">
      <img src="img/logo.png" alt="Logo AutoRent" class="d-block mx-auto mb-3" height="60">
      <h4 class="mb-3">Crear cuenta</h4>
      <input id="rNombre" class="form-control mb-2" placeholder="Nombre">
      <input id="rEmail" type="email" class="form-control mb-2" placeholder="Email">
      <input id="rPass" type="password" class="form-control mb-3" placeholder="Contraseña (mín. 4 caracteres)">
      <button id="rBtn" class="btn btn-success w-100">Registrarme</button>
      <p class="mt-3 mb-0 text-center">¿Ya tenés cuenta? <a href="#login">Ingresá</a></p>
    </div></div>`;

  $('#rBtn').addEventListener('click', async () => {
    const nombre = $('#rNombre').value.trim();
    const email = $('#rEmail').value.trim().toLowerCase();
    const password = $('#rPass').value;

    if (!nombre || !/^\S+@\S+\.\S+$/.test(email) || password.length < 4) {
      return aviso('Revisá los datos ingresados', 'warning');
    }

    try {
      const users = await api.listar('users');

      if (users.some((u) => u.email.toLowerCase() === email)) {
        return aviso('Ese email ya está registrado', 'danger');
      }

      await api.crear('users', { nombre, email, password, role: 'USUARIO' });

      aviso('Cuenta creada. Ya podés ingresar');
      irA('login');
    } catch (error) {
      aviso('No se pudo crear la cuenta. Revisá la conexión.', 'danger');
    }
  });
}
  
// ================== USUARIO: CATÁLOGO Y RESERVAS ==================
async function vistaCatalogo() {
  const autos = await api.listar('cars');
  $('#app').innerHTML = `
    <h3>Flota disponible</h3>
    <input id="busqueda" class="form-control my-3" placeholder="Buscar por marca o modelo...">
    <div id="grilla" class="grid-autos"></div>`;
  const pintar = (lista) => {
    $('#grilla').innerHTML = lista.length ? lista.map((a) => {
      const ok = a.disponible === 'Disponible';
      const foto = a.imagen ? `<img src="${esc(a.imagen)}" alt="${esc(a.marca)} ${esc(a.modelo)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'icono',textContent:'🚘'}))">` : '<div class="icono">🚘</div>';
      return `<div class="card card-auto">${foto}<div class="card-body">
        <h5 class="card-title">${esc(a.marca)} ${esc(a.modelo)}</h5>
        <p class="mb-1">${money(a.precioDia)} <small class="text-muted">/ día</small></p>
        <span class="badge ${ok ? 'bg-success' : 'bg-secondary'} mb-2">${esc(a.disponible)}</span>
        <button class="btn btn-primary w-100" data-id="${a.id}" ${ok ? '' : 'disabled'}>Reservar</button>
      </div></div>`;
    }).join('') : '<p class="text-muted">No se encontraron vehículos.</p>';
  };
  pintar(autos);
  $('#busqueda').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    pintar(autos.filter((a) => `${a.marca} ${a.modelo}`.toLowerCase().includes(q)));
  });
  $('#grilla').addEventListener('click', (e) => {
    const id = e.target.dataset.id;
    if (id) abrirReserva(autos.find((a) => a.id === id));
  });
}

function abrirReserva(auto) {
  const modal = bootstrap.Modal.getOrCreateInstance($('#modalReserva'));
  $('#mrTitulo').textContent = `Reservar ${auto.marca} ${auto.modelo}`;
  $('#mrInicio').value = ''; $('#mrFin').value = '';
  $('#mrInicio').min = hoy(); $('#mrFin').min = hoy();
  $('#mrTotal').textContent = 'Elegí las fechas para ver el total.';

  const calcular = () => {
    const i = $('#mrInicio').value, f = $('#mrFin').value;
    if (!i || !f) return null;
    if (i < hoy()) { $('#mrTotal').textContent = 'La fecha de inicio no puede ser pasada.'; return null; }
    if (f <= i) { $('#mrTotal').textContent = 'La fecha de fin debe ser posterior al inicio.'; return null; }
    const dias = Math.round((new Date(f) - new Date(i)) / 86400000);
    const total = dias * auto.precioDia;
    $('#mrTotal').textContent = `${dias} día(s) × ${money(auto.precioDia)} = ${money(total)}`;
    return { dias, total, i, f };
  };
  $('#mrInicio').onchange = calcular;
  $('#mrFin').onchange = calcular;

  $('#mrConfirmar').onclick = async () => {
    const c = calcular();
    if (!c) return aviso('Revisá las fechas', 'warning');
    // Validar disponibilidad: auto actual + choque de fechas con reservas activas
   const autoActual = await pedir(`cars/${auto.id}`);
    if (autoActual.disponible === 'En reparación') return aviso('El vehículo está en reparación', 'danger');
    const reservas = await api.listar('rentals');
    const choca = reservas.some((r) => r.carId === auto.id && r.estado === 'Activa' && c.i < r.fechaFin && r.fechaInicio < c.f);
    if (choca) return aviso('El auto ya está reservado en ese período', 'danger');
    await api.crear('rentals', { userId: getSesion().id, carId: auto.id, fechaInicio: c.i, fechaFin: c.f, total: c.total, estado: 'Activa' });
    modal.hide();
    aviso('¡Reserva confirmada!');
    irA('misreservas');
  };
  modal.show();
}

async function vistaMisReservas() {
  const [rentals, cars] = await Promise.all([api.listar('rentals'), api.listar('cars')]);
  const mias = rentals.filter((r) => r.userId === getSesion().id);
  $('#app').innerHTML = `<h3>Mis reservas</h3>` + (mias.length ? `<div class="tabla-scroll"><table class="table table-striped bg-white">
    <thead><tr><th>Auto</th><th>Desde</th><th>Hasta</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>
    ${mias.map((r) => {
      const c = cars.find((x) => x.id === r.carId);
      return `<tr><td>${c ? esc(c.marca + ' ' + c.modelo) : '(eliminado)'}</td><td>${esc(r.fechaInicio)}</td><td>${esc(r.fechaFin)}</td><td>${money(r.total)}</td><td>${esc(r.estado)}</td>
        <td>${r.estado === 'Activa' ? `<button class="btn btn-sm btn-outline-danger" data-cancel="${r.id}">Cancelar</button>` : ''}</td></tr>`;
    }).join('')}</tbody></table></div>` : '<p class="text-muted">Todavía no hiciste reservas.</p>');
  $('#app').addEventListener('click', async (e) => {
  const id = e.target.dataset.cancel;

  if (!id || !confirm('¿Cancelar la reserva?')) return;

  try {
    const r = mias.find((x) => x.id === id);
    await api.editar('rentals', id, { ...r, estado: 'Cancelada' });

    aviso('Reserva cancelada');
    router();
  } catch (error) {
    aviso('No se pudo cancelar la reserva', 'danger');
  }
}, { once: true });
}

// ================== ADMIN: AUTOS ==================
async function vistaAdminAutos() {
  const autos = await api.listar('cars');
  $('#app').innerHTML = `
    <h3>Gestión de vehículos</h3>
    <div class="card mb-3"><div class="card-body"><form id="fAuto" class="row g-2">
      <input type="hidden" id="aId">
      <div class="col-sm-3"><input id="aMarca" class="form-control" placeholder="Marca" required></div>
      <div class="col-sm-3"><input id="aModelo" class="form-control" placeholder="Modelo" required></div>
      <div class="col-sm-2"><input id="aPrecio" type="number" min="1" class="form-control" placeholder="Precio/día" required></div>
      <div class="col-sm-2"><select id="aEstado" class="form-select">${opciones(ESTADOS_AUTO)}</select></div>
      <div class="col-sm-2 d-grid"><button class="btn btn-primary" id="aBtn">Agregar</button></div>
      <div class="col-12"><input id="aImagen" class="form-control" placeholder="URL de la imagen (.jpg)"></div>
    </form></div></div>
    <div class="tabla-scroll"><table class="table table-striped bg-white"><thead><tr><th>Marca</th><th>Modelo</th><th>Precio/día</th><th>Estado</th><th></th></tr></thead><tbody>
    ${autos.map((a) => `<tr><td>${esc(a.marca)}</td><td>${esc(a.modelo)}</td><td>${money(a.precioDia)}</td>
      <td><select class="form-select form-select-sm" data-estado="${a.id}">${opciones(ESTADOS_AUTO, a.disponible)}</select></td>
      <td class="text-nowrap"><button class="btn btn-sm btn-outline-primary" data-edit="${a.id}">Editar</button>
      <button class="btn btn-sm btn-outline-danger" data-del="${a.id}">Eliminar</button></td></tr>`).join('')}
    </tbody></table></div>`;

    $('#fAuto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = { marca: $('#aMarca').value.trim(), modelo: $('#aModelo').value.trim(), precioDia: Number($('#aPrecio').value), disponible: $('#aEstado').value, imagen: $('#aImagen').value.trim() };
    if (!datos.marca || !datos.modelo || datos.precioDia <= 0) return aviso('Datos inválidos', 'warning');
    const id = $('#aId').value;
    try {
      id ? await api.editar('cars', id, datos) : await api.crear('cars', datos);
      aviso(id ? 'Vehículo actualizado' : 'Vehículo agregado');
      router();
    } catch (error) {
      aviso('No se pudo guardar el vehículo', 'danger');
    }
  });
  $('#app').querySelector('tbody').addEventListener('change', async (e) => {
    const id = e.target.dataset.estado;
    if (!id) return;
    const a = autos.find((x) => x.id === id);
    await api.editar('cars', id, { ...a, disponible: e.target.value });
    aviso('Estado actualizado');
  });
  $('#app').querySelector('tbody').addEventListener('click', async (e) => {
    const { edit, del } = e.target.dataset;
    if (edit) {
      const a = autos.find((x) => x.id === edit);
      $('#aId').value = a.id; $('#aMarca').value = a.marca; $('#aModelo').value = a.modelo;
      $('#aPrecio').value = a.precioDia; $('#aEstado').value = a.disponible;
      $('#aImagen').value = a.imagen || '';
      $('#aBtn').textContent = 'Guardar'; window.scrollTo(0, 0);
    }
    if (del && confirm('¿Eliminar este vehículo?')) { await api.borrar('cars', del); aviso('Vehículo eliminado'); router(); }
  });
}

// ================== ADMIN: RESERVAS ==================
async function vistaAdminReservas() {
  const [rentals, cars, users] = await Promise.all([api.listar('rentals'), api.listar('cars'), api.listar('users')]);
  $('#app').innerHTML = `<h3>Reservas</h3><div class="tabla-scroll"><table class="table table-striped bg-white">
    <thead><tr><th>Cliente</th><th>Auto</th><th>Desde</th><th>Hasta</th><th>Total</th><th>Estado</th></tr></thead><tbody>
    ${rentals.map((r) => {
      const u = users.find((x) => x.id === r.userId), c = cars.find((x) => x.id === r.carId);
      return `<tr><td>${u ? esc(u.nombre) : '(eliminado)'}</td><td>${c ? esc(c.marca + ' ' + c.modelo) : '(eliminado)'}</td>
        <td>${esc(r.fechaInicio)}</td><td>${esc(r.fechaFin)}</td><td>${money(r.total)}</td>
        <td><select class="form-select form-select-sm" data-r="${r.id}">${opciones(ESTADOS_RESERVA, r.estado)}</select></td></tr>`;
    }).join('')}</tbody></table></div>`;
  $('#app').querySelector('tbody').addEventListener('change', async (e) => {
    const id = e.target.dataset.r;
    if (!id) return;
    await api.editar('rentals', id, { ...rentals.find((x) => x.id === id), estado: e.target.value });
    aviso('Reserva actualizada');
  });
}

// ================== ADMIN: USUARIOS ==================
async function vistaAdminUsuarios() {
  const users = await api.listar('users');
  $('#app').innerHTML = `
    <h3>Usuarios</h3>
    <div class="card mb-3"><div class="card-body"><form id="fUser" class="row g-2">
      <div class="col-sm-3"><input id="uNombre" class="form-control" placeholder="Nombre" required></div>
      <div class="col-sm-3"><input id="uEmail" type="email" class="form-control" placeholder="Email" required></div>
      <div class="col-sm-2"><input id="uPass" type="password" class="form-control" placeholder="Contraseña" required minlength="4"></div>
      <div class="col-sm-2"><select id="uRol" class="form-select"><option>USUARIO</option><option>ADMIN</option></select></div>
      <div class="col-sm-2 d-grid"><button class="btn btn-primary">Crear</button></div>
    </form></div></div>
    <div class="tabla-scroll"><table class="table table-striped bg-white"><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th></th></tr></thead><tbody>
    ${users.map((u) => `<tr><td>${esc(u.nombre)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td>
      <td><button class="btn btn-sm btn-outline-secondary" data-pass="${u.id}">Cambiar contraseña</button></td></tr>`).join('')}
    </tbody></table></div>`;
  $('#fUser').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#uEmail').value.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === email)) return aviso('Ese email ya existe', 'danger');
    await api.crear('users', { nombre: $('#uNombre').value.trim(), email, password: $('#uPass').value, role: $('#uRol').value });
    aviso('Usuario creado'); router();
  });
  $('#app').querySelector('tbody').addEventListener('click', async (e) => {
    const id = e.target.dataset.pass;
    if (!id) return;
    const nueva = prompt('Nueva contraseña (mín. 4 caracteres):');
    if (!nueva || nueva.length < 4) return aviso('Contraseña inválida', 'warning');
    await api.editar('users', id, { ...users.find((x) => x.id === id), password: nueva });
    aviso('Contraseña actualizada');
  });
}

// ================== ADMIN: DASHBOARD ==================
let graficos = [];
async function vistaDashboard() {
  const [rentals, cars] = await Promise.all([api.listar('rentals'), api.listar('cars')]);
  const ingresos = rentals.filter((r) => r.estado !== 'Cancelada').reduce((s, r) => s + Number(r.total), 0);
  $('#app').innerHTML = `
    <h3>Dashboard</h3>
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3"><div class="card text-center p-3"><h4>${cars.length}</h4>Vehículos</div></div>
      <div class="col-6 col-md-3"><div class="card text-center p-3"><h4>${rentals.length}</h4>Reservas</div></div>
      <div class="col-6 col-md-3"><div class="card text-center p-3"><h4>${rentals.filter((r) => r.estado === 'Activa').length}</h4>Activas</div></div>
      <div class="col-6 col-md-3"><div class="card text-center p-3"><h4>${money(ingresos)}</h4>Ingresos</div></div>
    </div>
    <div class="row g-4">
      <div class="col-md-6"><div class="card p-3"><h6 class="text-center">Alquileres por estado</h6><div class="chart-box"><canvas id="gRentals"></canvas></div></div></div>
      <div class="col-md-6"><div class="card p-3"><h6 class="text-center">Flota por estado</h6><div class="chart-box"><canvas id="gCars"></canvas></div></div></div>
    </div>`;
  graficos.forEach((g) => g.destroy());
  const contar = (lista, campo, estados) => estados.map((e) => lista.filter((x) => x[campo] === e).length);
  graficos = [
    new Chart($('#gRentals'), { type: 'doughnut', data: { labels: ESTADOS_RESERVA, datasets: [{ data: contar(rentals, 'estado', ESTADOS_RESERVA), backgroundColor: ['#0d6efd', '#198754', '#dc3545'] }] } }),
    new Chart($('#gCars'), { type: 'bar', data: { labels: ESTADOS_AUTO, datasets: [{ label: 'Vehículos', data: contar(cars, 'disponible', ESTADOS_AUTO), backgroundColor: ['#198754', '#ffc107', '#dc3545'] }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } }),
  ];
}