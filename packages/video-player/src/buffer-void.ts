import { querySelector } from "./dom";
import Player from "./player";
import { normalizeId } from "./utils/helpers";

export interface VideoElemOptions {
    controls?: boolean;
    muted?: boolean;
    autoplay?: boolean;
    controlslist?: 'nodownload' | 'nofullscreen' | 'noremoteplaybac';
    crossorigin?: 'anonymous' | 'use-credentials';
    disablepictureinpicture?: boolean;
    disableremoteplayback?: boolean;
    height?: number;
    width?: number;
    loop?: boolean;
    playsinline?: boolean;
    poster?: string;
    preload?: 'none' | 'metadata' | 'auto';
    src?: string;
}

class BufferVoid {
    static playerId: string | undefined
    static player: Player | undefined

    constructor(id: string, options: VideoElemOptions = {}) {
        // let player = this.getPlayer()

        // if (player) {
        //     if (options) {
        //         console.warn("options will not apply,player is already instantated!!")
        //     }

        //     BufferVoid.playerId = id
        //     BufferVoid.player = player
        // } else {
        //     const elm = querySelector(`#${normalizeId(id)}`)
        //     if (!elm) {
        //         throw new Error("Invalid ElementID passed")
        //     }

        //     BufferVoid.player = new Player(elm, options)
        //     BufferVoid.playerId = id
        // }
    }

    getPlayer() {
        // if (BufferVoid.playerId) {
        //     const player = Player.players[BufferVoid.playerId];
        //     if (player) {
        //         return player
        //     }
        // }
    }
}

export default BufferVoid;