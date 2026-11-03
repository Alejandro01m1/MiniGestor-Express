// Aquí usamos el framework Express.

const express = require('express'); // herramientas express
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const ARCHIVO_DATOS = path.join(__dirname, 'data', 'tareas.json'); //donde guardamos datos

function crearAplicacion(archivo = ARCHIVO_DATOS) {
  const app = express(); // aplicación usando el framework.

  // Middleware: Express interpreta los datos JSON que envían los formularios.
  app.use(express.json({ limit: '8kb' }));

  // Permite que el mismo servidor entregue la página visual y sus estilos.
  app.use(express.static(path.join(__dirname, 'public')));

  // Los datos se guardan SOLO en el archivo de este proyecto.
  function leerTareas() {
    return JSON.parse(fs.readFileSync(archivo, 'utf8'));
  }

  function guardarTareas(tareas) {
    fs.writeFileSync(archivo, JSON.stringify(tareas, null, 2) + '\n', 'utf8');
  }

  // RUTA GET: el navegador pide la lista y Express la devuelve.
  app.get('/api/tareas', (req, res) => {
    res.json(leerTareas());
  });

  // RUTA POST: el navegador envía una tarea y Express la guarda.
  app.post('/api/tareas', (req, res) => {
    const texto = typeof req.body?.texto === 'string' ? req.body.texto.trim() : '';
    if (!texto || texto.length > 100) {
      return res.status(400).json({ error: 'Escribe una tarea de 1 a 100 caracteres.' });
    }
    const tareas = leerTareas();
    const tarea = { id: randomUUID(), texto, completada: false };
    tareas.unshift(tarea);
    guardarTareas(tareas);
    res.status(201).json(tarea);
  });

  // RUTA PATCH: marca o desmarca una tarea existente.
  app.patch('/api/tareas/:id', (req, res) => {
    if (typeof req.body?.completada !== 'boolean') {
      return res.status(400).json({ error: 'El campo completada debe ser verdadero o falso.' });
    }
    const tareas = leerTareas();
    const tarea = tareas.find((t) => t.id === req.params.id);
    if (!tarea) return res.status(404).json({ error: 'No se encontró esa tarea.' });
    tarea.completada = req.body.completada;
    guardarTareas(tareas);
    res.json(tarea);
  });

  // RUTA DELETE: elimina una tarea de la lista.
  app.delete('/api/tareas/:id', (req, res) => {
    const tareas = leerTareas();
    const restantes = tareas.filter((t) => t.id !== req.params.id);
    if (restantes.length === tareas.length) {
      return res.status(404).json({ error: 'No se encontró esa tarea.' });
    }
    guardarTareas(restantes);
    res.status(204).end();
  });

  // Ruta pequeña para mostrar que el framework está funcionando.
  app.get('/api/estado', (req, res) => {
    res.json({ proyecto: 'MiniGestor', framework: 'Express.js', estado: 'funcionando' });
  });

  // Si alguien escribe una dirección inexistente, damos un error controlado.
  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // Si el navegador envía JSON incorrecto, enviamos un mensaje claro.
  app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400) {
      return res.status(400).json({ error: 'Los datos enviados no tienen un formato correcto.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor.' });
  });
  return app;
}

if (require.main === module) {
  const puerto = Number(process.env.PORT || 3100);
  const host = '127.0.0.1'; // Solo se abre en este computador.
  crearAplicacion().listen(puerto, host, () => {
    console.log('');
    console.log('MiniGestor funcionando con Express');
    console.log(`Abre en tu navegador: http://${host}:${puerto}`);
    console.log('Para detenerlo: Ctrl + C');
    console.log('');
  });
}

module.exports = { crearAplicacion };
