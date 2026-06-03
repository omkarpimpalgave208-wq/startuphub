import fs from 'fs';
import readline from 'readline';

async function findBypassScript() {
  const fileStream = fs.createReadStream('C:\\Users\\madha\\.gemini\\antigravity\\brain\\eccd4e02-8714-49d0-a18c-abbb168fb98a\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  let found = false;
  for await (const line of rl) {
    if (line.includes('To bypass email confirmation rate limits')) {
      console.log(`--- Found on Line ${lineCount} ---`);
      console.log(JSON.stringify(JSON.parse(line), null, 2));
      found = true;
    } else if (found && lineCount <= 875) {
      // Print a few lines after
      console.log(`--- Next Line ${lineCount} ---`);
      console.log(JSON.stringify(JSON.parse(line), null, 2));
    }
    lineCount++;
  }
}

findBypassScript();
