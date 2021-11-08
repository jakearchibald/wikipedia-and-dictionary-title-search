import {
  GunzipStream,
  chunkOnNewline,
  bufferChunks,
  getDB,
  createInsertQuery,
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

db.query(`PRAGMA journal_mode = MEMORY`);

db.query(
  `CREATE TABLE IF NOT EXISTS terms (id INTEGER PRIMARY KEY, term TEXT, reverse TEXT, source INTEGER)`,
);

db.query(`BEGIN TRANSACTION`);

let written = 0;

const groupSize = 10_000;

const fullGroupQuery = createInsertQuery(db, 10_000);

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
  for await (const words of wordStream.pipeThrough(bufferChunks(groupSize))) {
    const args = words.flatMap((word) => {
      const iword = word
        .toLowerCase()
        // Entries seem to use _ rather than space
        .replaceAll('_', ' ')
        // Get rid of some unnecessary chars
        .replace(/['",]/g, '')
        // Get rid of sections in parentheses, since it's stuff like (Album)
        .replace(/ \([^)]+\)/g, '');

      return [iword, [...iword].reverse().join(''), i];
    });

    if (words.length === groupSize) {
      fullGroupQuery.execute(args);
    } else {
      const query = createInsertQuery(db, words.length);
      query.execute(args);
      query.finalize();
    }

    written += words.length;
    console.log('Written', written);
  }

  console.log('Completed', url);
}

fullGroupQuery.finalize();

console.log('Creating term index');
db.query(`CREATE INDEX IF NOT EXISTS term ON terms (term)`);
console.log('Creating reverse index');
db.query(`CREATE INDEX IF NOT EXISTS reverse ON terms (reverse)`);

db.query(`END TRANSACTION`);

db.close();
