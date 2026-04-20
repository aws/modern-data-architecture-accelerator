const baseConfig = require('../../jest.config');

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 60,
      statements: 80,
    },
  },
};
