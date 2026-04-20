const baseConfig = require("../../jest.config");

module.exports = {
  ...baseConfig,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/',
  ],
};
