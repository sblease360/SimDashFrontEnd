'use strict';

var socket = null;

function initialisePage() {
    startConnection();
    setInterval(checkConnection(), 5000);
}

function startConnection() {
    console.log('Attempting to create new websocket connection');
    socket = new WebSocket('ws://127.0.0.1:8080');

    socket.onopen = function (event) {
        console.log("WebSocket connection open, sending confirmation to data source");
        socket.send("webapp connected and ready to recieve data");
        displayConnectionState();
    };

    socket.onmessage = function (event) {
        console.log("WebSocket data recieved");
        if (event.data == "Connected to iRacing") {
            document.getElementById('irStatus').innerHTML = "Running"
        };
        if (event.data == "Disconnected from iRacing") {
            document.getElementById('irStatus').innerHTML = "Not Running"
        }
        //var date = new Date(null);
        //date.setSeconds(e.data.values.SessionTime)
        //var timeString = date.toISOString().substr(11, 8);
        document.getElementById('testelem').innerHTML = event.data;
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
            document.getElementById('dataSourceStatus').innerHTML = 'Attempting to connect'
            break;
        case 1: //open
            document.getElementById('dataSourceStatus').innerHTML = 'Connected'
            break;
        case 2: //closing
            document.getElementById('dataSourceStatus').innerHTML = 'Connection Error'
            break;
        case 3: //closed
            document.getElementById('dataSourceStatus').innerHTML = 'Disconnected'
            document.getElementById('irStatus').innerHTML = "Not Running"
            break;
        default: //bad things have happened
    };
    //setTimeout(displayConnectionState, 1000);
};



