const baseConfig = require('../../../jest.config');

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 5,
      statements: 45,
    },
  },
};
