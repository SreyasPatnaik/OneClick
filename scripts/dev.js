import { spawn } from 'node:child_process';

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('\x1b[33m%s\x1b[0m', '═══════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '  🚀 Starting ClipNest API (Port 4000) & Desktop UI (Port 5173)...');
console.log('\x1b[33m%s\x1b[0m', '═══════════════════════════════════════════════════════════\n');

// Start Backend API (runs yt-dlp metadata extraction & streaming service)
const api = spawn(npmCmd, ['--workspace=@clipnest/api', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

// Start Frontend Desktop/Web Vite dev server
const web = spawn(npmCmd, ['--workspace=@clipnest/desktop', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  try {
    api.kill();
    web.kill();
  } catch {}
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
