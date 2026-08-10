"""Unit tests for test_starter_kit.py — the starter kit test runner.

Tests pure functions only: config parsing, context key detection,
affected module resolution. No subprocess calls or git operations.
"""

from __future__ import annotations

from pathlib import Path

from test_starter_kit import (
    CLI_PACKAGE,
    compute_affected,
    discover_kits,
    find_context_keys_in_file,
    find_untested_targets,
    get_changed_context_keys,
    get_kit_modules,
    get_tested_modules,
    kit_test_file,
    mdaa_yaml_changed,
    modules_affected_by_config_changes,
    modules_affected_by_context_changes,
    parse_args,
    parse_nx_projects,
    select_kit,
)


class TestParseNxProjects:
    """Tests for parse_nx_projects — reading `nx show projects` output.

    nx emits a single-line JSON array. A line-based parse silently yields an
    empty set, which disables the nx detection paths entirely (module synths
    and the CLI baseline gate) while the runner still exits 0.
    """

    def test_parses_single_line_json_array(self):
        """The real nx output format."""
        stdout = '["@aws-mdaa/cli","@aws-mdaa/starter-kits","@aws-mdaa/roles"]'
        assert parse_nx_projects(stdout) == {
            "@aws-mdaa/cli",
            "@aws-mdaa/starter-kits",
            "@aws-mdaa/roles",
        }

    def test_json_array_with_trailing_newline_and_spaces(self):
        stdout = '  ["@aws-mdaa/cli", "@aws-mdaa/roles"]  \n'
        assert parse_nx_projects(stdout) == {"@aws-mdaa/cli", "@aws-mdaa/roles"}

    def test_pretty_printed_json_array(self):
        stdout = '[\n  "@aws-mdaa/cli",\n  "@aws-mdaa/roles"\n]'
        assert parse_nx_projects(stdout) == {"@aws-mdaa/cli", "@aws-mdaa/roles"}

    def test_filters_non_mdaa_entries(self):
        stdout = '["@aws-mdaa/cli","some-other-project","@scope/thing"]'
        assert parse_nx_projects(stdout) == {"@aws-mdaa/cli"}

    def test_falls_back_to_line_based_output(self):
        """Non-JSON output is parsed one name per line."""
        stdout = "@aws-mdaa/cli\n@aws-mdaa/roles\n"
        assert parse_nx_projects(stdout) == {"@aws-mdaa/cli", "@aws-mdaa/roles"}

    def test_empty_output(self):
        assert parse_nx_projects("") == set()
        assert parse_nx_projects("   \n  ") == set()

    def test_empty_json_array(self):
        assert parse_nx_projects("[]") == set()

    def test_ignores_non_list_json(self):
        assert parse_nx_projects('{"projects":["@aws-mdaa/cli"]}') == set()


class TestGetKitModules:
    """Tests for get_kit_modules config parsing."""

    def test_empty_config(self):
        assert get_kit_modules({}) == []

    def test_single_module(self):
        config = {
            "domains": {
                "shared": {
                    "environments": {
                        "dev": {
                            "modules": {
                                "roles": {
                                    "module_path": "@aws-mdaa/roles",
                                    "module_configs": ["./roles.yaml"],
                                }
                            }
                        }
                    }
                }
            }
        }
        result = get_kit_modules(config)
        assert len(result) == 1
        assert result[0]["domain"] == "shared"
        assert result[0]["module"] == "roles"
        assert result[0]["module_path"] == "@aws-mdaa/roles"
        assert result[0]["config_files"] == ["./roles.yaml"]

    def test_module_without_config_files(self):
        config = {
            "domains": {
                "shared": {
                    "environments": {
                        "dev": {
                            "modules": {
                                "glue-catalog": {
                                    "module_path": "@aws-mdaa/glue-catalog",
                                }
                            }
                        }
                    }
                }
            }
        }
        result = get_kit_modules(config)
        assert len(result) == 1
        assert result[0]["config_files"] == []

    def test_multiple_domains(self):
        config = {
            "domains": {
                "shared": {
                    "environments": {
                        "dev": {
                            "modules": {
                                "roles": {"module_path": "@aws-mdaa/roles", "module_configs": []},
                            }
                        }
                    }
                },
                "dataops": {
                    "environments": {
                        "dev": {
                            "modules": {
                                "crawler": {"module_path": "@aws-mdaa/dataops-crawler", "module_configs": ["./crawler.yaml"]},
                            }
                        }
                    }
                },
            }
        }
        result = get_kit_modules(config)
        assert len(result) == 2
        domains = {m["domain"] for m in result}
        assert domains == {"shared", "dataops"}

    def test_template_based_modules(self):
        config = {
            "env_templates": {
                "common": {
                    "modules": {
                        "roles": {"module_path": "@aws-mdaa/roles", "module_configs": ["./roles.yaml"]},
                        "glue-cat": {"module_path": "@aws-mdaa/glue-catalog"},
                    }
                }
            },
            "domains": {
                "team1-com": {
                    "environments": {
                        "dev": {
                            "template": "common",
                        }
                    }
                }
            },
        }
        result = get_kit_modules(config)
        assert len(result) == 2
        module_names = {m["module"] for m in result}
        assert module_names == {"roles", "glue-cat"}
        assert all(m["domain"] == "team1-com" for m in result)

    def test_skips_non_dict_entries(self):
        config = {
            "domains": {
                "shared": {
                    "environments": {
                        "dev": {
                            "modules": {
                                "roles": {"module_path": "@aws-mdaa/roles"},
                                "broken": "not a dict",
                            }
                        }
                    }
                }
            }
        }
        result = get_kit_modules(config)
        assert len(result) == 1


class TestFindContextKeysInFile:
    """Tests for find_context_keys_in_file regex extraction."""

    def test_finds_context_keys(self, tmp_path):
        f = tmp_path / "test.yaml"
        f.write_text('vpcId: "{{context:vpc_id}}"\nsubnet: "{{context:subnet-id-1}}"')
        result = find_context_keys_in_file(f)
        assert result == {"vpc_id", "subnet-id-1"}

    def test_no_context_keys(self, tmp_path):
        f = tmp_path / "test.yaml"
        f.write_text("buckets:\n  raw:\n    accessPolicies: []")
        result = find_context_keys_in_file(f)
        assert result == set()

    def test_nonexistent_file(self, tmp_path):
        f = tmp_path / "nonexistent.yaml"
        result = find_context_keys_in_file(f)
        assert result == set()

    def test_duplicate_keys(self, tmp_path):
        f = tmp_path / "test.yaml"
        f.write_text('a: "{{context:vpc_id}}"\nb: "{{context:vpc_id}}"')
        result = find_context_keys_in_file(f)
        assert result == {"vpc_id"}

    def test_hyphenated_keys(self, tmp_path):
        f = tmp_path / "test.yaml"
        f.write_text('group: "{{context:team1-group-sso-id}}"')
        result = find_context_keys_in_file(f)
        assert result == {"team1-group-sso-id"}


class TestGetChangedContextKeys:
    """Tests for get_changed_context_keys diff parsing."""

    def test_parses_added_context_keys(self, tmp_path, monkeypatch):
        diff = """\
diff --git a/starter_kits/minimal/mdaa.yaml b/starter_kits/minimal/mdaa.yaml
--- a/starter_kits/minimal/mdaa.yaml
+++ b/starter_kits/minimal/mdaa.yaml
@@ -10,6 +10,8 @@
 organization: test-org
 
 context:
+  vpc_id: vpc-123
+  subnet_id: subnet-abc
 
 domains:
"""
        # Monkeypatch get_file_diff to return our test diff
        import test_starter_kit
        monkeypatch.setattr(test_starter_kit, "get_file_diff", lambda _: diff)

        kit_dir = tmp_path / "starter_kits" / "minimal"
        kit_dir.mkdir(parents=True)
        repo_root = tmp_path

        result = get_changed_context_keys(kit_dir, repo_root)
        assert result == {"vpc_id", "subnet_id"}

    def test_parses_removed_context_keys(self, tmp_path, monkeypatch):
        diff = """\
diff --git a/kit/mdaa.yaml b/kit/mdaa.yaml
@@ -10,8 +10,6 @@
 context:
-  old_key: old-value
-  another: gone
 
 domains:
"""
        import test_starter_kit
        monkeypatch.setattr(test_starter_kit, "get_file_diff", lambda _: diff)

        kit_dir = tmp_path / "kit"
        kit_dir.mkdir(parents=True)
        repo_root = tmp_path

        result = get_changed_context_keys(kit_dir, repo_root)
        assert result == {"old_key", "another"}

    def test_ignores_non_context_changes(self, tmp_path, monkeypatch):
        diff = """\
diff --git a/kit/mdaa.yaml b/kit/mdaa.yaml
@@ -1,3 +1,3 @@
-organization: old-org
+organization: new-org
 
 context:
   vpc_id: unchanged
"""
        import test_starter_kit
        monkeypatch.setattr(test_starter_kit, "get_file_diff", lambda _: diff)

        kit_dir = tmp_path / "kit"
        kit_dir.mkdir(parents=True)
        repo_root = tmp_path

        result = get_changed_context_keys(kit_dir, repo_root)
        assert result == set()

    def test_handles_hyphenated_keys(self, tmp_path, monkeypatch):
        diff = """\
@@ -10,6 +10,7 @@
 context:
+  team1-group-sso-id: new-value
"""
        import test_starter_kit
        monkeypatch.setattr(test_starter_kit, "get_file_diff", lambda _: diff)

        kit_dir = tmp_path / "kit"
        kit_dir.mkdir(parents=True)
        repo_root = tmp_path

        result = get_changed_context_keys(kit_dir, repo_root)
        assert result == {"team1-group-sso-id"}

    def test_empty_diff(self, tmp_path, monkeypatch):
        import test_starter_kit
        monkeypatch.setattr(test_starter_kit, "get_file_diff", lambda _: "")

        kit_dir = tmp_path / "kit"
        kit_dir.mkdir(parents=True)

        result = get_changed_context_keys(kit_dir, tmp_path)
        assert result == set()


class TestModulesAffectedByContextChanges:
    """Tests for modules_affected_by_context_changes."""

    def test_matches_module_referencing_changed_key(self, tmp_path):
        config_file = tmp_path / "bedrock.yaml"
        config_file.write_text('model: "{{context:llm_model}}"\nvpc: "{{context:vpc_id}}"')

        modules = [
            {"domain": "genai", "module": "agent", "module_path": "@aws-mdaa/bedrock-builder", "config_files": ["./bedrock.yaml"]},
            {"domain": "shared", "module": "roles", "module_path": "@aws-mdaa/roles", "config_files": ["./roles.yaml"]},
        ]
        # Create the roles.yaml without context refs
        (tmp_path / "roles.yaml").write_text("generateRoles:\n  admin: {}")

        result = modules_affected_by_context_changes(modules, {"vpc_id"}, tmp_path)
        assert len(result) == 1
        assert result[0]["module"] == "agent"

    def test_no_match_when_keys_dont_overlap(self, tmp_path):
        config_file = tmp_path / "config.yaml"
        config_file.write_text('vpc: "{{context:vpc_id}}"')

        modules = [
            {"domain": "shared", "module": "datalake", "module_path": "@aws-mdaa/datalake", "config_files": ["./config.yaml"]},
        ]

        result = modules_affected_by_context_changes(modules, {"unrelated_key"}, tmp_path)
        assert result == []

    def test_module_without_config_files(self, tmp_path):
        modules = [
            {"domain": "shared", "module": "glue-catalog", "module_path": "@aws-mdaa/glue-catalog", "config_files": []},
        ]
        result = modules_affected_by_context_changes(modules, {"vpc_id"}, tmp_path)
        assert result == []


class TestModulesAffectedByConfigChanges:
    """Tests for modules_affected_by_config_changes."""

    def test_detects_changed_config_file(self):
        repo_root = Path("/repo")
        kit_dir = Path("/repo/starter_kits/minimal")
        modules = [
            {"domain": "govern", "module": "roles", "module_path": "@aws-mdaa/roles", "config_files": ["./govern/roles.yaml"]},
            {"domain": "govern", "module": "glue-catalog", "module_path": "@aws-mdaa/glue-catalog", "config_files": []},
        ]
        changed_files = ["starter_kits/minimal/govern/roles.yaml", "starter_kits/minimal/README.md"]

        result = modules_affected_by_config_changes(modules, changed_files, kit_dir, repo_root)
        assert len(result) == 1
        assert result[0]["module"] == "roles"

    def test_no_match_for_unrelated_changes(self):
        repo_root = Path("/repo")
        kit_dir = Path("/repo/starter_kits/minimal")
        modules = [
            {"domain": "govern", "module": "roles", "module_path": "@aws-mdaa/roles", "config_files": ["./govern/roles.yaml"]},
        ]
        changed_files = ["starter_kits/minimal/README.md", "packages/cli/lib/mdaa.ts"]

        result = modules_affected_by_config_changes(modules, changed_files, kit_dir, repo_root)
        assert result == []

    def test_handles_relative_paths(self):
        repo_root = Path("/repo")
        kit_dir = Path("/repo/starter_kits/basic_datalake")
        modules = [
            {"domain": "dataops", "module": "crawler", "module_path": "@aws-mdaa/dataops-crawler", "config_files": ["./dataops/crawler.yaml"]},
        ]
        changed_files = ["starter_kits/basic_datalake/dataops/crawler.yaml"]

        result = modules_affected_by_config_changes(modules, changed_files, kit_dir, repo_root)
        assert len(result) == 1
        assert result[0]["module"] == "crawler"


class TestMdaaYamlChanged:
    """Tests for mdaa_yaml_changed."""

    def test_detects_mdaa_yaml_in_changed_files(self):
        repo_root = Path("/repo")
        kit_dir = Path("/repo/starter_kits/minimal")
        changed_files = ["starter_kits/minimal/mdaa.yaml", "starter_kits/minimal/roles.yaml"]

        assert mdaa_yaml_changed(kit_dir, changed_files, repo_root) is True

    def test_false_when_mdaa_yaml_not_changed(self):
        repo_root = Path("/repo")
        kit_dir = Path("/repo/starter_kits/minimal")
        changed_files = ["starter_kits/minimal/roles.yaml", "packages/cli/lib/mdaa.ts"]

        assert mdaa_yaml_changed(kit_dir, changed_files, repo_root) is False

    def test_does_not_match_other_kits_mdaa_yaml(self):
        repo_root = Path("/repo")
        kit_dir = Path("/repo/starter_kits/minimal")
        changed_files = ["starter_kits/basic_datalake/mdaa.yaml"]

        assert mdaa_yaml_changed(kit_dir, changed_files, repo_root) is False


class TestGetTestedModules:
    """Tests for get_tested_modules — parsing baselineModuleSynth calls.

    get_tested_modules now takes the path to a single kit's diff test file
    (tests are centralized under starter_kits/test/<kit>/<kit>.diff.test.ts).
    """

    def _write_test(self, tmp_path: Path, body: str) -> Path:
        test_file = tmp_path / "mykit.diff.test.ts"
        test_file.write_text(body)
        return test_file

    def test_extracts_domain_module_pairs(self, tmp_path):
        test_file = self._write_test(
            tmp_path,
            "\n".join(
                [
                    "baselineCliCommands('mykit', CONTEXT);",
                    "baselineModuleSynth('mykit', 'shared', 'roles', CONTEXT);",
                    "baselineModuleSynth('mykit', 'dataops', 'crawler', CONTEXT, { cdkContext: {} });",
                ]
            ),
        )
        result = get_tested_modules(test_file)
        assert result == {("shared", "roles"), ("dataops", "crawler")}

    def test_handles_double_quotes(self, tmp_path):
        test_file = self._write_test(tmp_path, 'baselineModuleSynth("mykit", "ent-com", "glue-cat", CONTEXT);')
        result = get_tested_modules(test_file)
        assert result == {("ent-com", "glue-cat")}

    def test_returns_empty_when_file_missing(self, tmp_path):
        assert get_tested_modules(tmp_path / "nope.diff.test.ts") == set()

    def test_returns_empty_when_no_synth_calls(self, tmp_path):
        test_file = self._write_test(tmp_path, "baselineCliCommands('mykit', CONTEXT);")
        assert get_tested_modules(test_file) == set()


class TestDiscoverKits:
    """Tests for discover_kits — enumerating kit directories."""

    def test_lists_dirs_with_mdaa_yaml_excluding_test(self, tmp_path):
        for kit in ["basic_datalake", "smus_data_mesh"]:
            d = tmp_path / kit
            d.mkdir()
            (d / "mdaa.yaml").write_text("organization: test\n")
        # 'test' dir is excluded even if it somehow had an mdaa.yaml
        (tmp_path / "test").mkdir()
        # a dir without mdaa.yaml is not a kit
        (tmp_path / "not_a_kit").mkdir()
        # a stray file is ignored
        (tmp_path / "README.md").write_text("x")

        assert discover_kits(tmp_path) == ["basic_datalake", "smus_data_mesh"]

    def test_empty_when_no_kits(self, tmp_path):
        assert discover_kits(tmp_path) == []


class TestKitTestFile:
    """Tests for kit_test_file path construction."""

    def test_builds_centralized_path(self):
        result = kit_test_file(Path("/repo/starter_kits"), "smus_data_mesh")
        assert result == Path("/repo/starter_kits/test/smus_data_mesh/smus_data_mesh.diff.test.ts")


class TestFindUntestedTargets:
    """Tests for find_untested_targets — the zero-match guard."""

    def test_flags_targeted_module_without_test(self):
        affected = {("ent-data", "lake"), ("shared", "roles")}
        tested = {("shared", "roles")}
        assert find_untested_targets(affected, tested) == [("ent-data", "lake")]

    def test_no_flag_when_all_targets_tested(self):
        affected = {("shared", "roles")}
        tested = {("shared", "roles"), ("dataops", "crawler")}
        assert find_untested_targets(affected, tested) == []

    def test_no_flag_when_tested_set_empty(self):
        # Empty tested set means the test file could not be parsed — do not
        # produce false positives; let Jest run.
        affected = {("ent-data", "lake")}
        assert find_untested_targets(affected, set()) == []

    def test_returns_sorted_list(self):
        affected = {("z-domain", "m"), ("a-domain", "m")}
        assert find_untested_targets(affected, {("x", "y")}) == [
            ("a-domain", "m"),
            ("z-domain", "m"),
        ]


class TestComputeAffected:
    """Tests for compute_affected — combining the detection paths."""

    def _kit(self, tmp_path: Path) -> Path:
        kit = tmp_path / "mykit"
        kit.mkdir()
        (kit / "roles.yaml").write_text("x")
        return kit

    def test_mdaa_yaml_change_sets_cli_baseline(self, tmp_path, monkeypatch):
        import test_starter_kit
        monkeypatch.setattr(test_starter_kit, "get_changed_context_keys", lambda *a: set())
        kit = self._kit(tmp_path)
        modules = [{"domain": "shared", "module": "roles", "module_path": "@aws-mdaa/roles", "config_files": ["./roles.yaml"]}]
        changed = ["mykit/mdaa.yaml"]

        run_cli, affected = compute_affected(kit, tmp_path, changed, modules, set())
        assert run_cli is True
        assert affected == set()

    def test_upstream_package_change_selects_module(self, tmp_path):
        kit = self._kit(tmp_path)
        modules = [{"domain": "shared", "module": "roles", "module_path": "@aws-mdaa/roles", "config_files": ["./roles.yaml"]}]

        run_cli, affected = compute_affected(kit, tmp_path, [], modules, {"@aws-mdaa/roles"})
        assert run_cli is False
        assert affected == {("shared", "roles")}

    def test_config_file_change_selects_module(self, tmp_path):
        kit = self._kit(tmp_path)
        modules = [{"domain": "shared", "module": "roles", "module_path": "@aws-mdaa/roles", "config_files": ["./roles.yaml"]}]
        changed = ["mykit/roles.yaml"]

        run_cli, affected = compute_affected(kit, tmp_path, changed, modules, set())
        assert run_cli is False
        assert affected == {("shared", "roles")}

    def test_nothing_affected(self, tmp_path):
        kit = self._kit(tmp_path)
        modules = [{"domain": "shared", "module": "roles", "module_path": "@aws-mdaa/roles", "config_files": ["./roles.yaml"]}]

        run_cli, affected = compute_affected(kit, tmp_path, ["unrelated/file.ts"], modules, set())
        assert run_cli is False
        assert affected == set()

    def test_cli_package_change_sets_cli_baseline(self, tmp_path):
        """A CLI-only change selects the CLI baseline for every kit.

        The CLI is not a kit module_path and a CLI change touches no kit
        mdaa.yaml, so paths 1-3 cannot select the baseline. Regression test for
        stale baselines surviving a CLI command-format change.
        """
        kit = self._kit(tmp_path)
        modules = [{"domain": "shared", "module": "roles", "module_path": "@aws-mdaa/roles", "config_files": ["./roles.yaml"]}]
        changed = ["packages/cli/lib/mdaa-cli.ts"]

        run_cli, affected = compute_affected(kit, tmp_path, changed, modules, {CLI_PACKAGE})
        assert run_cli is True
        # No module synths: the CLI is not a module, so no module is affected.
        assert affected == set()

    def test_cli_package_change_does_not_suppress_module_synths(self, tmp_path):
        """A change affecting both the CLI and a module selects both."""
        kit = self._kit(tmp_path)
        modules = [{"domain": "shared", "module": "roles", "module_path": "@aws-mdaa/roles", "config_files": ["./roles.yaml"]}]

        run_cli, affected = compute_affected(
            kit, tmp_path, [], modules, {CLI_PACKAGE, "@aws-mdaa/roles"}
        )
        assert run_cli is True
        assert affected == {("shared", "roles")}

    def test_cli_package_not_treated_as_module_path(self, tmp_path):
        """CLI_PACKAGE in the affected set never registers a module synth test.

        Guards against the CLI being matched by path 3 if a kit ever declared it.
        """
        kit = self._kit(tmp_path)
        modules = [{"domain": "shared", "module": "roles", "module_path": "@aws-mdaa/roles", "config_files": ["./roles.yaml"]}]

        _run_cli, affected = compute_affected(kit, tmp_path, [], modules, {CLI_PACKAGE})
        assert ("shared", "roles") not in affected


class TestSelectKit:
    """Tests for select_kit — per-kit selection in the multi-kit loop.

    parse_mdaa_yaml is monkeypatched so these stay pure (no PyYAML dependency).
    """

    def test_returns_none_when_unaffected(self, tmp_path, monkeypatch):
        import test_starter_kit
        (tmp_path / "mykit").mkdir()
        monkeypatch.setattr(
            test_starter_kit, "parse_mdaa_yaml", lambda _:
            {"domains": {"shared": {"environments": {"dev": {"modules": {
                "roles": {"module_path": "@aws-mdaa/roles", "module_configs": ["./roles.yaml"]}}}}}}},
        )
        result = select_kit("mykit", tmp_path, tmp_path, ["unrelated.ts"], set())
        assert result is None

    def test_returns_selection_when_affected(self, tmp_path, monkeypatch):
        import test_starter_kit
        (tmp_path / "mykit").mkdir()
        monkeypatch.setattr(
            test_starter_kit, "parse_mdaa_yaml", lambda _:
            {"domains": {"shared": {"environments": {"dev": {"modules": {
                "roles": {"module_path": "@aws-mdaa/roles", "module_configs": ["./roles.yaml"]}}}}}}},
        )
        result = select_kit("mykit", tmp_path, tmp_path, [], {"@aws-mdaa/roles"})
        assert result is not None
        test_file, _run_cli, affected, _all_modules = result
        assert affected == {("shared", "roles")}
        assert test_file == tmp_path / "test" / "mykit" / "mykit.diff.test.ts"

    def test_unparseable_mdaa_yaml_runs_all(self, tmp_path, monkeypatch):
        import test_starter_kit
        (tmp_path / "mykit").mkdir()
        # Empty config (PyYAML missing or empty file) -> run all of the kit's tests.
        monkeypatch.setattr(test_starter_kit, "parse_mdaa_yaml", lambda _: {})
        result = select_kit("mykit", tmp_path, tmp_path, ["x"], set())
        assert result is not None
        _test_file, run_cli, affected, _all_modules = result
        assert run_cli is True
        assert affected == set()


class TestParseArgs:
    """Tests for the CLI argument parser (--kit / --list-kits)."""

    def test_defaults(self):
        args = parse_args([])
        assert args.kit is None
        assert args.list_kits is False

    def test_kit_selector(self):
        args = parse_args(["--kit", "smus_data_mesh"])
        assert args.kit == "smus_data_mesh"
        assert args.list_kits is False

    def test_list_kits_flag(self):
        args = parse_args(["--list-kits"])
        assert args.list_kits is True
        assert args.kit is None
