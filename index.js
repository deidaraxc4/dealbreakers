const express = require('express');
const _ = require('lodash');
const port = process.env.PORT || 3000;
const favicon = require('serve-favicon');
const app = express();

const server = require('http').createServer(app);

const io = require('socket.io')(server)

app.use(express.static(`${__dirname}/public`));
app.use(favicon(__dirname + '/public/images/favicon.ico'));

server.listen(port, () => console.log(`listening on port ${port}`));

const perks = ["rich", "handsome", "has big house", "is doctor", "is celebrity", "is tall", "is cool", "is nice", "is alive", "has car", "is funny"];
//const perks = ["rich", "handsome", "badass"];
const dealbreakers = ["ugly", "bad breath", "smelly", "cant read", "is dumb", "will cheat"];

class GameRoom {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.players = {};//Player object
        this.playerList = [];
        this.whiteDeck = new CardDeck([...perks]);
        this.redDeck = new CardDeck([...dealbreakers]);
        this.currentSingleSocketId = null;
        this.stage = "Waiting on players to add perks...";
        this.submissions = {};//socket id key to Date object value
        //this.submissionMapping = new Map(); //socket id key to username value, socket id will get the next index's username
    }

    unreadyAllPlayers() {
        for(let [key, value] of Object.entries(this.players)) {
            console.log("LINE 23")
            console.log(key)
            console.log(value)
            value.ready = false;
            console.log(value)
        }
    }

    // return true if all players ready
    allPlayersReady() {
        for(let [key, value] of Object.entries(this.players)) {
            if(!value.ready) {
                return false;
            }
        }
        return true;
    }

    setSinglePlayer() {
        const socketIds = Object.keys(this.players);
        console.log("line52"+socketIds);
        // check current single and get its index, set single to the next person or if end of array set back to the first
        if(this.currentSingleSocketId) {
            const currentSingleIndex =socketIds.indexOf(this.currentSingleSocketId)
            if(currentSingleIndex + 1 >= socketIds.length) {
                this.currentSingleSocketId = socketIds[0];
            } else {
                this.currentSingleSocketId = socketIds[currentSingleIndex + 1];
            }
        } else {
            this.currentSingleSocketId = socketIds[0];
        }
    }

    whoIsSingle() {
        return this.currentSingleSocketId;
    }

    // deal everyone cards until they have 4 white cards, 2 red cards
    giveEveryoneCards() {
        for(let [key, value] of Object.entries(this.players)) {
            const currentAmountWhiteCards = value.whiteCards.length;
            const currentAmountRedCards = value.redCards.length;
            //console.log(currentAmountRedCards, currentAmountWhiteCards);
            const amountWhiteToDeal = 4 - currentAmountWhiteCards;
            const amountRedToDeal = 2 - currentAmountRedCards;
            value.whiteCards = value.whiteCards.concat(this.whiteDeck.dealCards(amountWhiteToDeal));
            value.redCards = value.redCards.concat(this.redDeck.dealCards(amountRedToDeal));
        }
    }

    // start the round by emitting designatedSingle event to the socket who is single, and everyone else emit designatedAuctioner event
    startRound() {
        console.log("line85")
        console.log(gameRooms[this.roomCode].players)
        io.to(gameRooms[this.roomCode].whoIsSingle()).emit("designatedSingle", {stage: gameRooms[this.roomCode].stage});
        for(let key of Object.keys(this.players)) {
            if(key !== this.currentSingleSocketId) {
                io.to(key).emit("designatedAuctioner", {whiteCards: this.players[key].whiteCards, redCards: this.players[key].redCards, phase: "white", pickAmount: 2, instructions: "Pick 2 perks"});
            }
        }
    }

    // emit event to single to alert phase change and alert auctioners event to pick red cards
    redCardRound() {
        this.stage = "Waiting on players  to add dealbreakers...";
        io.to(gameRooms[this.roomCode].whoIsSingle()).emit("singleUpdateState", {stage: this.stage});
        // need logic to pass the person to the left whitecards to next auctioner
        const submissionMapping = this.getSubmissionMapping();
        // now we know who gets who cards


        for(let key of Object.keys(this.players)) {
            if(key !== this.currentSingleSocketId) {
                // get the username
                const username = this.players[key].name;
                const userCardsToGet = submissionMapping.get(username);
                const submission = this.submissions[userCardsToGet];
                io.to(key).emit("redCardPhase", {redCards: this.players[key].redCards, competingDatePerk1: submission.perk1, competingDatePerk2: submission.perk2, 
                    competingUser: userCardsToGet, instructions: "Pick 1 dealbreaker", phase: "red", pickAmount: 1 });
            }
        }
    }

    singlePersonVotes() {
        this.stage = "Choose who you would date";
        io.to(this.whoIsSingle()).emit("singleUpdateState", {stage: this.stage});
        io.to(this.whoIsSingle()).emit("displayFinalDateChoices", {submissions: this.submissions});
        for(let key of Object.keys(this.players)) {
            if(key !== this.currentSingleSocketId) {
                io.to(key).emit("leftOnRead", {message: "Stop checking if they replied to your message", stage: "Waiting on single to choose a date"});
            }
        }
    }

    getSubmissionMapping() {
        //TODO this wont work if we have duplicate names so we need validation there when people try joining
        // determine the single and start one index over it
        const submissionMapping = new Map();
        const singleUsername = this.players[this.currentSingleSocketId].name;
        console.log("line 113 "+singleUsername);
        let playerListMinusSingle = [...this.playerList];
        playerListMinusSingle = playerListMinusSingle.filter(e => e!== singleUsername);
        for(let i = 0; i < playerListMinusSingle.length; i++) {
            let key = playerListMinusSingle[i];
            let value;
            if(i+1 === playerListMinusSingle.length) {
                value = playerListMinusSingle[0]; 
            } else {
                value = playerListMinusSingle[i+1];
            }
            submissionMapping.set(key, value);
        }
        return submissionMapping;
    }

    areAllRedCardsSubmitted() {
        for(let [key, value] of Object.entries(this.submissions)) {
            if(!value.dealbreaker) {
                return false;
            }
        }
        return true;
    }

    clearSubmissions() {
        this.submissions = {};
    }

    endRoundAndGivePoint(winner) {
        // give the point, TODO really need to enforce unique names
        for(let [key, value] of Object.entries(this.players)) {
            if(value.name === winner) {
                value.points += 1;
                break;
            }
        }
        // emit message to single and give them ability to start next round
        io.to(this.whoIsSingle()).emit("promptToStartNextRound", {chosenWinner: winner});
        // emit message to everyone else informing the winner
        for(let key of Object.keys(this.players)) {
            if(key !== this.currentSingleSocketId) {
                io.to(key).emit("informWinner", {chosenWinner: winner});
            }
        }
        // deal out cards, clear submissions and determine next single
        this.stage = "Waiting on players to add perks...";
        this.clearSubmissions();
        this.giveEveryoneCards();
        this.setSinglePlayer();
    }
}

class CardDeck {
    constructor(cards) {
        this.cards = this.shuffle(cards);
        this.discard = [];
    }

    shuffle(cards) {
        let shuffledCards = [];

        shuffledCards = _.shuffle(cards)

        return shuffledCards;
    }

    reShuffle() {
        const x = this.shuffle(this.discard);
        this.cards = this.cards.concat(x)
    }

    dealCards(amount) {
        const hand = [];
        for(let i = 0; i < amount; i++) {
            // check this.cards array is not empty if it is then reshuffle the discard array and empty into the new deck
            if(this.cards.length == 0) {
                this.reShuffle();
                this.discard = [];
            }
            const card = this.cards.pop();
            hand.push(card);
            this.discard.push(card);
        }
        return hand;
    }

    get count() {
        return this.cards.length;
    }
}

class Player {
    constructor(name, id, roomCode) {
        this.name = name;
        this.id = id;
        this.roomCode = roomCode;
        this.ready = false;
        this.points = 0;
        this.whiteCards = [];
        this.redCards = [];
    }

    discardCards(whiteCards, redCards) {
        this.whiteCards = this.whiteCards.filter(e => !whiteCards.includes(e));
        this.redCards = this.redCards.filter(e => !redCards.includes(e));
    }
}

class Date {
    constructor(perk1, perk2, dealbreaker) {
        this.perk1 = perk1,
        this.perk2 = perk2,
        this.dealbreaker = dealbreaker;
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
                //unready all players in the room
                gameRooms[roomCode].unreadyAllPlayers();
                //emit something to the room to let everyone else know that guy left so we can updatee the waiting screeen
                const newPlayerList = gameRooms[roomCode].playerList.filter(player => player !== players[socket.id].name);
                gameRooms[roomCode].playerList = newPlayerList;
                io.in(players[socket.id].roomCode).emit("updatePlayerList", { players: newPlayerList});
                delete gameRooms[roomCode].players[socket.id];
                // if room is completely empty now, delete it
                if(gameRooms[roomCode].playerList.length == 0) {
                    delete gameRooms[roomCode];
                }
                // console.log(gameRooms[roomCode])
            }
        }
        console.log("line275");
        console.log(gameRooms)
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
            //unready all players
            gameRooms[data.gameId].unreadyAllPlayers();
            console.log("debug");
            console.log(gameRooms[data.gameId]);
            const players = gameRooms[data.gameId].playerList;
            io.in(data.gameId).emit("updatePlayerList", { players: players});
        } else {
            console.log("bad id");
            socket.emit("badGameId", {message: "game id does not exist"});
        }
    };

    const readyPlayer = (data) => {
        console.log(data)
        gameRooms[data.gameId].players[socket.id].ready = true;
        console.log(gameRooms[data.gameId].players)
        // emit back event to show all clients the player ready
        io.in(data.gameId).emit("readyPlayerStatus", { player: data.username});
        // check if we have at least 3 players in room and all players in room are ready then emit event to begin game
        if(gameRooms[data.gameId].playerList.length >= 3 && gameRooms[data.gameId].allPlayersReady()) {
            console.log("more than or equal 3 players are in room and all are ready");
            gameRooms[data.gameId].setSinglePlayer();
            //console.log(gameRooms[data.gameId]);
            // deal 4 perks 2 dealbreakers to everyone
            gameRooms[data.gameId].giveEveryoneCards();
            console.log(gameRooms[data.gameId]);
            gameRooms[data.gameId].startRound();
            // io.to(gameRooms[data.gameId].whoIsSingle()).emit("designatedSingle", {stage: gameRooms[data.gameId].stage});

            // send event to socketid with io.to() to tell them they are single and another event to auctioners
        }
    };

    const whiteCardSubmission = (data) => {
        console.log(data);
        gameRooms[data.gameId].submissions[data.username] = new Date(data.whiteCards[0], data.whiteCards[1], null);
        console.log(gameRooms[data.gameId]);
        // emit event back to socket so that they know they are waiting on other submissions
        socket.emit("postWhiteCardSubmission", {message: "Waiting on others to finalize their dates"});
        // remove the white cards from their hand
        gameRooms[data.gameId].players[socket.id].discardCards(data.whiteCards, []);
        // check that we have a submission from everyone minus the single, if we do then emit event back to auctioners for red card phase
        const numNeededSubmisisons = gameRooms[data.gameId].playerList.length - 1;
        if(Object.keys(gameRooms[data.gameId].submissions).length == numNeededSubmisisons) {
            // emit event to single to let them know phase change
            gameRooms[data.gameId].redCardRound();
            // gameRooms[data.gameId].stage = "Waiting on players  to add dealbreakers...";
            // io.to(gameRooms[data.gameId].whoIsSingle()).emit("singleUpdateState", {stage: gameRooms[data.gameId].stage});

        }
    };

    const redCardSubmission = (data) => {
        console.log(data);
        gameRooms[data.gameId].submissions[data.username].dealbreaker = data.redCards[0];
        console.log(gameRooms[data.gameId]);
        // emit event back to socket so they know they are waiting on others
        socket.emit("postRedCardSubmission", {message: "Waiting on others to sabotage each others' dates"});
        // remove the red card from their hand
        gameRooms[data.gameId].players[socket.id].discardCards([], data.redCards);
        // check that we have all submissions from everyone minus the single
        if(gameRooms[data.gameId].areAllRedCardsSubmitted()) {
            gameRooms[data.gameId].singlePersonVotes();
        }
    };

    const dateWinnerSubmission = (data) => {
        console.log(data);
        gameRooms[data.gameId].endRoundAndGivePoint(data.winner);
    };

    const startRound = (data) => {
        gameRooms[data.gameId].startRound();
    };
    
    // listen for client sending event
    socket.on("hello", helloMsg => console.info(`Socket ${socket.id} says: ${helloMsg}`));
    socket.on("createNewGame", createNewGame);
    socket.on("joinGame", joinGame);
    socket.on("readyPlayer", readyPlayer);
    socket.on("whiteCardSubmission", whiteCardSubmission);
    socket.on("redCardSubmission", redCardSubmission);
    socket.on("dateWinnerSubmission", dateWinnerSubmission);
    socket.on("nextRound", startRound);
};

io.sockets.on('connection', onNewWebSocketConnection);

// console.log("testing deck")
// const x = new GameRoom("123");
// x.players["socketid"] = new Player("bob", "socketid", "123");
// x.players["socketid2"] = new Player("joe", "socketid2", "123");
// x.players["socketid3"] = new Player("juan", "socketid3", "123");
// console.log(x)
// x.giveEveryoneCards();
// x.giveEveryoneCards();
// x.giveEveryoneCards();
// // const cards = x.whiteDeck.dealCards(10);
// // console.log(cards);
// console.log("line210")
// console.log(x.players);
// console.log("line224")
// // console.log(x)
// console.log("line236")
// x.players["socketid"].discardCards(["is doctor", "handsome", "rich", "is cool", "is celebrity", "badinput"], ["bad breath", "smelly", "is dumb", "will cheat"]);
// console.log(x.players)