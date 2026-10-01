// CJS stub for the ESM-only `better-auth` package.
// The real package ships .mjs entry points that Jest cannot require()
// under CommonJS; moduleNameMapper in jest.config.ts redirects every
// import of `better-auth` here.
export const betterAuth = jest.fn(() => ({
    api: {
        getSession: jest.fn(async () => null),
        createUser: jest.fn(async () => ({ user: { id: "stub-user" } })),
    },
    handler: jest.fn(async () => new Response()),
}));

export default { betterAuth };