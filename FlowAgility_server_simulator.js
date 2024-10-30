// Emulador de servidor de Flow Agility 
//  - Muestra en consola los mensajes recibidos
//  - Envia los mensajes escritos en consola si estan en formato de letra + 10 numeros


// Simple server
var stdin = process.openStdin();
const { WebSocket } = require('ws');
const wss = new WebSocket.Server({ port: 5000 });

// Mensajes de inicio
console.clear();
console.log("\nFA Server Simulator running on localhost:5000\n")


// imprimir lo que se recibe
wss.on('connection', function connection(ws, req) {
	const path = req.url;
	console.log('Client connected on path:', path);

	ws.on('message', function message(data) {
		console.log('received on %s: %s', path, data);
	});

});

// enviar según lo que se escriba en consola
stdin.addListener("data", d => {
	const data = d.toString().replace('\r', '').replace('\n', '');
	const formato = /^[a-z]\d{10}$/;

	if (formato.test(data)) {
		console.log('sending: %s', data);
		wss.clients.forEach(client => {
			client.send(data);
		});
	}
	
});
