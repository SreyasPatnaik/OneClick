import { app, BrowserWindow, ipcMain, dialog, shell, clipboard } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import https from 'node:https';

let mainWindow: BrowserWindow | null = null;

function getDefaultDownloadDir(): string {
  const userDownloads = app.getPath('downloads');
  const oneClickFolder = path.join(userDownloads, 'OneClick');
  if (!fs.existsSync(oneClickFolder)) {
    try {
      fs.mkdirSync(oneClickFolder, { recursive: true });
    } catch {
      return userDownloads;
    }
  }
  return oneClickFolder;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 850,
    minHeight: 600,
    frame: true,
    backgroundColor: '#0b0f19',
    title: 'OneClick - Universal Link Inspector & Video Downloader',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler: Choose download directory
ipcMain.handle('dialog:chooseFolder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: getDefaultDownloadDir(),
    title: 'Select Destination Folder for Downloads',
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// IPC Handler: Open file with default player
ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return 'File not found';
  }
  return await shell.openPath(filePath);
});

// IPC Handler: Show item in folder (Windows Explorer / Finder)
ipcMain.handle('shell:showItemInFolder', async (_event, filePath: string) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
  }
});

// IPC Handler: Safe clipboard read
ipcMain.handle('clipboard:readText', () => {
  return clipboard.readText('clipboard');
});

// Window controls
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window:close', () => {
  mainWindow?.close();
});

// Native chunked download handler
ipcMain.handle(
  'download:start',
  async (_event, { id, url, filename, saveDirectory }: {
    id: string;
    url: string;
    filename: string;
    saveDirectory?: string;
  }) => {
    const targetDir = saveDirectory || getDefaultDownloadDir();
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
    const destinationPath = path.join(targetDir, safeFilename);

    return new Promise((resolve) => {
      try {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const request = protocol.get(
          url,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ClipNest/1.0',
            },
          },
          (response) => {
            // Handle HTTP redirects (301, 302, 307, 308)
            if (
              response.statusCode &&
              response.statusCode >= 300 &&
              response.statusCode < 400 &&
              response.headers.location
            ) {
              // follow redirect
              const redirectUrl = new URL(response.headers.location, url).toString();
              resolve(
                (ipcMain as any).emit('download:start', _event, {
                  id,
                  url: redirectUrl,
                  filename,
                  saveDirectory,
                })
              );
              return;
            }

            if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
              resolve({
                success: false,
                error: `HTTP Error: ${response.statusCode || 'Unknown'}`,
              });
              return;
            }

            const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
            let downloadedBytes = 0;
            let lastProgressTime = Date.now();
            let bytesSinceLastProgress = 0;

            const fileStream = fs.createWriteStream(destinationPath);

            response.on('data', (chunk: Buffer) => {
              downloadedBytes += chunk.length;
              bytesSinceLastProgress += chunk.length;
              fileStream.write(chunk);

              const now = Date.now();
              if (now - lastProgressTime >= 200) {
                const elapsedSeconds = (now - lastProgressTime) / 1000;
                const speed = Math.round(bytesSinceLastProgress / elapsedSeconds);
                const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;

                mainWindow?.webContents.send('download:progress', {
                  id,
                  downloadedBytes,
                  totalBytes,
                  progressPercent: percent,
                  speedBytesPerSec: speed,
                });

                lastProgressTime = now;
                bytesSinceLastProgress = 0;
              }
            });

            response.on('end', () => {
              fileStream.end(() => {
                mainWindow?.webContents.send('download:progress', {
                  id,
                  downloadedBytes,
                  totalBytes: totalBytes || downloadedBytes,
                  progressPercent: 100,
                  speedBytesPerSec: 0,
                });
                resolve({ success: true, localPath: destinationPath });
              });
            });

            response.on('error', (err) => {
              fileStream.destroy();
              resolve({ success: false, error: err.message });
            });
          }
        );

        request.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
      } catch (err: any) {
        resolve({ success: false, error: err.message || 'Download failed' });
      }
    });
  }
);
