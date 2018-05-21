var chessEngine = (function () { // Namespace chessEngine

    return {
        bestStockfishMove: function (fen, level, callback) {
            ratio = (level - 1) / 9;
            params = {
                depth: Math.floor(1 + ratio * 9),
                skill: Math.floor(ratio * 20),
                maxError: ratio * 5000,
                probability: ratio * 1000
            };
            var msgs = [
                "position fen " + fen,
                "setoption name Skill Level value " + params.skill,
                "setoption name Skill Level Maximum Error value " + params.maxError,
                "setoption name Skill Level Probability value " + params.probability,
                "setoption name Contempt value " + 100,
                "go depth " + params.depth
            ];
            var debug = "";
            var stockfish = new STOCKFISH();
            stockfish.onmessage = function (event) {
                var moveData = event.data ? event.data : event;
                if (!moveData) return;
                utils.log(moveData, "stockfish");
                var splt = moveData.split(" ");
                var bestmove = null;
                for (i in splt)
                    if (splt[i].trim() == "bestmove")
                        bestmove = splt[parseInt(i) + 1];
                if (!bestmove) return;
                utils.log("stockfish found best move: " + bestmove, "stockfish");
                callback(bestmove);
            };

            for (i in msgs) debug += msgs[i] + "\n";
            utils.log("Sending stockfish commands:\n" + debug, "stockfish");
            for (i in msgs) stockfish.postMessage(msgs[i]);
        }
    }

}()); // End namespace chessEngine