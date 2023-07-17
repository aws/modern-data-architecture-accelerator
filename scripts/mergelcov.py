# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

import os
import subprocess
from pathlib import Path
import re

merged_output_file = './coverage/merged_lcov.info'

# Creating a function to replace the text


def replacetext(filename, search_text, replace_text):

    _file = Path(filename)
    data = _file.read_text()
    data = data.replace(search_text, replace_text)
    _file.write_text(data)
    return " Replace Completed !"


# Declare constants
pattern_text = "SF:lib/"

# Get curr directory
print(__file__)

_src_path = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
subprocess.run(["cd ", _src_path], shell=True)  # nosec

# Search for lcov file and create a list
lcov_path = list(Path(_src_path).rglob("lcov.info"))

# Create merged lcov supplemented relative path file.
os.makedirs(os.path.dirname(merged_output_file), exist_ok=True)
with open(merged_output_file, 'w') as outfile:
    for lcov_loc in lcov_path:
        _path = lcov_loc._str.split('/coverage/', 1)[0]
        replace_text = "SF:"+_path+"/lib/"

        # Test if pattern exists in any of the file  // could be removed
        for i, line in enumerate(open(lcov_loc)):
            for match in re.finditer(pattern_text, line):
                print('Found on line %s: %s' % (i+1, match.group()))

        # call replace function
        replacetext(lcov_loc, pattern_text, replace_text)

        # check if lcov file is empty
        if os.stat(lcov_loc._str).st_size != 0:
            with open(lcov_loc._str) as infile:
                outfile.write(infile.read())
            outfile.write("\n")
outfile.close()

print("Replace task finished !")
