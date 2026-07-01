import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { TextEncoder, TextDecoder } from 'util';

if (!globalThis.structuredClone) {
    globalThis.structuredClone = <T>(obj: T): T =>
        JSON.parse(JSON.stringify(obj)) as T;
}

Object.assign(global, { TextDecoder, TextEncoder });

// Set globally once — never needs repeating in individual test files
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
    // cleanup() handles unmounting — RTL already calls this automatically
    // when using @testing-library/react, but explicit is fine too
    cleanup();
});