# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

from pathlib import Path
import os
import re

script_dir = os.path.dirname(__file__)

with open(f"{script_dir}/license_header.txt", encoding="utf-8") as f:
    license_header_contents = ''.join(f.readlines())

license_header_regex = re.compile(re.escape(license_header_contents))

license_header_reorder_regex = re.compile(
    f'^(.+){re.escape(license_header_contents)}', re.DOTALL)


def reorder_license(contents):
    if re.search(license_header_reorder_regex, contents):
        fixed_contents = re.sub(license_header_reorder_regex,
                                rf'{license_header_contents}\n\n\g<1>', contents)
    else:
        fixed_contents = None
    return fixed_contents


def add_license(contents):
    fixed_contents = license_header_contents + "\n\n" + contents
    return fixed_contents


def detect_license_header(path):
    # nosemgrep
    with open(path, encoding="utf-8") as f:
        contents = ''.join(f.readlines())
    if re.search(license_header_regex, contents):
        fixed_contents = reorder_license(contents)
    else:
        fixed_contents = add_license(contents)

    if fixed_contents is not None:
        with open(path, "w", encoding="utf-8") as f:
            f.write(fixed_contents)

for extension in ['ts', 'js']:
    for path in [path for path in Path('./packages').rglob(f'lib/*.{extension}')
                 if "node_modules" not in str(path)
                 and "jest" not in path.name]:
        detect_license_header(path)
