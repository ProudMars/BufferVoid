import { querySelector } from "./dom";
import Player, { PlayerOptions } from "./player";
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
    static playerId: string | undefined;
    static player: Player | undefined;
    
    /**
     * Create a new BufferVoid video player instance
     * 
     * @param id - The ID of the element to attach the player to
     * @param options - Configuration options for the player
     */
    constructor(id: string, options: PlayerOptions = {}) {
        // Check if we already have a player instance
        let player = this.getPlayer();

        if (player) {
            if (options && Object.keys(options).length > 0) {
                console.warn("Options will not apply, player is already instantiated!");
            }

            BufferVoid.playerId = id;
            BufferVoid.player = player;
        } else {
            // Find the element by ID
            const elm = querySelector(`#${normalizeId(id)}`);
            if (!elm) {
                throw new Error("Invalid ElementID passed");
            }
            
            if (!(elm instanceof HTMLElement)) {
                throw new Error("Element is not an HTMLElement");
            }

            // Create a new player instance
            BufferVoid.player = new Player(elm, options);
            BufferVoid.playerId = id;
        }
    }

    /**
     * Get the current player instance if it exists
     */
    getPlayer() {
        if (BufferVoid.playerId) {
            const player = Player.players[BufferVoid.playerId];
            if (player) {
                return player;
            }
        }
        return undefined;
    }
    
    /**
     * Create a player with chunked loading enabled
     * 
     * @param id - The ID of the element to attach the player to
     * @param src - The source URL of the video
     * @param options - Additional player options
     */
    static createStreamingPlayer(id: string, src: string, options: Partial<PlayerOptions> = {}) {
        const streamingOptions: PlayerOptions = {
            ...options,
            src,
            useChunkedLoading: true,
            streamOptions: {
                chunkSize: options.streamOptions?.chunkSize || 1024 * 1024, // Default 1MB chunks
                bufferAhead: options.streamOptions?.bufferAhead || 3,
                initialBufferSize: options.streamOptions?.initialBufferSize || 2,
                mimeType: options.streamOptions?.mimeType || 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
            }
        };
        
        return new BufferVoid(id, streamingOptions);
    }
    
    /**
     * Clean up resources when the player is no longer needed
     */
    dispose() {
        if (BufferVoid.player) {
            BufferVoid.player.dispose();
            BufferVoid.player = undefined;
            BufferVoid.playerId = undefined;
        }
    }
}

export default BufferVoid;
