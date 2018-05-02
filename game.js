// Namespace game
var game = (function () {

    var board = new Chess(); // The chess board
    var playerInfo;          // Info about the player
    var promotonMenuOpen = false;

    // DOM elements
    var pieces;        // The DOM elements representing the pieces
    var selectedPiece; // The DOM element representing the selected piece
    var moveOptions;   // The DOM elements representing the possible moves
    var boardArea;     // The DOM element representing the board
    var opponentArea;  // The DOM element representing the opponent
    var playerArea;    // The DOM element representing the player
    var settingsMenu;  // The DOM element representing the settings window (if it's open)  

    // Returns true if it is my turn
    function myTurn() {
        return playerInfo.playingAs == getLongColor(board.turn());
    }

    // Make the given move
    function makeMove(move) {
        board.move(move);
        updateBoardUI();
        setMoveOptions([]);
        replyWithMove();
    }

    // Build a pice from a pieceInfo structure
    function buildPiece(pieceInfo) {

        var x = pieceInfo.position[0];
        var y = pieceInfo.position[1];

        var p = document.createElement("div");
        p.className = "piece";
        p.style.transform = xyToTransform(x, y);
        p.style.backgroundImage =
            "url(img/" + pieceInfo.name + "_" + pieceInfo.color + ".svg)";
        pieces[x][y] = p;
        boardArea.appendChild(p);

        p.onclick = function () {
            // Select the piece
            if (promotonMenuOpen) return; // A promotion menu is open, don't allow clicking on pieces
            if (pieceInfo.color != playerInfo.playingAs) return; // This isn't my piece
            if (selectedPiece != null) selectedPiece.id = null;  // Deselect old piece
            selectedPiece = p;
            p.id = "selected";
            setMoveOptions(board.moves({ square: xyToAn(x, y), verbose: true }));
        }
    }

    // Set move options
    function setMoveOptions(moves) {

        // Remove previous move options
        if (moveOptions != null)
            for (var i in moveOptions)
                moveOptions[i].remove();
        moveOptions = [];

        // Create new move options
        for (var i in moves) {
            var move = moves[i];
            var target = anToXy(move.to);

            var elm = document.createElement("div");
            elm.className = "moveOption";
            elm.style.transform = xyToTransform(target.x, target.y);
            moveOptions.push(elm);
            boardArea.appendChild(elm);

            (function (m) {
                elm.onclick = function () {
                    if (!myTurn()) return;
                    if (m.flags.includes("p")) {
                        createPromotionDropdown(m);
                        return;
                    }
                    makeMove(m);
                }
            })(move);
        }
    }

    // Create the menu to promote a piece
    function createPromotionDropdown(promotionMove) {

        promotonMenuOpen = true;
        setMoveOptions([]);
        var xy = anToXy(promotionMove.to);
        var promotors = [];
        var colormod = 1;
        if (playerInfo.playingAs == "black")
            colormod = -1;

        createPromotor({
            promotors: promotors,
            move: promotionMove,
            promoteTo: "q",
            x: xy.x,
            y: xy.y
        });

        createPromotor({
            promotors: promotors,
            move: promotionMove,
            promoteTo: "n",
            x: xy.x + colormod * 1,
            y: xy.y
        });

        createPromotor({
            promotors: promotors,
            move: promotionMove,
            promoteTo: "r",
            x: xy.x + colormod * 2,
            y: xy.y
        });

        createPromotor({
            promotors: promotors,
            move: promotionMove,
            promoteTo: "b",
            x: xy.x + colormod * 3,
            y: xy.y
        });
    }

    // Create a promotor
    function createPromotor(promotorInfo) {
        console.log(promotorInfo.x);
        var prom = document.createElement("div");
        prom.className = "promotion";
        prom.style.transform = xyToTransform(promotorInfo.x, promotorInfo.y);
        prom.style.backgroundImage =
            "url(img/" + getLongName(promotorInfo.promoteTo) +
            "_" + playerInfo.playingAs + ".svg)";
        promotorInfo.promotors.push(prom);

        prom.onclick = function () {
            promotorInfo.move.promotion = promotorInfo.promoteTo;
            makeMove(promotorInfo.move);
            for (var i in promotorInfo.promotors)
                promotorInfo.promotors[i].remove();
            promotonMenuOpen = false;
        }
        boardArea.appendChild(prom);
    }

    // Opponent makes a move
    function replyWithMove() {
        var moves = board.moves();
        var move = moves[Math.floor(Math.random() * moves.length)];
        board.move(move);
        updateBoardUI();
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
        if (playerInfo.playingAs == "white")
            return "translate(" + y * 12.5 + "vw," + x * 12.5 + "vw)";
        else
            return "translate(" + (7 - y) * 12.5 + "vw," + (7 - x) * 12.5 + "vw)";
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

    // Public API
    return {
        // Start the game
        start: function (playerInfoIn) {
            console.log("Starting game");
            console.log(playerInfoIn);
            playerInfo = playerInfoIn;
            initializeUI();
            if (playerInfo.playingAs == "black") replyWithMove();
            updateBoardUI();
        },
    }

}()); // End namespace game