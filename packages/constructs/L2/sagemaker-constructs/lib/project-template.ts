/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { CfnTag } from 'aws-cdk-lib';
import { CfnProject } from 'aws-cdk-lib/aws-sagemaker';
import { CfnCloudFormationProduct } from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';

export interface MdaaSageMakerProjectTemplateProps extends MdaaConstructProps {
  /** Name of the SageMaker project */
  readonly projectName: string;
  /** Description of the SageMaker project */
  readonly projectDescription?: string;
  /** Name of the Service Catalog product backing this template */
  readonly serviceCatalogProductName: string;
  /** Description of the Service Catalog product */
  readonly serviceCatalogProductDescription?: string;
  /**
   * Display name of the Service Catalog product owner (e.g. a team name or email address).
   * This is a metadata string on the Service Catalog product — it is not an IAM role ARN
   * and carries no IAM semantics. AWS accepts any string up to 8191 characters.
   */
  readonly serviceCatalogProductOwner: string;
  /**
   * HTTPS URL of the CloudFormation template that defines the MLOps pipeline infrastructure
   * (CodePipeline, CodeBuild, IAM roles, S3 buckets) provisioned when a SageMaker project is created.
   *
   * This is NOT a SageMaker service-managed template. It is operator/platform-authored and managed
   * outside the SageMaker service. The expected pattern is for an L3 construct to define this
   * infrastructure in CDK via a `ProductStack`, and derive this URL at synthesis time using
   * `CloudFormationTemplate.fromProductStack(stack).bind(parentStack).httpUrl`.
   * Customers configure the pipeline through L3 props (YAML) — they do not author CloudFormation directly.
   */
  readonly templateUrl: string;
  /** Provisioning artifact name (version label) */
  readonly provisioningArtifactName?: string;
  /** Provisioning artifact description */
  readonly provisioningArtifactDescription?: string;
  /** Tags to apply to the SageMaker project */
  readonly tags?: CfnTag[];
}

export const MAX_SERVICE_CATALOG_PRODUCT_NAME_LENGTH = 100;
export const MAX_SAGEMAKER_PROJECT_NAME_LENGTH = 32;

/**
 * A construct for creating a compliant SageMaker Project Template backed by a Service Catalog product.
 * Used by both model training and model deployment L3 constructs.
 */
export class MdaaSageMakerProjectTemplate extends Construct {
  public readonly project: CfnProject;
  public readonly product: CfnCloudFormationProduct;

  constructor(scope: Construct, id: string, props: MdaaSageMakerProjectTemplateProps) {
    super(scope, id);

    const productName = props.naming.resourceName(
      props.serviceCatalogProductName,
      MAX_SERVICE_CATALOG_PRODUCT_NAME_LENGTH,
    );

    this.product = new CfnCloudFormationProduct(this, 'product', {
      name: productName,
      owner: props.serviceCatalogProductOwner,
      description: props.serviceCatalogProductDescription,
      provisioningArtifactParameters: [
        {
          info: {
            LoadTemplateFromURL: props.templateUrl,
          },
          name: props.provisioningArtifactName ?? 'v1',
          description: props.provisioningArtifactDescription ?? 'Initial version',
        },
      ],
      tags: props.tags,
    });

    const projectName = props.naming.resourceName(props.projectName, MAX_SAGEMAKER_PROJECT_NAME_LENGTH);

    this.project = new CfnProject(this, 'project', {
      projectName,
      projectDescription: props.projectDescription,
      serviceCatalogProvisioningDetails: {
        productId: this.product.ref,
      },
      tags: props.tags,
    });

    new MdaaParamAndOutput(
      this,
      {
        ...props,
        resourceType: 'sagemaker-project',
        resourceId: props.projectName,
        name: 'id',
        value: this.project.attrProjectId,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        ...props,
        resourceType: 'sagemaker-project',
        resourceId: props.projectName,
        name: 'arn',
        value: this.project.attrProjectArn,
      },
      scope,
    );
  }
}
