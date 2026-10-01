export const nextCookies = jest.fn(() => ({}));
export const toNextJsHandler = jest.fn(() => ({
    GET: jest.fn(),
    POST: jest.fn(),
}));
export default { nextCookies, toNextJsHandler };