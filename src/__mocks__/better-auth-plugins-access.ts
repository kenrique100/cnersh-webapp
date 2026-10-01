export const createAccessControl = jest.fn(() => ({
    newRole: jest.fn((statements: unknown) => statements),
}));
export default { createAccessControl };