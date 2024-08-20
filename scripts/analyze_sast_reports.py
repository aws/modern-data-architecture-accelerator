# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

import json
import sys
import os
import inspect

vulnerabilities = {}
dir = './reports'
for file in os.listdir(dir):
    if file.endswith(".json"):
        report = file.rstrip(".json")
        print(f'Checking {report} for discovered vulnerabilities ...')
        with open(os.path.join(dir, file), encoding="utf-8") as f:
            data = json.load(f)
            for v in data.get('vulnerabilities', []):
                if v['severity'] not in ['Critical', 'High']:
                    continue
                count = vulnerabilities.setdefault(
                    v['severity'], {}).setdefault('count', 0)
                vulnerabilities[v['severity']]['count'] += 1
                v['report'] = report
                vulnerabilities.setdefault(
                    v['severity'], {}).setdefault('items', []).append(v)
if not vulnerabilities:
    print("No Vulnerabilities Found :-)")
    sys.exit(0)

print("Vulnerabilities Found:")
for sev, v in vulnerabilities.items():
    print(f"\t\t{sev} count: {v.get('count', 0)}")
    for item in v.get('items', []):
        main_ident = {}
        for ident in item.get('identifiers', []):
            if ident.get('url', None):
                main_ident = ident
                break
        print(inspect.cleandoc(
            f'''
                {sev}: {item["report"]} : {item.get("name", main_ident.get('name', 'Unknown'))}
                File: {item["location"]["file"]}
                URL: {main_ident.get("url", 'Unknown')}
                -
            '''
        ))

if vulnerabilities.get('Critical', {}).get('count', 0) > 0:
    sys.exit(1)
sys.exit(0)
