import { readableStreamFromReader } from 'https://deno.land/std@0.113.0/streams/conversion.ts';
import type { Trie } from './src/utils.ts';
import { chunkOnNewline } from './src/utils.ts';

const file = await Deno.open('./words.txt');
const stream = readableStreamFromReader(file)
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(chunkOnNewline());

const startsWithTrie: Trie = {};
const endsWithTrie: Trie = {};

for await (const word of stream) {
  const iword = word.toLowerCase();
  const letters = [...iword];

  let node = startsWithTrie;

  for (const letter of letters) {
    if (!node[letter]) node[letter] = {};
    node = node[letter];
  }

  node[''] = {};

  letters.reverse();

  node = endsWithTrie;

  for (const letter of letters) {
    if (!node[letter]) node[letter] = {};
    node = node[letter];
  }

  node[''] = {};
}

await Promise.all([
  Deno.writeTextFile('./startsWithTrie.json', JSON.stringify(startsWithTrie)),
  Deno.writeTextFile('./endsWithTrie.json', JSON.stringify(endsWithTrie)),
]);
