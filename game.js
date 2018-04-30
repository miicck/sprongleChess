// Initialzie Async must resolve
// before we can losd the game
FBInstant.initializeAsync()
    .then(function () {
        console.log("FBInstant.initializeAsync resolved")
        load();
    });

// Load the game
function load() {
    console.log("Loading started...");

    // Informs the SDK of loading progress
    FBInstant.setLoadingProgress(100);

    console.log("...Loading finished");

    // Once all assets are loaded, tells the SDK 
    // to end loading view and start the game
    FBInstant.startGameAsync()
        .then(function () {
            // Retrieving context and player information can only be done
            // once startGameAsync() resolves
            var contextId = FBInstant.context.getID();
            var contextType = FBInstant.context.getType();

            var playerName = FBInstant.player.getName();
            var playerPic = FBInstant.player.getPhoto();
            var playerId = FBInstant.player.getID();

            // Once startGameAsync() resolves it also means the loading view has 
            // been removed and the user can see the game viewport

            start();
        });
}

// Start the game
function start() {
    console.log("Hello World!");
}