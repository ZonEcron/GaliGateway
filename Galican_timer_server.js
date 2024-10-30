// Emulador de servidor de Flow Agility 
//  - Muestra en consola los mensajes recibidos
//  - Envia los mensajes escritos en consola
//  - Si se introduce en consola s simula el arranque o parada del crono


// Simple server
var stdin = process.openStdin();
const { WebSocket } = require('ws');
const wss = new WebSocket.Server({ port: 3000, path: '/timerws' });


//Variables globales
var upDateTime = new Date().getTime();
var inicio = new Date().getTime();
var timer = {
	"time": 0,
	"faults": 0,
	"refusals": 0,
	"elimination": 0,
	"running": false,
	"precission": 1,
	"countdown": 0,
	"uptime": 0,
}


// Mensajes de inicio
console.log("\n\nWebSocket Server running on port localhost:3000\n\nType  s + enter   to emulate timer start/stop")


// envio ciclico del estado del crono 
setInterval(() => {

	const ahora = new Date().getTime();

	if (timer.running) timer.time = ahora - inicio;
	timer.uptime = ahora - upDateTime;

	wss.clients.forEach(client => {
		client.send(JSON.stringify(timer));
	});

}, 500);


// imprimir lo que se recive
wss.on('connection', function connection(ws) {
	console.log('Client connected');
	ws.on('message', function message(data) {

		const parsedData = checkJSON(data);

		if (parsedData) {
			console.log('received: %s', parsedData);
			for (let property in timer) {
				if (parsedData.hasOwnProperty(property)) {
					timer[property] = parsedData[property];
				}
			}

		}


	});
});

// enviar según lo que se escriba en consola
stdin.addListener("data", d => {
	const data = d.toString().replace('\r', '').replace('\n', '');
	if (data === 's') {
		// simular start y stop de crono al introducir 's' en consola
		if (timer.running) {
			timer.running = false;
			timer.time = new Date().getTime() - inicio;
			console.log("Timer stopped. Time:", timer.time);
		} else {
			timer.running = true;
			inicio = new Date().getTime();
			console.log("Timer started");
		}

	} else {
		// si no se ha tecleado una 's', enviar lo que se escribe en consola
		wss.clients.forEach(client => {
			client.send(data);
		});
	}
});

function checkJSON(JSONstring) {
	try {
		const parsedData = JSON.parse(JSONstring);
		return parsedData;
	} catch (error) {
		return null;
	}
}