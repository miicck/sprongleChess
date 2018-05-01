// Namespace ui
var ui = (function () {

    var pieces;

    function buildPiece(pieceInfo) {
        var x = pieceInfo.position[0];
        var y = pieceInfo.position[1];
        var ret = document.createElement("div");
        ret.className = "piece";
        ret.style.transform = "translate(" + y * 12.5 + "vw," + x * 12.5 + "vw)";
        ret.style.backgroundImage = "url(img/" + pieceInfo.name + "_" + pieceInfo.color + ".svg)";
        pieces[x][y] = ret;
        document.getElementById("board").appendChild(ret);
    }

    function getLongName(charName) {
        switch (charName) {
            case "p": return "pawn";
            case "k": return "king";
            case "q": return "queen";
            case "r": return "rook";
            case "b": return "bishop";
            case "n": return "knight";
            default:
                throw "ah nah bruv couldn't work out the piece name";
                return "oh dear";
        }
    }

    function getLongColor(charColor) {
        switch (charColor) {
            case "w": return "white";
            case "b": return "black";
            default:
                throw "ah nah bruv couldn't work out the piece color";
                return "oh dear";
        }
    }

    // Public API
    return {
        // Initialize the ui
        initialize: function (playerInfo) {
            pieces = new Array(8);
            for (var x = 0; x < 8; ++x)
                pieces[x] = new Array(8);
        },

        // Update the chessboard
        updateBoard: function (board) {
            var pcs = board.board();
            for (var x = 0; x < 8; ++x)
                for (var y = 0; y < 8; ++y) {

                    if (pieces[x][y] != null)
                        pieces[x][y].remove();

                    if (pcs[x][y] != null) {
                        var type = pcs[x][y].type;
                        var color = pcs[x][y].color;
                        buildPiece({
                            name: getLongName(type),
                            color: getLongColor(color),
                            position: [x, y]
                        });

                    }
                }
        }
    }

})(); // End namespace ui