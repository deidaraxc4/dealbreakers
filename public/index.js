const socket = io();
socket.on("connect", () => socket.emit("hello", `hello I am here`));

// namespace for code relating to socket.io
const IO = {
    init: () => {
        // bind events
        IO.bindEvents();
    },

    bindEvents: () => {
        socket.on("newGameCreated", IO.onNewGameCreated);
        socket.on("badGameId", IO.onBadGameId);
        socket.on("updatePlayerList", IO.onUpdatePlayerList);
        socket.on("readyPlayerStatus", IO.onReadyPlayerStatus);
        socket.on("designatedSingle", IO.onDesignatedSingle);
        socket.on("designatedAuctioner", IO.onDesignatedAuctioner);
    },

    onNewGameCreated: (data) => {
        console.log(data);
        App.gameInit(data);
    },

    onBadGameId: (data) => {
        console.log(data);
        window.alert(data.message);
    },

    onUpdatePlayerList: (data) => {
        console.log(data);
        App.displayWaitingRoom();
        App.updatePlayers(data.players);
    },

    onReadyPlayerStatus: (data) => {
        console.log(data);
        App.updateReadyStatus(data.player);
    },

    onDesignatedSingle: (data) => {
        console.log(data);
    },

    onDesignatedAuctioner: (data) => {
        console.log(data);
    },
};

// namespace for code relating to the game logic
const App = {

    gameId: 0,
    mySocketId: '',
    currentRound: 0,
    numPlayersInRoom: 0,
    username: '',

    init: () => {
        App.cacheElements();
        App.showInitScreen();
        App.bindEvents();
    },

    cacheElements: () => {
        App.doc = $(document);

        App.gameArea = $('#gameArea');
        App.templateIntroScreen = $('#intro-screen-template').html();
        App.templateWaitingScreen = $('#waiting-screen-template').html();
        App.templateJoinScreen = $('#join-screen-template').html();
        App.templateSingleScreen = $('#single-player-game-screen-template').html();
        App.templateAuctionScreen = $('#auction-player-game-screen-template').html();
    },

    showInitScreen: () => {
        App.gameArea.html(App.templateIntroScreen);
    },

    bindEvents: () => {
        App.doc.on('click', '#btnCreateGame', App.createGame);
        App.doc.on('click', '#btnJoinGame', App.joinGame);
        App.doc.on('click', '#btnBackIntro', App.showInitScreen);
        App.doc.on('click', '#btnJoinRoom', App.joinGameRoom);
        App.doc.on('click', '#btnReady', App.readyPlayer);
    },

    gameInit: (data) => {
        App.gameId = data.gameId;
        App.mySocketId = data.mySocketId;
        App.numPlayersInRoom += 1;

        App.displayWaitingRoom();
        App.updatePlayers([data.username]);
    },

    // game logic
    createGame: () => {
        const username = $('#usernameInput').val();
        App.username = username;
        console.log(username);
        if(username) {
            console.log("you clicked create game");
            // need to emit some socket event so the backend can create a random gameId and join the gameId with socket.join
            socket.emit('createNewGame', { username: username });
            // App.displayWaitingRoom();
            return;
        }
        window.alert("You forgot your name");
    },

    // go to join game screen
    joinGame: () => {
        const username = $('#usernameInput').val();
        App.username = username;
        console.log(username);
        if(username) {
            console.log("you clicked join game");
            App.displayJoinRoom();
            return;
        }
        window.alert("You forgot your name");
    },

    // actually join a game
    joinGameRoom: () => {
        const roomCode = $('#roomCodeInput').val();
        if(roomCode.length >= 5) {
            console.log("You joined room "+ roomCode);
            App.gameId = roomCode;
            socket.emit('joinGame', {gameId: roomCode, username: App.username});
            // emit some socket event so the backend can add user to game room and check room is valid
            //App.displayWaitingRoom();
            return;
        }
        window.alert("Room codes are 5 digits long, can you count?");
    },

    readyPlayer: () => {
        console.log("You clicked ready "+socket.id)
        socket.emit("readyPlayer", {username: App.username, gameId: App.gameId});
    },

    displayWaitingRoom: () => {
        App.gameArea.html(App.templateWaitingScreen);
        $("#roomCode").text(App.gameId);
    },

    displayJoinRoom: () => {
        App.gameArea.html(App.templateJoinScreen);
    },

    updatePlayers: (players) => {
        // clear existing ones
        $("#players").empty();
        players.map((player) => {
            $("#players").append('<p class="font-weight-bold">'+player+'</p>')
        });
    },

    updateReadyStatus: (player) => {
        $('p:contains('+player+')').html(player+" &#9829").css('color', 'red');
    },
};

const main = () => {
    console.log("jquery");

    // initialize
    IO.init();
    App.init();

};

main();