module.exports = {
  roots: [ '<rootDir>/test' ],
  testMatch: [ '**/*.test.ts' ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  coveragePathIgnorePatterns: [
    "imports",
    "node_modules"
  ]
};
