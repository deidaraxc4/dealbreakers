const express = require('express');
const port = process.env.PORT || 3000;

const app = express();

const server = require('http').createServer(app);

const io = require('socket.io')(server)

app.use(express.static(`${__dirname}/public`));

server.listen(port, () => console.log(`listening on port ${port}`));

class GameRoom {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.players = [];
    }
}

const gameRooms = {};

const onNewWebSocketConnection = (socket) => {
    console.info(`Socket ${socket.id} has connected.`);

    socket.on("disconnect", () => {
        console.info(`Socket ${socket.id} has disconnected.`);
    });

    const createNewGame = (data) => {
        const gameId = Math.floor(10000 + Math.random() * 90000);
        console.log(gameId);
        console.log(data);
        socket.emit("newGameCreated", {gameId: gameId, mySocketId: socket.id, username: data.username});
        socket.join(gameId.toString());
        //gameRooms.push(gameId);
        gameRooms[gameId] = new GameRoom(gameId);
        gameRooms[gameId].players.push(data.username);
        console.log(io.sockets.adapter.rooms);
        //socket.to(gameId.toString()).emit("newGameCreated", {gameId: gameId, mySocketId: socket.id, username: data.username});
        //console.log(io.sockets.clients(gameId.toString()));
    };

    const joinGame = (data) => {
        console.log(data)
        //const numGameId = Number(data.gameId)
        // check if gameId is good
        if(data.gameId in gameRooms) {
            socket.join(data.gameId);
            console.log(io.sockets.adapter.rooms);
            gameRooms[data.gameId].players.push(data.username);
            console.log("debug");
            console.log(gameRooms[data.gameId]);
            const players = gameRooms[data.gameId].players;
            io.in(data.gameId).emit("playerJoinedGame", { players: players});
        } else {
            console.log("bad id");
            socket.emit("badGameId", {message: "game id does not exist"});
        }
    };
    
    // listen for client sending event
    socket.on("hello", helloMsg => console.info(`Socket ${socket.id} says: ${helloMsg}`));
    socket.on("createNewGame", createNewGame);
    socket.on("joinGame", joinGame)
};

io.sockets.on('connection', onNewWebSocketConnection);