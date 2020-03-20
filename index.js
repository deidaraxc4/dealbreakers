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
        this.players = {};
        this.playerList = [];
    }
}

class Player {
    constructor(name, id, roomCode) {
        this.name = name;
        this.id = id;
        this.roomCode = roomCode;
        this.ready = false;
        this.whiteCards = [];
        this.redCards = [];
    }
}

const gameRooms = {};

const onNewWebSocketConnection = (socket) => {
    console.info(`Socket ${socket.id} has connected.`);

    socket.on("disconnect", () => {
        console.info(`Socket ${socket.id} has disconnected.`);
        //TODO need to have socket leave the room and do something
        for(const roomCode in gameRooms) {
            console.log(roomCode);
            const players = gameRooms[roomCode].players;
            console.log(players)
            console.log(players[socket.id])
            if(players[socket.id]) {
                //emit something to the room to let everyone else know that guy left so we can updatee the waiting screeen
                const newPlayerList = gameRooms[roomCode].playerList.filter(player => player !== players[socket.id].name);
                gameRooms[roomCode].playerList = newPlayerList;
                io.in(players[socket.id].roomCode).emit("updatePlayerList", { players: newPlayerList});
                delete gameRooms[roomCode].players[socket.id];
            }
        }
    });

    const createNewGame = (data,) => {
        const gameId = Math.floor(10000 + Math.random() * 90000);
        console.log(gameId);
        console.log(data);
        socket.emit("newGameCreated", {gameId: gameId, mySocketId: socket.id, username: data.username});
        socket.join(gameId.toString());
        gameRooms[gameId] = new GameRoom(gameId);
        gameRooms[gameId].players[socket.id] = new Player(data.username, socket.id, gameId);
        gameRooms[gameId].playerList.push(data.username);
        //gameRooms[gameId].players.push(data.username);
        console.log(io.sockets.adapter.rooms);
    };

    const joinGame = (data) => {
        console.log(data)
        // check if gameId is good
        if(data.gameId in gameRooms) {
            socket.join(data.gameId);
            console.log(io.sockets.adapter.rooms);
            gameRooms[data.gameId].players[socket.id] = new Player(data.username, socket.id, data.gameId);
            gameRooms[data.gameId].playerList.push(data.username);
            //gameRooms[data.gameId].players.push(data.username);
            console.log("debug");
            console.log(gameRooms[data.gameId]);
            const players = gameRooms[data.gameId].playerList;
            io.in(data.gameId).emit("updatePlayerList", { players: players});
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