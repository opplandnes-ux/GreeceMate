import { errorResponse, json, readJson, ApiError } from "../lib/errors";
import type { Env } from "../lib/db";
import { createOrder } from "../lib/order-service";
import { validateOrderInput } from "../lib/validation";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await readJson(request);
    const input = validateOrderInput(body);
    const suppliedKey = request.headers.get("idempotency-key") || "";
    const idempotencyKey = suppliedKey.trim() || `server_${crypto.randomUUID()}`;
    if (idempotencyKey.length > 160) {
      throw new ApiError(400, "INVALID_IDEMPOTENCY_KEY", "重复提交凭证格式不正确。" );
    }

    const result = await createOrder(env, input, idempotencyKey);
    return json(
      {
        orderId: result.order.orderId,
        orderNumber: result.order.orderNumber,
        orderStatus: result.order.orderStatus,
        paymentStatus: result.order.paymentStatus,
        orderViewToken: result.orderViewToken,
        notificationStatus: result.notificationStatus,
        order: result.order,
      },
      result.created ? 201 : 200,
    );
  } catch (error) {
    return errorResponse(error);
  }
};
