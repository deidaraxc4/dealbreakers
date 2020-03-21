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
        socket.on("postWhiteCardSubmission", IO.onPostWhiteCardSubmission);
        socket.on("singleUpdateState", IO.onSingleUpdateState);
        socket.on("redCardPhase", IO. onRedCardPhase);
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
        // change screen and display waiting status
        App.displaySingleRoom();
        App.updateSingleRoomGamePhase(data.stage);
    },

    onDesignatedAuctioner: (data) => {
        console.log(data);
        //todo backend also send out whether its white phase or red phase so we render the buttons to select for it and how many to select too
        // change screen and display data as cards with jquery
        App.phase = data.phase;
        App.pickAmount = data.pickAmount;
        App.displayAuctionRoom();
        App.updateAuctionRoomTitle("Time to build that perfect date");
        App.updateAuctionRoomGamePhase(data.instructions);
        App.auctionRoomRenderWhiteCards(data.whiteCards);
    },

    onPostWhiteCardSubmission: (data) => {
        console.log(data);
        App.displayPostSubmissionRoom();
        App.updatePostSubmissionMessage(data.message);
    },

    onSingleUpdateState: (data) => {
        console.log(data);
        App.updateSingleRoomGamePhase(data.stage);
    },

    onRedCardPhase: (data) => {
        console.log(data);
        const competingCards = [];
        competingCards.push(data.competingDatePerk1);
        competingCards.push(data.competingDatePerk2);

        App.phase = data.phase;
        App.pickAmount = data.pickAmount;
        App.displayAuctionRoom();
        App.updateAuctionRoomTitle("Time to sabotage " + data.competingUser + "'s date");
        App.updateAuctionRoomGamePhase(data.instructions);
        App.auctionRoomRenderCompetingCards(competingCards, data.competingUser);
        App.auctionRoomRenderRedCards(data.redCards);
    },
};

// namespace for code relating to the game logic
const App = {

    gameId: 0,
    mySocketId: '',
    currentRound: 0,
    numPlayersInRoom: 0,
    username: '',
    phase: '', //white or red which will determine which cards to render buttons for
    pickAmount: 0,
    selectedWhite: [],
    selectedRed: [],

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
        App.templatePostSubmissionScreen = $('#post-submission-screen-template').html();
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
        App.doc.on('click', '#selectTraits', App.onSubmit);
        
        // card events
        App.doc.on('click', '#redCardSelect', App.redCardSelect);
        App.doc.on('click', '#whiteCardSelect', App.whiteCardSelect);
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

    displaySingleRoom: () => {
        App.gameArea.html(App.templateSingleScreen);
    },

    displayAuctionRoom: () => {
        App.gameArea.html(App.templateAuctionScreen);
    },

    displayPostSubmissionRoom: () => {
        App.gameArea.html(App.templatePostSubmissionScreen);
    },

    updateSingleRoomGamePhase: (phase) => {
        $("#gamePhase").text(phase);
    },

    updateAuctionRoomGamePhase: (phase) => {
        $("#auctionState").text(phase);
    },

    updateAuctionRoomTitle: (title) => {
        $("#auction-title").text(title);
    },

    updatePostSubmissionMessage: (message) => {
        $("#post-submission-message").text(message);
    },

    auctionRoomRenderCompetingCards: (competingCards, competingUser) => {
        competingCards.map((competingCard) => {
            console.log(competingCard);
            $("#competing-date").append(
                '<div class="card text-white bg-dark mb-3" style="max-width: 18rem;">' +
                    '<div class="card-body">' +
                        '<h5 class="card-title">'+ competingUser +"'s date" +'</h5>' +
                        '<p class="card-text">'+ competingCard +'</p>' +
                    '</div>' +
                '</div>'
            );
        });
    },

    auctionRoomRenderWhiteCards: (whiteCards) => {
        whiteCards.map((whiteCard) => {
            console.log(whiteCard);
            $("#perks-area").append(
                '<div class="card bg-light mb-3 text-red" style="max-width: 18rem;">' +
                    '<div class="card-body">' +
                        '<h5 class="card-title">Perk</h5>' +
                        '<p class="card-text">'+ whiteCard +'</p>' +
                    '</div>' +
                    '<div class="card-footer">' +
                        '<button id="whiteCardSelect" type="button" class="btn btn-outline-primary">Select</button>' +
                    '</div>' +
                '</div>'
            );
        });
    },

    auctionRoomRenderRedCards: (redCards) => {
        redCards.map((redCard) => {
            console.log(redCard);
            $("#dealbreakers-area").append(
                '<div class="card text-white bg-danger mb-3 text-white" style="max-width: 18rem;">' +
                    '<div class="card-body">' +
                        '<h5 class="card-title">Dealbreaker</h5>' +
                        '<p class="card-text">'+ redCard +'</p>' +
                    '</div>' +
                    '<div class="card-footer">' +
                        '<button id="redCardSelect" type="button" class="btn btn-outline-light">Select</button>' +
                    '</div>' +
                '</div>'
            );
        });
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

    whiteCardSelect: (event) => {
        console.log($(event.target).parent().parent().find(".card-text").text());
        // check if selected value is already in selected list if it is then remove it from the list and change css accordingly
        const selected = $(event.target).parent().parent().find(".card-text").text();
        if(App.selectedWhite.includes(selected)) {
            App.selectedWhite = App.selectedWhite.filter(e => e !== selected);
            $(event.target).parent().parent().find(".card-body").removeClass("text-success");
            $(event.target).text("Select");
        } else {
            App.selectedWhite.push(selected);
            $(event.target).parent().parent().find(".card-body").addClass("text-success");
            $(event.target).text("Unselect");
        }
        console.log(App.selectedWhite)
    },

    redCardSelect: (event) => {
        console.log($(event.target).parent().parent().find(".card-text").text());
        const selected = $(event.target).parent().parent().find(".card-text").text();
        if(App.selectedRed.includes(selected)) {
            App.selectedRed = App.selectedRed.filter(e => e !== selected);
            $(event.target).parent().parent().find(".card-body").removeClass("text-dark");
            $(event.target).text("Select");
        } else {
            App.selectedRed.push(selected);
            $(event.target).parent().parent().find(".card-body").addClass("text-dark");
            $(event.target).text("Unselect");
        }
        console.log(App.selectedRed)
    },

    onSubmit: () => {
        // check what phase and how many should be selected and verify against selectedWhite/selectedRed
        if(App.phase === "white") {
            if(App.selectedWhite.length !== App.pickAmount) {
                window.alert("can you not read? it says pick " + App.pickAmount + " cards");
            } else {
                // emit event back to server
                socket.emit("whiteCardSubmission", {gameId: App.gameId, username: App.username, whiteCards: App.selectedWhite});
            }
        } else if(App.phase === "red") {
            if(App.selectedRed.length !== App.pickAmount) {
                window.alert("can you not read? it says pick " + App.pickAmount + " cards");
            } else {
                // emit event back to server
                socket.emit("redCardSubmission", {gameId: App.gameId, username: App.username, redCards: App.selectedRed});
            }
        }
    },
};

const main = () => {
    console.log("jquery");

    // initialize
    IO.init();
    App.init();

};

main();