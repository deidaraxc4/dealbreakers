const main = () => {
    const socket = io();
    socket.on("connect", () => socket.emit("hello", `hello I am here`));

    console.log("jquery");
    const gameArea = $('#gameArea');
    const templateIntroScreen = $('#intro-screen-template').html();
    console.log(templateIntroScreen);

    gameArea.html(templateIntroScreen);


    // const secondsElement = document.getElementById("seconds");
    // socket.on("seconds", (seconds) => secondsElement.innerText = seconds.toString());

    // const welcomeElement = document.getElementById("welcome");
    // socket.on("online", online => onlineElement.innerText = online.toString());

    // const onlineElement = document.getElementById("online");
    // socket.on("welcome", welcomeMessage => welcomeElement.innerText = welcomeMessage);
}

main();