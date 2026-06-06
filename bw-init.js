#!/usr/bin/env node
// Minimal bubblewrap init without interactive prompts
// Uses child_process to handle prompts properly

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const JDK_PATH = 'C:/Users/Administrator/.bubblewrap/jdk/jdk-17.0.11+9';
const APK_DIR = 'C:/Users/Administrator/Desktop/forest-focus/apk';
const MANIFEST_URL = 'https://huanweide.github.io/forest-focus/manifest.json';

process.env.JAVA_HOME = JDK_PATH;
process.env.PATH = `${path.join(JDK_PATH, 'bin')};${process.env.PATH}`;

// Use node 18 via npx
const args = [
  '-p', 'node@18',
  '-p', '@bubblewrap/cli',
  '-y', '--',
  'bubblewrap', 'init',
  '--manifest', MANIFEST_URL,
  '--directory', APK_DIR,
];

const child = spawn('npx', args, {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env,
  cwd: os.tmpdir(),
});

child.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);

  if (text.includes('install the JDK')) {
    // Answer: No, use existing JDK
    console.log('>>> Sending: n');
    child.stdin.write('n\n');
  } else if (text.includes('Path to your existing JDK')) {
    // Answer: JDK path
    console.log('>>> Sending: JDK path');
    child.stdin.write(JDK_PATH + '\n');
  } else if (text.includes('?')) {
    // Any other prompt - try to accept default
    console.log('>>> Sending: enter (default)');
    child.stdin.write('\n');
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

child.on('close', (code) => {
  console.log('Process exited with code:', code);
});

// Send initial input immediately
child.stdin.write('n\n');

setTimeout(() => {
  child.stdin.write(JDK_PATH + '\n');
}, 3000);

setTimeout(() => {
  child.stdin.write('\n'); // Accept defaults for remaining prompts
}, 8000);
