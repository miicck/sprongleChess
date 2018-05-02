// Namespace startup
var startup = (function () {

    // Check if we're running locally for development purposes
    if (window.location.protocol == 'file:') {
        console.log("Running locally");
        game.start({
            name: "Sprongle",
            id: 0,
            picture: "img/grandfatherHector.png",
            elo: 1500,
        });
    }
    else FBInstant.initializeAsync()
        .then(function () {
            // Initialzie Async must resolve
            // before we can load the game
            console.log("FBInstant.initializeAsync resolved")
            startup.load();
        });

    // Public API
    return {
        // Load the game assets etc
        load: function () {
            console.log("Loading started...");

            // Informs the SDK of loading progress
            FBInstant.setLoadingProgress(100); // 100% progress, we aren't loading anything

            console.log("...Loading finished");

            // Once all assets are loaded, tells the SDK 
            // to end loading view and start the game
            FBInstant.startGameAsync()
                .then(function () {
                    // Retrieving context and player information can only be done
                    // once startGameAsync() resolves
                    var contextId = FBInstant.context.getID();
                    var contextType = FBInstant.context.getType();

                    // Once startGameAsync() resolves it also means the loading view has 
                    // been removed and the user can see the game viewport
                    game.start({
                        name: FBInstant.player.getName(),
                        id: FBInstant.player.getID(),
                        picture: FBInstant.player.getPhoto(),
                        elo: 1500,
                    });
                });
        }
    }

}()); // End namespace startup