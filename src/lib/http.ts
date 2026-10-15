import { NextRequest } from "next/server";
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 131072) throw new HttpError(413, "request too large");
  let body: unknown;
  try { body = JSON.parse(text); } catch { throw new HttpError(400, "invalid JSON"); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "JSON object required");
  return body as Record<string, unknown>;
}
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function apiHandler<C>(handler: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try { return await handler(req, ctx); }
    catch (error) {
      if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
      console.error("API request failed", req.nextUrl.pathname);
      return Response.json({ error: "service temporarily unavailable" }, { status: 503 });
    }
  };
}
