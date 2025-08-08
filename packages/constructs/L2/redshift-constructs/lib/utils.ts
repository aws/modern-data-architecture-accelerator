export function sanitizeClusterName(actionName: string): string {
  return actionName.replace(/-+/g, '-');
}
