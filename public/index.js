const socket = io();

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
        socket.on("postRedCardSubmission", IO.onPostRedCardSubmission);
        socket.on("displayFinalDateChoices", IO.onDisplayFinalDateChoices);
        socket.on("leftOnRead", IO.onLeftOnRead);
        socket.on("promptToStartNextRound", IO.onPromptToStartNextRound);
        socket.on("informWinner", IO.onInformWinner);
    },

    onNewGameCreated: (data) => {
        //console.log(data);
        App.gameInit(data);
    },

    onBadGameId: (data) => {
        //console.log(data);
        window.alert(data.message);
    },

    onUpdatePlayerList: (data) => {
        //console.log(data);
        App.displayWaitingRoom();
        App.updatePlayers(data.players);
    },

    onReadyPlayerStatus: (data) => {
        //console.log(data);
        App.updateReadyStatus(data.player);
    },

    onDesignatedSingle: (data) => {
        //console.log(data);
        // change screen and display waiting status
        App.displaySingleRoom();
        App.updateSingleRoomGamePhase(data.stage);
    },

    onDesignatedAuctioner: (data) => {
        //console.log(data);
        //todo backend also send out whether its white phase or red phase so we render the buttons to select for it and how many to select too
        // change screen and display data as cards with jquery
        App.phase = data.phase;
        App.pickAmount = data.pickAmount;
        App.displayAuctionRoom();
        App.updateAuctionRoomTitle("Time to build that perfect date for "+data.singlePlayer);
        App.updateAuctionRoomGamePhase(data.instructions);
        App.auctionRoomRenderWhiteCards(data.whiteCards);
    },

    onPostWhiteCardSubmission: (data) => {
        //console.log(data);
        App.displayPostSubmissionRoom();
        App.updatePostSubmissionMessage(data.message);
    },

    onPostRedCardSubmission: (data) => {
        //console.log(data);
        App.displayPostSubmissionRoom();
        App.updatePostSubmissionMessage(data.message);
    },

    onSingleUpdateState: (data) => {
        //console.log(data);
        App.updateSingleRoomGamePhase(data.stage);
    },

    onRedCardPhase: (data) => {
        //console.log(data);
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

    onDisplayFinalDateChoices: (data) => {
        //console.log(data);
        App.updateSingleRoomGamePhase(data.stage);
        App.singleroomRenderDates(data.submissions);
    },

    onLeftOnRead: (data) => {
        //console.log(data);
        App.displayPostSubmissionRoom();
        App.updatePostSubmissionMessage(data.message);
        App.updatePostSubmissionStage(data.stage);
        App.auctionRoomRenderAllDates(data.submissions);
    },

    onPromptToStartNextRound: (data) => {
        //console.log(data);
        App.updateSingleRoomGamePhase("You chose "+data.chosenWinner +"'s date");
        App.singleRoomPromptNextRound();
    },

    onInformWinner: (data) => {
        //console.log(data);
        App.updatePostSubmissionMessage(data.chosenWinner + " is the winner");
        if(App.username === data.chosenWinner) {
            App.updatePostSubmissionStage("Look at you getting dates and stuff");
            App.points +=1;
            App.updateScore();
        } else {
            App.updatePostSubmissionStage("Tough luck, better go back to swiping");
        }
    },
};

// namespace for code relating to the game logic
const App = {

    gameId: 0,
    mySocketId: '',
    numPlayersInRoom: 0,
    username: '',
    phase: '', //white or red which will determine which cards to render buttons for
    pickAmount: 0,
    selectedWhite: [],
    selectedRed: [],
    points: 0,

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
        App.doc.on('click', '#dateSelect', App.onDateSelect);
        App.doc.on('click', '#startNextRound', App.onStartNextRound);
        
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
        if(username) {
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
        if(username) {
            App.displayJoinRoom();
            return;
        }
        window.alert("You forgot your name");
    },

    // actually join a game
    joinGameRoom: () => {
        const roomCode = $('#roomCodeInput').val();
        if(roomCode.length >= 5) {
            App.gameId = roomCode;
            socket.emit('joinGame', {gameId: roomCode, username: App.username});
            // emit some socket event so the backend can add user to game room and check room is valid
            //App.displayWaitingRoom();
            return;
        }
        window.alert("Room codes are 5 digits long, can you count?");
    },

    readyPlayer: () => {
        socket.emit("readyPlayer", {username: App.username, gameId: App.gameId});
    },

    displayWaitingRoom: () => {
        App.gameArea.html(App.templateWaitingScreen);
        $("#roomCode").text(App.gameId);
        $("#gameUrl").text("Go to "+window.location.href);
    },

    displayJoinRoom: () => {
        App.gameArea.html(App.templateJoinScreen);
    },

    displaySingleRoom: () => {
        App.gameArea.html(App.templateSingleScreen);
        App.updateScore();
    },

    displayAuctionRoom: () => {
        App.gameArea.html(App.templateAuctionScreen);
        App.updateScore();
    },

    displayPostSubmissionRoom: () => {
        App.gameArea.html(App.templatePostSubmissionScreen);
        App.updateScore();
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

    updatePostSubmissionStage: (stage) => {
        $("#post-submission-stage").text(stage);
    },

    updateScore: () => {
        $("#score").text("Amount of dates you went on: "+App.points);
    },

    singleRoomPromptNextRound: () => {
        $("#choices").empty();
        $("#choices").append(
            '<button id="startNextRound" type="button" class="btn btn-primary">Start Next Round</button>'
        );
    },

    singleroomRenderDates: (submissions) => {
        for(let [key, value] of Object.entries(submissions)) {
            $("#choices").append(
                '<div class="card-deck">' +
                    '<div> <h1 id="dateSubmission">'+key+'</h1> <button id="dateSelect" type="button" class="btn btn-primary">This is the way</button> </div> <br />' +
                    '<div class="card text-red bg-light mb-3">' +
                        '<div class="card-header">Perks &#10084;</div>' +
                        '<div class="card-body">' +
                            '<p class="card-text">'+ value.perk1 +'</p>' +
                        '</div>' +
                    '</div>' +
                    '<div class="card text-red bg-light mb-3">' +
                        '<div class="card-header">Perks &#10084;</div>' +
                        '<div class="card-body">' +
                            '<p class="card-text">'+ value.perk2 +'</p>' +
                        '</div>' +
                    '</div>' +
                    '<div class="card text-white bg-danger mb-3">' +
                        '<div class="card-header">Dealbreakers &#128148;</div>' +
                        '<div class="card-body">' +
                            '<p class="card-text">'+ value.dealbreaker +'</p>' +
                        '</div>' +
                    '</div>' +
                '</div>'
            );
        }
    },

    auctionRoomRenderAllDates: (submissions) => {
        for(let [key, value] of Object.entries(submissions)) {
            $("#all-dates").append(
                '<div class="card-group">' +
                    '<div class="card text-white bg-dark mb-3">' +
                        '<div class="card-body">' +
                            '<p class="card-text">'+ key+"'s date" +'</p>' +
                        '</div>' +
                    '</div>' +
                    '<div class="card text-red bg-light mb-3">' +
                        '<div class="card-body">' +
                            '<p class="card-text">'+ value.perk1 +'</p>' +
                        '</div>' +
                    '</div>' +
                    '<div class="card text-red bg-light mb-3">' +
                        '<div class="card-body">' +
                            '<p class="card-text">'+ value.perk1 +'</p>' +
                        '</div>' +
                    '</div>' +
                    '<div class="card text-white bg-danger mb-3">' +
                            '<div class="card-body">' +
                                '<p class="card-text">'+ value.dealbreaker +'</p>' +
                            '</div>' +
                        '</div>' +
                '</div>'
            );
        }
    },

    auctionRoomRenderCompetingCards: (competingCards, competingUser) => {
        competingCards.map((competingCard) => {
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
        // check if selected value is already in selected list if it is then remove it from the list and change css accordingly
        const selected = $(event.target).parent().parent().find(".card-text").text();
        if(App.selectedWhite.includes(selected)) {
            App.selectedWhite = App.selectedWhite.filter(e => e !== selected);
            $(event.target).parent().parent().find(".card-body").removeClass("text-success");
            $(event.target).text("Select");
            $(event.target).addClass("btn-outline-primary");
            $(event.target).removeClass("btn-primary");
        } else {
            App.selectedWhite.push(selected);
            $(event.target).parent().parent().find(".card-body").addClass("text-success");
            $(event.target).text("Unselect");
            $(event.target).removeClass("btn-outline-primary");
            $(event.target).addClass("btn-primary");
        }
    },

    redCardSelect: (event) => {
        const selected = $(event.target).parent().parent().find(".card-text").text();
        if(App.selectedRed.includes(selected)) {
            App.selectedRed = App.selectedRed.filter(e => e !== selected);
            $(event.target).parent().parent().find(".card-body").removeClass("text-dark");
            $(event.target).text("Select");
            $(event.target).addClass("btn-outline-primary");
            $(event.target).removeClass("btn-primary");
        } else {
            App.selectedRed.push(selected);
            $(event.target).parent().parent().find(".card-body").addClass("text-dark");
            $(event.target).text("Unselect");
            $(event.target).removeClass("btn-outline-primary");
            $(event.target).addClass("btn-primary");
        }
    },

    onSubmit: () => {
        // check what phase and how many should be selected and verify against selectedWhite/selectedRed
        if(App.phase === "white") {
            if(App.selectedWhite.length !== App.pickAmount) {
                window.alert("can you not read? it says pick " + App.pickAmount + " cards");
            } else {
                // emit event back to server and clear selected
                socket.emit("whiteCardSubmission", {gameId: App.gameId, username: App.username, whiteCards: App.selectedWhite});
                App.selectedWhite = [];
            }
        } else if(App.phase === "red") {
            if(App.selectedRed.length !== App.pickAmount) {
                window.alert("can you not read? it says pick " + App.pickAmount + " cards");
            } else {
                // emit event back to server and clear selected
                socket.emit("redCardSubmission", {gameId: App.gameId, username: App.username, redCards: App.selectedRed});
                App.selectedRed = [];
            }
        }
    },

    onDateSelect: (event) => {
        const user = $(event.target).parent().find("#dateSubmission").text();
        socket.emit("dateWinnerSubmission", {gameId: App.gameId, winner: user});
    },

    onStartNextRound: () => {
        socket.emit("nextRound", {gameId: App.gameId});
    },
};

const main = () => {
    IO.init();
    App.init();
};

main();