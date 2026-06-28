import { ApiError } from "./errors";
import type { Env, OrderRow } from "./db";
import { constantTimeEqual, hashToken } from "./token";

function bearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") || "";
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  return request.headers.get("x-order-view-token") || "";
}

export async function requireOrderAccess(request: Request, row: OrderRow): Promise<void> {
  const token = bearerToken(request);
  if (!token) throw new ApiError(401, "ORDER_TOKEN_REQUIRED", "需要订单查看凭证。" );
  const receivedHash = await hashToken(token);
  const storedHash = (row as OrderRow & { order_view_token_hash?: string }).order_view_token_hash || "";
  if (!storedHash || !constantTimeEqual(receivedHash, storedHash)) {
    throw new ApiError(403, "ORDER_TOKEN_INVALID", "订单查看凭证无效。" );
  }
}

export function requireAdmin(request: Request, env: Env): void {
  if (!env.ADMIN_SECRET) {
    throw new ApiError(503, "ADMIN_NOT_CONFIGURED", "后台服务尚未配置管理员凭证。" );
  }
  const provided = request.headers.get("x-admin-secret") || "";
  if (!provided || !constantTimeEqual(provided, env.ADMIN_SECRET)) {
    throw new ApiError(401, "ADMIN_UNAUTHORIZED", "管理员凭证无效。" );
  }
}

