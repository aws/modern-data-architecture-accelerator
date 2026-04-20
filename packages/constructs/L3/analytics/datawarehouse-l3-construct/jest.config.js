const baseConfig = require('../../../../../jest.config');

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 65,
      statements: 80,
    },
  },
};
