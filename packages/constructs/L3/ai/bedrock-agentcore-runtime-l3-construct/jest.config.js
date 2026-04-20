const baseConfig = require('../../../../../jest.config');

module.exports = {
  ...baseConfig,
  testEnvironment: 'node',
  collectCoverageFrom: ['lib/**/*.ts', '!lib/**/*.d.ts'],
};
