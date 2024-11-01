let localSettings = checkJSON(readLocal("galiGateWay")) || {};

const timerWStype = document.getElementById("timerWStype");
const timerIP = document.getElementById("timerIP");
const timerStatus = document.getElementById("timerStatus");
const timerButton = document.getElementById("timerButton");
let timerConn = { readyState: WebSocket.CLOSED };
let timerReconnTimeout;
let timerReconnTimeoutActive = false;
let timerReconnCountD;
let timerReconnTimeLeft = 5;

const macForFA = document.getElementById("macForFA");
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
let serverCleanCloseAsked = false;
let serverConnError = false;

let timer = {
    time: 0,
    faults: 0,
    refusals: 0,
    elimination: 0,
    running: false,
    countdown: 0,
    coursewalk: false,
};

(function () {

    localSettings.randomMac ||= randomMac(12);
    macForFA.innerHTML = localSettings.randomMac;

    timerWStype.selectedIndex = localSettings.timerWStype === 1 ? 1 : 0;
    timerIP.value = localSettings.timerIP ||= '';;

    serverWStype.selectedIndex = localSettings.serverWStype=== 0 ? 0 : 1;
    serverIP.value = localSettings.serverIP ||= '';

})();


function connTimer() {
    if (timerConn.readyState !== WebSocket.CLOSED || timerReconnTimeoutActive) {

        timerConn.close();

        // timerWStype.disabled = false;
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

    // timerWStype.disabled = true;
    timerIP.disabled = true;

    clearInterval(timerReconnCountD);
    clearTimeout(timerReconnTimeout);

    timerStatus.innerHTML = "Trying";
    timerStatus.style.color = "orange";
    timerButton.innerHTML = "Cancel";

    timerConn.onopen = () => {

        localSettings.timerWStype = timerWStype.selectedIndex;
        localSettings.timerIP = timerIP.value;
        saveLocal("galiGateWay", JSON.stringify(localSettings));

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

            const oldTimer = { ...timer };

            for (let property in timer) {
                if (parsedData.hasOwnProperty(property)) {
                    timer[property] = parsedData[property];
                }
            }

            const runMatch = oldTimer.running === timer.running;
            const couseMatch = oldTimer.coursewalk === timer.coursewalk;
            const timeMatch = oldTimer.time === timer.time;

            if (!runMatch || !couseMatch) sendToFlowAgility = true; // if mode has changed

            if (!timer.running && !timer.coursewalk && !timeMatch) sendToFlowAgility = true;  // if timer is stopped but time has changed

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

function serverCleanClose() {

    serverIP.disabled = false;
    serverWStype.disabled = false;

    clearTimeout(serverReconnTimeout);
    clearInterval(serverReconnCountD);

    serverReconnTimeoutActive = false;

    serverStatus.innerHTML = "Server Disconnected";
    serverStatus.style.color = "red";
    serverButton.innerHTML = "Connect";

    clearInterval(serverPingInterval);

}
function connServer() {
    if (serverConn.readyState !== WebSocket.CLOSED || serverReconnTimeoutActive) {
        serverConn.close();
        serverCleanCloseAsked = true;
        serverConnError = false;
        serverCleanClose();
    } else {
        serverCleanCloseAsked = false;
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
    serverWStype.disabled = true;

    clearInterval(serverReconnCountD);
    clearTimeout(serverReconnTimeout);

    serverStatus.innerHTML = "Trying";
    serverStatus.style.color = "orange";
    serverButton.innerHTML = "Cancel";

    serverConn.onopen = () => {

        localSettings.serverWStype = serverWStype.selectedIndex;
        localSettings.serverIP = serverIP.value;
        saveLocal("galiGateWay", JSON.stringify(localSettings));

        serverConnError = false;
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

            } else if (message.data[0] === 'g') {
                if (timer.coursewalk) {
                    timer.coursewalk = 0;  // TODO this is a patch because Galican timer time cant be changed once it is coursewalking
                    return;
                } else {
                    objToSend = {
                        coursewalk: true,
                    }
                }

            } else if (message.data[0] === 'o') {

                // TODO this is a patch because Galican timer time cant be changed once it is coursewalking
                if (timer.coursewalk) {
                    if (timerConn.readyState === WebSocket.OPEN) {
                        const telegrama1 = 'o000' + timer.time.toString().padStart(7, '0');
                        serverConn.send(telegrama1);
                        console.log('To FA:', telegrama1);

                        const telegrama2 = 'g000' + timer.time.toString().padStart(7, '0');
                        serverConn.send(telegrama2);
                        console.log('To FA:', telegrama2);
                    }
                }
                return; // ! Nothing is sent to timer
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
        if (serverCleanCloseAsked || !serverConnError) serverCleanClose();
    }

    serverConn.onerror = () => {

        if (!serverCleanCloseAsked) {

            serverConnError = true;

            console.log('Server Connection Error');

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

    let modo = 'p';

    if (timer.running) {
        modo = 'i';
    } else if (timer.coursewalk) {
        modo = 'g';
    }

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

