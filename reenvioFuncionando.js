const net = require("net");
const https = require("https");
const fs = require("fs");

// Función para modificar el paquete recibido
const newPackage = (data) => {
  // Aquí va tu lógica para procesar los datos recibidos
  try {
    let divided = data.split(",");
    let fechaHora = divided[6].split("");

    function time(fechaHora) {
      let hora = "";
      for (let i = 6; i < fechaHora.length; i++) {
        hora += fechaHora[i];
      }
      return hora;
    }

    let GPSStatus = divided[7];
    let lat = divided[4];

    const getACCStatusString = (paquete) => {
      let divided = data.split(",");
      let accStatus = divided[17];

      if (accStatus === "0000") {
        return "FFFFBBFF"; // ACC apagado
      } else if (accStatus === "0400") {
        return "FFFF9FFF"; // ACC encendido
      } else {
        return "Estado del ACC desconocido";
      }
    };

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
      long = parseFloat(long);

      // Obtener los grados y minutos.
      let degrees = Math.floor(Math.abs(long));
      let minutes = (Math.abs(long) - degrees) * 60;

      // Obtener la dirección (E o W).
      let direction = long >= 0 ? "E" : "W";

      // Devolver la longitud en el formato "DDDMM.MMMM".
      return `${degrees.toString().padStart(3, "0")}${minutes
        .toFixed(5)
        .padStart(8, "0")}`;
    }

    let vel = divided[10];

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
    let imei = "013226004207938";
    let rumbo = divided[11];
    let latitud = convertLatitude(Math.abs(lat)); // Quitamos el signo negativo
    let longitud = convertLongitude(Math.abs(long)); // Quitamos el signo negativo
    let fecha = date(fechaHora);

    let accStatus = getACCStatusString(data); // Obtener el estado del ACC

    let SendPackage = [
      "*HQ",
      imei,
      "V1",
      Hora,
      GPSStatus,
      latitud,
      DireccionLat,
      longitud,
      DireccionLong,
      Velocidad,
      rumbo,
      fecha,
      accStatus, // Reemplazar "FFFFBBFF" por el estado del ACC
      "722",
      "310",
      "06211",
      "15036#",
    ];

    // Resto del código de la función newPackage...

    // Devolver el paquete modificado en formato string
    return SendPackage.join(",");
  } catch (error) {
    console.error(error);
  }
};

// Función para enviar los datos a través de netcat
function sendViaNetcat(data) {
  const host = "hwc9760.gpsog.com";
  const port = 9760;

  // Creamos el cliente TCP
  const client = net.connect(port, host, () => {
    console.log(`Conectado al servidor: ${host}:${port}`);
    // Enviamos los datos a través del socket del cliente TCP
    client.write(data);
  });

  // Capturamos los datos recibidos del servidor remoto
  client.on("data", (data) => {
    console.log(`Datos recibidos del servidor remoto: ${data}`);
    // Aquí puedes realizar alguna acción con los datos recibidos si lo deseas
  });

  // Capturamos el evento de cierre de la conexión
  client.on("end", () => {
    console.log("Conexión cerrada por el servidor remoto.");
  });

  // Capturamos el evento de error en la conexión
  client.on("error", (err) => {
    console.error(`Error en la conexión al servidor: ${err}`);
  });
}

// Creamos el servidor TCP para recibir los datos del GPS
function gpsTrackerServer(host, port) {
  const server = net.createServer((clientSocket) => {
    console.log(
      `Cliente conectado desde: ${clientSocket.remoteAddress}:${clientSocket.remotePort}`
    );

    clientSocket.on("data", (data) => {
      // Procesamos los datos recibidos y obtenemos la respuesta
      const processedData = newPackage(data.toString());

      console.log(`Datos recibidos: ${data.toString()}`);
      console.log(`Respuesta enviada al cliente: ${processedData}`);

      // Enviamos los datos procesados a través de netcat
      sendViaNetcat(processedData);

      // Ejemplo: procesar los datos recibidos y enviar una respuesta al cliente
      const response = "Datos procesados correctamente";
      clientSocket.write(response);
    });

    clientSocket.on("end", () => {
      console.log("Cliente cerró la conexión.");
    });

    clientSocket.on("error", (err) => {
      console.log(`Error en la conexión del cliente: ${err.message}`);
    });
  });

  server.on("error", (err) => {
    console.log(`Error en el servidor: ${err.message}`);
  });

  server.listen(port, host, () => {
    console.log(`Servidor escuchando en ${host}:${port}`);
  });
}

// Ejecutamos la función del servidor
const host = "0.0.0.0"; // Escucha en todas las interfaces
const port = 9700; // Puerto del servidor TCP
gpsTrackerServer(host, port);
