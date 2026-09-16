declare module "dailyhot-api/dist/app.js" {
  const app: {
    fetch: (request: Request, ...rest: unknown[]) => Promise<Response>;
  };
  export default app;
}

declare module "dailyhot-api" {
  const serveHotApi: (port?: number) => unknown;
  export default serveHotApi;
}
