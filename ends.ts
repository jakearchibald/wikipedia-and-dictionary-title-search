import { findTrieMatches } from './src/utils.ts';

const trie = JSON.parse(await Deno.readTextFile('./endsWithTrie.json'));
const matches = [
  ...findTrieMatches(trie, [...Deno.args[0].toLowerCase()].reverse().join('')),
];
console.log(matches.map((match) => [...match].reverse().join('')).join(', '));
