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

function toggleFullscreen(){

    if(document.fullscreenElement === null) {
        document.documentElement.requestFullscreen();
    } else {
        window.location.reload(true); 
    };  
};

function loadingRoutine() {
    startConnection();
    setInterval(checkConnection(), 5000);
}

function startConnection() {
    console.log('Attempting to create new websocket connection');
    socket = new WebSocket('ws://192.168.178.50:8080');
    var sessionInfo = null;
    var telem = null;

    socket.onopen = function (event) {
        console.log("WebSocket connection open, sending confirmation to data source");
        //socket.send("webapp connected and ready to recieve data");
        //displayConnectionState();
    };

    socket.onmessage = function (event) { 

        

        let data = JSON.parse(event.data)

        if (data.test === "test") {
            //console.log("success")
        } else {
            let gear = null
            if (data.gear == -1) {
                gear = 'R'
            } else if (data.gear == 0){
                gear = 'N'
            } else {
                gear = data.gear
            };
            document.getElementById('gear').innerHTML = gear;
            document.getElementById('rpm').innerHTML = data.rpm.toFixed(0);
            document.getElementById('speed').innerHTML = (2.23694 * data.speed).toFixed(0);
            document.getElementById('fuel-amount').innerHTML = data.fuel_level.toFixed(2);
            document.getElementById('brake-bias').innerHTML = data.brake_bias.toFixed(1);
            document.getElementById('abs').innerHTML = data.abs;
            document.getElementById('traction-control').innerHTML = data.tc_value;
            document.getElementById('diff-value').innerHTML = data.tc_value;

            //document.getElementById('oil-temp').innerHTML = data.oil_temp.toFixed(1);
            // document.getElementById('water-temp').innerHTML = data.water_temp.toFixed(1);
            // document.getElementById('track-temp').innerHTML = data.track_temp.toFixed(1);
            // document.getElementById('ambient-temp').innerHTML = data.ambient_temp.toFixed(1);
            // document.getElementById('fuel-level-value').innerHTML = data.fuel_level.toFixed(2);
            document.getElementById('current-revs').style.width = (100 * (data.rpm / data.redline)) + '%'
            document.getElementById('throttle-pressure-value').style.height = (100 * data.throttle) + '%'
            document.getElementById('brake-pressure-value').style.height = (100 * data.brake) + '%'
            if (data.throttle === 1) {
                document.getElementById('throttle-100pct-indicator').style.display = 'block'
            } else {
                document.getElementById('throttle-100pct-indicator').style.display = 'none'
            };
            
            switch(data.shift_light) {
                case 0:
                    document.getElementById('shift-light-1-left').style.backgroundColor = "black"
                    document.getElementById('shift-light-2-left').style.backgroundColor = "black"
                    document.getElementById('shift-light-3-left').style.backgroundColor = "black"
                    document.getElementById('shift-light-4-left').style.backgroundColor = "black"
                    document.getElementById('shift-light-1-right').style.backgroundColor = "black"
                    document.getElementById('shift-light-2-right').style.backgroundColor = "black"
                    document.getElementById('shift-light-3-right').style.backgroundColor = "black"
                    document.getElementById('shift-light-4-right').style.backgroundColor = "black"
                    break;
                case 1: 
                    document.getElementById('shift-light-1-left').style.backgroundColor = "#ffe100"
                    document.getElementById('shift-light-2-left').style.backgroundColor = "black"
                    document.getElementById('shift-light-3-left').style.backgroundColor = "black"
                    document.getElementById('shift-light-4-left').style.backgroundColor = "black"
                    document.getElementById('shift-light-1-right').style.backgroundColor = "#ffe100"
                    document.getElementById('shift-light-2-right').style.backgroundColor = "black"
                    document.getElementById('shift-light-3-right').style.backgroundColor = "black"
                    document.getElementById('shift-light-4-right').style.backgroundColor = "black"
                    break;            
                case 2: 
                    document.getElementById('shift-light-1-left').style.backgroundColor = "#ffe100"
                    document.getElementById('shift-light-2-left').style.backgroundColor = "#ffaa00"
                    document.getElementById('shift-light-3-left').style.backgroundColor = "black"
                    document.getElementById('shift-light-4-left').style.backgroundColor = "black"
                    document.getElementById('shift-light-1-right').style.backgroundColor = "#ffe100"
                    document.getElementById('shift-light-2-right').style.backgroundColor = "#ffaa00"
                    document.getElementById('shift-light-3-right').style.backgroundColor = "black"
                    document.getElementById('shift-light-4-right').style.backgroundColor = "black"
                    break;
                case 3: 
                    document.getElementById('shift-light-1-left').style.backgroundColor = "#ffe100"
                    document.getElementById('shift-light-2-left').style.backgroundColor = "#ffaa00"
                    document.getElementById('shift-light-3-left').style.backgroundColor = "#ff6200"
                    document.getElementById('shift-light-4-left').style.backgroundColor = "black"
                    document.getElementById('shift-light-1-right').style.backgroundColor = "#ffe100"
                    document.getElementById('shift-light-2-right').style.backgroundColor = "#ffaa00"
                    document.getElementById('shift-light-3-right').style.backgroundColor = "#ff6200"
                    document.getElementById('shift-light-4-right').style.backgroundColor = "black"
                    break;
                case 4: 
                    document.getElementById('shift-light-1-left').style.backgroundColor = "#ff0000"
                    document.getElementById('shift-light-2-left').style.backgroundColor = "#ff0000"
                    document.getElementById('shift-light-3-left').style.backgroundColor = "#ff0000"
                    document.getElementById('shift-light-4-left').style.backgroundColor = "#ff0000"
                    document.getElementById('shift-light-1-right').style.backgroundColor = "#ff0000"
                    document.getElementById('shift-light-2-right').style.backgroundColor = "#ff0000"
                    document.getElementById('shift-light-3-right').style.backgroundColor = "#ff0000"
                    document.getElementById('shift-light-4-right').style.backgroundColor = "#ff0000"
                    break;            
            };        
        };
        // if (isJSON(event.data)) {
        //     console.log("this is telemetry data");
        //     telem = JSON.parse(event.data);
        //     console.log(telem);

        //     //Session details
        //     document.getElementById('trackTemp').innerHTML = telem.trackTemp
        //     document.getElementById('airTemp').innerHTML = telem.airTemp
        //     document.getElementById('skyConditions').innerHTML = telem.skyConditions
        //     document.getElementById('softRedLine').style.width = telem.softRedLine

        //     //Rev and gear information
        //     document.getElementById('currentRevsBar').style.width = telem.revBarWidth;
        //     document.getElementById('currGear').innerHTML = telem.currGear;
        //     document.getElementById('currRevs').innerHTML = telem.currRevs;
        //     document.getElementById('currSpeed').innerHTML = telem.currSpeed;

        //     if (telem.shiftLight === true) {
        //         document.getElementById('revCounterBorder').style.borderColor = "#FF0000";
        //         document.getElementById('revsArea').style.backgroundColor = "#FF0000";
        //     } else {
        //         document.getElementById('revCounterBorder').style.borderColor = "#0f1214";
        //         document.getElementById('revsArea').style.backgroundColor = "#0f1214";
        //     }

        //     //Output lap numbers and fuel details
        //     document.getElementById('fuelRemaining').innerHTML = telem.fuelRemaining;
        //     document.getElementById('currentLap').innerHTML = telem.currentLap;
        //     document.getElementById('lastLapUsage').innerHTML = telem.lastLapUsage;
        //     document.getElementById('minLapUsage').innerHTML = telem.minLapUsage;
        //     document.getElementById('maxLapUsage').innerHTML = telem.maxLapUsage;
        //     document.getElementById('avgLapUsage').innerHTML = telem.avgLapUsage;
        //     document.getElementById('lapsThisStint').innerHTML = telem.lapsThisStint;

        //     //Output lap timings
        //     document.getElementById('lastLapTime').innerHTML = telem.lastLapTime;
        //     document.getElementById('bestSessionLapTime').innerHTML = telem.bestLapTime;
        //     document.getElementById('optimumLapTime').innerHTML = telem.optimumLapTime;
        //     document.getElementById('bestStintLapTime').innerHTML = telem.bestStintLapTime;
        //     document.getElementById('avgStintLapTime').innerHTML = telem.avgStintLapTime;

        //     //Lap Progress bars
        //     document.getElementById('thisLapProgress').style.width = telem.thisLapProgress;
        //     let elements = document.getElementsByClassName('lapComparisonBar');       
        //     for (let i = 0; i < elements.length; i++) {
        //         elements[i].style.width = telem.thisLapProgress;
        //     }
        //     document.getElementById('bestSessionLapProgress').style.width = telem.bestSessionLapProgress;
        //     document.getElementById('optimumSessionLapProgress').style.width = telem.optimumSessionLapProgress;
        //     document.getElementById('lastLapProgress').style.width = telem.lastLapProgress;

        //     //lap deltas
        //     document.getElementById('lastLapDelta').innerHTML = telem.lastLapDelta;
        //     document.getElementById('bestLapDelta').innerHTML = telem.bestLapDelta;
        //     document.getElementById('optimumLapDelta').innerHTML = telem.optimumLapDelta;

        //     let elements2 = document.getElementsByClassName('deltaTime');
        //     for (let j = 0; j < elements2.length; j++) {
        //         if (elements2[j].innerHTML < -0.05) {
        //             elements2[j].style.color = "#5aff3d"
        //         } else if (elements2[j].innerHTML > 0.05) {
        //             elements2[j].style.color = "#ff1100"
        //         } else {
        //             elements2[j].style.color = "#A2A8AD"
        //         }

            
        //     }
            
               
        // } else {
        //     if (event.data == "Connected to iRacing") {
        //         document.getElementById('irStatus').innerHTML = "Running"
        //     };
        //     if (event.data == "Disconnected from iRacing") {
        //         document.getElementById('irStatus').innerHTML = "Not Running"
        //     }
        // }


    }

    socket.onclose = function (event) {
        console.log('WebSocket closing');
        //displayConnectionState();
        checkConnection()
    };

};

function checkConnection() {
    if (!socket || socket.readyState == WebSocket.CLOSED) {
        startConnection()
    }
}
