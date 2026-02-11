/**
 * Jest configuration
 */
module.exports = {
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+.tsx?$': 'ts-jest',
  },
  coverageThreshold: {
    global: {
      branches: 50,
      statements: 80,
    },
  },
};
