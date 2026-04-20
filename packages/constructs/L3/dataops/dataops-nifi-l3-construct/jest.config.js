const baseConfig = require('../../../../../jest.config');

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 20,
      statements: 40,
    },
  },
  coveragePathIgnorePatterns: ['<rootDir>/lib/cdk8s'],
};
