import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Construct } from 'constructs';
import { EventApi } from 'aws-cdk-lib/aws-appsync';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { addDataSourceToChannelNamespace, addNagSuppressionsRuleForAppSyncRole } from '../utils/utils';

export interface CustomDataSourceProps {
  /** ARN of the external Lambda function to invoke */
  readonly lambdaArn: string;
}

interface CustomDataSourceConstructProps extends CustomDataSourceProps, MdaaL3ConstructProps {
  /** AppSync Event API for WebSocket communication */
  readonly eventApi: EventApi;
}

/**
 * Custom Data Source construct for integrating external Lambda functions.
 *
 * This construct creates:
 * - AppSync data source for external Lambda integration
 * - Cross-account Lambda invocation support
 * - WebSocket channel namespace integration
 *
 * The data source provides:
 * - Integration with external Lambda functions
 * - Support for cross-account Lambda invocation
 * - Custom business logic integration
 * - Third-party service integration capabilities
 */
export class CustomDataSource extends MdaaL3Construct {
  private readonly props: CustomDataSourceConstructProps;

  constructor(scope: Construct, id: string, props: CustomDataSourceConstructProps) {
    super(scope, id, props);
    this.props = props;

    // Create AppSync data source for external Lambda function
    // skipPermissions: true because this Lambda is managed externally (potentially cross-account).
    // The external Lambda owner must grant invoke permissions to this AppSync service role via:
    // 1. Resource-based policy on the Lambda function allowing appsync.amazonaws.com to invoke it, OR
    // 2. Cross-account IAM role assumption if the Lambda is in a different AWS account
    // This construct cannot manage those permissions as it doesn't own the external Lambda.
    const dataSource = props.eventApi.addLambdaDataSource(
      'custom-ds',
      Function.fromFunctionAttributes(this, 'CustomImportedFunction', {
        functionArn: this.props.lambdaArn,
        skipPermissions: true,
      }),
      {
        name: 'Custom',
        description:
          'A specialized data source that can invoke a custom lambda outside of MDAA. This function could be in another AWS account.',
      },
    );

    // Apply CDK Nag suppressions for AppSync role
    addNagSuppressionsRuleForAppSyncRole(dataSource);

    // Add data source to AppSync channel namespace for WebSocket routing
    addDataSourceToChannelNamespace('custom', props.eventApi, dataSource, 'custom');
  }
}
