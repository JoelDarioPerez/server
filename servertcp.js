const net = require('net');

// Crear un servidor TCP
const server = net.createServer((socket) => {
  console.log('Cliente conectado');

  // Evento 'data': se dispara cuando se reciben datos del cliente
  socket.on('data', (data) => {
    const message = data.toString().trim();
    console.log(`Mensaje recibido: ${message}`);
  });

  // Evento 'close': se dispara cuando el cliente se desconecta
  socket.on('close', () => {
    console.log('Cliente desconectado');
  });

  // Evento 'error': se dispara si hay algún error con el cliente
  socket.on('error', (err) => {
    console.error('Error en el cliente:', err.message);
  });
});

// Manejar errores del servidor
server.on('error', (err) => {
  console.error('Error en el servidor:', err.message);
});

// Escuchar en el puerto 9700
const port = 9700;
server.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});

