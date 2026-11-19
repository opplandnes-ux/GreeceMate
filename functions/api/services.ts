import type { Env } from "../lib/db";
import { errorResponse, json } from "../lib/errors";
import { listPublishedServices, toPublicService } from "../lib/service-catalog";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const rows = await listPublishedServices(env);
    return json({ services: rows.map(toPublicService) });
  } catch (error) {
    return errorResponse(error);
  }
};

