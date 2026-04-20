const baseConfig = require('../../../../../jest.config');

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 50,
      statements: 80,
    },
  },
};
