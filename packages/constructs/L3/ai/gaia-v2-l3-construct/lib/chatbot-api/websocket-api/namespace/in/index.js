export function onSubscribe(ctx) {
  // We don't allow subscribtions on messages sent from the user as we process them in the publish lambda
  util.unauthorized();
}
