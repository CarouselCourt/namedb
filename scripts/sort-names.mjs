#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const namesPath = join(__dirname, '../data/names.json');

console.log('Reading names.json...');
const names = JSON.parse(readFileSync(namesPath, 'utf-8'));

console.log(`Found ${names.length} names`);
console.log('Sorting alphabetically by name...');

// Sort alphabetically by name (case-insensitive)
names.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

console.log('Writing sorted names back to names.json...');
writeFileSync(namesPath, JSON.stringify(names, null, 2) + '\n', 'utf-8');

console.log('✓ names.json is now sorted alphabetically');
