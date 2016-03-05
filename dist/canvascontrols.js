$(document).ready(function(){
    setupSocket();
});
var exampleSocket;
function setupSocket(){
    exampleSocket = new WebSocket("ws://" + window.location.hostname + ":" + window.location.port + "/droneinfostream");
    exampleSocket.onmessage = function (event) {
        //console.log(event.data);
        var data = JSON.parse(event.data);
        for (var key in data) {
            $("span[data='" + key + "'").text(data[key]);
        }
    };
}

function shutdown(){
    if (exampleSocket == undefined) return;
    exampleSocket.send(JSON.stringify({"command": "ShutdownApplication()"}));
}
function cancelTask(){
    if (exampleSocket == undefined) return;
    exampleSocket.send(JSON.stringify({"command": "cancelTask()"}));
}
function cancelTaskAndLand(){
    if (exampleSocket == undefined) return;
    exampleSocket.send(JSON.stringify({"command": "cancelTaskAndLand()"}));
}
function runSimpleTest(){
    exampleSocket.send(JSON.stringify({"command": "takeoff().after(4000, function(){land();});"}));
}
function runAdvancedTest(){
    if (exampleSocket == undefined) return;
    exampleSocket.send(JSON.stringify({"command": "takeoff().after(10, function(){testAltitude(1);});"}));
}

