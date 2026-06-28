export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return json({ error: { code: error.code, message: error.message } }, error.status);
  }

  console.error("Order API request failed", error instanceof Error ? error.message : "Unknown error");
  return json(
    { error: { code: "INTERNAL_ERROR", message: "订单服务暂时不可用，请稍后重试。" } },
    500,
  );
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "请求格式必须为 JSON。" );
  }

  try {
    const data = await request.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Invalid object");
    }
    return data as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "INVALID_JSON", "订单数据格式不正确。" );
  }
}

