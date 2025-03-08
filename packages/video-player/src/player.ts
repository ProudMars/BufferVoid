import { createElement, replaceWith } from "./dom";
import { VideoElemOptions } from "./buffer-void";
import StreamLoader, { StreamLoaderOptions } from "./utils/stream-loader";

export interface PlayerOptions extends VideoElemOptions {
  useChunkedLoading?: boolean;
  streamOptions?: Partial<StreamLoaderOptions>;
}

class Player {
    videoElm: HTMLVideoElement | undefined;
    elm: HTMLElement;
    options: PlayerOptions;
    #controls: boolean;
    #streamLoader: StreamLoader | undefined;
    
    static players: { [key: string]: Player } = {};

    constructor(elm: HTMLElement, options: PlayerOptions = {}) {
        elm.id = elm.id || `buffer-void-${parseInt(elm.id) + 1}`;

        this.#controls = !!options.controls;
        delete options.controls;

        this.options = options;
        this.elm = elm;

        this.createPlayer();

        Player.players[elm.id] = this;
        
        // Initialize stream loader if chunked loading is enabled
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

    muted(val: boolean) {
        if (this.videoElm) {
            this.videoElm.muted = val;
        }
    }

    createPlayer() {
        const videoElm = createElement('video');

        // If we're using chunked loading, don't set the src attribute directly
        const skipSrcAttribute = this.options.useChunkedLoading;
        
        for (let option in this.options) {
            // Skip non-attribute options
            if (option === 'useChunkedLoading' || option === 'streamOptions') {
                continue;
            }
            
            // Skip src if using chunked loading
            if (skipSrcAttribute && option === 'src') {
                continue;
            }
            
            videoElm.setAttribute(option, this.options[option as keyof VideoElemOptions] as string);
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
    private initializeStreamLoader() {
        if (!this.videoElm || !this.options.src) {
            console.error('Cannot initialize stream loader: video element or source URL is missing');
            return;
        }
        
        try {
            // Create and initialize the stream loader
            this.#streamLoader = new StreamLoader(
                this.videoElm,
                this.options.src,
                this.options.streamOptions
            );
            
            // Initialize the stream loader
            this.#streamLoader.initialize().catch(error => {
                console.error('Failed to initialize stream loader:', error);
                
                // Fallback to regular video loading if streaming fails
                if (this.videoElm && this.options.src) {
                    console.log('Falling back to regular video loading');
                    this.videoElm.src = this.options.src;
                }
            });
            
            console.log('Chunked video loading initialized');
        } catch (error) {
            console.error('Error setting up chunked video loading:', error);
            
            // Fallback to regular video loading
            if (this.videoElm && this.options.src) {
                this.videoElm.src = this.options.src;
            }
        }
    }

    /**
     * Clean up resources when the player is destroyed
     */
    dispose() {
        // Clean up stream loader if it exists
        if (this.#streamLoader) {
            this.#streamLoader.dispose();
            this.#streamLoader = undefined;
        }
        
        // Remove the player from the static players object
        if (this.elm.id && Player.players[this.elm.id]) {
            delete Player.players[this.elm.id];
        }
    }

    createControls() {
        const div = document.createElement('div');
        // Control implementation would go here
    }
}

export default Player;
