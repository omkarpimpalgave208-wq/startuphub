import fs from 'fs';

const paths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Local\\Google\\Chrome\\Application\\chrome.exe',
];

for (const p of paths) {
  if (fs.existsSync(p)) {
    console.log(`Chrome found at: ${p}`);
    process.exit(0);
  }
}

console.log('Chrome not found at standard paths');
process.exit(1);
