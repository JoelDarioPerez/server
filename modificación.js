const express = require("express");
const https = require("https");
const net = require("net");
const fs = require("fs");
const cors = require("cors");

// Configuración del servidor HTTPS
const options = {
  key: fs.readFileSync("./private.key"),
  cert: fs.readFileSync("./certificate.crt"),
};

const newPackage = (paquete) => {
  let divided = paquete.split(",");

  let fechaHora = divided[6].split("");
  let CMDConfirmed = "V1";

  function time(fechaHora) {
    let hora = "";
    for (let i = 0; i < 6; i++) {
      hora += fechaHora[i];
    }
    return hora;
  }

  let GPSStatus = divided[7];
  let lat = divided[4];

  function convertLatitude(lat) {
    // Convertir la latitud a un número decimal.
    lat = parseFloat(lat);

    // Obtener los grados y minutos.
    let degrees = Math.floor(Math.abs(lat));
    let minutes = (Math.abs(lat) - degrees) * 60;

    // Obtener la dirección (N o S).
    let direction = lat >= 0 ? "N" : "S";

    // Devolver la latitud en el formato "DDMM.MMMM".
    return `${degrees.toString().padStart(2, "0")}${minutes.toFixed(4)}`;
  }

  let long = divided[5];

  function convertLongitude(long) {
    // Convertir la longitud a un número decimal.
    long = parseFloat(long);

    // Obtener los grados y minutos.
    let degrees = Math.floor(Math.abs(long));
    let minutes = (Math.abs(long) - degrees) * 60;

    // Obtener la dirección (E o W).
    let direction = long >= 0 ? "E" : "W";

    // Devolver la longitud en el formato "DDDMM.MMMM".
    return `${degrees.toString().padStart(3, "0")}${minutes.toFixed(4)}`;
  }

  let vel = divided[11];

  function convertKmHToKnots(kmH) {
    // Convertir km/h a nudos.
    let knots = kmH / 1.852;

    // Redondear a 4 decimales.
    let roundedKnots = knots.toFixed(2);

    // Asegurar que la velocidad tenga siempre 3 dígitos.
    return roundedKnots.padStart(3, "0");
  }

  function date(fechaHora) {
    let fecha = "";
    for (let i = 0; i < 6; i++) {
      fecha += fechaHora[i];
    }
    return (
      fecha.slice(4) + fecha.slice(2, 4) + fecha.slice(0, 2)
    ); /* Cambiar formato AAMMDD a DDMMAA */
  }

  let DireccionLat = lat >= 0 ? "N" : "S";
  let DireccionLong = long >= 0 ? "E" : "W";
  let Hora = time(fechaHora);
  let Velocidad = convertKmHToKnots(vel);
  let imei = divided[1];
  let rumbo = divided[10];
  let latitud = convertLatitude(Math.abs(lat)); // Quitamos el signo negativo
  let longitud = convertLongitude(Math.abs(long)); // Quitamos el signo negativo
  let fecha = date(fechaHora);

  let SendPackage = [
    "*HQ",
    imei,
    CMDConfirmed,
    Hora,
    GPSStatus,
    latitud,
    DireccionLat,
    longitud,
    DireccionLong,
    Velocidad,
    ...rumbo, // Spread operator para incluir los elementos del array rumbo
    fecha,
    "FFFFBBFF",
    "722",
    "310",
    "06211",
    "15036#",
  ];

  console.log("editado", SendPackage.join(","));
  return SendPackage.join(",");
};

function enviarMensajeAlServidorTCP(mensaje) {
  const client = net.createConnection({
    host: "hwc9760.gpsog.com", // la dirección del servidor TCP
    port: 9760, // el puerto del servidor TCP
  });

  // Evento 'connect': se dispara cuando se establece la conexión con el servid>
  client.on("connect", () => {
    console.log("Conexión TCP establecida");
    client.write(mensaje); // Enviar el mensaje al servidor TCP
  });

  // Evento 'data': se dispara cuando se reciben datos del servidor TCP
  client.on("data", (data) => {
    console.log("Datos recibidos del servidor TCP:", data.toString());
    client.end(); // Cerrar la conexión después de recibir la respuesta
  });

  // Evento 'end': se dispara cuando se cierra la conexión con el servidor TCP
  client.on("end", () => {
    console.log("Conexión TCP cerrada");
  });

  // Evento 'error': se dispara si hay algún error en la conexión
  client.on("error", (err) => {
    console.error("Error en la conexión TCP:", err.message);
  });
}

const datosRecibidos = [];

// Crear un servidor TCP
const server = net.createServer((socket) => {
  socket.setEncoding("utf8");
  // Evento 'data': se dispara cuando se reciben datos del cliente a través del>
  socket.on("data", (data) => {
    const mensaje = data.toString();
    console.log("Datos recibidos:", mensaje);
    const mensajeModificado = newPackage(mensaje);

    enviarMensajeAlServidorTCP(mensajeModificado);

    // Guardar el mensaje en el array de datosRecibidos
    datosRecibidos.push(mensaje);
  });
  socket.on("end", () => {
    console.log("Cliente desconectado");
  });

  socket.on("close", function (error) {
    console.log("Socket closed!", error);
  });

  socket.on("error", function (error) {
    console.log("error", error);
  });
});

// Crear una instancia de Express.js
const app = express();

// Habilitar el middleware CORS
app.use(cors());

// Ruta GET para obtener los datos
app.get("/data", (req, res) => {
  res.send(datosRecibidos);
});

// Ruta GET para eliminar los datos
app.get("/dataEliminar", (req, res) => {
  datosRecibidos.splice(0, datosRecibidos.length);
  res.send("todo ok");
});

const PORT = 9700;
server.listen(PORT, () => {
  console.log(`Servidor TCP escuchando en el puerto ${PORT}`);
});

const PORTExpress = 3010;

https.createServer(options, app).listen(PORTExpress, () => {
  console.log(
    `Servidor de Express con SSL escuchando en el puerto ${PORTExpress}`
  );
});
