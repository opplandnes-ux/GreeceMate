import { requireOrderAccess } from "../../../lib/auth";
import type { Env, OrderRow } from "../../../lib/db";
import { toPublicOrder } from "../../../lib/db";
import { errorResponse, json } from "../../../lib/errors";
import { getOrderRow } from "../../../lib/order-service";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const row = (await getOrderRow(env, param(params.orderId), true)) as OrderRow & {
      order_view_token_hash: string;
    };
    await requireOrderAccess(request, row);
    return json({ order: toPublicOrder(row) });
  } catch (error) {
    return errorResponse(error);
  }
};

