'use strict';

function isJSON(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

function isAO(val) {
    return val instanceof Array || val instanceof Object ? true : false;
};

//Websocket stuff
const WebSocket = require('ws');

const wss = new WebSocket.Server({
    port: 8080
});

//iRacing Stuff
var irsdk = require('node-irsdk');
irsdk.init({
    telemetryUpdateInterval: 50,
    sessionInfoUpdateInterval: 500
});
var iracing = irsdk.getInstance()

console.log('\nWaiting for iRacing instance')

var revInfo = null
var sessionJSON = null
var fuelInfo = null
var lapInfo = {
    outlap: null,
    startOfStint: null,
    pitState: null
    }
var currLap = null

//WebSocket data
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('recieved: %s', message);
        if (iracing.sessionInfo == null) {
            console.log("Connected to output site, no iRacing connection");
        } else {
            console.log("Connection established - confirming iRacing status");
            wss.clients.forEach(function each(client) {
                client.send("Connected to iRacing");
            })
            wss.clients.forEach(function each(client) {
                console.log("Sending session state data as new client joined");   
                client.send(JSON.stringify(sessionJSON));
            })
        };
    });
})

iracing.on('Connected', function () {
    console.log('\nConnected to iRacing!.');
    wss.clients.forEach(function each(client) {
        client.send("Connected to iRacing");
    })
})

iracing.once('Disconnected', function () {
    console.log('iRacing closed.');
    wss.clients.forEach(function each(client) {
        client.send("Disconnected from iRacing");
    })
})

iracing.on('Telemetry', function (rawTelem) {
    var telem = null;
    telem = JSON.parse(JSON.stringify(rawTelem.values));

    //set flags for car in pits
    if (telem.OnPitRoad === true) {
        lapInfo.pitState = true;
    };

    //Initialise current lap variable, this is used to control logic that only needs to be recalculated on lap change
    if (currLap === null) {
        currLap = telem.Lap;
    }

    if (lapInfo.pitState === true && telem.OnPitRoad === false) {
        lapInfo.outlap = true;
        lapInfo.startOfStint = telem.Lap;
    }

    //Has lap changed on last lap tick?
    if (!(currLap === telem.Lap)) {
        lapInfo.pitState = false; 
        //record all required values for fuel/laptimes etc, update averages as required.
        if (telem.LapLastLapTime === -1) {
            //This is an outlap
            lapInfo.startOfStint = telem.LapCompleted;

        }

        //Finally, update current lap as this is needed for next lap
        currLap = telem.Lap;
    }

    if (!(lapInfo.startOfStint === null)) {
        telem.startOfStint = lapInfo.startOfStint;
    }
    

    //Transmit data to clients
    wss.clients.forEach(function each(client) {
        console.log("Sending Telem Data at session time %o", telem.SessionTime);
        client.send(JSON.stringify(telem));
    })
})

iracing.on('SessionInfo', function (rawInfo) {
    var gearOverrideInfo = null
    sessionJSON = JSON.parse(JSON.stringify(rawInfo.data));
    gearOverrideInfo = getRevThresholds(rawInfo.data.DriverInfo.Drivers[0].CarScreenName);
    if (gearOverrideInfo === null) {
        sessionJSON.hardRedLine = sessionJSON.DriverInfo.DriverCarRedLine;
        sessionJSON.softRedLine = sessionJSON.DriverInfo.DriverCarSLFirstRPM;
        sessionJSON.shiftLight = sessionJSON.DriverInfo.DriverCarSLBlinkRPM;
    } else {
        if (!(gearOverrideInfo.hardRedLine === null)) { sessionJSON.hardRedLine = gearOverrideInfo.hardRedLine };
        if (!(gearOverrideInfo.softRedLine === null)) { sessionJSON.softRedLine = gearOverrideInfo.softRedLine };
        if (!(gearOverrideInfo.shiftLight === null)) { sessionJSON.shiftLight = gearOverrideInfo.shiftLight };
    }

    if (!(gearOverrideInfo === null)) {
        
    }
    //Consider if this needs the option to overwrite at well, if so it can be done by improving the override code in getRevThresholds()
    sessionJSON.shiftLightRPM = sessionJSON.DriverInfo.DriverCarSLBlinkRPM;
    
    wss.clients.forEach(function each(client) {
        console.log("Sending Session State Data");    
        client.send(JSON.stringify(sessionJSON));
    })
})

//hardRedLine, softRedLine and shiftLight are used in the visuals of the rev counter
//They can be overridden here for specific cars
//This is definitely required where the telemetry adjusts the redline for launch control etc
//Might have other uses and need expanding on in the future
function getRevThresholds(carName) {
    var revInfo = {
        hardRedLine: null,
        softRedLine: null,
        shiftLight: null
    };
    switch (carName) {
        case "Audi RS 3 LMS TCR": 
            revInfo.hardRedLine = 7000;
            return revInfo;
        default:
            return null;
    }
}

//To be used server side to format second values into nice strings for output
function fancyTimeFormat(time) {
    // Hours, minutes, seconds and milliseconds in format 00:00.000 assuming no hours
    if (time == -1) {
        return "-:--.---";
    }

    var hrs = ~~(time / 3600);
    var mins = ~~((time % 3600) / 60);
    var secs = ~~time % 60;
    var milliSecs = 1000 * (time - ~~time).toFixed(3)

    var ret = "";

    if (hrs > 0) {
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }

    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs + "." + (milliSecs < 100 ? "0" : "");
    ret += "" + milliSecs;
    return ret;
}






