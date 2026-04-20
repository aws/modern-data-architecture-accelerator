/**
 * Jest configuration
 */
const path = require('path');

module.exports = {
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+.tsx?$': 'ts-jest',
  },
  setupFiles: [path.resolve(__dirname, 'jest.setup.js')],
  coverageReporters: ['lcov', 'text'],
  coverageThreshold: {
    global: {
      branches: 80,
      statements: 80,
    },
  },
};
