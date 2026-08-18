/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GlueJobCDKApp } from '../lib/dataops-job';
import * as path from 'path';

interface CfnResourceShape {
  readonly Type: string;
  readonly Properties: Record<string, unknown>;
}

describe('GlueJob DataZone lineage validation', () => {
  test('Synth fails when lineage is enabled on a Glue version below 5.0', () => {
    const moduleApp = new GlueJobCDKApp({
      context: {
        module_configs: path.join(__dirname, 'fixtures', 'lineage-invalid-glueversion.yaml'),
        module_name: 'test-gluejob-lineage-invalid',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    });

    expect(() => moduleApp.generateStack()).toThrow(/requires Glue version 5.0 or higher/);
  });

  test('Synth injects the OpenLineage DataZone --conf when lineage is enabled on Glue 5.0', () => {
    const moduleApp = new GlueJobCDKApp({
      context: {
        module_configs: path.join(__dirname, 'fixtures', 'lineage-valid-glueversion.yaml'),
        module_name: 'test-gluejob-lineage-valid',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    });
    moduleApp.generateStack();
    const assembly = moduleApp.synth();

    const glueJobs = assembly.stacks.flatMap(stack =>
      Object.values((stack.template.Resources ?? {}) as Record<string, CfnResourceShape>).filter(
        resource => resource.Type === 'AWS::Glue::Job',
      ),
    );
    expect(glueJobs).toHaveLength(1);

    const conf = JSON.stringify(glueJobs[0].Properties.DefaultArguments);
    expect(conf).toContain('spark.extraListeners=io.openlineage.spark.agent.OpenLineageSparkListener');
    expect(conf).toContain('spark.openlineage.transport.type=amazon_datazone_api');
    expect(conf).toContain('spark.openlineage.transport.domainId=dzd_positivetest');
    expect(conf).toContain('spark.glue.accountId');
  });
});
