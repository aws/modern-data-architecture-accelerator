/**
 * Jest configuration
 */
module.exports = {
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+.tsx?$': 'ts-jest',
  },
  coverageReporters: ['lcov', 'text'],
  coverageThreshold: {
    global: {
      branches: 80,
      statements: 80,
    },
  },
};
