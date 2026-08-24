/**
 * Custom hook for audio recording using the MediaRecorder API.
 *
 * Features:
 * - Start / Stop / Pause / Resume controls
 * - Accurate cumulative duration tracking across pause/resume cycles
 * - Auto-stop after a configurable max duration (only counts active recording time)
 * - IndexedDB persistence on BOTH pause and stop — recordings survive page reloads
 * - Page-specific metadata (e.g. topic) persisted alongside audio via getStorageMetadata callback
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { saveRecording, loadRecording, deleteRecording, type SavedRecording } from '../lib/recordingStore';

interface UseAudioRecorderOptions {
  /** Maximum recording duration in seconds (default: 300 = 5 min). */
  maxDurationSeconds?: number;
  /**
   * If set, recordings are auto-saved to IndexedDB under this key
   * on both pause and stop. Can be restored after a page reload.
   */
  storageKey?: string;
  /**
   * Called when the hook saves to IndexedDB (on pause or stop).
   * Return page-specific metadata (e.g. { topic, topicLocked }) to persist
   * alongside the audio blob.
   */
  getStorageMetadata?: () => { topic?: string; topicLocked?: boolean };
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  audioBlob: Blob | null;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  /** Discard the recording and delete it from IndexedDB. */
  discardRecording: () => void;
  /**
   * Inject a restored recording (called by the page after loading from IndexedDB).
   * This lets the hook treat it as a completed recording ready for playback/submit.
   */
  restoreRecording: (blob: Blob, dur: number) => void;
  error: string | null;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const { maxDurationSeconds = 300, storageKey } = options;

  // Keep a ref to getStorageMetadata so it always points to the latest closure
  const getMetadataRef = useRef(options.getStorageMetadata);
  getMetadataRef.current = options.getStorageMetadata;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const intervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Duration tracking across pause/resume cycles ──
  const elapsedBeforePauseRef = useRef(0);
  const segmentStartTimeRef = useRef(0);

  // ── Max-duration auto-stop timer ──
  const autoStopTimerRef = useRef<number | null>(null);
  const remainingMaxRef = useRef(maxDurationSeconds);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);

      // Stop the MediaRecorder cleanly, but null out onstop first so that
      // unmounting (e.g. pressing back while paused) doesn't trigger a stale
      // save to IndexedDB — the good data was already saved on pause/stop.
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') {
        mr.onstop = null;
        mr.onpause = null;
        mr.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // ── Internal: start the duration interval ──
  const startDurationInterval = useCallback(() => {
    segmentStartTimeRef.current = Date.now();
    intervalRef.current = window.setInterval(() => {
      const segmentElapsed = Math.floor((Date.now() - segmentStartTimeRef.current) / 1000);
      setDuration(elapsedBeforePauseRef.current + segmentElapsed);
    }, 250);
  }, []);

  // ── Internal: stop the duration interval and bank elapsed time ──
  const stopDurationInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const segmentElapsed = Math.floor((Date.now() - segmentStartTimeRef.current) / 1000);
    elapsedBeforePauseRef.current += segmentElapsed;
  }, []);

  // ── Internal: start the auto-stop timer for remaining max duration ──
  const startAutoStopTimer = useCallback(() => {
    autoStopTimerRef.current = window.setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }, remainingMaxRef.current * 1000);
  }, []);

  // ── Internal: pause the auto-stop timer ──
  const pauseAutoStopTimer = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    const segmentElapsed = (Date.now() - segmentStartTimeRef.current) / 1000;
    remainingMaxRef.current = Math.max(0, remainingMaxRef.current - segmentElapsed);
  }, []);

  // ── Internal: save current state to IndexedDB ──
  const saveToStorage = useCallback((blob: Blob | null, dur: number) => {
    if (!storageKey) return;
    const pageMeta = getMetadataRef.current?.() ?? {};
    saveRecording(storageKey, blob, { duration: dur, ...pageMeta }).catch((err) =>
      console.warn('Failed to save recording:', err),
    );
  }, [storageKey]);

  // ── Start recording ──
  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setDuration(0);
    elapsedBeforePauseRef.current = 0;
    remainingMaxRef.current = maxDurationSeconds;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setIsRecording(false);
        setIsPaused(false);

        // Final duration
        const segmentElapsed = Math.floor((Date.now() - segmentStartTimeRef.current) / 1000);
        const totalDuration = elapsedBeforePauseRef.current + segmentElapsed;
        setDuration(totalDuration);

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Clear timers
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (autoStopTimerRef.current) {
          clearTimeout(autoStopTimerRef.current);
          autoStopTimerRef.current = null;
        }

        // Save to IndexedDB
        saveToStorage(blob, totalDuration);
      };

      // Start recording — collect data every second
      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);

      startDurationInterval();
      startAutoStopTimer();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(message);
      console.error('Error starting recording:', err);
    }
  }, [maxDurationSeconds, saveToStorage, startDurationInterval, startAutoStopTimer]);

  // ── Pause recording — also saves intermediate audio to IndexedDB ──
  const pauseRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === 'recording') {
      // Pause fires ondataavailable with any buffered data, then pauses.
      // We use the onpause event to create the intermediate blob AFTER
      // the final chunk has been pushed to chunksRef.
      mr.onpause = () => {
        const intermediateBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const totalDuration = elapsedBeforePauseRef.current;
        saveToStorage(intermediateBlob, totalDuration);
        mr.onpause = null; // Clean up one-shot handler
      };

      mr.pause();
      setIsPaused(true);
      stopDurationInterval();
      pauseAutoStopTimer();
    }
  }, [stopDurationInterval, pauseAutoStopTimer, saveToStorage]);

  // ── Resume recording ──
  const resumeRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === 'paused') {
      mr.resume();
      setIsPaused(false);
      startDurationInterval();
      startAutoStopTimer();
    }
  }, [startDurationInterval, startAutoStopTimer]);

  // ── Stop recording ──
  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && (mr.state === 'recording' || mr.state === 'paused')) {
      if (mr.state === 'paused') {
        segmentStartTimeRef.current = Date.now();
      }
      mr.stop();
    }
  }, []);

  // ── Reset recording (clears state + deletes from IndexedDB) ──
  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setError(null);
    setIsPaused(false);
    elapsedBeforePauseRef.current = 0;
    remainingMaxRef.current = maxDurationSeconds;
    if (storageKey) {
      deleteRecording(storageKey).catch(() => {});
    }
  }, [maxDurationSeconds, storageKey]);

  // ── Discard recording (alias for reset — explicit user action) ──
  const discardRecording = useCallback(() => {
    resetRecording();
  }, [resetRecording]);

  // ── Restore a previously saved recording ──
  const restoreRecording = useCallback((blob: Blob, dur: number) => {
    setAudioBlob(blob);
    setDuration(dur);
    setError(null);
  }, []);

  return {
    isRecording,
    isPaused,
    audioBlob,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    discardRecording,
    restoreRecording,
    error,
  };
}

// ── Re-export storage helpers for pages to use directly ──
export { saveRecording, loadRecording, deleteRecording };
export type { SavedRecording };
