#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tags } from "aws-cdk-lib";
import { EC2InstanceApp } from "../lib/ec2";
const app = new EC2InstanceApp()
const stack = app.generateStack()
// This avoids existing instances with legacy tags being recreated
if (stack.node.tryGetContext("@aws-mdaa/legacyCdkAppTags")) {
    if (stack.node.tryGetContext("@aws-mdaa/legacyCaefTags")) {
        Tags.of(stack).add("caef_cdk_app", "ec2-instance")
    } else {
        Tags.of(stack).add("mdaa_cdk_app", "ec2-instance")
    }
}