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
      branches: 65,
      statements: 80,
    },
  },
};
