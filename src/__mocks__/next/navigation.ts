const useRouter = jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
}));

const usePathname = jest.fn(() => '/');
const useSearchParams = jest.fn(() => new URLSearchParams());
const useParams = jest.fn(() => ({}));

const redirect = jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
});

const notFound = jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
});

export { useRouter, usePathname, useSearchParams, useParams, redirect, notFound };