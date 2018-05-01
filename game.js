// Namespace game
var game = (function () {

    var board = new Chess(); // The chess board  
    var playerInfo;          // Info about the player

    // One game tick
    function tick() {
        if (board.game_over())
            board = new Chess();
        var moves = board.moves();
        var move = moves[Math.floor(Math.random() * moves.length)];
        board.move(move);
        ui.updateBoard(board);
    };

    // Public API
    return {
        start: function (playerInfoIn) {
            console.log("Starting game");
            console.log(playerInfoIn);
            playerInfo = playerInfoIn;
            ui.initialize(playerInfo);
            setInterval(tick, 2000);
        }
    }

}()); // End namespace game