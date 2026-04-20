const baseConfig = require('../../../../../jest.config');

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 70,
      statements: 80,
    },
  },
};
