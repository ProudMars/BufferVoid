import BufferVoid from "./buffer-void";

// Example of creating a regular video player
// const videoPlayer = new BufferVoid('buffervoid', {
//     autoplay: true,
//     muted: true,
//     src: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
// });

// Create a streaming video player that loads video chunks to reduce buffering
const streamingPlayer = BufferVoid.createStreamingPlayer(
    'buffervoid',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    {
        autoplay: true,
        muted: true,
        controls: true,
        streamOptions: {
            // Customize chunk size (in bytes)
            chunkSize: 512 * 1024, // 512KB chunks
            // Number of chunks to buffer ahead of current playback position
            bufferAhead: 4,
            // Number of chunks to load initially before playback starts
            initialBufferSize: 2,
            // MIME type with codecs
            mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
        }
    }
);

// Export the player instance for external use
export default streamingPlayer;
