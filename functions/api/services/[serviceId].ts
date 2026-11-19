import type { Env } from "../../lib/db";
import { errorResponse, json } from "../../lib/errors";
import { getService, toPublicService } from "../../lib/service-catalog";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  try {
    return json({ service: toPublicService(await getService(env, param(params.serviceId), true)) });
  } catch (error) {
    return errorResponse(error);
  }
};

