import fs from 'fs';

const lines = fs.readFileSync('C:\\Users\\madha\\.gemini\\antigravity\\brain\\aeac3740-a35b-486a-9336-73c8b2113037\\.system_generated\\logs\\transcript.jsonl', 'utf8').split('\n');

console.log('Searching for FirstStartupBadge.tsx in transcript:');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('FirstStartupBadge.tsx')) {
    console.log(`Line ${i}:`, lines[i].substring(0, 1000));
  }
}
