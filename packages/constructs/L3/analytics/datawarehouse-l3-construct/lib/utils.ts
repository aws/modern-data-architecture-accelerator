export function sanitizeScheduledActionName(actionName: string): string {
  return actionName.replace(/-+/g, '-');
}
