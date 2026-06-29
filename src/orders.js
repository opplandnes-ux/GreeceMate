const ORDER_STORAGE_KEY = "xiyoubang.orders.v1";
const ADMIN_SECRET_STORAGE_KEY = "greecemate.admin.secret.v1";

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || "[]");
  } catch (error) {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
}

function upsertCachedOrder(order) {
  const orders = getOrders();
  const index = orders.findIndex((item) => item.id === order.id);
  if (index >= 0) {
    orders[index] = { ...orders[index], ...order };
  } else {
    orders.unshift(order);
  }
  orders.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  saveOrders(orders);
  return order;
}

function cacheServerOrder(order, orderViewToken) {
  return upsertCachedOrder({
    ...order,
    serverBacked: true,
    syncStatus: "synced",
    orderViewToken: orderViewToken || getOrder(order.id)?.orderViewToken || "",
  });
}

function getSubmissionKey(form) {
  if (!form.dataset.submissionKey) {
    form.dataset.submissionKey = `web_${crypto.randomUUID()}`;
  }
  return form.dataset.submissionKey;
}

async function responseError(response) {
  try {
    const data = await response.json();
    return data?.error?.message || "订单服务暂时不可用，请稍后重试。";
  } catch (error) {
    return "订单服务暂时不可用，请稍后重试。";
  }
}

async function submitOrderToServer(payload, idempotencyKey) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await responseError(response));
  const result = await response.json();
  cacheServerOrder(result.order, result.orderViewToken);
  return result;
}

async function fetchServerOrder(order) {
  if (!order.serverBacked || !order.orderViewToken) return order;
  const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, {
    headers: { Authorization: `Bearer ${order.orderViewToken}` },
  });
  if (!response.ok) throw new Error(await responseError(response));
  const result = await response.json();
  return cacheServerOrder(result.order, order.orderViewToken);
}

async function submitPaymentConfirmationToServer(order, payload) {
  if (!order?.serverBacked || !order.orderViewToken) {
    throw new Error("订单尚未同步到服务端，暂时无法提交付款信息。");
  }
  const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/payment-confirmation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${order.orderViewToken}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await responseError(response));
  const result = await response.json();
  return cacheServerOrder(result.order, order.orderViewToken);
}

async function syncUserOrders() {
  const cached = getOrders();
  const serverOrders = cached.filter((order) => order.serverBacked && order.orderViewToken);
  if (!serverOrders.length) return cached;

  const results = await Promise.allSettled(serverOrders.map(fetchServerOrder));
  const failedIds = new Set(
    results
      .map((result, index) => (result.status === "rejected" ? serverOrders[index].id : ""))
      .filter(Boolean),
  );

  if (failedIds.size) {
    const next = getOrders().map((order) =>
      failedIds.has(order.id) ? { ...order, syncStatus: "pending" } : order,
    );
    saveOrders(next);
  }
  return getOrders();
}

function updateOrder(orderId, updater) {
  const orders = getOrders();
  const next = orders.map((order) => (order.id === orderId ? { ...order, ...updater(order) } : order));
  saveOrders(next);
  return next.find((order) => order.id === orderId);
}

function getOrder(orderId) {
  return getOrders().find((order) => order.id === orderId);
}

function getAdminSecret() {
  return sessionStorage.getItem(ADMIN_SECRET_STORAGE_KEY) || "";
}

function setAdminSecret(secret) {
  sessionStorage.setItem(ADMIN_SECRET_STORAGE_KEY, secret);
}

function clearAdminSecret() {
  sessionStorage.removeItem(ADMIN_SECRET_STORAGE_KEY);
}

async function adminRequest(path, options = {}) {
  const secret = getAdminSecret();
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      "X-Admin-Secret": secret,
      ...(options.headers || {}),
    },
  });
  if (response.status === 401) clearAdminSecret();
  if (!response.ok) throw new Error(await responseError(response));
  return response.json();
}

async function fetchAdminOrders({ search = "", status = "" } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  const suffix = params.toString() ? `?${params}` : "";
  const result = await adminRequest(`/api/admin/orders${suffix}`);
  result.orders.forEach((order) => upsertCachedOrder({ ...order, serverBacked: true, syncStatus: "synced" }));
  return result.orders;
}

async function fetchAdminOrder(orderId) {
  const result = await adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}`);
  upsertCachedOrder({ ...result.order, serverBacked: true, syncStatus: "synced" });
  return result.order;
}

async function patchAdminOrder(orderId, update) {
  const result = await adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
  upsertCachedOrder({ ...result.order, serverBacked: true, syncStatus: "synced" });
  return result.order;
}
