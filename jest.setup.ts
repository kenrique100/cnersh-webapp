
if (!globalThis.structuredClone) {
    globalThis.structuredClone = (obj: unknown) => JSON.parse(JSON.stringify(obj));
}

import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';
import { MessageChannel, MessagePort } from 'worker_threads';

Object.assign(global, {
    TextDecoder,
    TextEncoder,
    ReadableStream,
    MessageChannel,
    MessagePort,
});

import '@testing-library/jest-dom';