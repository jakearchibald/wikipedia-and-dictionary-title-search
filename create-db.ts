import {
  GunzipStream,
  chunkOnNewline,
  bufferChunks,
  getDB,
} from './src/utils.ts';

const sources = [
  // Simple word list
  {
    url: 'https://raw.githubusercontent.com/dwyl/english-words/master/words.txt',
    needsGunzip: false,
    needsHeaderSkip: false,
  },
  // Wiktionary page titles
  {
    url: 'https://dumps.wikimedia.org/enwiktionary/latest/enwiktionary-latest-all-titles-in-ns0.gz',
    needsGunzip: true,
    needsHeaderSkip: true,
  },
  // Wikipedia page titles
  {
    url: 'https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-all-titles-in-ns0.gz',
    needsGunzip: true,
    needsHeaderSkip: true,
  },
] as const;

const db = getDB('create');

db.query(
  `CREATE TABLE IF NOT EXISTS terms (term TEXT PRIMARY KEY, reverse TEXT, source INTEGER)`,
);

let written = 0;

for (const [i, { url, needsGunzip, needsHeaderSkip }] of sources.entries()) {
  let bytesStream = (await fetch(url)).body!;

  if (needsGunzip) {
    bytesStream = bytesStream.pipeThrough(new GunzipStream());
  }

  const wordStream = bytesStream
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(chunkOnNewline());

  if (needsHeaderSkip) {
    // The first line is the header, so we skip it
    const reader = wordStream.getReader();
    await reader.read();
    reader.releaseLock();
  }

  // Buffering the chunks because it's faster than writing to sqllite per row.
  for await (const words of wordStream.pipeThrough(bufferChunks(15_000))) {
    const placeholders = Array(words.length).fill(`(?, ?, ${i})`).join(',');

    db.query(
      `INSERT OR IGNORE INTO terms (term, reverse, source) VALUES ${placeholders}`,
      words.flatMap((word) => {
        const iword = word
          .toLowerCase()
          // Entries seem to use _ rather than space
          .replaceAll('_', ' ')
          // Get rid of some unnecessary chars
          .replace(/['",]/g, '')
          // Get rid of sections in parentheses, since it's stuff like (Album)
          .replace(/ \([^)]+\)/g, '');

        return [iword, [...iword].reverse().join('')];
      }),
    );

    written += words.length;
    console.log('Written', written);
  }

  console.log('Completed', url);
}

console.log(`Creating reverse terms index`);
// Faster to do this in one operation at the end.
db.query(`CREATE UNIQUE INDEX IF NOT EXISTS reverse ON terms (reverse)`);

db.close();
