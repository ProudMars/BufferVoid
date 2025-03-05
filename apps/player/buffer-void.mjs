// src/dom.ts
function querySelector(selector) {
  return document.querySelector(selector);
}
function replaceWith(elm, ...replaceNode) {
  return elm.replaceWith(...replaceNode);
}
function createElement(tagName, options) {
  return document.createElement(tagName, options);
}

// src/player.ts
var Player = class _Player {
  videoElm;
  element;
  options;
  static players = {};
  constructor(elm, options = {}) {
    elm.id = elm.id || `buffer-void-${parseInt(elm.id) + 1}`;
    this.element = elm;
    this.options = options;
    this.createPlayer();
    _Player.players[elm.id] = this;
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
  createPlayer() {
    const videoElm = createElement("video");
    replaceWith(this.element, videoElm);
    this.videoElm = videoElm;
    for (let option in this.options) {
      this.videoElm.setAttribute(option, this.options[option]);
    }
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
  constructor(id, options = {}) {
    let player = this.getPlayer();
    if (player) {
      if (options) {
        console.warn("options will not apply,player is already instantated!!");
      }
      _BufferVoid.playerId = id;
      _BufferVoid.player = player;
    } else {
      const videoElm = querySelector(`#${normalizeId(id)}`);
      if (!videoElm) {
        throw new Error("Invalid ElementID passed");
      }
      _BufferVoid.player = new player_default(videoElm, options);
      _BufferVoid.playerId = id;
    }
  }
  getPlayer() {
    if (_BufferVoid.playerId) {
      const player = player_default.players[_BufferVoid.playerId];
      console.log("playerId: ", _BufferVoid.playerId, "Player: ", player);
      if (player) {
        console.log("Player exists!!");
        return player;
      }
    }
  }
};
var buffer_void_default = BufferVoid;
export {
  buffer_void_default as default
};
//# sourceMappingURL=buffer-void.mjs.map