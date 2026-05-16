import http from 'node:http';

const port = Number(process.env.HARNESS_MOCK_PORT ?? '19999');

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url?.startsWith('/health?')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(port, '127.0.0.1', () => {
  // eslint-disable-next-line no-console -- startup signal for webServer
  console.error(`[mock-http-server] listening on ${port}`);
});
