import type { QueryParameterSet } from 'https://deno.land/x/sqlite@v3.1.1/mod.ts';

import outdent from 'http://deno.land/x/outdent/mod.ts';
import { parse } from 'https://deno.land/std@0.113.0/flags/mod.ts';
import { getDB } from './src/utils.ts';

const parsedArgs = parse(Deno.args);

if (parsedArgs.help) {
  console.log(outdent`
    Options:
      --starts=term
      --ends=term
      --source - Filter to a particular word source
        0 - Simple word list
        1 - Wiktionary titles
        2 - Wikipedia titles
      --single-word - only return one word from the start/end, useful for filtering.
  `);
  Deno.exit();
}

if (!parsedArgs.starts && !parsedArgs.ends) {
  throw Error('Nothing to search for.');
}

if (parsedArgs.starts && parsedArgs.ends) {
  throw Error(`Can't use both starts & ends.`);
}

const db = getDB('read');

// Much faster searches, as it can just use the index
db.query(`PRAGMA case_sensitive_like = TRUE`);

const matchEnd = !!parsedArgs.ends;
const term = (
  (parsedArgs.starts || [...parsedArgs.ends].reverse().join('')) as string
)
  .replace(/[_%]/g, '')
  .toLowerCase();

const matches = (() => {
  const row = matchEnd ? 'reverse' : 'term';
  let query = `SELECT ${row} from terms WHERE ${row} LIKE ?`;
  const args: QueryParameterSet = [term + '%'];

  if ('source' in parsedArgs) {
    query += ` AND source = ?`;
    args.push(Number(parsedArgs.source) || 0);
  }

  let results = db.query(query, args).map((row) => row[0] as string);

  if (parsedArgs['single-word']) {
    results = results.map((result) => /^[^ ]*/.exec(result)![0]);
  }

  if (matchEnd) {
    results = results.map((result) => [...result].reverse().join(''));
  }

  return [...new Set(results)];
})();

console.log(`Found ${matches.length} matches`);
console.log(matches.join('\n'));
