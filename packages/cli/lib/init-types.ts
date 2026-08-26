/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Types shared between the `mdaa init` modules. Lives apart from the feature
 * modules so that `init-steering` (which writes the files) and `init-version`
 * (which persists the record of them) can both depend on it without depending
 * on each other.
 */

/**
 * Maps a file's path (relative to the project root) to the SHA-256 hash of the
 * content MDAA last wrote to it. Persisted in `.mdaa/metadata.json` so that a
 * later `--enhance`/`upgrade` run can tell whether the user modified a
 * previously-generated file, without relying on git state or content sniffing.
 */
export type GeneratedFileManifest = Record<string, string>;
