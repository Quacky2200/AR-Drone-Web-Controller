//Variables
var http = require("http"),
    fs = require("fs"),
    dispatcher = require('httpdispatcher'),
    drone = require("./lib/server"),
    server = http.createServer(handleRequests),
    arDrone = require('ar-drone'),
    client = arDrone.createClient(),
    publicDir = "dist";
//Start listening
drone.listen(server);
server.listen(5555);
//HTTP server & drone server setup
function handleRequests(request, response){
    //Handle files

        //Regex expression for all valid filename's inside ./dist/*.* (js, png, etc...)
        var dirRegex = "(\\/" + publicDir + "\\/[\\w\\d\\-\\_]+\\.\\w{2,4}){1}";
        if((new RegExp(dirRegex)).test(request.url)) {
            var readFile = fs.createReadStream(__dirname + request.url);
            readFile.on("open", function(){
                readFile.pipe(response);
            });
            readFile.on("error", function(){
                response.writeHead(404, {'Content-Type': 'text/plain'});
                response.end("404 Not Found");
            });
            console.log("Handled public file to client (" + request.url + ")");
            return;
        }
        //Otherwise handle other URL requests
        dispatcher.dispatch(request, response);
        console.log("Handled request for " + request.url);

}
//Handle home URL
dispatcher.onGet("/", function(request, response){
    fs.createReadStream(__dirname + "/" +  publicDir + "/index.html").pipe(response);
});
//Handle 404 errors
dispatcher.onError(function(request, response){
    response.writeHead(404, {'Content-Type': 'text/plain'});
    response.end("404 Not Found");
});
//handle cancel page (kills the node process)
dispatcher.onGet("/cancel", function(request, response){
    console.log("Cancelled.");
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.end("Cancelling process...");
    client.stop();
    client.land();
    client.after(5000, function(){
        console.log("Aborted.");
        process.exit(-1);
    });
});
//Drone Info w/ WebSocket
var droneInfo = {
    "drone-id": "AR Drone 2.0",
    "drone-process": "Idle & Connected",
    "camera-id": "Camera 1",
    "battery-percentage": "100%",
    "battery-timeduration": "Less than a minute",
    "altitude-distance": "0m"
};
var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({server: server, path: '/droneinfostream'}),
    sockets = [];
function updateDroneInfo(){
    //TODO: send drone info to client...
    sockets.forEach(function (socket) {
        try {
            socket.send(JSON.stringify(droneInfo));
        } catch(err) {
            console.log('Websocket drone info error: %s', err);
        }
    });
}
wss.on('connection', function (socket) {
    socket.on('message', function incoming(message) {
        console.log('received: %s', message);
        var data = JSON.parse(message);
        switch(data['message']){
            case "cancel":
                break;
            case "doTest":
                //makeAltitudeTest();
                takeoff().after(4000, function(){
                    land();
                });
                break;
            default:
                updateDroneInfo();
        }
        eval(data['command']);
    });
    sockets.push(socket);
    updateDroneInfo();
    socket.on("close", function () {
        console.log("Closing drone info socket");
        sockets = sockets.filter(function (el) {
            return el !== socket;
        });
    });
});
//Drone main functionality implementation
function swapCameras(){
    //TODO: Change camera's and reassign the camera id
    droneInfo['camera-id'] = "Camera 1";
    updateDroneInfo();
}
function land(){
    //Landing
    droneInfo['drone-process'] = "Landing";
    console.log("Initiating landing procedure, blinking green, red");
    client.animateLeds('blinkGreenRed', 1.5, 5);
    client.stop();
    return goToAltitude(0.1).after(10, function(){
        client.land();
        landed = true;
        client.after(2000, function(){
            droneInfo['drone-process'] = "Landed";
            client.animateLeds('green', 1, 1);
            updateDroneInfo();
        });
    });
}
function cancelTask(){
    client.stop();
}
function cancelTaskAndLand(){
    landed = true;
    cancelTask();
    client.land();
}
function ShutdownApplication(){
    cancelTaskAndLand();
    client.after(5000, function(){
        process.exit(-1);
    });
}
function findTarget(){
    //Confused/Finding target...
    droneInfo['drone-process'] = "Finding Target";
    updateDroneInfo();
    client.animateLeds('snakeGreenRed', 2, 5);
}
function cameraDip(){
    //Camera Dip
    droneInfo['drone-process'] = "Dipping Camera";
    updateDroneInfo();
    client.animateLeds('blinkOrange', 10, 1);
    //Test tipping point
    //setTimeout(function(){
    //	client.takeoff();
    //
    //	client
    //	// .after(5000, function(){
    //	// 	client.stop();
    //	// 	client.front(0.25);
    //	// 	client.down(0.25);
    //	// })
    //	// .after(500, function(){
    //	// 	client.stop();
    //	// })
    //	.after(6000, function(){
    //		client.stop();
    //		client.land();
    //	});
    //}, 5000);
}
function takeoff(){
    //Rising
    client.takeoff();
    droneInfo['drone-process'] = "Taking off";
    updateDroneInfo();
    client.animateLeds('blinkGreenRed', 2.5, 5);
    return client.after(5000, function(){
        if (lastAltitude == 0) {
            droneInfo['drone-process'] = "Takeoff Failed " + (lastPercentage < 20 ? " (Low Battery..?)" : " (Emergency Mode..?)");
            updateDroneInfo();
            setTimeout(function(){
                //Let the message arrive to the client and quit slowly...
                console.log("takeoff failed, either bad battery or drone's in emergency mode. Quitting!");
                process.exit(-1);
            }, 1500);
        } else {
            droneInfo['drone-process'] = "Takeoff Complete";
            updateDroneInfo();
            requiredAltitude = 1;
            console.log("takeoff complete");
            landed = false;
            checkAltitude();
        }
    });
}
//Altitude drone control
var lastAltitude = 0;
client.on('altitudeChange', function(level){
    lastAltitude = level;
    droneInfo['altitude-distance'] = level + "m";
    console.log("Altitude: " + level + "m");
});
var landed = true;
var requiredAltitude = .25;
var speed = 0.25; //0.25 meters per second
function checkAltitude(){
    if (landed) return;
    var difference = requiredAltitude - lastAltitude;
    console.log(difference + "m difference");
    if(difference != 0) {
        return client
            .after(10, function () {
                droneInfo['drone-process'] = "Balancing Drone";
                updateDroneInfo();
                client.animateLeds("blinkOrange", 15, 1000 * (difference / speed));
                if (difference > 0) {
                    console.log("Adjusting to go higher (Diff:" + difference + "m)");
                    client.up(speed);
                } else {
                    console.log("Adjusting to go lower (Diff:" + difference + "m)");
                    client.down(speed);
                }
            })
            .after(1000 * (difference / speed), function () {
                droneInfo['drone-process'] = "Balanced";
                console.log("Adjustment done");
                client.stop();
                setTimeout(checkAltitude, 50);
            });
    }
}
function goToAltitude(altitude){
    droneInfo['drone-process'] = "Changing Altitude (" + requiredAltitude + "m -> " + altitude + "m)";
    requiredAltitude = altitude;
    return client;
}
//Batteries
var lastPercentage,
    lastPercentageTimeLong = (new Date()).getTime(),
    TimeRemaining = "Infinite";
client.on('batteryChange', function(level){
    if (lastPercentage == undefined || level < lastPercentage){
        var oldLastPercentage = lastPercentage;
        var oldPercentageTimeLong = lastPercentageTimeLong;
        lastPercentage = level;
        lastPercentageTimeLong = (new Date()).getTime();
        var remaining = new Date(oldPercentageTimeLong - lastPercentageTimeLong);
        remaining.setSeconds(remaining.getSeconds() * level);
        TimeRemaining = (remaining.getHours() > 0 ? remaining.getHours() + " hours, " : "") + (remaining.getMinutes() > 0 ? remaining.getMinutes() + " minutes" : "")
        if (TimeRemaining == "") TimeRemaining = "Less than a minute";
    }
    droneInfo["battery-percentage"] = lastPercentage + "%";
    droneInfo["battery-timeduration"] = TimeRemaining;
    updateDroneInfo();
    console.log("Battery: " + level + "%, " + TimeRemaining + " until flat");
});
//Tests
function testAltitude(i){
    console.log("Testing altitude " + i + "/10");
    droneInfo['drone-process'] = "Testing Altitude (" + i + "/10)";
    updateDroneInfo();
    if (i == 11) land().after(10, function(){process.exit(0);});
    requiredAltitude = 1 + ((i >= 5 ? 10 - i : i) / 10);
    setTimeout(function(){
        testAltitude(i+1);
    }, 2500);
}
function makeAltitudeTest(){
    takeoff().after(10, function(){
        testAltitude(1);
    });
}