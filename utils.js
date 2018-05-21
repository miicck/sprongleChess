var utils = (function () { // Namespace utils

    return {

        // Log a thing if the tag is in the acceptedTags list
        log: function (thing, tag) {
            var acceptedTags = [
                //"server",
                //"stockfish",
                //"server_tick",
                //"server_all",
                //"ui",
                //"sound"
            ];

            var accepted = false;
            for (var i in acceptedTags)
                if (acceptedTags[i] == tag) {
                    accepted = true;
                    break;
                }

            if (accepted) {
                if (thing) console.log(thing);
                else console.log("Tried to print null thing, with tag: " + tag);
            }
        }
    }

}()); // End namespace utils