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
};

/**
 * Initiates a new native background download task.
 * @param id Unique task identifier
 * @param url Target stream URL
 * @param title Track title
 * @param fileName Output file name
 */
export const startNativeDownload = (id: string, url: string, title: string, fileName: string): void => {
  HyperDownloader.startDownload(id, url, title, fileName);
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
