'use strict';

var socket = null;

function isJSON(str) {
    try {     
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

function fullscreen(){
    document.documentElement.requestFullscreen()
    document.getElementById('full-screen-button').style.display = 'none';
};

function loadingRoutine() {
    startConnection();
    setInterval(checkConnection(), 5000);
}

function startConnection() {
    console.log('Attempting to create new websocket connection');
    socket = new WebSocket('ws://127.0.0.1:8080');
    var sessionInfo = null;
    var telem = null;

    socket.onopen = function (event) {
        console.log("WebSocket connection open, sending confirmation to data source");
        socket.send("webapp connected and ready to recieve data");
        displayConnectionState();
    };

    socket.onmessage = function (event) { 
        //All data from the game is passed as JSON, other items are sent in plain text
        document.getElementById('gear').innerHTML = event.data;
    }

    socket.onclose = function (event) {
        console.log('WebSocket closing');
        displayConnectionState();
        checkConnection()
    };

};

function checkConnection() {
    if (!socket || socket.readyState == WebSocket.CLOSED) {
        startConnection()
    }
}

function displayConnectionState() {
    switch (socket.readyState) {
        case 0: //connecting
            document.getElementById('data-source-status').innerHTML = 'Attempting to connect'
            break;
        case 1: //open
            document.getElementById('data-source-status').innerHTML = 'Connected'
            break;
        case 2: //closing
            document.getElementById('data-source-status').innerHTML = 'Connection Error'
            break;
        case 3: //closed
            document.getElementById('data-source-status').innerHTML = 'Disconnected'
            document.getElementById('iracing-status').innerHTML = "Not Running"
            break;
        default: //bad things have happened
    };
};



