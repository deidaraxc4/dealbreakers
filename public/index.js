// namespace for code relating to socket.io
const IO = {
    init: () => {

    },
};

// namespace for code relating to the game logic
const App = {

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
    },

    showInitScreen: () => {
        App.gameArea.html(App.templateIntroScreen);
    },

    bindEvents: () => {
        App.doc.on('click', '#btnCreateGame', App.createGame);
        App.doc.on('click', '#btnJoinGame', App.joinGame);
        App.doc.on('click', '#btnBackIntro', App.showInitScreen);
        App.doc.on('click', '#btnJoinRoom', App.joinGameRoom);
    },

    // game logic
    createGame: () => {
        const username = $('#usernameInput').val();
        console.log(username);
        if(username) {
            console.log("you clicked create game");
            // need to emit some socket event so the backend can create a random gameId and join the gameId with socket.join
            App.displayWaitingRoom();
            return;
        }
        window.alert("You forgot your name");
    },

    // go to join game screen
    joinGame: () => {
        const username = $('#usernameInput').val();
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
        if(roomCode) {
            console.log("You joined room "+ roomCode);
            // emit some socket event so the backend can add user to game room and check room is valid
            App.displayWaitingRoom();
            return;
        }
        window.alert("Room codes are 5 digits long, can you count?");
    },

    displayWaitingRoom: () => {
        App.gameArea.html(App.templateWaitingScreen);
    },

    displayJoinRoom: () => {
        App.gameArea.html(App.templateJoinScreen);
    },
};

const main = () => {
    const socket = io();
    socket.on("connect", () => socket.emit("hello", `hello I am here`));

    console.log("jquery");

    // initialize
    App.init();

};

main();