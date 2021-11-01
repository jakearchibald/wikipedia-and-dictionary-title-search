import { findTrieMatches } from './src/utils.ts';

const trie = JSON.parse(await Deno.readTextFile('./startsWithTrie.json'));
const matches = [...findTrieMatches(trie, Deno.args[0].toLowerCase())];
console.log(matches.join(', '));
