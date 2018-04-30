// Namespace game
var game = (function () {

    // The chess board
    var board = new Chess();

    // The player and opponent
    var playerName = "sprongle";
    var oppenentName = "sprongle";

    // Redraw the board
    function redrawBoard() {
        var main = document.getElementById("main");
        main.innerHTML =
            playerName + " vs. " + oppenentName +
            "<br><br>" +
            board.ascii().replace(/(?:\r\n|\r|\n)/g, '<br>');
    };

    // One game tick
    function tick() {
        if (board.game_over())
            board = new Chess();
        var moves = board.moves();
        var move = moves[Math.floor(Math.random() * moves.length)];
        board.move(move);
        redrawBoard();
    };

    // Public API
    return {
        start: function (playerNameIn) {
            console.log("Starting game");
            console.log("Player: " + playerNameIn);
            playerName = playerNameIn;
            setInterval(tick, 500);
        }
    }

}()); // End namespace game