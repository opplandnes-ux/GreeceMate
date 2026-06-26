const ORDER_STORAGE_KEY = "xiyoubang.orders.v1";

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

function createOrder(payload) {
  const service = SERVICES.find((item) => item.id === payload.serviceId);
  const now = new Date();
  const order = {
    id: `XYB${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random()
      .toString(16)
      .slice(2, 7)
      .toUpperCase()}`,
    createdAt: now.toISOString(),
    status: "新订单",
    serviceId: payload.serviceId,
    serviceName: service ? service.name : payload.serviceType,
    priceText: service ? service.price : "待报价",
    customer: {
      name: payload.name,
      wechat: payload.wechat,
      whatsapp: payload.whatsapp,
      email: payload.email,
      country: payload.country,
      city: payload.city,
    },
    request: {
      preferredTime: payload.preferredTime,
      serviceType: payload.serviceType,
      description: payload.description,
      urgent: payload.urgent === "是",
      chineseCompanion: payload.chineseCompanion === "是",
      uploadNeeded: payload.uploadNeeded === "是",
      note: payload.note,
    },
    admin: {
      owner: "",
      internalNote: "",
      paid: false,
      urgent: payload.urgent === "是",
      result: "",
    },
  };

  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);
  return order;
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
