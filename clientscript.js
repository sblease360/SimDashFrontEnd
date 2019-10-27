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

    socket.onopen = function (event) {
        console.log("WebSocket connection open, sending confirmation to data source");
        socket.send("webapp connected and ready to recieve data");
        displayConnectionState();
    };

    socket.onmessage = function (event) {    
        if (isJSON(event.data)) {
            //check if the JSON is session info (recieved once on connection, if not then it is telem data)
            if (JSON.parse(event.data).hasOwnProperty('hardRedline')) {
                console.log("This is session info data");
                sessionInfo = JSON.parse(event.data);
                document.getElementById('softRedline').style.width = 2 + (100 * ((sessionInfo.hardRedline - sessionInfo.softRedline) / sessionInfo.hardRedline)) + "%";
            } else {
                console.log("this is telemetry data");
                //If it doesn't have hardRedline then it is telemetry data

                //Below converts session time into nicely formatted hours, mins, seconds
                //var date = new Date(null);
                //date.setSeconds(e.data.values.SessionTime)
                //var timeString = date.toISOString().substr(11, 8);

                var telem = null;
                //var revPercent = null;
                telem = JSON.parse(event.data);

                //Display gearing and rev counter percentages
                document.getElementById('currentRevsBar').style.width = (100 * (telem.RPM / 6990)) + "%";
                if (telem.Gear === 0) {
                    document.getElementById('currGear').innerHTML = "N";
                } else if (telem.Gear === -1) {
                    document.getElementById('currGear').innerHTML = "R";
                } else {
                    document.getElementById('currGear').innerHTML = telem.Gear;
                }
                ;
                document.getElementById('currRevs').innerHTML = Math.round(telem.RPM);

                //Set shift light if required
                if (!(sessionInfo == null)) {
                    if (telem.RPM > sessionInfo.shiftLight) {
                        document.getElementById('revCounterBorder').style.borderColor = "#FF0000";
                    } else {
                        document.getElementById('revCounterBorder').style.borderColor = "#0f1214";
                    }
                }
    
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



