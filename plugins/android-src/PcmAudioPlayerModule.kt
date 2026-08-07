package com.amogh.dlt.calling

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Streams decrypted call audio to the speaker/earpiece via AudioTrack in
 * streaming mode. Pairs with react-native-live-audio-stream on the capture
 * side to give the encrypted-PCM call pipeline real playback on native,
 * since react-native-webrtc's own audio track can't carry app-level E2EE.
 */
class PcmAudioPlayerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var audioTrack: AudioTrack? = null
    private var writeExecutor: ExecutorService? = null

    override fun getName(): String = "PcmAudioPlayer"

    @ReactMethod
    fun init(sampleRate: Int, promise: Promise) {
        try {
            stopInternal()

            val minBufferSize = AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            )
            val bufferSize = if (minBufferSize > 0) minBufferSize * 2 else sampleRate

            val track = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setSampleRate(sampleRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .build()
                )
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()

            track.play()
            audioTrack = track
            writeExecutor = Executors.newSingleThreadExecutor()
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("pcm_audio_player_init_failed", error.message, error)
        }
    }

    @ReactMethod
    fun write(base64Chunk: String) {
        val executor = writeExecutor ?: return
        executor.execute {
            try {
                val bytes = Base64.decode(base64Chunk, Base64.NO_WRAP)
                audioTrack?.write(bytes, 0, bytes.size, AudioTrack.WRITE_BLOCKING)
            } catch (_: Exception) {
                // Dropped frame: a torn write is preferable to killing the playback thread.
            }
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        stopInternal()
        promise.resolve(null)
    }

    private fun stopInternal() {
        val trackToRelease = audioTrack
        writeExecutor?.execute {
            try {
                trackToRelease?.stop()
                trackToRelease?.release()
            } catch (_: Exception) {
                // Already stopped/released.
            }
        }
        writeExecutor?.shutdown()
        writeExecutor = null
        audioTrack = null
    }
}
