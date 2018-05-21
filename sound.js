// Namespace sound
var sound = (function () {

    var muted = false;

    return {
        // Play the sound at the url
        playSound: function (url) {
            utils.log("playing sound: " + url + " muted: " + muted, "sound");
            if (muted) return;
            var audio = new Audio(url);
            audio.play();
        },

        // Mute/unmute sound
        mute: function () { muted = true; },
        unmute: function () { muted = false; },
    }

})(); // End namespace sound