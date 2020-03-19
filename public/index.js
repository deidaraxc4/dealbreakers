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
    },

    cacheElements: () => {
        App.gameArea = $('#gameArea');
    },

    showInitScreen: () => {
        $('#gameArea').html()
        const templateIntroScreen = $('#intro-screen-template').html();
        App.gameArea.html(templateIntroScreen);
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