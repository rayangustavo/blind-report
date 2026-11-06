import http from "node:http";

export type HttpRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
};

export type HttpResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
};

export type RequestHandler = (request: HttpRequest) => Promise<HttpResponse | { statusCode: number; body: string }> | HttpResponse | { statusCode: number; body: string };

export function createServer({
  port,
  handler,
}: {
  port: number;
  handler?: RequestHandler;
}) {
  const requestHandler = handler ?? (async () => ({ statusCode: 200, body: "ok" }));
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", async () => {
      const bodyText = Buffer.concat(chunks).toString("utf8");
      let parsedBody: unknown = undefined;
      try {
        parsedBody = bodyText ? JSON.parse(bodyText) : undefined;
      } catch {
        parsedBody = bodyText;
      }

      const response = await requestHandler({
        method: req.method ?? "GET",
        url: req.url ?? "/",
        headers: Object.fromEntries(Object.entries(req.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value ?? ""])),
        body: parsedBody,
      });

      const responseHeaders = "headers" in response ? response.headers ?? {} : {};

      res.writeHead(response.statusCode, {
        "content-type": responseHeaders["content-type"] ?? "application/json",
        ...responseHeaders,
      });
      res.end(response.body);
    });
  });

  return {
    server,
    port,
    async start() {
      await new Promise<void>((resolve) => server.listen(port, () => resolve()));
      return true;
    },
    async stop() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      return true;
    },
  };
}

export function createTestServer(handler?: RequestHandler) {
  return createServer({ port: 0, handler });
}
