declare module "dailyhot-api/dist/routes/*.js" {
  export const handleRoute: (
    context: { req: { query: (key: string) => string | undefined } },
    noCache: boolean,
  ) => Promise<Record<string, unknown>>;
}

declare module "dailyhot-api" {
  const serveHotApi: (port?: number) => unknown;
  export default serveHotApi;
}
