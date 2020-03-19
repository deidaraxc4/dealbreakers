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
    },

    showInitScreen: () => {
        App.gameArea.html(App.templateIntroScreen);
    },

    bindEvents: () => {
        App.doc.on('click', '#btnCreateGame', App.createGame);
        App.doc.on('click', '#btnJoinGame', App.joinGame);
    },

    // game logic
    createGame: () => {
        // todo check for name input
        console.log("you clicked create game")
    },

    joinGame: () => {
        console.log("you clicked join game")
    }
};

const main = () => {
    const socket = io();
    socket.on("connect", () => socket.emit("hello", `hello I am here`));

    console.log("jquery");

    // initialize
    App.init();

};

main();