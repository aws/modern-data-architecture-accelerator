const baseConfig = require('../../../../../jest.config');

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 40,
      statements: 50,
    },
  },
};
