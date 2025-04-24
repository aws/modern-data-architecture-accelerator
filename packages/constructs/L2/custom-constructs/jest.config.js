module.exports = {
  roots: [ '<rootDir>/test' ],
  testMatch: [ '**/*.test.ts' ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  coveragePathIgnorePatterns: [
    "node_modules",
    "<rootDir>/lib/aws-custom-resource"
  ]
};
