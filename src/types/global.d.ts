// Extends NodeJS.Global so TypeScript accepts IS_REACT_ACT_ENVIRONMENT
// on `globalThis` inside jest.setup.ts and test files.
declare global {
    // eslint-disable-next-line no-var
    var IS_REACT_ACT_ENVIRONMENT: boolean;
}

export {};