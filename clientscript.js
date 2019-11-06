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

function initialisePage() {
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
        if (isJSON(event.data)) {
            console.log("this is telemetry data");
            telem = JSON.parse(event.data);
            console.log(telem);

            //Session details
            document.getElementById('trackTemp').innerHTML = telem.trackTemp
            document.getElementById('airTemp').innerHTML = telem.airTemp
            document.getElementById('skyConditions').innerHTML = telem.skyConditions
            document.getElementById('softRedLine').style.width = telem.softRedLine

            //Rev and gear information
            document.getElementById('currentRevsBar').style.width = telem.revBarWidth;
            document.getElementById('currGear').innerHTML = telem.currGear;
            document.getElementById('currRevs').innerHTML = telem.currRevs;
            document.getElementById('currSpeed').innerHTML = telem.currSpeed;

            if (telem.shiftLight === true) {
                document.getElementById('revCounterBorder').style.borderColor = "#FF0000";
                document.getElementById('revsArea').style.backgroundColor = "#FF0000";
            } else {
                document.getElementById('revCounterBorder').style.borderColor = "#0f1214";
                document.getElementById('revsArea').style.backgroundColor = "#0f1214";
            }

            //Output lap numbers and fuel details
            document.getElementById('fuelRemaining').innerHTML = telem.fuelRemaining;
            document.getElementById('currentLap').innerHTML = telem.currentLap;
            document.getElementById('lastLapUsage').innerHTML = telem.lastLapUsage;
            document.getElementById('minLapUsage').innerHTML = telem.minLapUsage;
            document.getElementById('maxLapUsage').innerHTML = telem.maxLapUsage;
            document.getElementById('avgLapUsage').innerHTML = telem.avgLapUsage;

            //Output lap timings
            document.getElementById('lastLapTime').innerHTML = "Last: " + telem.lastLapTime;
            document.getElementById('bestLapTime').innerHTML = "Best: " + telem.bestLapTime;
            document.getElementById('lapsThisStint').innerHTML = telem.lapsThisStint;
               
        } else {
            if (event.data == "Connected to iRacing") {
                document.getElementById('irStatus').innerHTML = "Running"
            };
            if (event.data == "Disconnected from iRacing") {
                document.getElementById('irStatus').innerHTML = "Not Running"
            }
        }


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
};



