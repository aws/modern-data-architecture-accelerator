export function sanitizeReplicationInstanceIdentifier(replicationInstanceIdentifier: string): string {
  return replicationInstanceIdentifier.replace(/-+/g, '-');
}
