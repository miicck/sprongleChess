// Namespace game
var game = (function () {

    var board = new Chess();      // The chess board state
    var playerInfo;               // Info about the player
    var opponentInfo;             // Info about the oppenent

    // Allows switching on/off debug messages
    function log(thing, tag) {
        utils.log(thing, tag);
    }

    // Returns true if it is my turn
    function myTurn() {
        return playerInfo.playingAs == getLongColor(board.turn());
    }

    // Returns true if we're running the local dev version
    function localVersion() {
        return window.location.protocol == 'file:'
    }

    // Returns true if we're playing against the machine
    function playingTheMachine() {
        return opponentInfo.name == "Stockfish";
    }

    // Returns true if a promotion menu is open
    function promotionMenuOpen() {
        return document.getElementsByClassName("promotion").length > 0;
    }

    // Adds the element e as the first child of this
    Element.prototype.addFirstChild = function (e) {
        this.insertBefore(e, this.firstChild);
    }

    // Call func on each element with the given class name
    function foreachOfClassName(className, func) {
        var list = document.getElementsByClassName(className);
        list2 = []; // This second list is needed as list can change when func is called
        for (var i = 0; i < list.length; ++i)
            list2.push(list[i]);
        for (var i in list2)
            func(list2[i]);
    }

    // Build a pice from a pieceInfo structure
    function buildPiece(pieceInfo) {

        var x = pieceInfo.position[0];
        var y = pieceInfo.position[1];

        var p = document.createElement("div");
        p.className = "piece";
        p.id = pieceInfo.color + "_" + pieceInfo.name;
        p.style.backgroundImage = "url(img/" + pieceInfo.name + "_" + pieceInfo.color + ".svg)";
        elmFromID_X_Y("square", x, y).appendChild(p);

        p.onclick = function () {
            // Select the piece
            if (pieceInfo.color == playerInfo.playingAs)
                selectPiece(x, y);
        }

        return p;
    }

    // Select the piece at x, y
    function selectPiece(x, y) {
        if (promotionMenuOpen()) return; // A promotion menu is open, don't allow clicking on pieces
        var wasSelected = (elmFromID_X_Y("selectionMarker", x, y) != null);
        deselectPiece();
        if (wasSelected) return;
        var sq = elmFromID_X_Y("square", x, y);
        sm = document.createElement("div");
        sm.className = "selectionMarker";
        var xy = xyToFlipped(x, y);
        sm.id = "selectionMarker_" + xy.x + "_" + xy.y;
        sq.addFirstChild(sm);
        setMoveOptionsFromSelection();
    }

    // Deselect the selected piece
    function deselectPiece() {
        foreachOfClassName("selectionMarker", e => e.remove());
        setMoveOptions([]);
    }

    function setMoveOptionsFromSelection() {
        setMoveOptions([]);
        foreachOfClassName("selectionMarker", sm => {
            var sp = sm.id.split("_");
            var x = parseInt(sp[1]);
            var y = parseInt(sp[2]);
            var xyf = xyToFlipped(x, y);
            setMoveOptions(board.moves({ square: xyToAn(xyf.x, xyf.y), verbose: true }));
        });
    }

    // Set move options
    function setMoveOptions(moves) {

        log("move options: " + moves.length, "ui");

        // Remove previous move options
        foreachOfClassName("moveOption", e => e.remove());

        // Create new move options
        for (var i in moves) {
            var move = moves[i];
            var target = anToXy(move.to);

            var sq = elmFromID_X_Y("square", target.x, target.y);
            var elm = document.createElement("div");
            elm.className = "moveOption";
            sq.appendChild(elm);

            (function (m) {
                elm.onclick = function () {
                    if (!myTurn()) return;
                    if (m.flags.includes("p")) {
                        createPromotionDropdown(m);
                        return;
                    }
                    playerMakeMove(m);
                }
            })(move);
        }
    }

    // Create the menu to promote a piece
    function createPromotionDropdown(promotionMove) {

        setMoveOptions([]);
        foreachOfClassName("promotion", e => e.remove());

        var xy = anToXy(promotionMove.to);
        var colormod = 1;
        if (playerInfo.playingAs == "black")
            colormod = -1;

        var vals = ["q", "n", "r", "b"];
        for (var i in vals)
            createPromotor({
                move: promotionMove,
                promoteTo: vals[i],
                x: xy.x + colormod * i,
                y: xy.y
            });
    }

    // Create a promotor
    function createPromotor(promotorInfo) {

        var prom = document.createElement("div");
        prom.className = "promotion";
        prom.style.backgroundImage =
            "url(img/" + getLongName(promotorInfo.promoteTo) +
            "_" + playerInfo.playingAs + ".svg)";

        prom.onclick = function () {
            promotorInfo.move.promotion = promotorInfo.promoteTo;
            playerMakeMove(promotorInfo.move);
            foreachOfClassName("promotion", e => e.remove());
        }

        var sq = elmFromID_X_Y("square", promotorInfo.x, promotorInfo.y);
        sq.appendChild(prom);
    }

    // Returns true if the given move is a capturing move
    function isCapture(move) {
        if (move.flags)
            return move.flags.includes('c');
        if (typeof move == "string") {
            var xy = anToXy(move.substr(2, 2));
            var p = board.board()[xy.x][xy.y];
            return p != null;
        }
    }

    // Called whenever a move is made
    function makeMove(move) {
        if (isCapture(move)) sound.playSound("sound/Capture.mp3");
        else sound.playSound("sound/Move.mp3");
        board.move(move, { sloppy: true });
        if (myTurn()) highlightLastOpponentMove(move);
        updatePieces();
        setMoveOptionsFromSelection();
    }

    // Player makes the given move
    function playerMakeMove(move) {

        deselectPiece();
        if (!playingTheMachine())
            sendServerMessage(
                "Content: ChessMove\r\n" +
                "From: " + playerInfo.id + "\r\n" +
                "To: " + opponentInfo.id + "\r\n" +
                "Move: " + move.san + "\r\n" +
                "Game: " + playerInfo.contextId,
                function (x) {
                    console.log("chess move success");
                },
                function (x) {
                    console.log("chess move failure");
                });

        makeMove(move);
        awaitMoveReply(); // Wait for a reply
    }

    // Await move reply from server (or stockfish)
    function awaitMoveReply() {
        if (myTurn()) return; // It's my turn, don't wait for a reply
        if (board.game_over()) return; // The game is over, don't do anything
        if (playingTheMachine()) {
            stockfishReplyWithMove();
            return;
        }
    }

    // Get a random move from the current board
    function getRandomMove() {
        var moves = board.moves({ verbose: true });
        return moves[Math.floor(Math.random() * moves.length)];
    }

    // Make a random move
    function makeRandomMove() {
        log("stockfish made a random move", "stockfish");
        var move = getRandomMove();
        makeMove(move);
    }

    // Stockfish replys with a move
    function stockfishReplyWithMove() {
        var level = 1;
        var menu = document.getElementById("stockfishLevelMenu");
        if (menu) level = menu.value;

        if (level == "thermal") {
            setTimeout(makeRandomMove, 250);
            return;
        }

        setTimeout(() =>
            chessEngine.bestStockfishMove(board.fen(), level,
                bm => makeMove(bm)), 10);
    }

    // Set the last move positions
    function highlightLastOpponentMove(move) {
        foreachOfClassName("lastMove", e => e.remove());

        var xyf;
        var xyt;

        if (move.from && move.to) {
            // Parse a verbose move
            xyf = anToXy(move.from);
            xyt = anToXy(move.to);
        }
        else if (typeof move == "string") {
            // Pass a move of the form a1a2
            xyf = anToXy(move.substr(0, 2));
            xyt = anToXy(move.substr(2, 2));
        }
        else return;

        createLastMoveHighlight(xyf);
        createLastMoveHighlight(xyt);
    }

    // Highlight this square
    function createLastMoveHighlight(xy) {
        var from = document.createElement("div");
        from.className = "lastMove";
        var sq = elmFromID_X_Y("square", xy.x, xy.y);
        sq.addFirstChild(from);
    }

    // Update the chess pieces so they are the same as those
    // in the chess.js board
    function updatePieces() {
        if (board.game_over()) board = new Chess();
        foreachOfClassName("piece", e => e.remove());
        var pcs = board.board();
        for (var x = 0; x < 8; ++x)
            for (var y = 0; y < 8; ++y)
                if (pcs[x][y] != null) {
                    var type = pcs[x][y].type;
                    var color = pcs[x][y].color;
                    var p = buildPiece({
                        name: getLongName(type),
                        color: getLongColor(color),
                        position: [x, y]
                    });
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

    // Flip x and y if the board is upside down
    function xyToFlipped(x, y) {
        if (playerInfo.playingAs == "black")
            return {
                x: 7 - x,
                y: 7 - y
            }
        return {
            x: x,
            y: y
        }
    }

    // Return the square at x, y
    function elmFromID_X_Y(id, x, y) {
        var xy = xyToFlipped(x, y);
        return document.getElementById(id + "_" + xy.x + "_" + xy.y);
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
        if (info.name == "Stockfish") {
            elo.id = "stockfishLevel";
            elo.innerHTML = "";

            var stockFishLevelMenu = document.createElement("select");
            stockFishLevelMenu.id = "stockfishLevelMenu";
            for (var i = 0; i < 11; ++i) {
                var opt = document.createElement("option");
                opt.value = i;
                if (i == 0) opt.value = "thermal";
                opt.innerHTML = opt.value;
                stockFishLevelMenu.appendChild(opt);
            }

            elo.innerHTML += "Level: ";
            elo.appendChild(stockFishLevelMenu);
        }
        nameArea.appendChild(elo);

        var clock = document.createElement("div");
        clock.className = "clock";
        clock.innerHTML = "05:00";
        element.appendChild(clock);
    }

    // Initialize the ui
    function initializeUI() {
        var boardArea = document.createElement("div");
        boardArea.className = "board";

        var table = document.createElement("table");
        table.cellSpacing = 0;
        table.className = "board";
        for (var x = 0; x < 8; ++x) {
            var row = document.createElement("tr");
            table.appendChild(row);
            for (var y = 0; y < 8; ++y) {
                var square = document.createElement("td");
                square.className = "darkSquare";
                if ((x + y) % 2 == 0) square.className = "lightSquare";
                square.id = "square_" + x + "_" + y;
                row.appendChild(square);
            }
        }
        boardArea.appendChild(table);

        opponentArea = document.createElement("div");
        opponentArea.className = "player";
        setupPlayerInfo(opponentArea, opponentInfo);

        playerArea = document.createElement("div");
        playerArea.className = "player";
        setupPlayerInfo(playerArea, playerInfo);

        var infoArea = document.createElement("div");
        infoArea.className = "info";
        infoArea.innerHTML = "5+0 | casual | rapid";

        document.body.appendChild(infoArea);
        document.body.appendChild(opponentArea);
        document.body.appendChild(boardArea);
        document.body.appendChild(playerArea);
    }

    // Send the server a message
    function sendServerMessage(message, successHandler, failureHandler) {
        log("Sending message to sprongle.com ...\n" + message, "server_all");
        var x = new XMLHttpRequest();
        x.open('POST', 'http://sprongle.com', true);

        x.onload = function () {
            log("Response from sprongle.com:", "server_all");
            log(x.response, "server_all");
            if (x.responseText.startsWith("success"))
                successHandler(x);
            else
                failureHandler(x);
        };

        x.onreadystatechange = function () {
            if (x.readyState == 4)
                if (x.status == 0) {
                    // Request complete, failed
                    failureHandler(x);
                    return;
                }
        };

        x.ontimeout = function () {
            log("XMLHttp request timeout", "server_all");
        };

        try { x.send(message); }
        catch (e) {
            console.log("XMLHttp send error:");
            console.log(e);
        }
    }

    // Get the response of the form "header : response" in message
    function parseServerResponseFor(message, header) {
        var splt = message.split("\n");
        for (var i in splt) {
            if (splt[i].startsWith(header))
                return splt[i].split(":")[1].trim();
        }
        return null;
    }

    // Get updates on a tick
    function serverTickUpdate() {
        sendServerMessage(
            "Content: GameStateRequest\r\n" +
            "From: " + playerInfo.id + "\r\n" +
            "Game: " + playerInfo.contextId,
            function (x) {
                log("Server tick state request success", "server_tick");
                loadGameFromServerFEN(x);
                updatePieces();
            },
            function (x) {
                log("Server tick state request failed", "server_tick");
            });
    }

    // Simulate the effects of a server tick
    function simulatedServerTick() {
        updatePieces();
    }

    // Called when a game on the server is successfully started
    function onServerSuccessfulStart() {
        // Actually display the started game
        console.log("Game started/resumed from server. Playing as " + playerInfo.playingAs);
        initializeUI();
        updatePieces();
        if (!myTurn()) awaitMoveReply();
        setInterval(serverTickUpdate, 1000);
    }

    // Called when the game on the server failed to start
    function onServerFailStart() {
        console.log("Failed to connect to the server, loading stockfish...");
        opponentInfo = {
            name: "Stockfish",
            id: -1,
            picture: "img/stockfish.png",
            elo: "?",
            contextId: -1,
        }
        board = new Chess();

        if (Math.random() < 0.5) playerInfo.playingAs = "white";
        else playerInfo.playingAs = "black";

        initializeUI();
        updatePieces();
        setInterval(simulatedServerTick, 1000);
        if (!myTurn()) awaitMoveReply();
    }

    // Load a game from a successful GameState request
    function loadGameFromServerFEN(xhttp) {
        playerInfo.playingAs = parseServerResponseFor(xhttp.responseText, "Colour").toLowerCase();
        board.load(parseServerResponseFor(xhttp.responseText, "FEN"));
    }

    // Attempt to start/resume a game on the server,
    // returns true if successful
    function serverStartResumeGame() {
        const MAX_ATTEMPTS = 0;
        var attempts = 0;
        var tryStartResume = function () {
            ++attempts;
            if (attempts > MAX_ATTEMPTS) {
                console.log("Failed to get game from server after " + MAX_ATTEMPTS + " attempts (maximum attempts).")
                onServerFailStart();
                return;
            }
            log("Trying to start/resume server game, attempt: " + attempts, "server");
            sendServerMessage(
                "Content: AppStart\r\nFrom: " +
                playerInfo.id + "\r\nName: " +
                playerInfo.name,
                function () {
                    log("Login success", "server");
                    sendServerMessage(
                        "Content: GameStateRequest\r\n" +
                        "From: " + playerInfo.id + "\r\n" +
                        "Game: " + playerInfo.contextId,
                        function (x) {
                            log("Game exists in server, loading it...", "server");
                            loadGameFromServerFEN(x);
                            onServerSuccessfulStart(); // Success
                        },
                        function (x) {
                            log("No game in server, starting new game...", "server");
                            sendServerMessage(
                                "Content: GameStart\r\n" +
                                "From: " + playerInfo.id + "\r\n" +
                                "To: " + opponentInfo.id + "\r\n" +
                                "Game: " + playerInfo.contextId,
                                function (x) {
                                    log("successfully registered new game", "server");
                                    playerInfo.playingAs =
                                        parseServerResponseFor(x.responseText, "Colour")
                                            .toLowerCase();
                                    board = new Chess();
                                    onServerSuccessfulStart(); // Success
                                },
                                function (x) {
                                    log("failed to register new game", "server");
                                    tryStartResume(); // Retry
                                }
                            )
                        }
                    )
                },
                function () {
                    log("Login failed!", "server");
                    tryStartResume(); // Retry 
                });
        };
        tryStartResume();
    }

    // Public API
    return {
        // Start the game
        start: function (playerInfoIn, opponentInfoIn) {
            console.log("Starting game");
            playerInfo = playerInfoIn;
            opponentInfo = opponentInfoIn;
            // Load a silly thing so we know if we failed somewhere
            playerInfo.playingAs = "white";
            board.load("k7/qqqqqqqq/8/8/8/8/QQQQQQQQ/K7 w - - 1 45");
            serverStartResumeGame();
        }
    }

}()); // End namespace game