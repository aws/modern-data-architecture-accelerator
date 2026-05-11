async function handler(event) {
  const request = event.request;
  const uri = request.uri;

  // Redirect to index.html for directory paths or extensionless routes
  if (uri.endsWith('/') || !uri.includes('.')) {
    request.uri = '/index.html';
  }

  return request;
}
