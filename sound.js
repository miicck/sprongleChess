// Namespace sound
var sound = (function () {

    var muted = true;

    return {
        // Play the sound at the url
        playSound: function (url) {
            if (muted) return;
            var audio = new Audio(url);
            audio.play();
        },

        // Mute/unmute sound
        mute: function () { muted = true; },
        unmute: function () { muted = false; },
    }

})(); // End namespace sound