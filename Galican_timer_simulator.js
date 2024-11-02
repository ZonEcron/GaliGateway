// Emulador de servidor de crono Galican
//  - Muestra en consola los mensajes recibidos
//  - Si se introduce en consola s simula el arranque o parada del crono


// Simple server
var stdin = process.openStdin();
const { WebSocket } = require('ws');
const wss = new WebSocket.Server({ port: 3000, path: '/timerws' });


//Variables globales
var upDateTime = Date.now();
var inicio = Date.now();
var timer = {
	time: 0,
	faults: 0,
	refusals: 0,
	elimination: 0,
	running: false,
	countdown: false,
	coursewalk: false,
	precission: 0,
	uptime: 0,
}


// Mensajes de inicio
console.clear();
console.log("\nGalican Timer Simulator running on localhost:3000\n\nType  s + enter   to emulate timer start/stop\n")


// envio ciclico del estado del crono cada 500 ms.
setInterval(() => {

	const ahora = new Date().getTime();

	if (timer.coursewalk) {
		if (ahora > inicio) {
			timer.time = 0;
			timer.faults = 0;
			timer.refusals = 0;
			timer.elimination = 0;
			timer.running = false;
			timer.countdown = 0;
			timer.coursewalk = false;
		} else {
			timer.time = inicio - ahora;
		}
	} else if ( timer.countdown) {
		timer.time = ahora - inicio;
		if (ahora > inicio) {
			timer.running = true;
			timer.countdown = 0;
			timer.coursewalk = false;
		}
	} else if (timer.running) {
		timer.time = ahora - inicio;
	}

	timer.uptime = ahora - upDateTime;

	wss.clients.forEach(client => {
		client.send(JSON.stringify(timer));
	});

}, 500);


// imprimir lo que se recibe si es json valido
wss.on('connection', function connection(ws) {
	console.log('Client connected\n');

	ws.on('message', function message(data) {
		const parsedData = checkJSON(data);

		if (parsedData) {
			console.log('received:', JSON.stringify(parsedData, null, 2), '\n');

			if (parsedData.hasOwnProperty("reset")) {
				timer.time = 0;
				timer.faults = 0;
				timer.refusals = 0;
				timer.elimination = 0;
				timer.running = false;
				timer.countdown = 0;
				timer.coursewalk = false;

			} else if (parsedData.hasOwnProperty("coursewalk")) {
				if (!timer.coursewalk) {
					inicio = Date.now() + 420000;
					timer.time = 0;
					timer.faults = 0;
					timer.refusals = 0;
					timer.elimination = 0;
					timer.running = false;
					timer.countdown = 0;
					timer.coursewalk = true;
				}

			} else if (parsedData.hasOwnProperty("countdown")) {
				if (!timer.countdown) {
					inicio = Date.now() + 15000;
					timer.time = -15000;
					timer.faults = 0;
					timer.refusals = 0;
					timer.elimination = 0;
					timer.running = true;
					timer.countdown = 1;
					timer.coursewalk = false;
				}

			} else {
				for (let property in timer) {
					if (parsedData.hasOwnProperty(property)) {
						timer[property] = parsedData[property];
					}
				}
			}
		}

	});
});

// start stop del crono tecleando s en consola
stdin.addListener("data", d => {
	const data = d.toString().replace('\r', '').replace('\n', '');
	if (data === 's') {
		// simular start y stop de crono al introducir 's' en consola
		if (timer.running) {
			timer.running = false;
			timer.time = Date.now() - inicio;
			console.log("Timer stopped. Time:", timer.time);
		} else {
			timer.running = true;
			inicio = Date.now();
			timer.faults = 0;
			timer.refusals = 0;
			timer.elimination = 0;
			console.log("Timer started");
		}
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