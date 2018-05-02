// Namespace game
var game = (function () {

    var board = new Chess(); // The chess board
    var playerInfo;          // Info about the player
    var pieces;        // The DOM elements representing the pieces
    var selectedPiece; // The DOM element representing the selected piece
    var moveOptions;   // The DOM elements representing the possible moves
    var boardArea;     // The DOM element representing the board
    var opponentArea;  // The DOM element representing the opponent
    var playerArea;    // The DOM element representing the player
    var settingsMenu;  // The DOM element representing the settings window (if it's open)

    // Build a pice from a pieceInfo structure
    function buildPiece(pieceInfo) {
        var x = pieceInfo.position[0];
        var y = pieceInfo.position[1];
        var p = document.createElement("div");
        p.className = "piece";
        p.style.transform = xyToTransform(x, y);
        p.style.backgroundImage = "url(img/" + pieceInfo.name + "_" + pieceInfo.color + ".svg)";
        pieces[x][y] = p;
        boardArea.appendChild(p);
        p.onclick = function () {
            console.log("Selected piece " + pieceInfo.color + " " + pieceInfo.name)
            if (selectedPiece != null)
                selectedPiece.style.backgroundColor = null;
            selectedPiece = p;
            p.style.backgroundColor = "rgba(0,100,0,0.4)";
            var mvs = board.moves({ square: xyToAn(x, y), verbose: true });
            var allMoves = [];
            for (var i in mvs) {
                var m = mvs[i];
                var xy = anToXy(m.to);
                allMoves.push({ x: x, y: y, xt: xy.x, yt: xy.y });
            }
            setMoveOptions(allMoves);
        }
    }

    // Set move options from x,y -> xt,yt coords
    function setMoveOptions(xys) {
        if (moveOptions != null)
            for (var i in moveOptions)
                moveOptions[i].remove();

        moveOptions = []
        for (var i in xys) {
            var xy = xys[i];
            var mv = document.createElement("div");
            mv.className = "moveOption";
            mv.style.transform = xyToTransform(xy.xt, xy.yt);
            (function (xyloc) {
                mv.onclick = function () {
                    board.move({
                        from: xyToAn(xyloc.x, xyloc.y),
                        to: xyToAn(xyloc.xt, xyloc.yt)
                    });
                    updateBoardUI();
                    setMoveOptions([]);
                }
            })(xy);
            moveOptions.push(mv);
            boardArea.appendChild(mv);
        }
    }

    // Setup a player info section
    function setupPlayerInfo(element, info) {
        var img = document.createElement("img");
        img.className = "player";
        img.src = info.picture;
        element.appendChild(img);

        var nameArea = document.createElement("div");
        nameArea.className = "nameArea";
        element.appendChild(nameArea);

        var nameBox = document.createElement("div");
        nameBox.className = "name";
        nameBox.innerHTML = info.name;
        nameArea.appendChild(nameBox);

        var elo = document.createElement("div");
        elo.className = "elo";
        elo.innerHTML = info.elo;
        nameArea.appendChild(elo);

        var clock = document.createElement("div");
        clock.className = "clock";
        clock.innerHTML = "05:00";
        element.appendChild(clock);
    }

    // Initialize the ui
    function initializeUI() {
        pieces = new Array(8);
        for (var x = 0; x < 8; ++x)
            pieces[x] = new Array(8);

        boardArea = document.createElement("div");
        boardArea.className = "board";

        opponentArea = document.createElement("div");
        opponentArea.className = "player";
        setupPlayerInfo(opponentArea, playerInfo);

        playerArea = document.createElement("div");
        playerArea.className = "player";
        setupPlayerInfo(playerArea, playerInfo);

        var infoArea = document.createElement("div");
        infoArea.className = "info";
        infoArea.innerHTML = "5+0 | casual | rapid";

        var optionsButton = document.createElement("i");
        optionsButton.id = "options";
        optionsButton.className = "material-icons";
        optionsButton.innerHTML = "settings";
        infoArea.appendChild(optionsButton);

        optionsButton.onclick = function () {
            if (settingsMenu != null) {
                settingsMenu.remove();
                settingsMenu = null;
                return;
            }
            settingsMenu = document.createElement("div");
            settingsMenu.className = "gameSettings"
            document.body.appendChild(settingsMenu);

            var muteButton = document.createElement("div");
            muteButton.className = "toggle";
            //settingsMenu.appendChild(muteButton);
        }

        document.body.appendChild(infoArea);
        document.body.appendChild(opponentArea);
        document.body.appendChild(boardArea);
        document.body.appendChild(playerArea);
    }

    // Update the chessboard
    function updateBoardUI() {
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

    // One game tick
    function tick() {
        if (board.game_over())
            board = new Chess();
        var moves = board.moves();
        var move = moves[Math.floor(Math.random() * moves.length)];
        //board.move(move);
        //sound.playSound("sound/move.mp3");
        //ui.updateBoard(board);
    }

    // Go from x,y to a,n notation, i.e 0,1 -> a7
    function xyToAn(x, y) {
        return String.fromCharCode(97 + y) + "" + (8 - x);
    }

    // Go from a,n notation to xy, i.e a7 -> 0,1
    function anToXy(an) {
        var ret = {
            y: an.charCodeAt(0) - 97,
            x: 8 - parseInt(an.charAt(1)),
        }
        return ret;
    }

    // Return the css transform needed to place something at x,y
    function xyToTransform(x, y) {
        return "translate(" + y * 12.5 + "vw," + x * 12.5 + "vw)";
    }

    // Convert p -> pawn etc.
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

    // Convert w -> white etc.
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
        // Start the game
        start: function (playerInfoIn) {
            console.log("Starting game");
            console.log(playerInfoIn);
            playerInfo = playerInfoIn;
            initializeUI();
            updateBoardUI();
            setInterval(tick, 200);
        },
    }

}()); // End namespace game