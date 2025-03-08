/**
 * StreamLoader - Handles fetching video chunks and feeding them to MediaSource
 * Uses Fetch API and Media Source Extensions (MSE) to stream video content
 */

export interface StreamLoaderOptions {
  chunkSize: number;  // Size of each chunk in bytes
  bufferAhead: number; // Number of chunks to buffer ahead
  initialBufferSize: number; // Initial buffer size in chunks
  mimeType: string; // MIME type of the video (e.g., 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"')
}

export default class StreamLoader {
  private mediaSource: MediaSource;
  private sourceBuffer: SourceBuffer | null = null;
  private videoElement: HTMLVideoElement;
  private videoUrl: string;
  private options: StreamLoaderOptions;
  private abortController: AbortController | null = null;
  private isLoading: boolean = false;
  private isBuffering: boolean = false;
  private currentChunk: number = 0;
  private totalChunks: number = 0;
  private contentLength: number = 0;
  private loadedChunks: Set<number> = new Set();
  private pendingChunks: Set<number> = new Set();

  // Default options
  private static defaultOptions: StreamLoaderOptions = {
    chunkSize: 1024 * 1024, // 1MB chunks
    bufferAhead: 3, // Buffer 3 chunks ahead
    initialBufferSize: 2, // Initially load 2 chunks
    mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
  };

  constructor(videoElement: HTMLVideoElement, videoUrl: string, options?: Partial<StreamLoaderOptions>) {
    this.videoElement = videoElement;
    this.videoUrl = videoUrl;
    this.options = { ...StreamLoader.defaultOptions, ...options };
    this.mediaSource = new MediaSource();
    
    // Set up MediaSource
    this.videoElement.src = URL.createObjectURL(this.mediaSource);
    
    this.mediaSource.addEventListener('sourceopen', this.onSourceOpen.bind(this));
    this.mediaSource.addEventListener('sourceended', () => console.log('MediaSource ended'));
    this.mediaSource.addEventListener('sourceclose', () => console.log('MediaSource closed'));
    
    // Set up video element event listeners
    this.videoElement.addEventListener('seeking', this.onSeeking.bind(this));
    this.videoElement.addEventListener('waiting', this.onBuffering.bind(this));
    this.videoElement.addEventListener('playing', this.onPlaying.bind(this));
  }

  /**
   * Initialize the stream loader and start loading initial chunks
   */
  public async initialize(): Promise<void> {
    try {
      // Get content length to calculate total chunks
      const response = await fetch(this.videoUrl, { method: 'HEAD' });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video info: ${response.status} ${response.statusText}`);
      }
      
      const contentLength = response.headers.get('content-length');
      if (!contentLength) {
        throw new Error('Content length not available');
      }
      
      this.contentLength = parseInt(contentLength, 10);
      this.totalChunks = Math.ceil(this.contentLength / this.options.chunkSize);
      
      console.log(`Video size: ${this.contentLength} bytes, Total chunks: ${this.totalChunks}`);
      
      // Load initial chunks
      for (let i = 0; i < this.options.initialBufferSize && i < this.totalChunks; i++) {
        this.loadChunk(i);
      }
    } catch (error) {
      console.error('Error initializing stream loader:', error);
      throw error;
    }
  }

  /**
   * Handle MediaSource open event
   */
  private onSourceOpen(): void {
    console.log('MediaSource opened');
    
    try {
      // Create source buffer
      this.sourceBuffer = this.mediaSource.addSourceBuffer(this.options.mimeType);
      
      // Set up source buffer event listeners
      this.sourceBuffer.addEventListener('updateend', this.onSourceBufferUpdateEnd.bind(this));
      this.sourceBuffer.addEventListener('error', (e) => console.error('SourceBuffer error:', e));
      
      // Set mode to segments for better seeking
      this.sourceBuffer.mode = 'segments';
    } catch (error) {
      console.error('Error setting up source buffer:', error);
    }
  }

  /**
   * Handle source buffer update end event
   */
  private onSourceBufferUpdateEnd(): void {
    if (!this.sourceBuffer) return;
    
    // If we're not at the end and not currently loading, load more chunks
    if (this.currentChunk < this.totalChunks - 1 && !this.isLoading) {
      this.loadNextChunks();
    }
    
    // If we've loaded all chunks, close the media source
    if (this.loadedChunks.size === this.totalChunks && !this.sourceBuffer.updating) {
      try {
        this.mediaSource.endOfStream();
      } catch (error) {
        console.error('Error ending media source stream:', error);
      }
    }
  }

  /**
   * Handle video seeking event
   */
  private onSeeking(): void {
    if (!this.sourceBuffer || !this.videoElement) return;
    
    const currentTime = this.videoElement.currentTime;
    const buffered = this.sourceBuffer.buffered;
    
    // Check if the seek position is already buffered
    let isBuffered = false;
    for (let i = 0; i < buffered.length; i++) {
      if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
        isBuffered = true;
        break;
      }
    }
    
    // If not buffered, load the appropriate chunk
    if (!isBuffered) {
      // Calculate which chunk contains the seek position
      const seekPositionRatio = currentTime / this.videoElement.duration;
      const estimatedChunk = Math.floor(seekPositionRatio * this.totalChunks);
      
      console.log(`Seeking to time ${currentTime}, loading chunk ${estimatedChunk}`);
      
      // Cancel current loads
      this.abortCurrentLoads();
      
      // Clear pending chunks
      this.pendingChunks.clear();
      
      // Load the chunk for the seek position and subsequent chunks
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
  private onBuffering(): void {
    this.isBuffering = true;
    console.log('Video is buffering');
    
    // Increase buffer ahead when buffering
    const tempBufferAhead = this.options.bufferAhead * 2;
    
    // Load more chunks ahead
    for (let i = this.currentChunk + 1; i < this.currentChunk + tempBufferAhead && i < this.totalChunks; i++) {
      if (!this.loadedChunks.has(i) && !this.pendingChunks.has(i)) {
        this.loadChunk(i);
      }
    }
  }

  /**
   * Handle video playing event
   */
  private onPlaying(): void {
    this.isBuffering = false;
    console.log('Video is playing');
  }

  /**
   * Load the next set of chunks based on buffer ahead setting
   */
  private loadNextChunks(): void {
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
  private async loadChunk(chunkIndex: number): Promise<void> {
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
      
      // Append the chunk to the source buffer if it's ready
      if (this.sourceBuffer && !this.sourceBuffer.updating) {
        this.sourceBuffer.appendBuffer(data);
        this.loadedChunks.add(chunkIndex);
        this.currentChunk = Math.max(this.currentChunk, chunkIndex);
        console.log(`Chunk ${chunkIndex} loaded and appended`);
        
        // Dispatch custom event for UI updates
        this.dispatchChunkLoadedEvent();
      } else {
        // If source buffer is busy, wait and try again
        console.log(`Source buffer busy, queuing chunk ${chunkIndex}`);
        setTimeout(() => {
          if (this.sourceBuffer && !this.sourceBuffer.updating) {
            try {
              this.sourceBuffer.appendBuffer(data);
              this.loadedChunks.add(chunkIndex);
              this.currentChunk = Math.max(this.currentChunk, chunkIndex);
              console.log(`Chunk ${chunkIndex} loaded and appended (delayed)`);
              
              // Dispatch custom event for UI updates
              this.dispatchChunkLoadedEvent();
            } catch (error) {
              console.error(`Error appending delayed chunk ${chunkIndex}:`, error);
            }
          }
        }, 100);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`Loading of chunk ${chunkIndex} aborted`);
      } else {
        console.error(`Error loading chunk ${chunkIndex}:`, error);
      }
    } finally {
      this.pendingChunks.delete(chunkIndex);
      this.abortController = null;
      this.isLoading = false;
      
      // Check if we need to load more chunks
      if (this.pendingChunks.size === 0 && !this.isBuffering) {
        this.loadNextChunks();
      }
    }
  }

  /**
   * Abort current chunk loads
   */
  private abortCurrentLoads(): void {
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
  private dispatchChunkLoadedEvent(): void {
    // Create and dispatch a custom event with chunk loading details
    const event = new CustomEvent('chunkLoaded', {
      detail: {
        loadedChunks: this.loadedChunks.size,
        totalChunks: this.totalChunks,
        currentChunk: this.currentChunk,
        isBuffering: this.isBuffering
      }
    });
    
    // Dispatch the event on the window object so it can be caught by the UI
    window.dispatchEvent(event);
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.abortCurrentLoads();
    
    // Remove event listeners
    this.videoElement.removeEventListener('seeking', this.onSeeking.bind(this));
    this.videoElement.removeEventListener('waiting', this.onBuffering.bind(this));
    this.videoElement.removeEventListener('playing', this.onPlaying.bind(this));
    
    if (this.sourceBuffer) {
      this.sourceBuffer.removeEventListener('updateend', this.onSourceBufferUpdateEnd.bind(this));
    }
    
    // Clear references
    this.sourceBuffer = null;
    this.loadedChunks.clear();
    this.pendingChunks.clear();
  }
}
