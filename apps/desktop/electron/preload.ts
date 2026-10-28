import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  isElectron: boolean;
  chooseDirectory: () => Promise<string | null>;
  openPath: (filePath: string) => Promise<string>;
  showItemInFolder: (filePath: string) => Promise<void>;
  readClipboard: () => Promise<string>;
  startDownload: (args: {
    id: string;
    url: string;
    filename: string;
    saveDirectory?: string;
  }) => Promise<{ success: boolean; localPath?: string; error?: string }>;
  onDownloadProgress: (
    callback: (event: {
      id: string;
      downloadedBytes: number;
      totalBytes: number;
      progressPercent: number;
      speedBytesPerSec: number;
    }) => void
  ) => () => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

const electronAPI: ElectronAPI = {
  isElectron: true,
  chooseDirectory: () => ipcRenderer.invoke('dialog:chooseFolder'),
  openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  readClipboard: () => ipcRenderer.invoke('clipboard:readText'),
  startDownload: (args) => ipcRenderer.invoke('download:start', args),
  onDownloadProgress: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('download:progress', handler);
    return () => {
      ipcRenderer.removeListener('download:progress', handler);
    };
  },
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
