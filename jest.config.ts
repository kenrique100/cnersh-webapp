import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/generated/prisma(.*)$': '<rootDir>/src/generated/prisma$1',
    '^next/server$': '<rootDir>/src/__mocks__/next/server.ts',
    '^next/navigation$': '<rootDir>/src/__mocks__/next/navigation.ts',
    '^isomorphic-dompurify$': '<rootDir>/src/__mocks__/isomorphic-dompurify.ts',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(isomorphic-dompurify|@exodus/bytes|html-encoding-sniffer|jsdom|parse5|nwsapi|whatwg-url|better-auth)/)',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/tests/',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

export default createJestConfig(config);