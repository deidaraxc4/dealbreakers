const express = require('express');
const port = process.env.PORT || 3000;

const app = express();

const server = require('http').createServer(app);

const io = require('socket.io')(server)

app.use(express.static(`${__dirname}/public`));

server.listen(port, () => console.log(`listening on port ${port}`));

let onlineClients = new Set();
let nextVisitorNumber = 1;

const onNewWebSocketConnection = (socket) => {
    console.info(`Socket ${socket.id} has connected.`);
    onlineClients.add(socket.id);

    socket.on("disconnect", () => {
        onlineClients.delete(socket.id);
        console.info(`Socket ${socket.id} has disconnected.`);
    });

    socket.on("hello", helloMsg => console.info(`Socket ${socket.id} says: ${helloMsg}`));

    socket.emit("welcome", `Welcome you are visitor number ${nextVisitorNumber++}`);
};

io.sockets.on('connection', onNewWebSocketConnection);

// timed event
let secondsSinceServerStarted = 0;
setInterval(() => {
    secondsSinceServerStarted++;
    io.emit("seconds", secondsSinceServerStarted);
    io.emit("online", onlineClients.size);
}, 1000);