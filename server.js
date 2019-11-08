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

var optimumLapTime = { //This is required as a workaround because this data is not in the telemetry packet, calculated using a laptime and a delta picked up in different places.
    lapNum: null, 
    optimum: null,
    lapDelta: null, 
}
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
var stintInfo = {
    minFuel: "---",
    maxFuel: "---",
    avgFuel: "---",
    lapsLeft: "---",
    avgLap: "---",
    bestLap: "---",
};

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

//https stuff


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
        if (existingJSON.DriverInfo.DriverCarSLBlinkRPM < existingJSON.DriverInfo.DriverCarRedLine) {
            existingJSON.shiftLight = existingJSON.DriverInfo.DriverCarSLBlinkRPM;
        } else {
            existingJSON.shiftLight = existingJSON.DriverInfo.DriverCarSLLastRPM;
        }
    }

    return existingJSON;
}

//Usage values from the lapArray
function getValuesFromLapArray() {
    var min, max, sum, count, avg, best, sumTime, avgTime, i;
    count = 0;
    sum = 0;
    min = 500;
    max = 0;    
    avg = 0;
    best = 0;
    sumTime = 0;
    avgTime = 0;
    for (i = 0; i < lapArray.length; i++) {
        if (lapArray[i].num < lapArray[lapArray.length - 1].startOfStint) { continue };
        if (lapArray[i].outlap === false && lapArray[i].inlap === false) {
            sum += lapArray[i].fuelUsed;
            sumTime += lapArray[i].lapTime;
            if (best === 0 || best > lapArray[i].lapTime) {
                best = lapArray[i].lapTime;
            };
            count += 1;
            if (lapArray[i].fuelUsed < min) { min = lapArray[i].fuelUsed };
            if (lapArray[i].fuelUsed > max) { max = lapArray[i].fuelUsed };
        };
    };
    avgTime = sumTime / count;
    avg = sum / count;
    if (min === 500) { min = "---" }; 
    if (max === 0) { max = "---" };
    if (avg === 0) { avg = "---" };
    if (best === 0) { best = "---" };
    if (avgTime === 0) { avgTime = "---" };
    return {
        min: min,
        max: max,
        avg: avg,
        best: best,
        avgTime: avgTime
    };
}


//Output time values in seconds as 00:00:00.000
function fancyTimeFormat(time) {
    //To be used server side to format second values into nice strings for output
    // Hours, minutes, seconds and milliseconds in format 00:00.000 assuming no hours
    if (time === -1 || time === null || time === "---" || typeof time === "undefined") {
        return "---";
    }

    if (Number.isNaN(time) === true) {
        return "---"
    };

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

function fancyDeltaFormat(time) {
    //To be used server side to format second values into nice strings for output
    //seconds and milliseconds in format 00.000
    if (time === -1 || time === null || time === "---" || typeof time === "undefined") {
        return "---";
    }

    if (Number.isNaN(time) === true) {
        return "---"
    };

    var secs = ~~time;
    var milliSecs = Math.round(1000 * (time - Math.floor(time)));

    var ret = "";

    if (time < 0) {
        ret += "-";
    } else if (time > 0) {
        ret += "+"
    };

    ret += "" + secs.toFixed(0) + "." + (milliSecs < 100 ? "0" : "");

    switch (milliSecs.length) {
        case 1:
            milliSecs = "00" + milliSecs;
            break;
        case 2:
            milliSecs = "0" + milliSecs;
            break;
    };

    ret += "" + milliSecs.toFixed(0);
    return ret;
}

iracing.on('SessionInfo', function (rawInfo) {
    sessionJSON = JSON.parse(JSON.stringify(rawInfo.data));

    //Check gear override info for the current car and set variables for use in front end
    sessionJSON = getRevThresholds(sessionJSON, rawInfo.data.DriverInfo.Drivers[0].CarScreenName);

    console.log("Session info updated")
})

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

    //Attempt to estimate optimum lap time by catching a delta value very close to the end of the lap and adding it to the last lap time
    if (telem.LapDistPct > 0.995 && telem.LapDeltaToSessionOptimalLap_OK === true && outlap === false) {
        optimumLapTime.lapNum = telem.Lap;
        optimumLapTime.lapDelta = telem.LapDeltaToSessionOptimalLap;
    }

    //telem.LapLastLapTime doesn't get updated for a second or two after telem.Lap does
    //To get accuract lap times displayed, wait for this time and then push a copy of the object to the array 
    if (prevLapDone === false && telem.LapCurrentLapTime < 5) {
        prevLapDone = true;
        if (!(optimumLapTime.lapDelta === null && optimumLapTime.lapNum === (telem.Lap - 1))) {
            optimumLapTime.optimum = telem.LapLastLapTime - optimumLapTime.lapDelta;
            optimumLapTime.lapDelta = null;
        }        
        lapDetail.lapTime = telem.LapLastLapTime;
        lapArray.push(JSON.parse(JSON.stringify(lapDetail)));
        let val = getValuesFromLapArray();
        stintInfo.minFuel = val.min;
        stintInfo.maxFuel = val.max;
        stintInfo.avgFuel = val.avg;
        stintInfo.avgLap = val.avgTime; 
        stintInfo.bestLap = val.best;
        if (!(isNaN(val.avg))) {
            stintInfo.lapsLeft = (Math.round(100 * (telem.FuelLevel / val.avg))) / 100;
        };
    }
    
    //Compile and transmit the data, can only be done after a session tick as this function uses both session and telem data
    if (!(sessionJSON === null)) {
        compileAndTransmitData(telem)
    }
})

function compileAndTransmitData(telem) {
    var telemetryOutput = {};
    var i = null;

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

    telemetryOutput.currSpeed = Math.round(telem.Speed * 2.23694) + '<span class="additionalDataSmall"> mph</span>';

    if (telem.RPM > sessionJSON.shiftLight) {
        telemetryOutput.shiftLight = true;
    } else {
        telemetryOutput.shiftLight = false;
    };

    //Fuel and current lap details
    telemetryOutput.fuelRemaining = ((Math.round(1000 * telem.FuelLevel))/1000) + '<span class="additionalData"> L</span>';
    telemetryOutput.currentLap = telem.Lap;

    if (lapArray.length > 0) {
        telemetryOutput.lastLapUsage = ((Math.round(1000 * lapArray[lapArray.length - 1].fuelUsed)) / 1000) + '<span class="additionalData"> L</span>';
    } else {
        telemetryOutput.lastLapUsage = "---"
    };

    telemetryOutput.minLapUsage = ((Math.round(1000 * stintInfo.minFuel)) / 1000) + '<span class="additionalData"> L</span>';
    telemetryOutput.maxLapUsage = ((Math.round(1000 * stintInfo.maxFuel)) / 1000) + '<span class="additionalData"> L</span>';
    telemetryOutput.avgLapUsage = ((Math.round(1000 * stintInfo.avgFuel)) / 1000) + '<span class="additionalData"> L</span>';
    telemetryOutput.lapsLeftFuel = stintInfo.lapsLeft;

    if (isNaN((Math.round(1000 * stintInfo.minFuel)) / 1000)) { telemetryOutput.minLapUsage = "---" };
    if (isNaN((Math.round(1000 * stintInfo.maxFuel)) / 1000)) { telemetryOutput.maxLapUsage = "---" };
    if (isNaN((Math.round(1000 * stintInfo.avgFuel)) / 1000)) { telemetryOutput.avgLapUsage = "---" };
    if (isNaN(stintInfo.lapsLeft)) { telemetryOutput.lapsLeftFuel = "---" };



    switch (outlap) {
        case true:
            telemetryOutput.lapsThisStint = "Outlap";
            break;
        case false:
            telemetryOutput.lapsThisStint = (telem.Lap - lapDetail.startOfStint);
            break;
        default:
            telemetryOutput.lapsThisStint = "---"
    };

    //Lap details and progress bars
    if (!(optimumLapTime.optimum === null)) {
        telemetryOutput.optimumLapTime = fancyTimeFormat(optimumLapTime.optimum);
    };

    telemetryOutput.lastLapTime = fancyTimeFormat(telem.LapLastLapTime);
    telemetryOutput.bestLapTime = fancyTimeFormat(telem.LapBestLapTime);
    telemetryOutput.optimumLapTime = fancyTimeFormat(optimumLapTime.optimum);
    telemetryOutput.avgStintLapTime = fancyTimeFormat(stintInfo.avgLap);
    telemetryOutput.bestStintLapTime = fancyTimeFormat(stintInfo.bestLap);

    telemetryOutput.thisLapProgress = (100 * telem.LapDistPct) + "%";
    telemetryOutput.lapComparisonBar = (100 * telem.LapDistPct) + "%";
    let scalingFactor = 1; //Inflate the size of the gap between the bars
    if (telem.LapDeltaToSessionBestLap_OK === true) {
        telemetryOutput.bestSessionLapProgress = (((100 * telem.LapDistPct) / telem.LapCurrentLapTime) * (telem.LapCurrentLapTime + (scalingFactor * telem.LapDeltaToSessionBestLap))) + "%";
        telemetryOutput.lastLapDelta = fancyDeltaFormat(telem.LapDeltaToSessionBestLap);
    } else {
        telemetryOutput.lastLapDelta = "+/-00.000";
    };
    if (telem.LapDeltaToSessionOptimalLap_OK === true) {
        telemetryOutput.optimumSessionLapProgress = (((100 * telem.LapDistPct) / telem.LapCurrentLapTime) * (telem.LapCurrentLapTime + (scalingFactor * telem.LapDeltaToSessionOptimalLap))) + "%";
        telemetryOutput.optimumLapDelta = fancyDeltaFormat(telem.LapDeltaToSessionOptimalLap);
    } else {
        telemetryOutput.optimumLapDelta = "+/-00.000";
    };
    if (telem.LapDeltaToSessionLastlLap_OK === true) {
        telemetryOutput.lastLapProgress = (((100 * telem.LapDistPct) / telem.LapCurrentLapTime) * (telem.LapCurrentLapTime + (scalingFactor * telem.LapDeltaToSessionLastlLap))) + "%";
        telemetryOutput.bestLapDelta = fancyDeltaFormat(telem.LapDeltaToSessionLastlLap)
    } else {
        telemetryOutput.bestLapDelta = "+/-00.000";
    };

    //Session info details
    telemetryOutput.trackTemp = sessionJSON.WeekendInfo.TrackSurfaceTemp;
    telemetryOutput.airTemp = sessionJSON.WeekendInfo.TrackAirTemp;
    telemetryOutput.skyConditions = sessionJSON.WeekendInfo.TrackSkies;
    telemetryOutput.softRedLine = 2 + (100 * ((sessionJSON.hardRedLine - sessionJSON.softRedLine) / sessionJSON.hardRedLine)) + "%"

    //Output data to clients
    sendWebSocketData(JSON.stringify(telemetryOutput));
};











