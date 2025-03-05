import { createElement, replaceWith } from "./dom";
import { VideoElemOptions } from "./buffer-void";

class Player {
    videoElm: HTMLVideoElement | undefined

    elm: HTMLElement;

    options: VideoElemOptions

    #controls: boolean;

    static players: { [key: string]: Player } = {}

    constructor(elm: HTMLElement, options: VideoElemOptions = {}) {
        elm.id = elm.id || `buffer-void-${parseInt(elm.id) + 1}`

        this.#controls = !!options.controls

        delete options.controls

        this.options = options

        this.elm = elm

        this.createPlayer()

        Player.players[elm.id] = this
    }

    play() {
        if (this.videoElm) {
            this.videoElm.play()
        }
    }

    pause() {
        if (this.videoElm) {
            this.videoElm.pause()
        }
    }

    autoPlay() {
        if (this.videoElm) {
            this.videoElm.muted = true
            this.videoElm.play()
        }
    }

    muted(val: boolean) {
        if (this.videoElm) {
            this.videoElm.muted = val
        }
    }

    createPlayer() {
        const videoElm = createElement('video')

        for (let option in this.options) {
            videoElm.setAttribute(option, this.options[option as keyof VideoElemOptions] as string)
        }

        this.elm.style.width = this.options.width + "px"
        this.elm.style.height = this.options.height + "px"

        this.elm.prepend(videoElm)
        this.videoElm = videoElm
    }

    createControls() {
        const div = document.createElement('div')

    }
}

export default Player
