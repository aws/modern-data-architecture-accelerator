const path = require('path');

// Single jest project for all starter kits. Each kit's diff tests live under
// test/<kit>/*.diff.test.ts and resolve their own kit source/baselines via the
// kit name passed to the @aws-mdaa/testing harness. The Python orchestrator
// (scripts/test/test_starter_kit.py) selects which kit test files to run based
// on the affected module set.
module.exports = {
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.diff.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  setupFiles: [path.resolve(__dirname, '../jest.setup.js')],
  testTimeout: 900000,
  coverageThreshold: {
    global: {
      branches: 0,
      statements: 0,
    },
  },
};
