/**
 * No specific behaviour for publish
 */
export function onPublish(ctx) {
  return ctx.events;
}

/**
 * Runs when a client subscribes to a channel in this namespace, we want to make sure that the client is allowed to subscribe to channel with his user-id only.
 */
export function onSubscribe(ctx) {
  // We get the sub (client ID) from the token and if it is not equal to the second segment, we deny the request
  if (
    ctx.info.channel.segments.length < 2 ||
    ctx.identity === undefined ||
    ctx.identity.sub !== ctx.info.channel.segments[1]
  ) {
    util.unauthorized();
  }
}
