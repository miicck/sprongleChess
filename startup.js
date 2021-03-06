// Namespace startup
var startup = (function () {

    var challengeImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAMSURBVBhXY/j//z8ABf4C/qc1gYQAAAAASUVORK5CYII=";

    // Check if we're running locally for development purposes
    if (window.location.protocol == 'file:') {
        console.log("Running locally");

        var richard = {
            name: "Magnet man",
            id: 1337,
            picture: "img/grandfatherHector.png",
            elo: 0,
            contextId: 69
        }

        var michael = {
            name: "Mr Michael",
            id: 6969,
            picture: "img/grandfatherHector.png",
            elo: 2750,
            contextId: 69
        }

        var localPlayer = richard;
        var opponent = michael;

        if (window.location.pathname.startsWith("/F")) {
            localPlayer = michael;
            opponent = richard;
            console.log("Hello michael!");
        }
        else console.log("Hello richard!");

        game.start(localPlayer, opponent);
    }
    else FBInstant.initializeAsync()
        .then(function () {
            // Initialzie Async must resolve
            // before we can load the game
            load();
        });

    // Load the game assets etc
    function load() {

        console.log("Loading game");

        // Informs the SDK of loading progress
        FBInstant.setLoadingProgress(100); // 100% progress, we aren't loading anything

        // Once all assets are loaded, tells the SDK 
        // to end loading view and start the game
        FBInstant.startGameAsync()
            .then(function () {

                // Attempt to challenge a player
                try {
                    FBInstant.updateAsync({
                        action: 'CUSTOM',
                        cta: 'Play',
                        image: challengeImage,
                        text: {
                            default: 'You were challenged',
                            localizations: {
                                en_US: 'You were challenged',
                            }
                        },
                        template: 'accept_challenge',
                        data: { myReplayData: 'challenge_accepted' },
                        strategy: 'IMMEDIATE',
                        notification: 'NO_PUSH'
                    }).then(function () {
                        // After the update is posted
                        console.log("Challenge update pushed!");
                    });
                }
                catch (e) {
                    console.log("Challenge update error: " + e);
                }

                // Retrieving context and player information can only be done
                // once startGameAsync() resolves
                var contextId = FBInstant.context.getID();
                var contextType = FBInstant.context.getType();
                console.log("Context: " + contextId + " type: " + contextType);

                FBInstant.context.getPlayersAsync()
                    .then(function (opponents) {
                        var opponent = opponents[0].$1;
                        game.start({
                            name: FBInstant.player.getName(),
                            id: FBInstant.player.getID(),
                            picture: FBInstant.player.getPhoto(),
                            elo: 1500,
                            contextId: contextId,
                        },
                            {
                                name: opponent.name,
                                id: opponent.id,
                                picture: opponent.photo,
                                elo: 1500,
                            });
                    });
            });
    }

}()); // End namespace startup