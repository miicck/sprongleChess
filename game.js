// Namespace game
var game = (function () {

    var board = new Chess();      // The chess board state
    var playerInfo;               // Info about the player
    var opponentInfo;             // Info about the oppenent
    var promotonMenuOpen = false; // Is the promotion menu open?

    // DOM elements
    var pieces;             // The DOM elements representing the pieces
    var boardArea;          // The DOM element representing the board
    var opponentArea;       // The DOM element representing the opponent
    var playerArea;         // The DOM element representing the player
    var settingsMenu;       // The DOM element representing the settings window (if it's open)
    var stockFishLevelMenu; // The DOM element for the skill of stockfish

    // Allows switching on/off debug messages
    function log(thing, tag) {

        var acceptedTags = [
            //"server",
            //"stockfish",
            //"server_tick",
            //"server_all",
            //"ui",
        ];

        var accepted = false;
        for (var i in acceptedTags)
            if (acceptedTags[i] == tag) {
                accepted = true;
                break;
            }

        if (accepted)
            console.log(thing);
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
        pieces[x][y] = p;
        elmFromID_X_Y("square", x, y).appendChild(p);

        p.onclick = function () {
            // Select the piece
            if (pieceInfo.color == playerInfo.playingAs)
                selectPiece(x, y);
        }

        return p;
    }

    // Return the square at x, y
    function elmFromID_X_Y(id, x, y) {
        if (playerInfo.playingAs == "white")
            return document.getElementById(id + "_" + x + "_" + y);
        return document.getElementById(id + "_" + (7 - x) + "_" + (7 - y));
    }

    // Select the piece at x, y
    function selectPiece(x, y) {
        if (promotonMenuOpen) return; // A promotion menu is open, don't allow clicking on pieces
        var wasSelected = elmFromID_X_Y("selectionMarker", x, y) != null;
        deselectPiece();
        if (wasSelected) return;
        var sq = elmFromID_X_Y("square", x, y);
        sm = document.createElement("div");
        sm.className = "selectionMarker";
        sm.id = "selectionMarker_" + x + "_" + y;
        sq.addFirstChild(sm);
        setMoveOptions(board.moves({ square: xyToAn(x, y), verbose: true }));
    }

    // Deselect the selected piece
    function deselectPiece() {
        foreachOfClassName("selectionMarker", e => e.remove());
        setMoveOptions([]);
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

        var vals = ["q", "n", "r", "b"];
        for (var i in vals)
            createPromotor({
                promotors: promotors,
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

    // Player makes the given move
    function makeMove(move) {

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

        board.move(move);
        updateBoardUI();
        setMoveOptions([]);
        awaitMoveReply();
    }

    // Await move reply from server
    function awaitMoveReply() {
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
        board.move(move);
        highlightLastOpponentMove({ from: move.from, to: move.to });
        updateBoardUI();
    }

    // Stockfish replys with a move
    function stockfishReplyWithMove() {

        var level = 1;
        if (stockFishLevelMenu)
            level = stockFishLevelMenu.value;

        if (level == "thermal") {
            makeRandomMove();
            return;
        }

        ratio = (level - 1) / 9;

        params = {
            depth: Math.floor(1 + ratio * 9),
            skill: Math.floor(ratio * 20),
            maxError: ratio * 5000,
            probability: ratio * 1000
        };

        var msgs = [
            "position fen " + board.fen(),
            "setoption name Skill Level value " + params.skill,
            "setoption name Skill Level Maximum Error value " + params.maxError,
            "setoption name Skill Level Probability value " + params.probability,
            "setoption name Contempt value " + 100,
            "go depth " + params.depth
        ];

        var debug = "";

        var stockfish = new STOCKFISH();
        stockfish.onmessage = function (event) { parseAndMakeStockfishMove(event); };

        for (i in msgs) {
            debug += msgs[i] + "\n";
            stockfish.postMessage(msgs[i]);
        }
        log("Sent stockfish commands:\n" + debug, "stockfish");
    }

    // Make best move from stockfish event data
    function parseAndMakeStockfishMove(event) {

        var moveData = String(event.data ? event.data : event);
        var splt = moveData.split(" ");
        var bestMove = null;
        for (i in splt)
            if (splt[i] == "bestmove")
                bestMove = splt[parseInt(i) + 1];
        if (bestMove == null) return;

        log("Making best stockfish move " + bestMove, "stockfish");
        board.move(bestMove, { sloppy: true });
        var from = bestMove.charAt(0) + bestMove.charAt(1);
        var to = bestMove.charAt(2) + bestMove.charAt(3);
        highlightLastOpponentMove({ from: from, to: to });
        updateBoardUI();
    }

    // Set the last move positions
    function highlightLastOpponentMove(move) {
        foreachOfClassName("lastMove", e => e.remove());
        var xyf = anToXy(move.from);
        var xyt = anToXy(move.to);
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

    // Update the chessboard
    function updateBoardUI() {
        var pcs = board.board();
        for (var x = 0; x < 8; ++x)
            for (var y = 0; y < 8; ++y) {

                if (pieces[x][y] != null) {
                    pieces[x][y].remove();
                    pieces[x][y] = null;
                }

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
        if (info.name == "Stockfish") {
            elo.id = "stockfishLevel";
            elo.innerHTML = "";

            stockFishLevelMenu = document.createElement("select");
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
        pieces = new Array(8);
        for (var x = 0; x < 8; ++x)
            pieces[x] = new Array(8);

        boardArea = document.createElement("div");
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
                updateBoardUI();
            },
            function (x) {
                log("Server tick state request failed", "server_tick");
            });
    }

    // Simulate the effects of a server tick
    function simulatedServerTick() {
        updateBoardUI();
    }

    // Called when a game on the server is successfully started
    function onServerSuccessfulStart() {
        // Actually display the started game
        console.log("Game started/resumed from server. Playing as " + playerInfo.playingAs);
        initializeUI();
        updateBoardUI();
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
        initializeUI();
        updateBoardUI();
        setInterval(simulatedServerTick, 1000);
        if (Math.random() < 0.5) playerInfo.playingAs = "white";
        else {
            playerInfo.playingAs = "black";
            awaitMoveReply();
        }
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
        },
    }

}()); // End namespace game