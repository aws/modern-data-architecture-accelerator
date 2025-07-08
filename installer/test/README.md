# MDAA Installer Testing

This directory contains comprehensive tests for the MDAA Installer Stack, including both unit tests and snapshot tests.

## Test Structure

### Unit Tests (`mdaa-installer.test.ts`)
- Tests individual components and functionality
- Validates resource properties and configurations
- Checks parameter definitions and validation rules
- Verifies security configurations

### Snapshot Tests (`mdaa-installer.snapshot.test.ts`)
- Captures the complete CloudFormation template structure
- Provides regression testing for template changes
- Breaks down snapshots by resource types and sections
- Includes different configuration scenarios

## Check environment readiness

```bash
cd installer
npm install
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Snapshot Tests Only
```bash
npm run test:snapshot
```

### Update Snapshots
```bash
npm run test:snapshot:update
```

## Snapshot Management

### When to Update Snapshots
- After intentional changes to the CloudFormation template
- When adding new resources or modifying existing ones
- After updating CDK versions that might change template structure

### Reviewing Snapshot Changes
1. Run tests to see which snapshots have changed
2. Review the diff to ensure changes are expected
3. Update snapshots if changes are intentional
4. Commit both code changes and updated snapshots

### Snapshot Files Location
Snapshots are stored in `__snapshots__/` directory and should be committed to version control.

## Test Categories

### Security Tests
- KMS key rotation
- S3 bucket encryption
- SSL enforcement
- Public access blocks
- IAM role configurations

### Infrastructure Tests
- CodeBuild project configuration
- CodePipeline setup (GitHub and S3)
- S3 bucket policies
- Resource dependencies

### Configuration Tests
- Parameter validation
- Conditional resource creation
- CloudFormation interface metadata
- Environment variables

### Template Structure Tests
- Complete template snapshots
- Section-specific snapshots (Parameters, Resources, etc.)
- Resource type groupings

## Best Practices

1. **Run tests before committing**: Always run the full test suite before pushing changes
2. **Review snapshot diffs**: Carefully review any snapshot changes to ensure they're intentional
3. **Keep tests focused**: Each test should verify a specific aspect of the stack
4. **Use descriptive test names**: Test names should clearly indicate what is being tested
5. **Update documentation**: Keep this README updated when adding new test categories

## Troubleshooting

### Common Issues

#### Snapshot Mismatch
```
Error: expect(received).toMatchSnapshot()
```
**Solution**: Review the changes and update snapshots if they're intentional using `npm run test:snapshot:update`

#### Test Timeout
```
Error: Timeout - Async callback was not invoked within the 5000ms timeout
```
**Solution**: The Jest configuration includes a 30-second timeout for CDK synthesis. If tests still timeout, check for infinite loops or resource dependency issues.

#### Missing Dependencies
```
Error: Cannot find module '@aws-cdk-lib/assertions'
```
**Solution**: Ensure all dependencies are installed with `npm install`

### Debug Mode
To run tests with verbose output:
```bash
npm run test:snapshot -- --verbose
```

## Contributing

When adding new tests:
1. Follow the existing naming conventions
2. Group related tests in describe blocks
3. Add appropriate snapshots for new functionality
4. Update this README if adding new test categories
5. Ensure tests are deterministic and don't rely on external state
