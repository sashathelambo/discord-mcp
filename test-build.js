#!/usr/bin/env node

// Simple test to verify the build output exists and has the expected structure
import { existsSync } from 'fs';
import { join } from 'path';

const requiredFiles = [
  'dist/index.js',
  'dist/discord-service.js',
  'dist/types.js',
  'package.json',
  'node_modules/@modelcontextprotocol/sdk',
  'node_modules/discord.js'
];

console.log('Verifying Discord MCP build...\n');

let allGood = true;

for (const file of requiredFiles) {
  const exists = existsSync(file);
  console.log(`${exists ? '✓' : '✗'} ${file}`);
  if (!exists) allGood = false;
}

console.log('\n' + (allGood ? '✅ Build verification passed!' : '❌ Build verification failed!'));
process.exit(allGood ? 0 : 1);
