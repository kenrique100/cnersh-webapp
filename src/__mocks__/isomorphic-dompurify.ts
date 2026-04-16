// Jest mock for isomorphic-dompurify
// Uses the browser-oriented dompurify package directly, since jsdom provides
// window/document in the test environment (no need for the isomorphic wrapper).
// This avoids loading @exodus/bytes which is an ESM-only package incompatible
// with Jest's CommonJS transform.
import DOMPurify from 'dompurify';

export default DOMPurify;
export const sanitize = DOMPurify.sanitize.bind(DOMPurify);
