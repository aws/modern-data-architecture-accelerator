/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/*.snapshot.test.ts'],
  testTimeout: 30000,
  maxWorkers: 4,
  silent: true,
  verbose: false,

  collectCoverageFrom: [
    'packages/**/*.ts',
    '!packages/**/*.d.ts',
    '!packages/**/node_modules/**',
    '!packages/**/test/**',
    '!packages/**/lib/**/*.js',
  ],
  coverageDirectory: 'coverage-snapshots',

  testPathIgnorePatterns: ['/node_modules/', '/lib/', '/dist/', '\\.d\\.ts$'],
};
