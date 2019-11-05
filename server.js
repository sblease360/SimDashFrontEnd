'use strict';

//Constants and global variables
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

var revInfo = null;
var sessionJSON = null;
var currLap = null;
var pitState = null;
var initialFuel = null;
var outlap = null; 
var inlap = null;
var prevLapDone = null;
var lapArray = [];
var lapDetail = {
    num: null,
    lapTime: null,
    clean: null,
    fuelUsed: null,
    outlap: null,
    inlap: null,
    startOfStint: null,
    initialFuel: null, 
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
        if (iracing.sessionJSON == null) {
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

//add calculated values to the telem object which will be sent to the frontend
function addDataToTelem(telem) {
    telem.startOfStint = lapDetail.startOfStint;
    telem.outlap = outlap; 
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

    //Initialise variables on first telemetry tick
    if (currLap === null) {
        currLap = telem.Lap;
    }

    //Things that happen when we enter the pitlane
    if (pitState === false && telem.OnPitRoad === true) {
        inlap = true;
    }


    //set flags for car in pits to identify when this has changed on the last tick
    if (telem.OnPitRoad === true) {
        pitState = true;
    };

    //Things that happen when we have left the pit lane
    if (pitState === true && telem.OnPitRoad === false) {
        outlap = true;
        lapDetail.startOfStint = telem.Lap;
        pitState = false; 
        initialFuel = telem.FuelLevel
    }

    //Things that happen each lap
    if (!(currLap === telem.Lap)) {
        //Set flag to add laptime
        prevLapDone = false;

        //Update the lapDetail object with the required information
        //NOTE: this does not get added to the array yet, because the accurate lap time information is not available for a couple of seconds in the telemetry
        lapDetail.num = currLap;
        console.log(inlap);
        if (inlap === true) {
            lapDetail.inlap = true;
        } else {
            lapDetail.inlap = false;
        }

        if (outlap === true) {
            lapDetail.outlap = true;
            lapDetail.initialFuel = initialFuel;
            lapDetail.fuelUsed = initialFuel - telem.FuelLevel;
        } else if (lapArray.length > 0) { 
            lapDetail.outlap = false;
            lapDetail.initialFuel = lapArray[lapArray.length - 1].initialFuel - lapArray[lapArray.length - 1].fuelUsed
            lapDetail.fuelUsed = lapDetail.initialFuel - telem.FuelLevel;
        } else { //This can happen if the server was started with the car already on track - ensure values don't break the rest of the array
            lapDetail.outlap = false;
            lapDetail.initialFuel = telem.FuelLevel;
            lapDetail.fuelUsed = 0;
        };      

        //Check if outlap status needs to be turned off
        if (outlap === true && !(lapDetail.startOfStint === telem.Lap)) {
            outlap = false;
        }

        //Turn off inlap status
        if (inlap === true) {
            inlap = false;
        }

        //Finally, update current lap so it is correct next time round
        currLap = telem.Lap;
    }

    //telem.LapLastLapTime doesn't get updated for a few seconds after telem.Lap does
    //To get accuract lap times displayed, wait for this time and then push a copy of the object to the array 
    if (prevLapDone === false && telem.LapCurrentLapTime < 5) {
        lapDetail.lapTime = telem.LapLastLapTime;
        lapArray.push(JSON.parse(JSON.stringify(lapDetail)));
        prevLapDone = true;
        console.log(lapArray);
    }

    //Add calculated values to the telemetry object before it is sent to the front end
    telem = addDataToTelem(telem)

    if (!(sessionJSON === null)) {
        compileAndTransmitData(telem)
    }

    //Transmit data to clients
    //sendWebSocketData(JSON.stringify(telem));
})

function compileAndTransmitData(telem) {
    var telemetryOutput = {};

    //Gear and rev data
    telemetryOutput.revBarWidth = (100 * (telem.RPM / sessionJSON.hardRedLine)) + "%";

    switch (telem.Gear) {
        case 0:
            telemetryOutput.currGear = "N";
            break;
        case -1:
            telemetryOutput.currGear = "R";
            break;
        default:
            telemetryOutput.currGear = telem.Gear;
    };

    telemetryOutput.currRevs = Math.round(telem.RPM);

    telemetryOutput.currSpeed = Math.round(telem.Speed * 2.23694) + '<span id="speedUnits"> mph</span>';

    if (telem.RPM > sessionJSON.shiftLight) {
        telemetryOutput.shiftLight = true;
    } else {
        telemetryOutput.shiftLight = false;
    };

    //Fuel and current lap details
    telemetryOutput.fuelRemaining = telem.FuelLevel.toFixed(2) + " l"
    telemetryOutput.currentLap = telem.Lap;

    telemetryOutput.lastLapTime = fancyTimeFormat(telem.LapLastLapTime);
    telemetryOutput.bestLapTime = fancyTimeFormat(telem.LapBestLapTime);

    switch (telem.outlap) {
        case true:
            telemetryOutput.lapsThisStint = "Outlap"
            break;
        case false:
            telemetryOutput.lapsThisStint = (telem.Lap - telem.startOfStint) + '<span class="additionalData"> + outlap</span>';
            break; 
        default: 
            telemetryOutput.lapsThisStint = "---"
    };

    if (lapArray.length > 0) {
        telemetryOutput.lastLapUsage = (Math.round(100 * lapArray[lapArray.length - 1].fuelUsed))/100;
    } else {
        telemetryOutput.lastLapUsage = "---"
    };

    //Session info details
    telemetryOutput.trackTemp = sessionJSON.WeekendInfo.TrackSurfaceTemp;
    telemetryOutput.airTemp = sessionJSON.WeekendInfo.TrackAirTemp;
    telemetryOutput.skyConditions = sessionJSON.WeekendInfo.TrackSkies;
    telemetryOutput.softRedLine = 2 + (100 * ((sessionJSON.hardRedLine - sessionJSON.softRedLine) / sessionJSON.hardRedLine)) + "%"

    //Output data to clients
    sendWebSocketData(JSON.stringify(telemetryOutput));
};

iracing.on('SessionInfo', function (rawInfo) {
    sessionJSON = JSON.parse(JSON.stringify(rawInfo.data));

    //Check gear override info for the current car and set variables for use in front end
    sessionJSON = getRevThresholds(sessionJSON, rawInfo.data.DriverInfo.Drivers[0].CarScreenName);

    console.log("Session info updated")
})









