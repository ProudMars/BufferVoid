// src/dom.ts
function querySelector(selector) {
  return document.querySelector(selector);
}
function createElement(tagName, options) {
  return document.createElement(tagName, options);
}

// src/utils/stream-loader.ts
var StreamLoader = class _StreamLoader {
  mediaSource;
  sourceBuffer = null;
  videoElement;
  videoUrl;
  options;
  abortController = null;
  isLoading = false;
  isBuffering = false;
  currentChunk = 0;
  totalChunks = 0;
  contentLength = 0;
  loadedChunks = /* @__PURE__ */ new Set();
  pendingChunks = /* @__PURE__ */ new Set();
  // Default options
  static defaultOptions = {
    chunkSize: 1024 * 1024,
    // 1MB chunks
    bufferAhead: 3,
    // Buffer 3 chunks ahead
    initialBufferSize: 2,
    // Initially load 2 chunks
    mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
  };
  constructor(videoElement, videoUrl, options) {
    this.videoElement = videoElement;
    this.videoUrl = videoUrl;
    this.options = { ..._StreamLoader.defaultOptions, ...options };
    this.mediaSource = new MediaSource();
    this.videoElement.src = URL.createObjectURL(this.mediaSource);
    this.mediaSource.addEventListener("sourceopen", this.onSourceOpen.bind(this));
    this.mediaSource.addEventListener("sourceended", () => console.log("MediaSource ended"));
    this.mediaSource.addEventListener("sourceclose", () => console.log("MediaSource closed"));
    this.videoElement.addEventListener("seeking", this.onSeeking.bind(this));
    this.videoElement.addEventListener("waiting", this.onBuffering.bind(this));
    this.videoElement.addEventListener("playing", this.onPlaying.bind(this));
  }
  /**
   * Initialize the stream loader and start loading initial chunks
   */
  async initialize() {
    try {
      const response = await fetch(this.videoUrl, { method: "HEAD" });
      if (!response.ok) {
        throw new Error(`Failed to fetch video info: ${response.status} ${response.statusText}`);
      }
      const contentLength = response.headers.get("content-length");
      if (!contentLength) {
        throw new Error("Content length not available");
      }
      this.contentLength = parseInt(contentLength, 10);
      this.totalChunks = Math.ceil(this.contentLength / this.options.chunkSize);
      console.log(`Video size: ${this.contentLength} bytes, Total chunks: ${this.totalChunks}`);
      for (let i = 0; i < this.options.initialBufferSize && i < this.totalChunks; i++) {
        this.loadChunk(i);
      }
    } catch (error) {
      console.error("Error initializing stream loader:", error);
      throw error;
    }
  }
  /**
   * Handle MediaSource open event
   */
  onSourceOpen() {
    console.log("MediaSource opened");
    try {
      this.sourceBuffer = this.mediaSource.addSourceBuffer(this.options.mimeType);
      this.sourceBuffer.addEventListener("updateend", this.onSourceBufferUpdateEnd.bind(this));
      this.sourceBuffer.addEventListener("error", (e) => console.error("SourceBuffer error:", e));
      this.sourceBuffer.mode = "segments";
    } catch (error) {
      console.error("Error setting up source buffer:", error);
    }
  }
  /**
   * Handle source buffer update end event
   */
  onSourceBufferUpdateEnd() {
    if (!this.sourceBuffer) return;
    if (this.currentChunk < this.totalChunks - 1 && !this.isLoading) {
      this.loadNextChunks();
    }
    if (this.loadedChunks.size === this.totalChunks && !this.sourceBuffer.updating) {
      try {
        this.mediaSource.endOfStream();
      } catch (error) {
        console.error("Error ending media source stream:", error);
      }
    }
  }
  /**
   * Handle video seeking event
   */
  onSeeking() {
    if (!this.sourceBuffer || !this.videoElement) return;
    const currentTime = this.videoElement.currentTime;
    const buffered = this.sourceBuffer.buffered;
    let isBuffered = false;
    for (let i = 0; i < buffered.length; i++) {
      if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
        isBuffered = true;
        break;
      }
    }
    if (!isBuffered) {
      const seekPositionRatio = currentTime / this.videoElement.duration;
      const estimatedChunk = Math.floor(seekPositionRatio * this.totalChunks);
      console.log(`Seeking to time ${currentTime}, loading chunk ${estimatedChunk}`);
      this.abortCurrentLoads();
      this.pendingChunks.clear();
      for (let i = estimatedChunk; i < estimatedChunk + this.options.bufferAhead && i < this.totalChunks; i++) {
        if (!this.loadedChunks.has(i)) {
          this.loadChunk(i);
        }
      }
    }
  }
  /**
   * Handle video buffering event
   */
  onBuffering() {
    this.isBuffering = true;
    console.log("Video is buffering");
    const tempBufferAhead = this.options.bufferAhead * 2;
    for (let i = this.currentChunk + 1; i < this.currentChunk + tempBufferAhead && i < this.totalChunks; i++) {
      if (!this.loadedChunks.has(i) && !this.pendingChunks.has(i)) {
        this.loadChunk(i);
      }
    }
  }
  /**
   * Handle video playing event
   */
  onPlaying() {
    this.isBuffering = false;
    console.log("Video is playing");
  }
  /**
   * Load the next set of chunks based on buffer ahead setting
   */
  loadNextChunks() {
    const nextChunk = this.currentChunk + 1;
    for (let i = nextChunk; i < nextChunk + this.options.bufferAhead && i < this.totalChunks; i++) {
      if (!this.loadedChunks.has(i) && !this.pendingChunks.has(i)) {
        this.loadChunk(i);
      }
    }
  }
  /**
   * Load a specific chunk
   */
  async loadChunk(chunkIndex) {
    if (this.loadedChunks.has(chunkIndex) || this.pendingChunks.has(chunkIndex)) {
      return;
    }
    this.pendingChunks.add(chunkIndex);
    this.isLoading = true;
    const start = chunkIndex * this.options.chunkSize;
    const end = Math.min(start + this.options.chunkSize - 1, this.contentLength - 1);
    console.log(`Loading chunk ${chunkIndex} (bytes ${start}-${end})`);
    this.abortController = new AbortController();
    try {
      const response = await fetch(this.videoUrl, {
        headers: {
          Range: `bytes=${start}-${end}`
        },
        signal: this.abortController.signal
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch chunk ${chunkIndex}: ${response.status} ${response.statusText}`);
      }
      const data = await response.arrayBuffer();
      if (this.sourceBuffer && !this.sourceBuffer.updating) {
        this.sourceBuffer.appendBuffer(data);
        this.loadedChunks.add(chunkIndex);
        this.currentChunk = Math.max(this.currentChunk, chunkIndex);
        console.log(`Chunk ${chunkIndex} loaded and appended`);
        this.dispatchChunkLoadedEvent();
      } else {
        console.log(`Source buffer busy, queuing chunk ${chunkIndex}`);
        setTimeout(() => {
          if (this.sourceBuffer && !this.sourceBuffer.updating) {
            try {
              this.sourceBuffer.appendBuffer(data);
              this.loadedChunks.add(chunkIndex);
              this.currentChunk = Math.max(this.currentChunk, chunkIndex);
              console.log(`Chunk ${chunkIndex} loaded and appended (delayed)`);
              this.dispatchChunkLoadedEvent();
            } catch (error) {
              console.error(`Error appending delayed chunk ${chunkIndex}:`, error);
            }
          }
        }, 100);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log(`Loading of chunk ${chunkIndex} aborted`);
      } else {
        console.error(`Error loading chunk ${chunkIndex}:`, error);
      }
    } finally {
      this.pendingChunks.delete(chunkIndex);
      this.abortController = null;
      this.isLoading = false;
      if (this.pendingChunks.size === 0 && !this.isBuffering) {
        this.loadNextChunks();
      }
    }
  }
  /**
   * Abort current chunk loads
   */
  abortCurrentLoads() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isLoading = false;
  }
  /**
   * Dispatch a custom event with chunk loading information
   * This is used to update the UI with loading progress
   */
  dispatchChunkLoadedEvent() {
    const event = new CustomEvent("chunkLoaded", {
      detail: {
        loadedChunks: this.loadedChunks.size,
        totalChunks: this.totalChunks,
        currentChunk: this.currentChunk,
        isBuffering: this.isBuffering
      }
    });
    window.dispatchEvent(event);
  }
  /**
   * Clean up resources
   */
  dispose() {
    this.abortCurrentLoads();
    this.videoElement.removeEventListener("seeking", this.onSeeking.bind(this));
    this.videoElement.removeEventListener("waiting", this.onBuffering.bind(this));
    this.videoElement.removeEventListener("playing", this.onPlaying.bind(this));
    if (this.sourceBuffer) {
      this.sourceBuffer.removeEventListener("updateend", this.onSourceBufferUpdateEnd.bind(this));
    }
    this.sourceBuffer = null;
    this.loadedChunks.clear();
    this.pendingChunks.clear();
  }
};

// src/player.ts
var Player = class _Player {
  videoElm;
  elm;
  options;
  #controls;
  #streamLoader;
  static players = {};
  constructor(elm, options = {}) {
    elm.id = elm.id || `buffer-void-${parseInt(elm.id) + 1}`;
    this.#controls = !!options.controls;
    delete options.controls;
    this.options = options;
    this.elm = elm;
    this.createPlayer();
    _Player.players[elm.id] = this;
    if (this.options.useChunkedLoading && this.videoElm && this.options.src) {
      this.initializeStreamLoader();
    }
  }
  play() {
    if (this.videoElm) {
      this.videoElm.play();
    }
  }
  pause() {
    if (this.videoElm) {
      this.videoElm.pause();
    }
  }
  autoPlay() {
    if (this.videoElm) {
      this.videoElm.muted = true;
      this.videoElm.play();
    }
  }
  muted(val) {
    if (this.videoElm) {
      this.videoElm.muted = val;
    }
  }
  createPlayer() {
    const videoElm = createElement("video");
    const skipSrcAttribute = this.options.useChunkedLoading;
    for (let option in this.options) {
      if (option === "useChunkedLoading" || option === "streamOptions") {
        continue;
      }
      if (skipSrcAttribute && option === "src") {
        continue;
      }
      videoElm.setAttribute(option, this.options[option]);
    }
    if (this.options.width) {
      this.elm.style.width = this.options.width + "px";
    }
    if (this.options.height) {
      this.elm.style.height = this.options.height + "px";
    }
    this.elm.prepend(videoElm);
    this.videoElm = videoElm;
  }
  /**
   * Initialize the stream loader for chunked video loading
   */
  initializeStreamLoader() {
    if (!this.videoElm || !this.options.src) {
      console.error("Cannot initialize stream loader: video element or source URL is missing");
      return;
    }
    try {
      this.#streamLoader = new StreamLoader(
        this.videoElm,
        this.options.src,
        this.options.streamOptions
      );
      this.#streamLoader.initialize().catch((error) => {
        console.error("Failed to initialize stream loader:", error);
        if (this.videoElm && this.options.src) {
          console.log("Falling back to regular video loading");
          this.videoElm.src = this.options.src;
        }
      });
      console.log("Chunked video loading initialized");
    } catch (error) {
      console.error("Error setting up chunked video loading:", error);
      if (this.videoElm && this.options.src) {
        this.videoElm.src = this.options.src;
      }
    }
  }
  /**
   * Clean up resources when the player is destroyed
   */
  dispose() {
    if (this.#streamLoader) {
      this.#streamLoader.dispose();
      this.#streamLoader = void 0;
    }
    if (this.elm.id && _Player.players[this.elm.id]) {
      delete _Player.players[this.elm.id];
    }
  }
  createControls() {
    const div = document.createElement("div");
  }
};
var player_default = Player;

// src/utils/helpers.ts
function normalizeId(id) {
  return id.startsWith("#") ? id.slice(1) : id;
}

// src/buffer-void.ts
var BufferVoid = class _BufferVoid {
  static playerId;
  static player;
  /**
   * Create a new BufferVoid video player instance
   * 
   * @param id - The ID of the element to attach the player to
   * @param options - Configuration options for the player
   */
  constructor(id, options = {}) {
    let player = this.getPlayer();
    if (player) {
      if (options && Object.keys(options).length > 0) {
        console.warn("Options will not apply, player is already instantiated!");
      }
      _BufferVoid.playerId = id;
      _BufferVoid.player = player;
    } else {
      const elm = querySelector(`#${normalizeId(id)}`);
      if (!elm) {
        throw new Error("Invalid ElementID passed");
      }
      if (!(elm instanceof HTMLElement)) {
        throw new Error("Element is not an HTMLElement");
      }
      _BufferVoid.player = new player_default(elm, options);
      _BufferVoid.playerId = id;
    }
  }
  /**
   * Get the current player instance if it exists
   */
  getPlayer() {
    if (_BufferVoid.playerId) {
      const player = player_default.players[_BufferVoid.playerId];
      if (player) {
        return player;
      }
    }
    return void 0;
  }
  /**
   * Create a player with chunked loading enabled
   * 
   * @param id - The ID of the element to attach the player to
   * @param src - The source URL of the video
   * @param options - Additional player options
   */
  static createStreamingPlayer(id, src, options = {}) {
    const streamingOptions = {
      ...options,
      src,
      useChunkedLoading: true,
      streamOptions: {
        chunkSize: options.streamOptions?.chunkSize || 1024 * 1024,
        // Default 1MB chunks
        bufferAhead: options.streamOptions?.bufferAhead || 3,
        initialBufferSize: options.streamOptions?.initialBufferSize || 2,
        mimeType: options.streamOptions?.mimeType || 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
      }
    };
    return new _BufferVoid(id, streamingOptions);
  }
  /**
   * Clean up resources when the player is no longer needed
   */
  dispose() {
    if (_BufferVoid.player) {
      _BufferVoid.player.dispose();
      _BufferVoid.player = void 0;
      _BufferVoid.playerId = void 0;
    }
  }
};
var buffer_void_default = BufferVoid;
export {
  buffer_void_default as default
};
//# sourceMappingURL=buffer-void.mjs.map