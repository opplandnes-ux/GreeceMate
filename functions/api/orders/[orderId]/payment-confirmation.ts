import { requireOrderAccess } from "../../../lib/auth";
import type { Env, OrderRow } from "../../../lib/db";
import { errorResponse, json, readJson } from "../../../lib/errors";
import { getOrderRow, submitPaymentConfirmation } from "../../../lib/order-service";
import { validatePaymentConfirmation } from "../../../lib/validation";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const orderId = param(params.orderId);
    const row = (await getOrderRow(env, orderId, true)) as OrderRow & {
      order_view_token_hash: string;
    };
    await requireOrderAccess(request, row);
    const input = validatePaymentConfirmation(await readJson(request));
    const order = await submitPaymentConfirmation(env, orderId, input);
    return json({ order });
  } catch (error) {
    return errorResponse(error);
  }
};
