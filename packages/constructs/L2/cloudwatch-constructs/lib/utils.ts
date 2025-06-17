import { LogGroupProps } from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { MdaaLogGroupProps } from './loggroup';

export function updateProps(props: MdaaLogGroupProps): LogGroupProps {
  const pathPrefix = props.logGroupNamePathPrefix.endsWith('/')
    ? props.logGroupNamePathPrefix
    : props.logGroupNamePathPrefix + '/';
  const overrideProps = {
    logGroupName: pathPrefix + props.naming.resourceName(props.logGroupName),
    removalPolicy: RemovalPolicy.RETAIN,
  };
  return { ...props, ...overrideProps };
}
