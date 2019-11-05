'use strict';

//Constants and global variables
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

var revInfo = null;
var sessionJSON = null;
var fuelInfo = null;
var lapInfo = {
    outlap: null,
    startOfStint: null,
    pitState: null
};
var currLap = null;
var currSector = 0;
var sectorBounds = [];
var lapArray = [];
var lapDetail = {
    num: null,
    sectorTimes: [],
    lapTime: null,
    clean: null,
    fuelUsed: null,
    outlap: null
}

//Initialise iRacing connection and log that we are waiting for a connection
var irsdk = require('node-irsdk');
irsdk.init({
    telemetryUpdateInterval: 50,
    sessionInfoUpdateInterval: 500
});
var iracing = irsdk.getInstance()
console.log('\nWaiting for iRacing instance')

//WebSocket handlers
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('recieved: %s', message);
        if (iracing.sessionInfo == null) {
            console.log("Connected to output site, no iRacing connection");
        } else {
            console.log("Connection established - confirming iRacing status");
            sendWebSocketData("Connected to iRacing");
            console.log("Sending session state data as new client joined");
            sendWebSocketData(JSON.stringify(sessionJSON));
        };
    });
})

iracing.on('Connected', function () {
    console.log('\nConnected to iRacing!.');
    sendWebSocketData("Connected to iRacing");
})

iracing.once('Disconnected', function () {
    console.log('iRacing closed.');
    sendWebSocketData("Disconnected from iRacing");
})

//############# General purpose functions

//Check if some data is JSON and return only true or false
function isJSON(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

//Check if some data is an object and return true or false
function isAO(val) {
    return val instanceof Array || val instanceof Object ? true : false;
};

//Send data to the websocket client(s)
function sendWebSocketData(data) {
    wss.clients.forEach(function each(client) {
        client.send(data);
    })
}

//############# Specific functions

//Everything that needs to be done when leaving the pitlane
function leavingPitLane(lapInfo, telem) {
    lapInfo.outlap = true;
    lapInfo.startOfStint = telem.Lap;
    lapInfo.pitState = false; 
    return lapInfo;
}

//add calculated values to the telem object which will be sent to the frontend
function addDataToTelem(telem) {
    telem.startOfStint = lapInfo.startOfStint;
    telem.outlap = lapInfo.outlap; 
    return telem;
}

//Override hardRedLine, softRedLine and ShiftLight if required (because of launch control or similar)
//If overridden, output new values to JSON, if not copy values from existing JSON
function getRevThresholds(existingJSON, carName) {

    var revInfo = {
        hardRedLine: null,
        softRedLine: null,
        shiftLight: null
    };
    //Override values
    switch (carName) {
        case "Audi RS 3 LMS TCR":
            revInfo.hardRedLine = 7000;
    }
    //Output
    if (!(revInfo.hardRedLine === null)) {
        existingJSON.hardRedLine = gearOverrideInfo.hardRedLine
    } else {
        existingJSON.hardRedLine = existingJSON.DriverInfo.DriverCarRedLine;
    }

    if (!(revInfo.softRedLine === null)) {
        existingJSON.softRedLine = gearOverrideInfo.softRedLine;
    } else {
        existingJSON.softRedLine = existingJSON.DriverInfo.DriverCarSLFirstRPM;
    };

    if (!(revInfo.shiftLight === null)) {
        existingJSON.shiftLight = gearOverrideInfo.shiftLight;
    } else {
        existingJSON.shiftLight = existingJSON.DriverInfo.DriverCarSLBlinkRPM;
    }

    return existingJSON;
}

//Output time values in seconds as 00:00:00.000
function fancyTimeFormat(time) {
    //To be used server side to format second values into nice strings for output
    // Hours, minutes, seconds and milliseconds in format 00:00.000 assuming no hours
    if (time == -1) {
        return "-:--.---";
    }

    var hrs = ~~(time / 3600);
    var mins = ~~((time % 3600) / 60);
    var secs = ~~time % 60;
    var milliSecs = 1000 * (time - ~~time).toFixed(3);

    var ret = "";

    if (hrs > 0) {
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }

    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs + "." + (milliSecs < 100 ? "0" : "");
    ret += "" + milliSecs;
    return ret;
}

iracing.on('Telemetry', function (rawTelem) {
    var telem = null;
    telem = JSON.parse(JSON.stringify(rawTelem.values));

    //Initialise current lap variable, this is used to control logic that only needs to be recalculated on lap change
    if (currLap === null) {
        currLap = telem.Lap;
    }

    //set flags for car in pits to identify when this has changed on the last tick
    if (telem.OnPitRoad === true) {
        lapInfo.pitState = true;
    };

    //Things that happen when we have left the pit lane
    if (lapInfo.pitState === true && telem.OnPitRoad === false) {
        lapInfo = leavingPitLane(lapInfo, telem);
    }

    //Things that happen each lap
    if (!(currLap === telem.Lap)) {
        //Check if outlap status needs to be turned off
        if (lapInfo.outlap === true && !(lapInfo.startOfStint === telem.lap)) {
            lapInfo.outlap = false;
        }

        //Finally, update current lap so it is correct next time round
        currLap = telem.Lap;
    }

    //Add calculated values to the telemetry object before it is sent to the front end
    telem = addDataToTelem(telem)

    //Transmit data to clients
    sendWebSocketData(JSON.stringify(telem));
})

iracing.on('SessionInfo', function (rawInfo) {
    sessionJSON = JSON.parse(JSON.stringify(rawInfo.data));

    //Check gear override info for the current car and set variables for use in front end
    sessionJSON = getRevThresholds(sessionJSON, rawInfo.data.DriverInfo.Drivers[0].CarScreenName);

    console.log("Sending Session State Data");
    sendWebSocketData(JSON.stringify(sessionJSON));
})









