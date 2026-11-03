// este archivo recoge lo que se hace en la pantalla.
// No guarda datos directamente, le pide ayuda a Express (server.js).
let tareas = [];
let filtro = 'todas';

const lista = document.querySelector('#lista-tareas');
const formulario = document.querySelector('#form-tarea');
const entrada = document.querySelector('#texto-tarea');
const mensaje = document.querySelector('#mensaje');

function mostrarAccion(nombre, ruta) {
  document.querySelector('#ultima-accion').textContent = nombre;
  document.querySelector('#ultima-ruta').textContent = ruta;
}

async function solicitar(ruta, opciones = {}) {
  const respuesta = await fetch(ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...(opciones.headers || {}) },
  });
  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => ({}));
    throw new Error(datos.error || 'No fue posible comunicarse con Express.');
  }
  return respuesta.status === 204 ? null : respuesta.json();
}

function renderizar() {
  const pendientes = tareas.filter((t) => !t.completada).length;
  const completadas = tareas.length - pendientes;
  document.querySelector('#contador').textContent = `${pendientes} pendiente${pendientes === 1 ? '' : 's'}`;
  document.querySelector('#completadas').textContent = completadas;
  document.querySelector('#total').textContent = `${tareas.length} tarea${tareas.length === 1 ? '' : 's'} en total`;

  const visibles = tareas.filter((t) => filtro === 'todas' || (filtro === 'completadas' ? t.completada : !t.completada));
  lista.replaceChildren();
  if (!visibles.length) {
    const vacio = document.createElement('div');
    vacio.className = 'empty';
    vacio.innerHTML = '<span class="empty-icon" aria-hidden="true">✳</span>No hay tareas en esta sección. ¡Puedes agregar una!';
    lista.append(vacio);
    return;
  }

  visibles.forEach((tarea) => {
    const fila = document.createElement('div');
    fila.className = 'task-item';
    const marcar = document.createElement('button');
    marcar.type = 'button';
    marcar.className = `tick ${tarea.completada ? 'done' : ''}`;
    marcar.textContent = tarea.completada ? '✓' : '';
    marcar.setAttribute('aria-label', tarea.completada ? `Marcar pendiente: ${tarea.texto}` : `Completar: ${tarea.texto}`);
    marcar.addEventListener('click', () => cambiarEstado(tarea));
    const texto = document.createElement('span');
    texto.className = `task-text ${tarea.completada ? 'done' : ''}`;
    texto.textContent = tarea.texto;
    const borrar = document.createElement('button');
    borrar.type = 'button';
    borrar.className = 'remove';
    borrar.textContent = '×';
    borrar.setAttribute('aria-label', `Eliminar: ${tarea.texto}`);
    borrar.title = 'Eliminar tarea';
    borrar.addEventListener('click', () => eliminarTarea(tarea));
    fila.append(marcar, texto, borrar);
    lista.append(fila);
  });
}

async function cargarTareas() {
  try {
    tareas = await solicitar('/api/tareas');
    mostrarAccion('Express envió la lista de tareas', 'GET /api/tareas · leer información');
    renderizar();
  } catch (error) {
    lista.textContent = 'No se pudo conectar con el servidor. ¿Sigue abierto npm start?';
    mensaje.textContent = error.message;
  }
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const texto = entrada.value.trim();
  if (!texto) return;
  const boton = formulario.querySelector('button');
  boton.disabled = true;
  mensaje.textContent = '';
  try {
    const nueva = await solicitar('/api/tareas', { method: 'POST', body: JSON.stringify({ texto }) });
    tareas.unshift(nueva);
    entrada.value = '';
    mostrarAccion(`Express guardó: “${nueva.texto}”`, 'POST /api/tareas · crear información');
    renderizar();
    entrada.focus();
  } catch (error) { mensaje.textContent = error.message; }
  finally { boton.disabled = false; }
});

async function cambiarEstado(tarea) {
  mensaje.textContent = '';
  try {
    const actualizada = await solicitar(`/api/tareas/${encodeURIComponent(tarea.id)}`, {
      method: 'PATCH', body: JSON.stringify({ completada: !tarea.completada }),
    });
    tareas = tareas.map((t) => t.id === actualizada.id ? actualizada : t);
    mostrarAccion(`Express ${actualizada.completada ? 'completó' : 'reactivó'} la tarea`, 'PATCH /api/tareas/:id · actualizar información');
    renderizar();
  } catch (error) { mensaje.textContent = error.message; }
}

async function eliminarTarea(tarea) {
  mensaje.textContent = '';
  try {
    await solicitar(`/api/tareas/${encodeURIComponent(tarea.id)}`, { method: 'DELETE' });
    tareas = tareas.filter((t) => t.id !== tarea.id);
    mostrarAccion(`Express eliminó: “${tarea.texto}”`, 'DELETE /api/tareas/:id · borrar información');
    renderizar();
  } catch (error) { mensaje.textContent = error.message; }
}

document.querySelectorAll('.filter').forEach((boton) => {
  boton.addEventListener('click', () => {
    filtro = boton.dataset.filter;
    document.querySelectorAll('.filter').forEach((b) => {
      b.classList.toggle('active', b === boton);
      b.setAttribute('aria-pressed', String(b === boton));
    });
    renderizar(); // Este filtro es visual: NO consulta al servidor.
  });
});

cargarTareas();
