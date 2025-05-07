import { ModuleEffectiveConfig } from '../lib/config-types';

export function isIntegration(): boolean {
  return process.argv.includes('--integration');
}

export const itif = (condition: boolean) => (condition ? it : it.skip);
export const itintegration = itif(isIntegration());

export function getCliConfig(): string {
  const args = process.argv.slice(2);
  const index = args.findIndex(arg => arg.startsWith('--cli-config='));
  if (index !== -1) return args[index].split('=')[1];
  throw new Error('Missing cli config');
}

// Input interfaces
interface EnvironmentInput {
  modules: number[];
  account?: unknown; // Optional account property that could be of any type
}

// Output interfaces
interface ModuleOutput {
  module_path: string;
  mdaa_version: string;
  module_configs: string[];
}

interface EnvironmentOutput {
  modules: Record<string, ModuleOutput>;
  account?: unknown;
}

interface DomainOutput {
  environments: Record<string, EnvironmentOutput>;
}

interface ConfigOutput {
  [domainKey: string]: DomainOutput;
}

export function createConfig(input: EnvironmentInput[][]): ConfigOutput {
  const result: ConfigOutput = {};

  // Process each domain in the input
  input.forEach((domain, domainIndex) => {
    const domainKey = `domain${domainIndex + 1}`;
    result[domainKey] = { environments: {} };

    // Process each environment in the domain
    domain.forEach((env, envIndex) => {
      const envKey = `env${envIndex + 1}`;
      const environmentOutput: EnvironmentOutput = {
        modules: {},
      };

      // Add account if it exists
      if (env.account !== undefined) {
        environmentOutput.account = env.account;
      }

      // Transform module numbers into module objects
      env.modules.forEach(moduleNumber => {
        const moduleKey = `mod${moduleNumber}`;
        environmentOutput.modules[moduleKey] = {
          mdaa_version: `test_mod${moduleKey}v1`,
          module_configs: [`./mod${moduleKey}.yaml`],
          module_path: `@aws-mdaa/${moduleKey}`,
        };
      });

      result[domainKey].environments[envKey] = environmentOutput;
    });
  });

  return result;
}

export function isAccountLevelModule<T>(
  moduleEffectiveConfig: ModuleEffectiveConfig,
  configName: string,
  validator: (value: unknown) => value is T,
) {
  console.log(`validator: ${validator}`);

  // Return different values based on the module name or other properties
  if (configName === 'ACCOUNT_LEVEL_MODULE') {
    const moduleName = moduleEffectiveConfig.moduleName;

    // Regular expression to match "mod" followed by a number
    const regex = /^mod(\d+)$/;
    const match = moduleName.match(regex);

    if (match) {
      // Extract the number part
      const numberPart = parseInt(match[1], 10);

      // Check if it's an odd number
      return numberPart % 2 !== 0;
    }

    // Return false for any other module names
    return false;
  }

  throw new Error(`Test did not expect configName: ${configName}`);
}
