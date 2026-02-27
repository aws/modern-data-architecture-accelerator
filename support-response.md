The customer's command syntax is incorrect. They ran:

```
mdaa l synth -e dev
```

But `l` without a dash is being interpreted as the action argument, which then gets passed to CDK as `cdk l ... synth` — an invalid command.

The correct syntax requires a dash:

```
mdaa -l synth -e dev
```

However, the `-l` (local mode) flag is deprecated in recent MDAA versions. The CLI now auto-detects whether to use local source or NPM packages. The customer can simply run:

```
mdaa synth -e dev
```

If they're using MDAA 1.3.0 as indicated, the `-l` flag should still work with proper syntax, but they'll see a message that it's no longer necessary.
