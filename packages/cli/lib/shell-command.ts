/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Central "validate + quote" choke point for assembling the shell command
 * strings the CLI runs via child_process (`execSync` / `spawnSync({shell:true})`).
 *
 * MDAA interpolates many user-supplied YAML config values (CDK context params,
 * Terraform `-var` args, module/naming paths, ...) into one shell string. Without
 * quoting, a value such as `foo$(id)` would be interpreted by the shell as a
 * command substitution rather than a literal. Routing every *value* through
 * {@link ShellCommand} quotes it **by construction**, so a shell metacharacter in
 * a config value can never be interpreted — it arrives at the receiving program
 * as literal bytes.
 *
 * This is input hygiene, not a privilege boundary: MDAA already runs arbitrary
 * shell by design via `predeploy`/`postdeploy` hooks, so the config is trusted.
 * The point is to eliminate the "a config value accidentally became shell syntax"
 * problem class: values are quoted by construction, and every trusted-text method
 * accepts a string *literal type* only, so a runtime `string` fails to compile there.
 */

import { shellQuote } from './platform-utils';
import { Literal, SafeCommand, brandSafe } from './safe-command';

/**
 * Builder for a single shell command string — the sanctioned way to assemble one
 * from a mix of trusted literal text and untrusted values. Every trusted-text
 * parameter is a {@link Literal} (a runtime `string` fails to compile), and values
 * only enter through {@link option}/{@link arg}, which quote them — so a value can
 * never arrive un-quoted *through this API* — which guarantees this class's output, not
 * that every command was built with it (`brandSafe` is unrestricted; see
 * {@link ./safe-command.SafeCommand}).
 */
export class ShellCommand {
  private readonly parts: string[];

  private constructor(initial: string[]) {
    this.parts = initial;
  }

  /** Entry point: begin a command with its literal program name. */
  public static for<T extends string>(program: Literal<T>): ShellCommand {
    return new ShellCommand([program]);
  }

  /**
   * Entry point for a bare argument fragment with no program name — for call sites
   * that build a single token (one `-var`/`-c`) pushed into an array joined elsewhere.
   */
  public static args(): ShellCommand {
    return new ShellCommand([]);
  }

  /**
   * Append valueless literal flags / subcommands, each as its own part. The mapped
   * tuple type checks each argument at its own position rather than unifying them.
   */
  public flags<const T extends readonly string[]>(...flags: { [K in keyof T]: Literal<T[K] & string> }): this {
    this.parts.push(...(flags as readonly string[]));
    return this;
  }

  /**
   * Append a literal flag and its shell-quoted value as ONE part, so the pair is
   * never split by the {@link build} separator. The only way to attach a value to a flag.
   */
  public option<T extends string>(flag: Literal<T>, value: string): this {
    this.parts.push(`${flag} ${shellQuote(value)}`);
    return this;
  }

  /** Append a positional shell-quoted value as its own part. */
  public arg(value: string): this {
    this.parts.push(shellQuote(value));
    return this;
  }

  /**
   * Audited escape hatch: append literal text carrying deliberate shell syntax
   * (redirects, operators, intentional `${VAR}` expansions) as its own part.
   */
  public shellSyntax<T extends string>(text: Literal<T>): this {
    this.parts.push(text);
    return this;
  }

  /** Join the accumulated parts into the final {@link SafeCommand} (default separator: a space). */
  public build(separator = ' '): SafeCommand {
    return brandSafe(this.parts.join(separator));
  }
}
