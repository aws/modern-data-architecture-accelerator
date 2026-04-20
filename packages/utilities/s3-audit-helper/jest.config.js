const baseConfig = require('../../../jest.config');

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 80,
      statements: 60,
    },
  },
};
