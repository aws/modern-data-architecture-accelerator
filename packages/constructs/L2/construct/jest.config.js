const baseConfig = require('../../../../jest.config');

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      // Both thresholds meet the 80% L2 standard, raised here from the previous
      // 70 branch / 60 statement. The package currently measures ~99% statement
      // and ~82% branch; the feature added alongside these thresholds
      // (inline-policy-naming-aspect.ts) is at 100% of both.
      //
      // Note that the package clears the 80% branch standard despite, not
      // because of, construct.ts, which remains at 68% branch. Backfilling
      // those tests is still outstanding and is deliberately left to a separate
      // change so it is not conflated with this naming feature. Because this
      // package has only ~44 branches in total, each one is worth roughly 2.3
      // points, so closing that gap is what would give the threshold real
      // headroom.
      branches: 80,
      statements: 80,
    },
  },
};
