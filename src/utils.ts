import { Inflate } from 'https://deno.land/x/compress@v0.4.1/zlib/inflate.ts';
import STATUS from 'https://deno.land/x/compress@v0.4.1/zlib/zlib/status.ts';

export class GunzipStream extends TransformStream<Uint8Array, Uint8Array> {
  private inflate = new Inflate({});

  constructor() {
    super({
      transform: (chunk, controller) => {
        controller.enqueue(this.inflate.push(chunk, STATUS.Z_SYNC_FLUSH));
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

export function bufferChunks<T>(count: number): TransformStream<T, T[]> {
  let buffer: T[] = [];

  return new TransformStream<T, T[]>({
    transform(chunk, controller) {
      buffer.push(chunk);
      if (buffer.length >= count) {
        controller.enqueue(buffer);
        buffer = [];
      }
    },
    flush(controller) {
      if (buffer.length !== 0) controller.enqueue(buffer);
    },
  });
}

import { DB } from 'https://deno.land/x/sqlite@v3.1.1/mod.ts';

export const getDB = (mode: 'read' | 'write' | 'create') =>
  new DB('terms.sqlite', { mode });
