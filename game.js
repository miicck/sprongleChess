var game = (function () { // Namespace game

    // The chess board
    var chess = new Chess();

    // Redraw the board
    function redrawBoard() {
        var main = document.getElementById("main");
        main.innerHTML = chess.ascii().replace(/(?:\r\n|\r|\n)/g, '<br>');
    };

    // One game tick
    function tick() {
        if (chess.game_over())
            chess = new Chess();
        var moves = chess.moves();
        var move = moves[Math.floor(Math.random() * moves.length)];
        chess.move(move);
        redrawBoard();
    };

    // Public API
    return {
        start: function (playerName) {
            console.log("Starting game");
            console.log("Player: " + playerName);
            setInterval(tick, 500);
        }
    }

}()); // End namespace game