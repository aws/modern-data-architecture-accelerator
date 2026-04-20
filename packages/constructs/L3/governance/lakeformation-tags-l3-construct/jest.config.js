const baseConfig = require('../../../../../jest.config');

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 25,
      statements: 55,
    },
  },
};
