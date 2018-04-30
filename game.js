// Namespace game
var game = {

    // Start the game
    start: function (playerName) {
        console.log("Starting game");
        console.log("Player: " + playerName);

        var chess = new Chess();
        var main = document.getElementById("main");
        main.innerHTML = chess.ascii().replace(/(?:\r\n|\r|\n)/g, '<br>');
        console.log(chess.ascii());
    }

} // End namespace game