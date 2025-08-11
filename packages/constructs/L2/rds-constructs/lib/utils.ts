import { MdaaRdsServerlessClusterProps } from './serverless-cluster';

const CLUSTER_IDENTIFIER_LENGTH = 63;
const CLUSTER_IDENTIFIER_REGEX = /^[a-zA-Z](?:-?[a-zA-Z0-9]){0,62}$/;

export function getSanitizeClusterIdentifier(props: MdaaRdsServerlessClusterProps): string {
  const nameOfRightLength = props.naming.resourceName(props.clusterIdentifier, CLUSTER_IDENTIFIER_LENGTH);
  const sanitizedName = nameOfRightLength.replace(/-+/g, '-');

  if (!CLUSTER_IDENTIFIER_REGEX.test(sanitizedName)) {
    throw new Error(`Unable to sanitize cluster identifier: ${props.clusterIdentifier}`);
  }

  return sanitizedName;
}
