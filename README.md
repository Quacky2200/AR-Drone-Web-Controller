# AR Drone Web Controller

Implement and control your drone right from your browser along with a realtime live video stream.

Implemented as part of [node-dronestream](https://github.com/bkw/node-dronestream) and [ar-drone](https://github.com/felixge/node-ar-drone) Node.JS repos. Please read these repo's 
so that you can add more functionality to your drone as part of this implementation.

**N.B. The index.js file is where most of this implementation is, because of the situation when the
repo was built, the index.js file was never split into a better layout with multiple files. Instead, 
the index.js file contains a large amount of code. (If this project gets updated, this will be one
of the first things to change). **

## How it works
#### The video feed
The drone sends a proprietary video feed on 192.168.1.1 port 5555. This is
mostly a h264 baseline video, but adds custom framing. These frames are parse
and mostly disposed of. The remaining h264 payload is split into NAL units and
sent to the browser via web sockets.

In the browser broadway takes care of the rendering of the WebGL canvas.

#### The HUD (Heads Up Display)
The HUD is implemented with HTML and a web socket that communicates between the
browser and the Node JS server. The information is then updated when any change
to the information occurs. The updates then get shown automatically on the 
website. To add information you will have to edit both the HTML and the
index.js script.

#### Commanding the drone
The commands that you can click on the website uses the same web socket as the 
HUD. The commands can get sent either as a message (that can be interpreted 
in whatever way you like) or a command that will get evaluated in Node.JS in
real-time. At the moment, there shouldn't be much of a problem evaluating 
javascript code until this is used in a production or outside environment that
would benefit as protection to remove the evaluation functionality.

The project was created for a open sauce hackathon as a look-into getting a drone
to land on an NFC device, however the project created by my university friend 
scrapped the idea, so I decided to keep the code for future use or practicality.

Kudos.
