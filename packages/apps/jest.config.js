/**
 * Shared Jest configuration for all app packages
 */
module.exports = {
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  coverageReporters: ['lcov', 'text'],
  coverageThreshold: {
    global: {
      branches: 0,
      statements: 80,
    },
  },
};
