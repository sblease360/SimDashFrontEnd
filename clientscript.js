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
            //check if the JSON is session info (recieved only when it changes)
            if (JSON.parse(event.data).hasOwnProperty('CameraInfo')) {
                console.log("This is session info data");
                sessionInfo = JSON.parse(event.data);
                //console.log(sessionInfo);
                document.getElementById('sessionDetails').innerHTML = sessionInfo.WeekendInfo.EventType + " session - " + sessionInfo.WeekendInfo.TrackName;

                //track conditions
                document.getElementById('trackTemp').innerHTML = sessionInfo.WeekendInfo.TrackSurfaceTemp;
                document.getElementById('airTemp').innerHTML = sessionInfo.WeekendInfo.TrackAirTemp;
                document.getElementById('skyConditions').innerHTML = sessionInfo.WeekendInfo.TrackSkies;

                //Set soft red line in gear element
                document.getElementById('softRedLine').style.width = 2 + (100 * ((sessionInfo.hardRedLine - sessionInfo.softRedLine) / sessionInfo.hardRedLine)) + "%";
                   
               
                

            } else {
                console.log("this is telemetry data");
                telem = JSON.parse(event.data);

                //Display gearing and rev counter percentages - two versions required
                document.getElementById('currentRevsBar').style.width = (100 * (telem.RPM / sessionInfo.hardRedLine)) + "%";
                

                if (telem.Gear === 0) {
                    document.getElementById('currGear').innerHTML = "N";
                } else if (telem.Gear === -1) {
                    document.getElementById('currGear').innerHTML = "R";
                } else {
                    document.getElementById('currGear').innerHTML = telem.Gear;
                };
                
                document.getElementById('currRevs').innerHTML = Math.round(telem.RPM);

                //Display current speed
                document.getElementById('currSpeed').innerHTML = Math.round(telem.Speed * 2.23694) + '<span id="mph"> mph</span>';

                //Set shift light if required
                if (!(sessionInfo == null)) {
                    if (telem.RPM > sessionInfo.shiftLight) {
                        document.getElementById('revCounterBorder').style.borderColor = "#FF0000";
                        document.getElementById('revsArea').style.backgroundColor = "#FF0000"
                    } else {
                        document.getElementById('revCounterBorder').style.borderColor = "#0f1214";
                        document.getElementById('revsArea').style.backgroundColor = "#0f1214"
                    }
                }

                //Output lap numbers and fuel details
                document.getElementById('fuelRemaining').innerHTML = telem.FuelLevel.toFixed(2);
                document.getElementById('lapsComplete').innerHTML = telem.Lap;

                //Output lap timings
                document.getElementById('lastLapTime').innerHTML = "Last: " + telem.LapLastLapTime;
                document.getElementById('bestLapTime').innerHTML = "Best: " + telem.LapBestLapTime.toFixed(3);
                document.getElementById('lapsThisStint').innerHTML = telem.LapCompleted - telem.startOfStint;
                console.log(telem.LapCompleted);
                console.log(telem.startOfStint);
    
            }
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



