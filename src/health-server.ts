import { createServer, type Server } from 'node:http';

const PORT = 8080;

export async function startHealthServer(): Promise<Server> {
  const server = createServer((request, response) => {
    if (request.url !== '/' && request.url !== '/healthz') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok' }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, '0.0.0.0', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  return server;
}
