/// <reference types="vite/client" />

declare const __APP_VERSION__: string

// File System Access API types
interface FileSystemDirectoryHandle {
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>
}

interface FileSystemWritableFileStream {
  write(data: string | ArrayBuffer | Blob): Promise<void>
  close(): Promise<void>
}

interface Window {
  showDirectoryPicker?(): Promise<FileSystemDirectoryHandle>
}
