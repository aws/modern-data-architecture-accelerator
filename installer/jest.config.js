module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  collectCoverageFrom: ['lib/**/*.ts', '!lib/**/*.d.ts', '!lib/**/*.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  // Snapshot serializer options
  snapshotSerializers: [],
  // Update snapshots with --updateSnapshot or -u flag
  updateSnapshot: process.argv.includes('--updateSnapshot') || process.argv.includes('-u'),
};
