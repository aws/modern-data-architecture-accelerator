import * as path from 'path';
import { IMdaaConfigValueTransformer } from './transformer';

export class ConfigConfigPathValueTransformer implements IMdaaConfigValueTransformer {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  public transformValue(value: string): string {
    if (value.startsWith('../')) {
      // Resolve to baseDir's parent path
      // nosemgrep
      return path.resolve(this.baseDir, value);
    }
    if (value.startsWith('./')) {
      // Resolve relative to baseDir
      // nosemgrep
      return path.resolve(value.replace(/^\./, this.baseDir));
    }
    return value;
  }
}
