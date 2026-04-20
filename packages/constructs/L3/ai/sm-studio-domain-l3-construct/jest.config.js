const baseConfig = require("../../../../../jest.config");

/**
 * Jest configuration
 */
module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 65,
      statements: 80,
    },
  },
};
