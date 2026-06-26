import DOMPurify from 'dompurify';

const purify = DOMPurify(global.window as unknown as Parameters<typeof DOMPurify>[0]);

export const sanitize = (
    dirty: string,
    options?: Parameters<typeof purify.sanitize>[1]
): string => purify.sanitize(dirty, options) as string;

export default purify;