/**
 * @file index.ts
 * @description TypeScript wrapper exposing native methods and event listeners for the HyperDownloader Expo module.
 */

import { requireNativeModule, EventEmitter } from 'expo-modules-core';

const HyperDownloader = requireNativeModule('HyperDownloader');
const downloadEmitter = new EventEmitter(HyperDownloader) as any;

/** Represents high-frequency download progress updates emitted by the native engine */
export type DownloadProgressEvent = {
  id: string;
  bytesWritten: number;
  totalBytes: number;
};

/** Represents lifecycle state transitions of a native download task */
export type DownloadStateEvent = {
  id: string;
  state: 'QUEUED' | 'DOWNLOADING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  error?: string;
  finalUri?: string;
  artworkUri?: string;
};

export type DownloadActionEvent = {
  action: 'cancelBatch' | 'pauseBatch' | 'resumeBatch';
};

export type DownloadTaskParams = {
  id: string;
  url?: string;
  title: string;
  fileName: string;
  trackType?: string;
  artworkUrl?: string;
  localArtworkUri?: string;
  quality?: 'data_saver' | 'normal' | 'high' | 'lossless';
};

/**
 * Initiates a new native background download batch.
 * Passes the entire array of tasks to Native Kotlin for True Headless orchestration.
 */
export const queueBatchDownload = (tracks: DownloadTaskParams[]): void => {
  HyperDownloader.queueBatch(tracks);
};

/**
 * Pauses an active native download task.
 * @param id Unique task identifier
 */
export const pauseNativeDownload = (id: string): void => {
  HyperDownloader.pauseDownload(id);
};

/**
 * Resumes a paused or failed native download task.
 * @param id Unique task identifier
 * @param newUrl Optional updated stream URL for handling HTTP 403 recoveries
 */
export const resumeNativeDownload = (id: string, newUrl: string | null = null): void => {
  HyperDownloader.resumeDownload(id, newUrl);
};

/**
 * Cancels a native download task and purges associated temporary files.
 * @param id Unique task identifier
 */
export const cancelNativeDownload = (id: string): void => {
  HyperDownloader.cancelDownload(id);
};

/**
 * Cancels the entire active download batch and purges all associated temporary files.
 */
export const cancelBatchNative = (): void => {
  HyperDownloader.cancelBatch();
};

/**
 * Pauses the entire active download batch gracefully.
 */
export const pauseBatchNative = (): void => {
  HyperDownloader.pauseBatch();
};

/**
 * Resumes the entire paused download batch.
 */
export const resumeBatchNative = (): void => {
  HyperDownloader.resumeBatch();
};

/**
 * Retrieves and clears the list of track IDs that completed while the JS thread was asleep.
 */
export const getAndClearCompletedDownloads = (): string[] => {
  return HyperDownloader.getAndClearCompletedDownloads();
};

/**
 * Sets whether the native downloader should only operate on Wi-Fi.
 */
export function setWifiOnlyNative(enabled: boolean): void {
  return HyperDownloader.setWifiOnly(enabled);
};

/**
 * Updates the native Android foreground notification batch progress display.
 */
export function updateBatchProgress(title: string, progressText: string, subtext: string | null, artworkUrl?: string, progress: number = 0, max: number = 0, isPaused: boolean = false): void {
  HyperDownloader.updateBatchProgress(title, progressText, subtext, artworkUrl, progress, max, isPaused);
}

/**
 * Clears the native Android foreground notification batch progress display.
 */
export function clearBatchProgress(): void {
  HyperDownloader.clearBatchProgress();
}

/**
 * Subscribes to high-frequency download progress events.
 * @param listener Callback function receiving progress updates
 */
export const addDownloadProgressListener = (listener: (event: DownloadProgressEvent) => void) => {
  return downloadEmitter.addListener('onDownloadProgress', listener);
};

/**
 * Subscribes to download state transition events.
 * @param listener Callback function receiving state transitions
 */
export const addDownloadStateListener = (listener: (event: DownloadStateEvent) => void) => {
  return downloadEmitter.addListener('onDownloadStateChanged', listener);
};

/**
 * Subscribes to native notification action buttons.
 */
export const addDownloadActionListener = (listener: (event: DownloadActionEvent) => void) => {
  return downloadEmitter.addListener('onDownloadAction', listener);
};
