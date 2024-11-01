
const timerWStype = document.getElementById("timerWStype");
const timerIP = document.getElementById("timerIP");
const timerStatus = document.getElementById("timerStatus");
const timerButton = document.getElementById("timerButton");
let timerConn = { readyState: WebSocket.CLOSED };
let timerReconnTimeout;
let timerReconnTimeoutActive = false;
let timerReconnCountD;
let timerReconnTimeLeft = 5;

const serverWStype = document.getElementById("serverWStype");
const serverIP = document.getElementById("serverIP");
const serverStatus = document.getElementById("serverStatus");
const serverButton = document.getElementById("serverButton");
let serverConn = { readyState: WebSocket.CLOSED };
let serverPingInterval;
const serverPingDelay = 25000;
let serverReconnTimeout;
let serverReconnTimeoutActive = false;
let serverReconnCountD;
let serverReconnTimeLeft = 5;

let timer = {
    time: 0,
    faults: 0,
    refusals: 0,
    elimination: 0,
    running: false,
    countdown: 0,
    coursewalk: false,
};

const mac = readLocal("randomMac") || saveLocal("randomMac", randomMac(12));
const macForFA = document.getElementById("macForFA");
macForFA.innerHTML = mac;

function connTimer() {
    if (timerConn.readyState !== WebSocket.CLOSED || timerReconnTimeoutActive) {

        timerConn.close();

        // timerSelector.disabled = false;
        timerIP.disabled = false;

        clearTimeout(timerReconnTimeout);
        clearInterval(timerReconnCountD);

        timerReconnTimeoutActive = false;

        timerStatus.innerHTML = "Timer Disconnected";
        timerStatus.style.color = "red";
        timerButton.innerHTML = "Connect";

    } else {
        websocTimer();
    }
}
function reconnTimer() {
    timerReconnTimeLeft--;
    timerStatus.innerHTML = `Retrying in ${timerReconnTimeLeft}s.`;
    timerStatus.style.color = "orange";
    timerButton.innerHTML = "Cancel";
}
function websocTimer() {

    if (timerConn instanceof WebSocket) timerConn.close();
    timerConn = new WebSocket(timerWStype.value + timerIP.value + '/timerws');

    // timerSelector.disabled = true;
    timerIP.disabled = true;

    clearInterval(timerReconnCountD);
    clearTimeout(timerReconnTimeout);

    timerStatus.innerHTML = "Trying";
    timerStatus.style.color = "orange";
    timerButton.innerHTML = "Cancel";

    timerConn.onopen = () => {
        clearInterval(timerReconnCountD);
        console.log("Timer Connected");
        timerStatus.innerHTML = "Timer Connected";
        timerStatus.style.color = "green";
        timerButton.innerHTML = "Disconnect";
    }

    timerConn.onmessage = (message) => {

        const parsedData = checkJSON(message.data);

        if (parsedData) {

            let sendToFlowAgility = false;

            if ('running' in parsedData && 'time' in parsedData) {
                if (parsedData.running != timer.running || !parsedData.running && (parsedData.time != timer.time)) {
                    sendToFlowAgility = true;
                    console.log('From Timer:', message.data);
                }
            }

            for (let property in timer) {
                if (parsedData.hasOwnProperty(property)) {
                    timer[property] = parsedData[property];
                }
            }

            if (sendToFlowAgility && (serverConn.readyState === WebSocket.OPEN)) {
                const telegrama = statusToFA();
                serverConn.send(telegrama);
                console.log('To FA: ', telegrama);
            }
        }
    }

    timerConn.onerror = () => {

        clearInterval(timerReconnCountD);

        timerStatus.innerHTML = "Retrying in 5s.";
        timerStatus.style.color = "orange";
        timerButton.innerHTML = "Cancel";

        timerReconnCountD = setInterval(reconnTimer, 1000);
        timerReconnTimeout = setTimeout(websocTimer, 5000);

        timerReconnTimeLeft = 5;
        timerReconnTimeoutActive = true;

    }

    timerConn.onclose = () => {
        console.log("Timer Disconnected");
    }
}


function connServer() {
    if (serverConn.readyState !== WebSocket.CLOSED || serverReconnTimeoutActive) {

        serverConn.close();

        serverIP.disabled = false;

        clearTimeout(serverReconnTimeout);
        clearInterval(serverReconnCountD);

        serverReconnTimeoutActive = false;

        serverStatus.innerHTML = "Server Disconnected";
        serverStatus.style.color = "red";
        serverButton.innerHTML = "Connect";

        clearInterval(serverPingInterval);

    } else {
        websocServer();
    }
}
function reconnServer() {
    serverReconnTimeLeft--;
    serverStatus.innerHTML = `Retrying in ${serverReconnTimeLeft}s.`;
    serverStatus.style.color = "orange";
    serverButton.innerHTML = "Cancel";
}
function websocServer() {

    if (serverConn instanceof WebSocket) serverConn.close();
    serverConn = new WebSocket(serverWStype.value + serverIP.value);

    serverIP.disabled = true;

    clearInterval(serverReconnCountD);
    clearTimeout(serverReconnTimeout);

    serverStatus.innerHTML = "Trying";
    serverStatus.style.color = "orange";
    serverButton.innerHTML = "Cancel";

    serverConn.onopen = () => {

        clearInterval(serverReconnCountD);

        console.log("Server connected");
        serverStatus.innerHTML = "Server connected";
        serverStatus.style.color = "green";
        serverButton.innerHTML = "Disconnect";

        clearInterval(serverPingInterval);
        serverPingInterval = setInterval(() => {
            serverConn.send(statusToFA());
            console.log('To FA: PING');
        }, serverPingDelay);

    }

    serverConn.onmessage = (message) => {

        console.log('From FA:', message.data);

        const formato = /^[a-z]\d{10}$/;

        if (formato.test(message.data)) {

            serverConn.send('#' + message.data);
            console.log('To FA: #' + message.data);

            let objToSend = {};

            if (message.data === 'p0000000000') {
                objToSend = {
                    reset: true,
                }

            } else if (message.data[0] === 'p' || message.data[0] === 'i') {
                objToSend = {
                    faults: parseInt(message.data[1]),
                    refusals: parseInt(message.data[2]),
                    elimination: parseInt(message.data[3]),
                };

            } else {
                objToSend = {
                    reset: true,
                }
                const telegrama = 'p0000000000';
                serverConn.send(telegrama);
                console.log('To FA:', telegrama);
                timer = {
                    time: 0,
                    faults: 0,
                    refusals: 0,
                    elimination: 0,
                    running: false,
                    countdown: 0,
                    coursewalk: false,
                };
            }

            if (timerConn.readyState === WebSocket.OPEN) {
                timerConn.send(JSON.stringify(objToSend));
                console.log("To Timer:", JSON.stringify(objToSend));
            }

        } else if (message.data === 'd0') {
            const telegrama = '#' + statusToFA();
            serverConn.send(telegrama);
            console.log('To FA:', telegrama);

        } else {
            serverConn.send('!' + message.data);
            console.log('To FA:', telegrama);
        }
    }

    serverConn.onclose = () => {
        console.log("Server Disconnected");
    }

    serverConn.onerror = () => {
        clearInterval(serverPingInterval);

        clearInterval(serverReconnCountD);

        serverStatus.innerHTML = "Retrying in 5s.";
        serverStatus.style.color = "orange";
        serverButton.innerHTML = "Cancel";

        serverReconnCountD = setInterval(reconnServer, 1000);
        serverReconnTimeout = setTimeout(websocServer, 5000);

        serverReconnTimeLeft = 5;
        serverReconnTimeoutActive = true;

    }
}

function checkJSON(JSONstring) {
    try {
        const parsedData = JSON.parse(JSONstring);
        return parsedData;
    } catch (error) {
        return null;
    }
}

function statusToFA() {
    const modo = timer.running && !timer.countdown ? 'i' : 'p';
    return `${modo}${timer.faults}${timer.refusals}${timer.elimination}${timer.time.toString().padStart(7, '0')}`;
}

function randomMac(length) {
    var result = '';
    var characters = 'ABCDEF0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function readLocal(keyName) {
    try {
        return localStorage.getItem(keyName);
    } catch (error) {
        return null;
    }
}

function saveLocal(keyName, value) {
    try {
        localStorage.setItem(keyName, value);
        return value;
    } catch (error) {
        return null;
    }
}

