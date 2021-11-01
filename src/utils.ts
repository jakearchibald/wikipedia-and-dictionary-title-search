export interface Trie {
  [key: string]: Trie;
}

function* getRestOfTrie(node: Trie, prefix: string): Iterable<string> {
  for (const [key, nextNode] of Object.entries(node)) {
    if (key === '') {
      yield prefix;
      continue;
    }
    yield* getRestOfTrie(nextNode, prefix + key);
  }
}

export function* findTrieMatches(trie: Trie, prefix: string): Iterable<string> {
  let node = trie;

  for (const letter of prefix) {
    if (!node[letter]) return;
    node = node[letter];
  }

  yield* getRestOfTrie(node, prefix);
}

import { Inflate } from 'https://deno.land/x/compress@v0.4.1/zlib/inflate.ts';
import STATUS from 'https://deno.land/x/compress@v0.4.1/zlib/zlib/status.ts';

export class GunzipStream extends TransformStream<Uint8Array, Uint8Array> {
  private inflate = new Inflate({});

  constructor() {
    super({
      transform: (chunk, controller) => {
        controller.enqueue(this.inflate.push(chunk, STATUS.Z_SYNC_FLUSH));
      },
      flush: (controller) => {
        const result = this.inflate.push(new Uint8Array(0), STATUS.Z_FINISH);
        if (result.length !== 0) controller.enqueue(result);
      },
    });
  }
}

export function chunkOnNewline(): TransformStream<string, string> {
  let buffer = '';

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) controller.enqueue(line);
    },
    flush(controller) {
      if (buffer) controller.enqueue(buffer);
    },
  });
}
