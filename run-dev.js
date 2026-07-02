import { spawn } from 'child_process';

console.log('Starting KidneyCare dev servers concurrently...');

const server = spawn('npx', ['tsx', 'server.ts'], {
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: 'true' }
});

const client = spawn('npx', ['vite'], {
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: 'true' }
});

const cleanup = () => {
  console.log('\nStopping servers...');
  server.kill('SIGINT');
  client.kill('SIGINT');
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
