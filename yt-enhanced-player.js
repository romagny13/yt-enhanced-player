(function (global, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
  } else {
    global.YTEnhancedPlayer = factory();
  }
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";

  function loadScript() {
    return new Promise((resolve, reject) => {
      if (window.YT && YT.Player) {
        resolve(); // Si l'API est déjà chargée, on résout immédiatement
        return;
      }

      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.onload = () => {
        // Attendre que YT et YT.Player soient disponibles
        waitForYouTubeAPI(resolve, reject);
      };
      script.onerror = (err) => reject(err); // Rejeter en cas d'erreur
      document.body.appendChild(script);
    });
  }

  function waitForYouTubeAPI(resolve, reject) {
    const checkInterval = setInterval(() => {
      if (window.YT && YT.Player) {
        clearInterval(checkInterval);
        resolve(); // L'API est prête, on résout la promesse
      }
    }, 100); // Vérifier toutes les 100ms
  }

  class YouTubePlayerPlugin {
    constructor(containerId, options = {}) {
      this.containerId = containerId;
      this.options = options;

      this.player = null;

      if (!this.options.videoId) {
        throw new Error("A videoId must be provided.");
      }

      this.initialize();
    }

    initialize() {
      loadScript().then(() => this.loadYouTubeAPI());
    }

    loadYouTubeAPI() {
      if (typeof YT === "undefined" || !YT.Player) {
        console.error("YouTube API is not ready.");
        return;
      }

      if (this.player) return;

      this.player = new YT.Player(this.containerId, this.options);
    }

    changeVideo(videoId) {
      if (this.player && this.player.loadVideoById) {
        this.player.loadVideoById(videoId);
      }
    }
  }

  class YouTubePlayerWithPlaylistPlugin {
    constructor(containerId, options = {}) {
      this.containerId = containerId;
      this.options = options;

      this.player = null;
      this.playlist = this.options.playlist || [];
      this.currentIndex = 0;
      this.loopMode = this.options.loopMode || "none"; // "none", "video", "playlist", "playlist-loop"
      this.onVideoChange = this.options.onVideoChange || null; // Callback function for video change

      if (!this.playlist.length) {
        throw new Error("A playlist with at least one video must be provided.");
      }

      this.initialize();
    }

    initialize() {
      loadScript().then(() => this.loadYouTubeAPI());
    }

    loadYouTubeAPI() {
      if (typeof YT === "undefined" || !YT.Player) {
        console.error("YouTube API is not ready.");
        return;
      }

      if (this.player) return;

      this.player = new YT.Player(this.containerId, {
        videoId: this.getCurrentVideoId(),
        events: {
          onReady: (event) => this.onPlayerReady(event),
          onStateChange: (event) => this.onPlayerStateChange(event)
        }
      });
    }

    onPlayerReady(event) {
      // console.log("La vidéo est prête et chargée", this.playlist[this.currentIndex]);
      if (typeof this.onVideoChange === "function") {
        this.onVideoChange(this.playlist[this.currentIndex]);
      }
    }

    onPlayerStateChange(event) {
      if (event.data === YT.PlayerState.ENDED) {
        switch (this.loopMode) {
          case "video":
            this.playVideo(this.currentIndex);
            break;
          case "playlist":
            if (this.currentIndex < this.playlist.length - 1) {
              this.nextVideo();
            }
            break;
          case "playlist-loop":
            this.nextVideo(true);
            break;
          default:
            break;
        }
      }
    }

    playVideo(index) {
      if (index >= 0 && index < this.playlist.length) {
        this.currentIndex = index;
        this.player.loadVideoById(this.playlist[this.currentIndex].videoId);

        // Notify if the onVideoChange callback is provided
        if (typeof this.onVideoChange === "function") {
          this.onVideoChange(this.playlist[this.currentIndex]);
        }
      }
    }

    nextVideo(loop = false) {
      if (this.currentIndex < this.playlist.length - 1) {
        this.playVideo(this.currentIndex + 1);
      } else if (loop) {
        this.playVideo(0);
      }
    }

    previousVideo() {
      if (this.currentIndex > 0) {
        this.playVideo(this.currentIndex - 1);
      }
    }

    setLoopMode(mode) {
      if (["none", "video", "playlist", "playlist-loop"].includes(mode)) {
        this.loopMode = mode;
      } else {
        throw new Error("Invalid loop mode.");
      }
    }

    static generateShuffledPlaylist(playlist) {
      const shuffled = [...playlist];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    getCurrentVideoId() {
      return this.playlist[this.currentIndex]?.videoId;
    }

    getCurrentIndex() {
      return this.currentIndex;
    }

    canGoToPreviousVideo() {
      return this.currentIndex > 0;
    }

    canGoToNextVideo() {
      return this.currentIndex < this.playlist.length - 1;
    }
  }

  return { YouTubePlayerPlugin, YouTubePlayerWithPlaylistPlugin };
});
