import { requireAdmin } from "../../lib/auth";
import type { Env } from "../../lib/db";
import { errorResponse, json } from "../../lib/errors";
import { listAdminOrders } from "../../lib/order-service";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    requireAdmin(request, env);
    const url = new URL(request.url);
    const orders = await listAdminOrders(
      env,
      url.searchParams.get("search") || "",
      url.searchParams.get("status") || "",
    );
    return json({ orders });
  } catch (error) {
    return errorResponse(error);
  }
};

