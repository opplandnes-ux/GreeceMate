const app = document.querySelector("#app");
const COMPLIANCE_TEXT =
  "所有政府、银行、居留、物业、维修、票务相关服务，仅提供协助、预约、陪同、资料整理、提醒、核验和代缴协助，不承诺银行、政府、移民局、物业公司、供应商或第三方机构的最终结果。";
const BUYER_SERVICE_GOOGLE_SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbw4hGSztT7i_g3Kr8cgOeGu7rECxEuJfTqMf9vhHNQe5LoS220qAkvOYGu3mnD8XtpY/exec";
const BUYER_SERVICE_FALLBACK_EMAIL = "sunmixbn@gmail.com";
const WECHAT_PAYMENT_QR_PATH = "/assets/images/payment/wechat-pay-qr.jpg";
const WECHAT_PAYMENT_QR_CONFIGURED = true;
const PAYMENT_NOTICE =
  "GreeceMate 官网主要用于服务说明、需求提交和客服确认。部分标准服务可通过微信扫码支付预约金。付款后请备注订单号和邮箱，客服核对到账后更新订单状态。";

function icon(name) {
  const icons = {
    briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 6h4a2 2 0 0 1 2 2v1h4v11H4V9h4V8a2 2 0 0 1 2-2Z"/><path d="M8 9V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/><path d="M4 13h16"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 13 22 7 17 6 13 10 5 7 3 9l7 5-4 4 2 2 4-4 5 7 2-2-3-8Z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  };
  return icons[name] || icons.shield;
}

function route() {
  let path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/index.html") path = "/";
  if (path === "/buyer-service.html") path = "/buyer-service";
  return { path, params: new URLSearchParams(window.location.search) };
}

function navigate(path, { replace = false } = {}) {
  if (replace) {
    window.history.replaceState({}, "", path);
  } else {
    window.history.pushState({}, "", path);
  }
  render();
}

function pageTitle(path) {
  if (path === "/") return "希友帮｜GreeceMate｜中国人在希腊的本地服务助手";
  if (path === "/buyer-service") return "GreeceMate Buyer Service｜希腊自选房源购房买方代表服务";
  if (path === "/services") return "GreeceMate 服务列表｜希友帮";
  if (path === "/orders") return "我的订单｜GreeceMate";
  if (path === "/contact") return "联系客服｜GreeceMate";
  if (path.startsWith("/services/")) {
    const service = SERVICES.find((item) => item.id === path.split("/")[2]);
    return service ? `${service.name}｜GreeceMate` : "页面未找到｜GreeceMate";
  }
  if (path.startsWith("/order/")) return "提交服务需求｜GreeceMate";
  if (path === "/order-success") return "订单提交成功｜GreeceMate";
  if (path.startsWith("/admin")) return "后台订单管理｜GreeceMate";
  return "页面未找到｜GreeceMate";
}

function normalizeLegacyRoute() {
  if (!window.location.hash.startsWith("#/")) return;
  const legacyPath = window.location.hash.slice(1);
  window.history.replaceState({}, "", legacyPath);
}

function mobileNavState(target) {
  const { path } = route();
  const active =
    target === "/"
      ? path === "/"
      : target === "/services"
        ? path === "/services" || path.startsWith("/services/") || path.startsWith("/order/")
        : path === target;
  return active ? 'class="active" aria-current="page"' : "";
}

function setMobileMenu(open) {
  const toggle = document.querySelector(".mobile-menu-toggle");
  document.body.classList.toggle("mobile-menu-open", open);
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "关闭导航菜单" : "打开导航菜单");
  }
}

function shell(content) {
  document.body.classList.remove("mobile-menu-open");
  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="/">
          <span class="brand-mark">希</span>
          <span>
            <span class="brand-title">${BRAND.fullName}</span>
            <span class="brand-sub">${BRAND.slogan}</span>
          </span>
        </a>
        <nav class="nav" aria-label="主要导航">
          <a href="/buyer-service">Buyer Service / 买方代表</a>
          <a href="/services">服务</a>
          <a href="/orders">我的订单</a>
          <a href="/contact">联系客服</a>
        </nav>
        <button class="mobile-menu-toggle" type="button" aria-controls="mobile-nav" aria-expanded="false" aria-label="打开导航菜单">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </header>
      <button class="mobile-menu-backdrop" type="button" aria-label="关闭导航菜单"></button>
      <nav class="mobile-menu" id="mobile-nav" aria-label="移动端导航">
        <a href="/" ${mobileNavState("/")}>首页</a>
        <a href="/buyer-service" ${mobileNavState("/buyer-service")}>买方代表</a>
        <a href="/services" ${mobileNavState("/services")}>服务</a>
        <a href="/orders" ${mobileNavState("/orders")}>我的订单</a>
        <a href="/contact" ${mobileNavState("/contact")}>联系客服</a>
      </nav>
      ${content}
      ${bottomBar()}
      ${footer()}
    </div>
  `;
}

function footer() {
  return `
    <footer class="footer" id="contact">
      <div class="container footer-inner">
        <section class="footer-cta" aria-labelledby="footer-cta-title">
          <div class="footer-cta-copy">
            <h2 id="footer-cta-title">不确定该选哪个服务？</h2>
            <p>复杂问题可以先提交需求，由客服人工确认服务方式、时间和资料要求。</p>
          </div>
          <a class="primary-btn js-scroll" href="#footer-contact" data-scroll-target="footer-contact">加微信或 WhatsApp 咨询</a>
        </section>

        <div class="footer-grid">
          <section class="footer-brand-column" aria-label="品牌与公司信息">
            <div class="footer-brand">
              <span class="brand-mark">希</span>
              <span class="footer-brand-copy">
                <strong>${BRAND.fullName}</strong>
                <span>${BRAND.poweredBy}</span>
              </span>
            </div>
            <p class="footer-slogan">${BRAND.slogan}</p>
            <div class="footer-company-meta">
              <p>${BRAND.company}</p>
              <p>${BRAND.address}</p>
              <p>${BRAND.phone}</p>
              <p>${BRAND.email}</p>
              <p>${BRAND.domain}</p>
            </div>
          </section>

          <section class="footer-service-column" aria-labelledby="footer-service-title">
            <h3 id="footer-service-title">服务说明</h3>
            <p>本平台提供本地服务协助、预约、陪同、资料整理、提醒、核验和代缴协助。</p>
            <p>政府、银行、居留、物业、维修、票务等事项以相关机构或第三方最终要求为准。</p>
          </section>

          <section class="footer-contact-column" id="footer-contact" aria-labelledby="footer-contact-title">
            <h3 id="footer-contact-title">联系客服</h3>
            <div class="qr-row">
              <figure class="qr-card">
                <div class="qr-image-wrap"><img src="${BRAND.wechatQr}" alt="微信二维码" /></div>
                <figcaption>微信</figcaption>
              </figure>
              <figure class="qr-card">
                <div class="qr-image-wrap"><img src="${BRAND.whatsappQr}" alt="WhatsApp 二维码" /></div>
                <figcaption>WhatsApp</figcaption>
              </figure>
            </div>
            <div class="footer-contact-meta">
              <p>服务时间：周一至周六 09:30–18:30</p>
              <p>紧急服务：钥匙、漏水、停电停网等情况可先提交需求，由人工确认响应方式。</p>
            </div>
          </section>
        </div>
      </div>
    </footer>
  `;
}

function bottomBar() {
  return `
    <div class="mobile-bottom-bar">
      <a href="/contact">咨询客服</a>
      <a href="/orders">我的订单</a>
      <a class="strong" href="/services">立即下单</a>
    </div>
  `;
}

function supportUrgent(service) {
  return service.id === "pink-slip-reminder" ? "不建议加急" : "支持加急确认";
}

function serviceCta(service) {
  if (service.paymentMode === "external_platform") return "去平台下单";
  if (service.paymentMode === "manual_confirm" || service.paymentMode === "no_payment") return "提交需求";
  return service.cta || "立即下单";
}

function paymentStatusLabel(status) {
  return {
    unpaid: "未支付",
    pending_manual_check: "待核款",
    paid_external: "已通过微信支付付款",
    refunded_external: "已退款",
    cancelled: "已取消",
  }[status] || "未支付";
}

function paymentChannelLabel(channel) {
  return channel === "wechat_qr" ? "微信支付" : channel ? channel : "未提交";
}

function paymentStatusOptions(current) {
  return [
    ["unpaid", "未支付"],
    ["pending_manual_check", "待核款"],
    ["paid_external", "已通过微信支付付款"],
    ["refunded_external", "已退款"],
    ["cancelled", "已取消"],
  ]
    .map(([value, label]) => `<option value="${value}" ${value === current ? "selected" : ""}>${label}</option>`)
    .join("");
}

function paymentAmount(value) {
  return value === null || value === undefined || value === "" ? "待确认" : `¥${Number(value).toFixed(2).replace(/\.00$/, "")}`;
}

function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function paymentQrMarkup(className = "") {
  if (!WECHAT_PAYMENT_QR_CONFIGURED) {
    return `<div class="payment-qr-placeholder ${className}"><strong>企业微信收款码待配置</strong><span>请先联系客服确认付款方式</span></div>`;
  }
  return `<div class="payment-qr-wrap ${className}"><img src="${WECHAT_PAYMENT_QR_PATH}" alt="GreeceMate 企业微信预约金收款码" /></div>`;
}

function compactText(text, maxLength = 24) {
  if (!text || text.length <= maxLength) return text || "";
  return `${text.slice(0, maxLength)}...`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function serviceCard(service) {
  return `
    <article class="service-card">
      <div class="tag-list">
        <span class="tag gold">${service.priceType}</span>
        <span class="tag">${service.mode}</span>
      </div>
      <h3>${service.name}</h3>
      <p>${service.short}</p>
      <div class="service-meta">
        <div class="meta-box"><div class="meta-label">适合谁</div><div class="meta-value">${compactText(service.forWhom, 22)}</div></div>
        <div class="meta-box"><div class="meta-label">价格说明</div><div class="meta-value">${compactText(service.price, 22)}</div></div>
        <div class="meta-box"><div class="meta-label">预计处理时间</div><div class="meta-value">${compactText(service.time, 24)}</div></div>
        <div class="meta-box"><div class="meta-label">加急</div><div class="meta-value">${supportUrgent(service)}</div></div>
      </div>
      <div class="card-actions">
        <a class="ghost-btn" href="/services/${service.id}">查看详情</a>
        <a class="primary-btn" href="/order/${service.id}">${serviceCta(service)}</a>
      </div>
    </article>
  `;
}

function renderHome() {
  const popular = SERVICES.filter((service) => service.popular).slice(0, 6);
  shell(`
    <main>
      <section class="hero">
        <div class="container hero-inner">
          <div class="hero-copy">
            <span class="eyebrow">${BRAND.fullName}</span>
            <h1><span class="hero-title-line">中国人在希腊的</span><span class="hero-title-line">本地服务助手</span></h1>
            <p>从银行开户、税号申请、粉卡续期，到接送机、房屋收房、维修核验和希腊旅行安排，一站式在线下单。</p>
            <div class="hero-actions">
              <a class="primary-btn" href="/services">立即选择服务</a>
              <a class="ghost-btn" href="/contact">咨询客服</a>
              <span class="hero-help">不确定该选哪个服务？先咨询客服</span>
            </div>
          </div>
          <aside class="hero-panel">
            <h2>本地管家 + 专业服务平台</h2>
            <ul class="quick-list">
              <li>办事、管房、出行、身份维护集中入口。</li>
              <li>提交需求后由人工确认时间、资料和费用。</li>
              <li>不承诺第三方结果，只协助推进流程。</li>
            </ul>
          </aside>
        </div>
      </section>
      <div class="compliance-strip">
        <div class="container">合规提示：本平台提供协助、预约、陪同、资料整理和提醒服务，具体结果以相关机构或第三方最终要求为准。</div>
      </div>
      <section class="section service-entry">
        <div class="container">
          <div class="section-head">
            <div>
              <h2>选择你现在最需要的服务</h2>
              <p class="section-desc">五大入口覆盖中国客户在希腊最常见的办事、管房、出行和应急场景。</p>
            </div>
          </div>
          <a class="buyer-feature-card" href="/buyer-service">
            <div>
              <span class="tag gold">GreeceMate Buyer Service</span>
              <h3>自选房源安心购｜GreeceMate Buyer Service</h3>
              <p>你可以自己选房，但不要自己承担希腊购房、黄金签证和交付全过程的风险。我们站在买方一侧，协助你做房源初筛、尽调协调、交易护航和资产落地。</p>
              <div class="tag-list">
                ${["房源初筛", "视频看房", "市场价格评估", "法律与技术尽调协调", "黄金签证资格判断", "定金协议审核", "交易付款节点控制", "黄金签证申请协助", "房屋交付与资产管理衔接"].map((item) => `<span class="tag">${item}</span>`).join("")}
              </div>
            </div>
            <span class="primary-btn">查看买方代表服务</span>
          </a>
          <div class="grid categories">
            ${CATEGORIES.map(
              (category) => `
              <a class="card category-card" href="/services?category=${category.id}">
                <span class="icon-box">${icon(category.icon)}</span>
                <h3>${category.title}</h3>
                <p>${category.summary}</p>
                <div class="tag-list">${category.items.slice(0, 4).map((item) => `<span class="tag">${item}</span>`).join("")}</div>
              </a>
            `,
            ).join("")}
          </div>
          ${contactBand("不确定该选哪个服务？先咨询客服", "复杂问题请先提交需求，由客服人工确认服务方式、时间和资料要求。")}
        </div>
      </section>
      <section class="section alt">
        <div class="container">
          <div class="section-head">
            <div>
              <h2>热门服务推荐</h2>
              <p class="section-desc">优先展示高频服务，方便客户快速进入下单流程。</p>
            </div>
            <a class="plain-btn" href="/services">查看全部</a>
          </div>
          <div class="grid three">${popular.map(serviceCard).join("")}</div>
          ${contactBand("复杂问题请先提交需求，由客服人工确认", "政府、银行、居留相关事项以相关机构最终要求为准。")}
        </div>
      </section>
      <section class="section">
        <div class="container grid three">
          <div class="card"><h3>为什么选择我们</h3><p>长期服务希腊本地 VIP 客户，熟悉房产维护、办事陪同、出行安排和跨语言沟通。</p></div>
          <div class="card"><h3>服务流程</h3><p>选择服务、提交需求、客服确认、报价或预约、付款占位、派单执行、客户确认。</p></div>
          <div class="card"><h3>合规说明</h3><p>平台提供协助和信息整理，不对政府、银行、供应商或第三方结果作承诺。</p></div>
        </div>
      </section>
    </main>
  `);
}

function contactBand(title, text) {
  return `
    <div class="contact-band">
      <div>
        <strong>${title}</strong>
        <p>${text}</p>
      </div>
      <a class="primary-btn js-scroll" href="#contact" data-scroll-target="contact">加微信或 WhatsApp 咨询</a>
    </div>
  `;
}

const BUYER_PAIN_POINTS = [
  "产权是否安全？",
  "技术文件是否一致？",
  "当前用途是住宅、商铺，还是待转换状态？",
  "是否已经满足黄金签证要求？",
  "定金支付后，房源是否真正被锁定？",
  "律师、工程师、公证员、中介、开发商之间，谁替客户统筹？",
  "买完以后，税务、出租、续卡、资产管理由谁跟进？",
];

const BUYER_FLOW = [
  "选房",
  "房源初筛",
  "视频看房",
  "市场评估",
  "法律与技术尽调",
  "黄金签证资格判断",
  "定金与交易条件审核",
  "合同签署与付款节点控制",
  "产权登记",
  "黄金签证申请",
  "指纹与取卡",
  "房屋交付",
  "资产管理衔接",
];

const BUYER_FLOW_GROUPS = [
  { title: "第一阶段：判断阶段", steps: BUYER_FLOW.slice(0, 4) },
  { title: "第二阶段：交易阶段", steps: BUYER_FLOW.slice(4, 9) },
  { title: "第三阶段：落地阶段", steps: BUYER_FLOW.slice(9) },
];

const BUYER_PACKAGES = [
  {
    name: "套餐一：自选房源初筛服务",
    fit: "刚开始看房、还未确定房源的客户。",
    items: ["黄金签证购房路径咨询", "家庭成员资格预审", "三套自选房源初筛", "一次远程视频看房", "一份购房移民费用预算", "一次买方顾问会议"],
    price: "€1,280 起 / 家庭",
    cta: "提交房源初筛",
  },
  {
    name: "套餐二：房源尽调决策服务",
    fit: "已经看中一套房，准备支付定金或进入尽调的客户。",
    items: ["自选房源初筛", "远程视频看房", "市场价格评估", "法律与技术尽调协调", "技术文件审查协调", "黄金签证资格判断", "商改住专项审查", "定金协议审核", "尽调报告中文解读", "买方风险清单", "是否推进购买建议"],
    price: "€3,880 起 / 套",
    cta: "预约尽调咨询",
  },
  {
    name: "套餐三：购房交易护航服务",
    fit: "已经决定购买，需要完成定金、合同、付款、登记的客户。",
    items: ["房源尽调决策服务全部内容", "Reservation Agreement 协调", "交易条件设计", "付款节点控制", "律师沟通与流程监督", "授权文件协助", "税号办理协助", "银行开户资料协助", "公证签约协调", "土地登记 / 地籍登记跟进", "产权文件整理", "数字化文件归档"],
    price: "€6,480 起 / 套；复杂房源或商改住项目 €8,800 起 / 套",
    cta: "了解交易护航",
  },
  {
    name: "套餐四：黄金签证申请协助服务",
    fit: "已经完成购房，准备办理希腊黄金签证的客户。",
    items: ["黄金签证申请材料清单", "家庭成员资料整理", "购房文件整理", "付款凭证整理", "保险办理协助", "移民律师递交流程协调", "蓝纸获取跟进", "全家赴希腊签证协助", "指纹预约与陪同", "居留卡领取跟进"],
    price: "€5,180 起 / 家庭",
    cta: "咨询申请协助",
  },
  {
    name: "套餐五：全程安心购服务",
    fit: "客户想自己选房，但希望从筛查、购房、签证到交付和资产管理全程托管。",
    items: ["自选房源初筛服务", "房源尽调决策服务", "购房交易护航服务", "黄金签证申请协助服务", "房屋交付验收", "水电账户转移协助", "首次登陆接待基础服务", "产权文件归档", "年度资产体检一次", "ARC 资产管理导入评估一次"],
    price: "€11,500 起 / 家庭；复杂全程安心购 €14,000 起 / 家庭",
    cta: "预约全程服务咨询",
  },
];

const BUYER_EXTENSION_SERVICE = {
  name: "黄金签证续卡申请协助",
  fit: "已经持有希腊黄金签证，准备办理续卡的家庭。",
  items: ["黄金签证申请协助", "黄金签证续卡提醒", "黄金签证续卡材料整理协助", "房屋交付后资产管理衔接", "水电账户转移协助", "租赁前房屋状态体检", "ARC 长期资产服务衔接"],
  price: "€1,280 起 / 家庭",
  note: "具体报价根据家庭成员人数、文件状态、是否需要补充材料和实际服务范围确认。",
  cta: "咨询续卡申请协助",
};

function renderBuyerService() {
  shell(`
    <main>
      ${buyerHero()}
      <section class="section buyer-value-section">
        <div class="container buyer-value-shell">
          <div class="buyer-value-intro">
            <div class="buyer-value-copy">
              <h2>自己选到房，也需要有人站在买方一侧控风险</h2>
              <p class="section-desc">希腊购房与黄金签证链路很长，真正的风险往往发生在定金、尽调、付款、登记和交付之间。</p>
              <div class="buyer-role-note">
                <span class="tag gold">Buyer Representative</span>
                <h3>我们不是传统中介，而是客户侧买方代表</h3>
                <p>GreeceMate Buyer Service 的角色不是替客户决定买哪套房，而是站在买方一侧，帮助客户判断房源风险、交易条件、付款节点、黄金签证适配性和后续资产落地路径。</p>
              </div>
            </div>
            <div class="buyer-core-sentence">客户自选房源，我们负责安全成交与长期护航。</div>
          </div>
          <div class="buyer-risk-grid" aria-label="买方风险检查清单">
            ${BUYER_PAIN_POINTS.map((item) => `<div class="buyer-risk-item"><span class="dot-mini" aria-hidden="true"></span><span>${item}</span></div>`).join("")}
          </div>
        </div>
      </section>
      <section class="section" id="buyer-flow">
        <div class="container">
          <div class="section-head">
            <div>
              <h2>服务流程</h2>
              <p class="section-desc">从客户自选房源开始，到签证、交付和资产管理衔接，逐节点控制风险。</p>
            </div>
          </div>
          <div class="buyer-flow-groups">${buyerFlowGroups()}</div>
        </div>
      </section>
      <section class="section alt" id="buyer-packages">
        <div class="container">
          <div class="section-head">
            <div>
              <h2>服务套餐与公开起价</h2>
              <p class="section-desc">所有价格均为对外公开起价。最终报价根据房源复杂程度、家庭成员数量、项目所在区域、是否涉及商改住、文件整改和实际服务范围确认。</p>
            </div>
          </div>
          <div class="grid buyer-package-grid">${BUYER_PACKAGES.map(packageCard).join("")}</div>
          <div class="notice" style="margin-top:16px">页面展示价格均为服务费起价，不含律师费、工程师费、公证费、土地登记费、政府申请费、翻译费、评估费、保险费、银行费用、税费、差旅费及其他第三方费用。最终报价根据房源复杂程度、家庭成员数量、项目所在区域、是否涉及商改住、文件整改和实际服务范围确认。</div>
          <div class="buyer-extension">
            <div class="section-head">
              <div>
                <h2>后续延伸服务</h2>
                <p class="section-desc">面向已完成购房和身份申请后的长期维护需求，与前面的五个主套餐分开展示。</p>
              </div>
            </div>
            ${extensionServiceCard(BUYER_EXTENSION_SERVICE)}
          </div>
        </div>
      </section>
      <section class="section">
        <div class="container">
          <div class="section-head">
            <div>
              <h2>我们负责过程控制，不替代专业人士独立意见</h2>
              <p class="section-desc">买方代表服务的价值在于风险识别、流程监督、信息翻译和长期资产落地衔接。</p>
            </div>
          </div>
          ${buyerBoundary()}
        </div>
      </section>
      <section class="section alt" id="buyer-form">
        <div class="container detail-layout">
          ${buyerForm()}
          <aside class="card detail-block side-box">
            <h2>先提交一套房源，我们先判断三件事</h2>
            <ul class="clean-list advisor-list">
              <li>这套房是否值得继续推进；</li>
              <li>是否存在黄金签证适配风险；</li>
              <li>是否需要进入尽调或交易护航。</li>
            </ul>
            <div class="notice">提交房源信息不代表服务正式开始。正式服务以双方确认服务内容并签署服务协议为准。</div>
            <div class="card-actions" style="margin-top:16px"><a class="ghost-btn js-scroll" href="#contact" data-scroll-target="contact">加微信或 WhatsApp 咨询</a></div>
          </aside>
        </div>
      </section>
    </main>
  `);
  document.querySelector("#buyerServiceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    submitBuyerServiceLead(event.currentTarget);
  });
}

async function submitBuyerServiceLead(form) {
  const result = document.querySelector("#buyerFormResult");
  const submitButton = form.querySelector('button[type="submit"]');
  const formValues = Object.fromEntries(new FormData(form).entries());
  const payload = {
    ...formValues,
    name: formValues.buyerName || "",
    contact: formValues.buyerContact || "",
    wechat: formValues.buyerContact || "",
    whatsapp: formValues.buyerContact || "",
    email: formValues.buyerEmail || "",
    propertyLink: formValues.propertyLink || "",
    property_link: formValues.propertyLink || "",
    propertyAddress: formValues.propertyAddress || "",
    property_address: formValues.propertyAddress || "",
    budget: formValues.budget || "",
    goldenVisa: formValues.goldenVisaPlan || "",
    golden_visa: formValues.goldenVisaPlan || "",
    familyMembers: formValues.familySize || "",
    family_members: formValues.familySize || "",
    stage: formValues.buyerStage || "",
    currentStage: formValues.buyerStage || "",
    notes: formValues.buyerNote || "",
    message: formValues.buyerNote || "",
    remark: formValues.buyerNote || "",
    status: "新提交",
    leadStatus: "新提交",
    "状态": "新提交",
    formType: "buyerService",
    submittedAt: new Date().toISOString(),
    source: "GreeceMate Buyer Service",
    sourcePage: "buyer-service",
  };

  submitButton.disabled = true;
  submitButton.textContent = "正在提交...";
  result.textContent = "";

  try {
    const response = await submitOrderToServer(
      {
        ...payload,
        orderType: "buyerService",
        serviceId: "buyer-service",
        serviceName: "GreeceMate Buyer Service",
        customerName: payload.name,
        goldenVisaPlan: payload.goldenVisa,
        currentStage: payload.stage,
      },
      getSubmissionKey(form),
    );
    form.reset();
    delete form.dataset.submissionKey;
    result.textContent = `房源初筛申请已提交。订单号：${response.orderNumber}。团队将根据您提供的资料进行初步判断，并与您联系确认下一步服务方案。`;
  } catch (error) {
    result.textContent = error instanceof Error ? error.message : "订单提交失败，请稍后重试。";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "提交房源初筛申请";
  }
}

function formatBuyerServiceLead(payload) {
  const labels = {
    name: "姓名",
    contact: "微信 / WhatsApp",
    email: "邮箱",
    propertyLink: "房源链接",
    propertyAddress: "房源地址",
    budget: "预算",
    goldenVisa: "是否计划申请黄金签证",
    familyMembers: "家庭成员人数",
    stage: "当前阶段",
    notes: "备注",
    status: "状态",
    submittedAt: "提交时间",
    source: "来源",
    sourcePage: "来源页面",
  };
  return Object.keys(labels)
    .map((key) => `${labels[key]}：${payload[key] || "未填写"}`)
    .join("\n");
}

function buyerHero() {
  return `
    <section class="buyer-hero">
      <div class="container buyer-hero-inner">
        <div>
          <span class="eyebrow">GreeceMate Buyer Service</span>
          <h1>希腊自选房源购房买方代表服务</h1>
          <p class="buyer-hero-subtitle">覆盖房源尽调、交易护航、黄金签证申请与资产落地。</p>
          <p class="buyer-hero-note">客户可以自己选房，我们帮助客户判断这套房能不能买、值不值得买、是否支持黄金签证，以及如何安全完成定金、合同、付款、登记、申请和交付。</p>
          <div class="hero-actions">
            <a class="primary-btn js-scroll" href="#buyer-form" data-scroll-target="buyer-form">提交房源初筛</a>
            <a class="ghost-btn js-scroll" href="#buyer-packages" data-scroll-target="buyer-packages">查看服务套餐</a>
          </div>
        </div>
        <aside class="hero-panel">
          <h2>客户自己选房，我们负责尽调、交易、签证与资产落地护航。</h2>
          <ul class="quick-list">
            <li>房源筛查、视频看房、市场评估和尽调协调。</li>
            <li>定金协议、交易付款节点、公证签约与产权登记跟进。</li>
            <li>黄金签证申请协助、房屋交付和后续资产管理衔接。</li>
          </ul>
        </aside>
      </div>
    </section>
  `;
}

function buyerFlowGroups() {
  let stepNumber = 1;
  return BUYER_FLOW_GROUPS.map((group) => {
    const steps = group.steps
      .map((item) => `<div class="buyer-flow-step"><span>${stepNumber++}</span><strong>${item}</strong></div>`)
      .join("");
    return `
      <article class="buyer-flow-group">
        <h3>${group.title}</h3>
        <div class="buyer-flow">${steps}</div>
      </article>
    `;
  }).join("");
}

function packageCard(item) {
  const visibleItems = item.items.slice(0, 6);
  const hiddenItems = item.items.slice(6);
  return `
    <article class="card buyer-package-card">
      <div class="buyer-package-body">
        <h3>${item.name}</h3>
        <p><strong>适合：</strong>${item.fit}</p>
        <ul class="clean-list package-list-main">${visibleItems.map((entry) => `<li>${entry}</li>`).join("")}</ul>
        ${hiddenItems.length ? `<details class="package-more"><summary>展开全部服务内容 / 收起</summary><ul class="clean-list">${hiddenItems.map((entry) => `<li>${entry}</li>`).join("")}</ul></details>` : ""}
      </div>
      <div class="buyer-package-footer">
        <div class="buyer-price">${item.price}</div>
        <a class="primary-btn js-scroll" href="#buyer-form" data-scroll-target="buyer-form">${item.cta}</a>
      </div>
    </article>
  `;
}

function extensionServiceCard(item) {
  return `
    <article class="card buyer-extension-card">
      <div>
        <span class="tag gold">Residence Permit Renewal Service</span>
        <h3>${item.name}</h3>
        <p><strong>适合：</strong>${item.fit}</p>
        <ul class="clean-list">${item.items.map((entry) => `<li>${entry}</li>`).join("")}</ul>
        <p class="section-desc">${item.note}</p>
      </div>
      <div>
        <div class="buyer-price">${item.price}</div>
        <a class="primary-btn js-scroll" href="#buyer-form" data-scroll-target="buyer-form">${item.cta}</a>
      </div>
    </article>
  `;
}

function buyerBoundary() {
  const columns = [
    {
      title: "我们负责",
      items: ["从买方角度识别交易风险", "协调律师、工程师、评估师、公证员、银行等专业方", "将专业意见转化为客户可以理解的决策建议", "跟进交易节点、付款节点、签证节点和交付节点", "提供文件整理、流程监督和长期资产服务衔接"],
    },
    {
      title: "我们不替代",
      items: ["律师独立意见", "工程师技术结论", "会计师税务意见", "评估师估值报告", "政府审批决定", "银行开户、贷款或付款审核"],
    },
    {
      title: "重要说明",
      items: ["不承诺银行、政府、移民局、物业公司、供应商或第三方机构的最终结果。", "不承诺交易一定完成、签证一定获批、房源一定满足黄金签证要求。", "客户正式购买前，应以律师、工程师、会计师、公证员及政府机构的正式文件和意见为准。"],
    },
  ];
  return `<div class="grid three">${columns.map((column) => `<div class="card detail-block"><h3>${column.title}</h3><ul class="clean-list">${column.items.map((item) => `<li>${item}</li>`).join("")}</ul></div>`).join("")}</div>`;
}

function buyerForm() {
  return `
    <form class="form-panel" id="buyerServiceForm">
      <h2>提交一套房源，先做初步判断</h2>
      <div class="form-grid">
        ${field("姓名", "buyerName", "text", true)}
        ${field("微信 / WhatsApp", "buyerContact", "text", true)}
        ${field("邮箱", "buyerEmail", "email", true)}
        ${field("房源链接", "propertyLink", "url", false)}
        ${field("房源地址", "propertyAddress", "text", false)}
        ${field("预算", "budget", "text", false)}
        <div class="field"><label for="goldenVisaPlan">是否计划申请黄金签证</label><select id="goldenVisaPlan" name="goldenVisaPlan"><option value="">请选择</option><option>是</option><option>否</option><option>不确定</option></select></div>
        ${field("家庭成员人数", "familySize", "number", false)}
        <div class="field full"><label for="buyerStage">当前阶段</label><select id="buyerStage" name="buyerStage"><option>刚开始看房</option><option>已看中房源</option><option>准备付定金</option><option>已签协议</option><option>已购房需申请黄金签证</option></select></div>
        <div class="field full"><label for="buyerNote">备注</label><textarea id="buyerNote" name="buyerNote" placeholder="可补充房源情况、开发商/中介信息、交易时间压力或最担心的问题。"></textarea></div>
      </div>
      <div class="notice" style="margin-top:16px">页面展示价格均为服务费起价，不含律师费、工程师费、公证费、土地登记费、政府申请费、翻译费、评估费、保险费、银行费用、税费、差旅费及其他第三方费用。最终报价根据房源复杂程度、家庭成员数量、项目所在区域、是否涉及商改住、文件整改和实际服务范围确认。</div>
      <div class="notice" style="margin-top:12px">提交代表你理解：本服务为买方代表、流程协调和风险识别协助，不替代律师、工程师、会计师、评估师或政府审批决定。</div>
      <div class="card-actions" style="margin-top:18px"><button class="primary-btn" type="submit">提交房源初筛申请</button><a class="ghost-btn js-scroll" href="#contact" data-scroll-target="contact">联系人工顾问</a></div>
      <p id="buyerFormResult" class="form-result" aria-live="polite"></p>
    </form>
  `;
}

function renderServices() {
  const { params } = route();
  const active = params.get("category") || "all";
  const filtered = active === "all" ? SERVICES : SERVICES.filter((service) => service.categoryId === active);
  shell(`
    <main>
      <section class="services-hero">
        <div class="container">
          <div class="services-hero-copy">
            <h1>服务列表</h1>
            <p>按场景浏览服务，每项服务都标明服务方式、适合人群和价格展示方式。</p>
          </div>
          <div class="tabs">
            <a class="tab ${active === "all" ? "active" : ""}" href="/services">全部服务</a>
            ${CATEGORIES.map((category) => `<a class="tab ${active === category.id ? "active" : ""}" href="/services?category=${category.id}">${category.title}</a>`).join("")}
          </div>
        </div>
      </section>
      <section class="section services-grid-section">
        <div class="container">
          <div class="grid three" style="margin-top:18px">${filtered.map(serviceCard).join("")}</div>
        </div>
      </section>
    </main>
  `);
}

function detailList(title, items) {
  return `<section class="card detail-block"><h2>${title}</h2><ul class="clean-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul></section>`;
}

function renderServiceDetail(serviceId) {
  const service = SERVICES.find((item) => item.id === serviceId);
  if (!service) return renderNotFound();
  shell(`
    <main>
      <div class="container page-title">
        <span class="tag gold">${service.priceType}</span>
        <h1>${service.name}</h1>
        <p class="section-desc">${service.intro}</p>
      </div>
      <section class="section" style="padding-top:0">
        <div class="container detail-layout">
          <div>
            <section class="card detail-block">
              <h2>服务简介</h2>
              <p>${service.short}</p>
              <p><strong>适合人群：</strong>${service.forWhom}</p>
            </section>
            ${detailList("服务内容", service.includes)}
            ${detailList("不包含的内容", service.excludes)}
            ${detailList("所需资料", service.materials)}
            ${detailList("服务流程", service.process)}
            <section class="card detail-block"><h2>预计处理时间</h2><p>${service.time}</p></section>
            <section class="card detail-block"><h2>退款规则</h2><p>${service.refund}</p></section>
            <section class="card detail-block"><h2>风险与合规提示</h2><p>${service.compliance}</p><p>${COMPLIANCE_TEXT}</p><p>希友帮不替代律师、会计师或持证专业人员意见。</p></section>
          </div>
          <aside class="card detail-block side-box">
            <h2>价格说明</h2>
            <div class="price">${service.price}</div>
            <p>${service.deposit}</p>
            <div class="service-meta">
              <div class="meta-box"><div class="meta-label">服务方式</div><div class="meta-value">${service.mode}</div></div>
              <div class="meta-box"><div class="meta-label">展示方式</div><div class="meta-value">${service.priceType}</div></div>
              <div class="meta-box"><div class="meta-label">预计时间</div><div class="meta-value">${service.time}</div></div>
              <div class="meta-box"><div class="meta-label">加急</div><div class="meta-value">${supportUrgent(service)}</div></div>
            </div>
            <div class="card-actions" style="margin-top:16px">
              <a class="primary-btn" href="/order/${service.id}">${serviceCta(service)}</a>
              <a class="ghost-btn" href="/services?category=${service.categoryId}">返回列表</a>
            </div>
          </aside>
        </div>
      </section>
    </main>
  `);
}

function renderOrderForm(serviceId) {
  const service = SERVICES.find((item) => item.id === serviceId) || SERVICES[0];
  const category = CATEGORIES.find((item) => item.id === service.categoryId);
  shell(`
    <main>
      <div class="container page-title">
        <h1>提交服务需求</h1>
        <p class="section-desc">当前选择：${service.name}。提交后客服会先确认服务边界、时间和报价说明。</p>
      </div>
      <section class="section" style="padding-top:0">
        <div class="container detail-layout">
          <form class="form-panel" id="orderForm">
            <div class="form-grid">
              ${field("姓名", "name", "text", true)}
              ${field("微信号", "wechat", "text", true)}
              ${field("WhatsApp", "whatsapp", "text", false)}
              ${field("邮箱", "email", "email", true)}
              ${field("当前所在国家", "country", "text", true, "中国 / 希腊 / 其他")}
              ${field("希腊城市 / 区域", "city", "text", true, "例如 Athens, Piraeus, Glyfada")}
              ${field("希望服务时间", "preferredTime", "datetime-local", true)}
              <div class="field">
                <label for="serviceType">服务类型</label>
                <select id="serviceType" name="serviceType" required>
                  ${SERVICES.map((item) => `<option value="${item.name}" ${item.id === service.id ? "selected" : ""}>${item.name}</option>`).join("")}
                </select>
              </div>
              <div class="field"><label for="urgent">是否加急</label><select id="urgent" name="urgent"><option>否</option><option>是</option></select></div>
              <div class="field"><label for="chineseCompanion">是否需要中文陪同</label><select id="chineseCompanion" name="chineseCompanion"><option>是</option><option>否</option></select></div>
              <div class="field"><label for="uploadNeeded">是否需要上传资料</label><select id="uploadNeeded" name="uploadNeeded"><option>否</option><option>是</option></select></div>
              <div class="field full"><label for="description">需求描述</label><textarea id="description" name="description" required placeholder="请说明服务背景、地址、时间、人数、资料状态或需要我们重点关注的问题。"></textarea></div>
              <div class="field full"><label for="note">备注</label><textarea id="note" name="note" placeholder="如有特殊情况可在这里补充。"></textarea></div>
            </div>
            <input type="hidden" name="serviceId" value="${service.id}" />
            <div class="notice" style="margin-top:16px">提交代表你理解：${COMPLIANCE_TEXT}</div>
            <div class="card-actions" style="margin-top:18px">
              <button class="primary-btn" type="submit">提交订单</button>
              <a class="ghost-btn" href="/services/${service.id}">返回详情</a>
            </div>
            <p id="orderFormResult" class="form-result" aria-live="polite"></p>
          </form>
          <aside class="order-side-stack side-box">
            <section class="card detail-block">
              <h2>${service.name}</h2>
              <p>${service.short}</p>
              <div class="price">${service.price}</div>
              <p>${service.deposit}</p>
              <div class="notice">${COMPLIANCE_TEXT}</div>
            </section>
            ${renderPreSubmitPaymentCard(service)}
          </aside>
        </div>
      </section>
    </main>
  `);
  document.querySelector("#orderForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const result = document.querySelector("#orderFormResult");
    const submitButton = formElement.querySelector('button[type="submit"]');
    const form = new FormData(formElement);
    const formValues = Object.fromEntries(form.entries());
    const payload = buildServiceOrderPayload(formValues, service, category);

    submitButton.disabled = true;
    submitButton.textContent = "正在提交...";
    result.textContent = "";

    try {
      const submitted = await submitServiceOrder(payload, getSubmissionKey(formElement));
      delete formElement.dataset.submissionKey;
      navigate(`/order-success?order=${submitted.orderId}`);
      return;
    } catch (error) {
      result.textContent = error instanceof Error ? error.message : "订单提交失败，请稍后重试。";
    }

    submitButton.disabled = false;
    submitButton.textContent = "提交订单";
  });
}

function renderPreSubmitPaymentCard(service) {
  if (service.paymentMode !== "wechat_qr_deposit") {
    return `
      <section class="card detail-block payment-card manual-payment-card">
        <span class="tag gold">人工确认</span>
        <h2>客服确认后付款</h2>
        <p>本服务需客服确认服务范围和预约金金额。客服确认后将提供付款方式。</p>
        <a class="ghost-btn" href="/contact">联系客服</a>
      </section>
    `;
  }
  return `
    <section class="card detail-block payment-card">
      <span class="tag gold">微信预约金</span>
      <h2>支付预约金</h2>
      <div class="payment-due">应付预约金：<strong>${paymentAmount(service.depositCNY)}</strong></div>
      <p><strong>订单号：</strong>提交订单后生成</p>
      ${paymentQrMarkup("payment-qr-small")}
      <p>请使用微信扫码支付预约金。付款备注请填写订单号 + 邮箱，方便客服核对。</p>
      <p class="payment-example">示例：GM-20260629-8K4P2M + abc@email.com</p>
      <div class="card-actions">
        <button class="primary-btn" type="button" disabled>提交订单后付款</button>
        <a class="ghost-btn" href="/contact">联系客服</a>
      </div>
    </section>
  `;
}

function buildServiceOrderPayload(formValues, service, category) {
  const submittedAt = new Date().toISOString();
  return {
    ...formValues,
    orderType: "serviceOrder",
    serviceId: service.id,
    formType: "serviceOrder",
    submittedAt,
    serviceCategory: category ? category.title : "",
    serviceName: service.name,
    servicePrice: service.price,
    paymentMode: service.paymentMode,
    depositCNY: service.depositCNY,
    amountEURReference: service.amountEURReference,
    customerName: formValues.name || "",
    contact: [formValues.wechat, formValues.whatsapp].filter(Boolean).join(" / "),
    email: formValues.email || "",
    phone: "",
    serviceAddress: [formValues.country, formValues.city].filter(Boolean).join(" / "),
    preferredTime: formValues.preferredTime || "",
    urgent: formValues.urgent || "否",
    notes: formValues.note || "",
    source: `${window.location.pathname}${window.location.search}`,
    sourcePage: window.location.href,
    status: "新提交",
    leadStatus: "新提交",
    "状态": "新提交",
  };
}

async function submitServiceOrder(payload, idempotencyKey) {
  return submitOrderToServer(payload, idempotencyKey);
}

function openServiceOrderFallbackEmail(payload) {
  const subject = encodeURIComponent("【GreeceMate Service Order】服务下单需求");
  const body = encodeURIComponent(formatServiceOrder(payload));
  window.location.href = `mailto:${BUYER_SERVICE_FALLBACK_EMAIL}?subject=${subject}&body=${body}`;
}

function formatServiceOrder(payload) {
  const labels = {
    submittedAt: "提交时间",
    serviceCategory: "服务分类",
    serviceName: "服务名称",
    servicePrice: "服务价格",
    customerName: "客户姓名",
    contact: "微信 / WhatsApp",
    email: "邮箱",
    phone: "电话",
    serviceAddress: "房源地址 / 服务地址",
    preferredTime: "期望服务时间",
    urgent: "是否加急",
    notes: "备注",
    sourcePage: "来源页面",
    status: "状态",
  };
  return Object.keys(labels)
    .map((key) => `${labels[key]}：${payload[key] || "未填写"}`)
    .join("\n");
}

function field(label, name, type, required, placeholder = "") {
  return `
    <div class="field">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="${type}" ${required ? "required" : ""} placeholder="${placeholder}" />
    </div>
  `;
}

function renderOrderSuccess() {
  const order = getOrder(route().params.get("order"));
  if (!order) return renderNotFound();
  const canPay = order.paymentMode === "wechat_qr_deposit";
  const payment = order.payment || {};
  const pendingCheck = order.paymentStatus === "pending_manual_check";
  shell(`
    <main>
      <section class="section">
        <div class="container">
          <div class="card success-box">
            <div class="success-mark">✓</div>
            <h1>需求已提交</h1>
            <p>订单号：<strong>${escapeHtml(order.orderNumber || order.id)}</strong></p>
            <p>当前状态：${pendingCheck ? "待核款" : canPay ? "待支付预约金" : escapeHtml(order.status)}</p>
            <p>客服会根据你提交的信息确认服务时间、资料要求和费用说明。</p>
          </div>
          <div class="grid two" style="margin-top:16px">
            <section class="card detail-block">
              <h2>订单确认</h2>
              <p><strong>服务名称：</strong>${order.serviceName}</p>
              <p><strong>预约金额 / 待报价：</strong>${order.priceText}</p>
              <p><strong>用户信息：</strong>${escapeHtml(order.customer.name)}，${escapeHtml(order.customer.wechat)}，${escapeHtml(order.customer.email)}</p>
              <p><strong>服务说明：</strong>本订单为服务需求提交，费用和时间需经客服确认。</p>
              <p><strong>免责声明：</strong>${COMPLIANCE_TEXT}</p>
            </section>
            ${canPay ? renderOrderPaymentModule(order) : renderManualPaymentModule(order)}
          </div>
        </div>
      </section>
    </main>
  `);

  const copyButton = document.querySelector("#copyOrderNumber");
  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(order.orderNumber || order.id);
        copyButton.textContent = "已复制订单号";
      } catch {
        copyButton.textContent = `订单号：${order.orderNumber || order.id}`;
      }
    });
  }

  const paymentForm = document.querySelector("#paymentConfirmationForm");
  if (paymentForm) {
    paymentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const result = document.querySelector("#paymentConfirmationResult");
      const button = form.querySelector('button[type="submit"]');
      const data = Object.fromEntries(new FormData(form).entries());
      button.disabled = true;
      button.textContent = "正在提交...";
      result.textContent = "";
      try {
        await submitPaymentConfirmationToServer(order, {
          paymentChannel: "wechat_qr",
          paymentAmountCNY: data.paymentAmountCNY,
          paymentReportedAt: data.paymentReportedAt,
          paymentTradeNo: data.paymentTradeNo,
          paymentRemark: data.paymentRemark,
          email: data.email,
        });
        result.textContent = "付款信息已提交。客服核对到账后，会更新订单状态。";
        setTimeout(() => renderOrderSuccess(), 700);
      } catch (error) {
        result.textContent = error instanceof Error ? error.message : "付款信息提交失败，请稍后重试。";
        button.disabled = false;
        button.textContent = "提交付款信息";
      }
    });
  }
}

function renderOrderPaymentModule(order) {
  const payment = order.payment || {};
  const alreadySubmitted = order.paymentStatus === "pending_manual_check";
  const confirmed = order.paymentStatus === "paid_external";
  return `
    <section class="card detail-block payment-card order-payment-card">
      <span class="tag ${confirmed ? "green" : "gold"}">${paymentStatusLabel(order.paymentStatus)}</span>
      <h2>微信预约金付款</h2>
      <div class="payment-due">应付预约金：<strong>${paymentAmount(order.depositCNY)}</strong></div>
      <p><strong>订单号：</strong>${escapeHtml(order.orderNumber || order.id)}</p>
      ${paymentQrMarkup()}
      <p>请使用微信扫码支付。付款备注请填写订单号 + 邮箱。</p>
      <p class="payment-example">${escapeHtml(order.orderNumber || order.id)} + ${escapeHtml(order.customer.email || "你的邮箱")}</p>
      <p class="mobile-payment-tip">手机端可长按二维码识别付款。付款前请先复制订单号。</p>
      <p class="payment-proof-reminder">付款后请保留微信账单截图，并在“我已付款”中填写微信交易单号、付款时间和金额。客服核对到账后更新订单状态。</p>
      <div class="card-actions">
        <button class="ghost-btn" id="copyOrderNumber" type="button">复制订单号</button>
        <a class="ghost-btn" href="/contact">联系客服</a>
        <a class="ghost-btn" href="/orders">返回我的订单</a>
      </div>
      ${
        confirmed
          ? '<div class="notice payment-state-notice">付款已确认，客服将继续处理服务。</div>'
          : alreadySubmitted
            ? '<div class="notice payment-state-notice">付款信息已提交，客服正在核对到账。</div>'
            : renderPaymentConfirmationForm(order)
      }
      <div class="payment-policy">
        <p>${PAYMENT_NOTICE}</p>
        <p>网站服务价格以欧元为基准，人民币支付金额以页面显示或客服确认金额为准。最终服务费用根据服务范围、资料复杂度、第三方费用和实际执行情况确认。</p>
        <p>当前官网微信二维码付款为人工核款方式。支付状态以客服核对到账后的后台更新为准。</p>
      </div>
    </section>
  `;
}

function renderPaymentConfirmationForm(order) {
  return `
    <details class="payment-confirmation">
      <summary class="primary-btn">我已付款</summary>
      <form id="paymentConfirmationForm" class="form-grid">
        <div class="field"><label>订单号</label><input value="${escapeHtml(order.orderNumber || order.id)}" disabled /></div>
        <div class="field"><label for="paymentEmail">邮箱</label><input id="paymentEmail" name="email" type="email" value="${escapeHtml(order.customer.email || "")}" required /></div>
        <div class="field"><label>付款渠道</label><input value="微信支付" disabled /></div>
        <div class="field"><label for="paymentAmountCNY">付款金额（人民币）</label><input id="paymentAmountCNY" name="paymentAmountCNY" type="number" min="0.01" step="0.01" value="${escapeHtml(order.depositCNY || "")}" required /></div>
        <div class="field"><label for="paymentReportedAt">付款时间</label><input id="paymentReportedAt" name="paymentReportedAt" type="datetime-local" value="${localDateTimeValue()}" required /></div>
        <div class="field"><label for="paymentTradeNo">微信交易单号</label><input id="paymentTradeNo" name="paymentTradeNo" inputmode="numeric" pattern="[0-9]{10,64}" maxlength="64" required /><small>可在微信账单详情中查看，例如以 420000 开头的一串数字。</small></div>
        <div class="field full"><label for="paymentRemark">付款备注</label><input id="paymentRemark" name="paymentRemark" placeholder="选填：请填写付款时使用的备注" /></div>
        <div class="field full"><div class="notice payment-proof-note"><strong>付款截图：</strong>当前暂未启用截图上传，请保留微信账单截图，以便客服需要时核对。</div></div>
        <div class="field full"><button class="primary-btn" type="submit">提交付款信息</button></div>
      </form>
      <p id="paymentConfirmationResult" class="form-result" aria-live="polite"></p>
    </details>
  `;
}

function renderManualPaymentModule(order) {
  return `
    <section class="card detail-block payment-card manual-payment-card">
      <span class="tag gold">人工确认</span>
      <h2>客服确认后付款</h2>
      <p>本服务需客服确认服务范围和预约金金额。客服确认后将提供付款方式。</p>
      <p>网站服务价格以欧元为基准，人民币支付金额以页面显示或客服确认金额为准。</p>
      <div class="card-actions">
        <a class="primary-btn" href="/contact">联系客服</a>
        <a class="ghost-btn" href="/orders">返回我的订单</a>
      </div>
    </section>
  `;
}

function renderOrders() {
  shell(`
    <main>
      <div class="container page-title">
        <h1>我的订单状态</h1>
        <p class="section-desc">展示订单流转：新订单、确认、补资料、报价、付款、派单、执行、客户确认、完成或售后。</p>
      </div>
      <section class="section" style="padding-top:0">
        <div class="container" id="userOrdersList"><div class="card empty">正在同步订单状态...</div></div>
      </section>
    </main>
  `);
  syncUserOrders()
    .then((orders) => renderUserOrdersList(orders))
    .catch(() => renderUserOrdersList(getOrders(), true));
}

function renderUserOrdersList(orders, syncFailed = false) {
  const target = document.querySelector("#userOrdersList");
  if (!target) return;
  const pending = syncFailed || orders.some((order) => order.syncStatus === "pending");
  target.innerHTML = `
    ${pending ? '<div class="notice" style="margin-bottom:16px">服务端状态暂时无法同步，以下为本地缓存，状态待同步。</div>' : ""}
    ${orders.length ? orders.map(userOrderCard).join("") : `<div class="card empty">还没有订单。<a href="/services">去选择服务</a></div>`}
  `;
}

function userOrderCard(order) {
  const currentIndex = ORDER_STATUSES.indexOf(order.status);
  const payment = order.payment || {};
  const paymentMessage =
    order.paymentStatus === "pending_manual_check"
      ? "付款信息已提交，客服正在核对到账。"
      : order.paymentStatus === "paid_external"
        ? "付款已确认，客服将继续处理服务。"
        : order.paymentMode === "manual_confirm"
          ? "客服确认服务范围和金额后，将提供付款方式。"
          : "订单尚未提交付款信息。";
  return `
    <article class="card detail-block" style="margin-bottom:16px">
      <div class="section-head">
        <div>
          <span class="status-pill">${escapeHtml(order.status)}</span>
          <h2>${escapeHtml(order.serviceName)}</h2>
          <p>订单号：${escapeHtml(order.orderNumber || order.id)}｜提交时间：${new Date(order.createdAt).toLocaleString("zh-CN")}</p>
        </div>
      </div>
      <div class="order-payment-summary">
        <div><span>支付状态</span><strong>${paymentStatusLabel(order.paymentStatus)}</strong></div>
        <div><span>付款渠道</span><strong>${paymentChannelLabel(payment.channel)}</strong></div>
        <div><span>付款金额</span><strong>${paymentAmount(payment.amountCNY ?? order.depositCNY)}</strong></div>
        <p>${paymentMessage}</p>
        ${order.paymentMode === "wechat_qr_deposit" && order.paymentStatus === "unpaid" ? `<a class="primary-btn" href="/order-success?order=${encodeURIComponent(order.id)}">查看付款说明</a>` : ""}
      </div>
      <div class="timeline">
        ${ORDER_STATUSES.map((status, index) => {
          const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "";
          return `<div class="timeline-row ${state}"><span class="dot">${index + 1}</span><div class="timeline-content"><strong>${status}</strong></div></div>`;
        }).join("")}
      </div>
    </article>
  `;
}

function renderAdmin() {
  if (!getAdminSecret()) return renderAdminLogin("/admin");
  const { params } = route();
  const filter = params.get("filter") || "全部";
  const search = params.get("search") || "";
  shell(`
    <main>
      <div class="container page-title">
        <h1>后台订单管理</h1>
        <p class="section-desc">订单以服务端 D1 为准。当前管理员凭证为过渡方案，正式支付前将升级访问控制。</p>
      </div>
      <section class="section" style="padding-top:0">
        <div class="container admin-grid">
          <aside class="admin-panel">
            <h2>筛选</h2>
            <div class="filter-list">
              ${["全部", "新订单", "待处理", "执行中", "已完成", "已取消"].map((item) => `<a class="ghost-btn ${filter === item ? "active" : ""}" href="/admin?filter=${item}">${item}</a>`).join("")}
            </div>
            <form id="adminSearchForm" style="margin-top:16px">
            <div class="field"><label for="adminSearch">按订单号或客户搜索</label><input id="adminSearch" name="search" value="${escapeHtml(search)}" /></div>
              <button class="ghost-btn" type="submit">搜索</button>
            </form>
            <button class="ghost-btn" id="adminLogout" type="button" style="margin-top:12px">退出后台</button>
          </aside>
          <section class="admin-panel">
            <div class="section-head"><h2>订单列表</h2><a class="primary-btn" href="/services">创建测试订单</a></div>
            <div id="adminOrdersList" class="empty">正在读取服务端订单...</div>
          </section>
        </div>
      </section>
    </main>
  `);
  document.querySelector("#adminSearchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("search") || "";
    navigate(`/admin?filter=${encodeURIComponent(filter)}&search=${encodeURIComponent(value)}`);
  });
  document.querySelector("#adminLogout").addEventListener("click", () => {
    clearAdminSecret();
    renderAdminLogin("/admin");
  });
  fetchAdminOrders({ search })
    .then((orders) => renderAdminOrdersList(filterOrders(orders, filter)))
    .catch((error) => {
      if (!getAdminSecret()) return renderAdminLogin("/admin");
      renderAdminOrdersList(filterOrders(getOrders(), filter), error.message);
    });
}

function renderAdminLogin(returnPath) {
  shell(`
    <main>
      <section class="section">
        <div class="container" style="max-width:560px">
          <form class="form-panel" id="adminLoginForm">
            <h1>管理员登录</h1>
            <p class="section-desc">请输入 Cloudflare 中配置的管理员凭证。</p>
            <div class="field"><label for="adminSecret">管理员凭证</label><input id="adminSecret" name="adminSecret" type="password" required autocomplete="current-password" /></div>
            <button class="primary-btn" type="submit">进入后台</button>
            <p id="adminLoginResult" class="form-result" aria-live="polite"></p>
          </form>
        </div>
      </section>
    </main>
  `);
  document.querySelector("#adminLoginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const secret = String(new FormData(event.currentTarget).get("adminSecret") || "");
    setAdminSecret(secret);
    try {
      await fetchAdminOrders();
      navigate(returnPath, { replace: true });
    } catch (error) {
      clearAdminSecret();
      document.querySelector("#adminLoginResult").textContent = error instanceof Error ? error.message : "管理员凭证无效。";
    }
  });
}

function renderAdminOrdersList(orders, warning = "") {
  const target = document.querySelector("#adminOrdersList");
  if (!target) return;
  target.className = "";
  target.innerHTML = `
    ${warning ? `<div class="notice" style="margin-bottom:16px">服务端读取失败，当前显示本地缓存：${escapeHtml(warning)}</div>` : ""}
    ${
      orders.length
        ? `<div class="table-wrap"><table class="orders-table"><thead><tr><th>订单</th><th>客户</th><th>状态</th><th>负责人</th><th>操作</th></tr></thead><tbody>${orders
            .map(
              (order) => `<tr>
                <td><strong>${escapeHtml(order.serviceName)}</strong><br />${escapeHtml(order.orderNumber || order.id)}</td>
                <td>${escapeHtml(order.customer.name)}<br />${escapeHtml(order.customer.wechat || order.customer.contact || order.customer.email)}</td>
                <td><span class="status-pill">${escapeHtml(order.status)}</span>${order.admin?.urgent ? '<br /><span class="tag gold">加急</span>' : ""}<br /><span class="tag ${order.paymentStatus === "paid_external" ? "green" : order.paymentStatus === "pending_manual_check" ? "gold" : ""}">${paymentStatusLabel(order.paymentStatus)}</span>${order.notificationStatus === "failed" ? '<br /><span class="tag gold">通知失败</span>' : ""}</td>
                <td>${escapeHtml(order.admin?.owner || "未分派")}</td>
                <td><a class="ghost-btn" href="/admin/${order.id}">查看详情</a></td>
              </tr>`,
            )
            .join("")}</tbody></table></div>`
        : `<div class="empty">暂无符合条件的订单。</div>`
    }
  `;
}

function filterOrders(orders, filter) {
  if (filter === "全部") return orders;
  if (filter === "待处理") return orders.filter((order) => ["新订单", "待核款", "待确认", "待补资料", "已报价"].includes(order.status));
  if (filter === "执行中") return orders.filter((order) => ["已付款", "已派单", "执行中", "待客户确认", "售后处理中"].includes(order.status));
  return orders.filter((order) => order.status === filter);
}

function renderAdminDetail(orderId) {
  if (!getAdminSecret()) return renderAdminLogin(`/admin/${orderId}`);
  shell(`
    <main>
      <div class="container page-title">
        <h1>订单详情</h1>
        <p class="section-desc">服务端订单状态与处理记录</p>
      </div>
      <section class="section" style="padding-top:0">
        <div class="container" id="adminDetailContent"><div class="card empty">正在读取订单...</div></div>
      </section>
    </main>
  `);
  fetchAdminOrder(orderId)
    .then((order) => renderAdminDetailForm(order))
    .catch((error) => {
      const cached = getOrder(orderId);
      if (cached) renderAdminDetailForm(cached, `服务端读取失败，当前显示本地缓存：${error.message}`);
      else document.querySelector("#adminDetailContent").innerHTML = `<div class="card empty">${error.message}</div>`;
    });
}

function renderAdminDetailForm(order, warning = "") {
  const target = document.querySelector("#adminDetailContent");
  if (!target) return;
  const payment = order.payment || {};
  const adminPayment = order.admin?.payment || {};
  const hasExpectedAmount = order.depositCNY !== null && order.depositCNY !== undefined && order.depositCNY !== "";
  const hasReportedAmount = payment.amountCNY !== null && payment.amountCNY !== undefined && payment.amountCNY !== "";
  const paymentAmountMatches =
    hasExpectedAmount && hasReportedAmount
      ? Math.abs(Number(order.depositCNY) - Number(payment.amountCNY)) < 0.01
      : null;
  const amountMatchText = paymentAmountMatches === null ? "待提交 / 待核对" : paymentAmountMatches ? "一致" : "不一致";
  target.className = "container detail-layout";
  target.innerHTML = `
    <section class="form-panel">
      ${warning ? `<div class="notice" style="margin-bottom:16px">${escapeHtml(warning)}</div>` : ""}
      <h2>修改订单状态与派单</h2>
      <p class="section-desc">${escapeHtml(order.orderNumber || order.id)}｜${escapeHtml(order.serviceName)}</p>
      <form id="adminForm" class="form-grid">
        <div class="field"><label for="status">订单状态</label><select id="status" name="status">${ORDER_STATUSES.map((status) => `<option ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}</select></div>
        <div class="field"><label for="owner">分派负责人</label><select id="owner" name="owner"><option value="">未分派</option>${ADMIN_USERS.map((user) => `<option ${user === order.admin?.owner ? "selected" : ""}>${user}</option>`).join("")}</select></div>
        <div class="field"><label for="urgent">标记是否加急</label><select id="urgent" name="urgent"><option value="false" ${!order.admin?.urgent ? "selected" : ""}>否</option><option value="true" ${order.admin?.urgent ? "selected" : ""}>是</option></select></div>
        <div class="field"><label for="paymentStatus">支付状态</label><select id="paymentStatus" name="paymentStatus">${paymentStatusOptions(order.paymentStatus)}</select></div>
        <div class="field"><label>付款渠道</label><input value="${paymentChannelLabel(payment.channel)}" disabled /></div>
        <div class="field"><label>应收预约金</label><input value="${paymentAmount(order.depositCNY)}" disabled /></div>
        <div class="field"><label>客户填写付款金额</label><input value="${paymentAmount(payment.amountCNY)}" disabled /></div>
        <div class="field"><label>金额是否匹配</label><input value="${amountMatchText}" disabled /></div>
        <div class="field"><label>客户填写付款时间</label><input value="${escapeHtml(payment.reportedAt || "未提交")}" disabled /></div>
        <div class="field full"><label>微信交易单号</label><input value="${escapeHtml(payment.tradeNo || "未提交")}" disabled /></div>
        <div class="field full"><label>付款备注</label><input value="${escapeHtml(payment.remark || "未提交")}" disabled /></div>
        <div class="field full"><label>付款截图</label>${adminPayment.proofUrl ? `<a class="ghost-btn" href="${escapeHtml(adminPayment.proofUrl)}" target="_blank" rel="noopener">查看付款截图</a>` : '<input value="未上传（当前未启用截图上传）" disabled />'}</div>
        ${paymentAmountMatches === false ? '<div class="field full"><div class="notice payment-mismatch-notice">付款金额与应付预约金不一致，请人工核查。</div></div>' : ""}
        <div class="field"><label for="paymentReceivedAmountCNY">实际到账金额（人民币）</label><input id="paymentReceivedAmountCNY" name="paymentReceivedAmountCNY" type="number" min="0" step="0.01" value="${escapeHtml(adminPayment.receivedAmountCNY ?? "")}" /></div>
        <div class="field"><label for="paymentCheckedAt">核款 / 到账时间</label><input id="paymentCheckedAt" name="paymentCheckedAt" type="datetime-local" value="${escapeHtml(adminPayment.checkedAt ? localDateTimeValue(new Date(adminPayment.checkedAt)) : "")}" /></div>
        <div class="field"><label for="paymentCheckedBy">核款人</label><input id="paymentCheckedBy" name="paymentCheckedBy" value="${escapeHtml(adminPayment.checkedBy || order.admin?.owner || "")}" /></div>
        <div class="field full"><label for="paymentCheckNotes">核款备注</label><textarea id="paymentCheckNotes" name="paymentCheckNotes">${escapeHtml(adminPayment.checkNotes || "")}</textarea></div>
        <div class="field full"><label for="internalNote">内部备注</label><textarea id="internalNote" name="internalNote">${escapeHtml(order.admin?.internalNote || "")}</textarea></div>
        <div class="field full"><label for="result">服务结果说明</label><textarea id="result" name="result">${escapeHtml(order.admin?.result || "")}</textarea></div>
        <div class="field full"><button class="primary-btn" type="submit">保存修改</button></div>
      </form>
      <p id="adminFormResult" class="form-result" aria-live="polite"></p>
    </section>
    <aside class="card detail-block side-box">
      <h2>客户与需求</h2>
      <p><strong>客户：</strong>${escapeHtml(order.customer.name)}</p>
      <p><strong>微信：</strong>${escapeHtml(order.customer.wechat || order.customer.contact || "未填写")}</p>
      <p><strong>WhatsApp：</strong>${escapeHtml(order.customer.whatsapp || "未填写")}</p>
      <p><strong>邮箱：</strong>${escapeHtml(order.customer.email || "未填写")}</p>
      <p><strong>国家 / 城市：</strong>${escapeHtml(order.customer.country || "")} / ${escapeHtml(order.customer.city || "")}</p>
      <p><strong>希望时间：</strong>${escapeHtml(order.request.preferredTime || "未填写")}</p>
      <p><strong>中文陪同：</strong>${order.request.chineseCompanion ? "需要" : "不需要"}</p>
      <p><strong>上传资料：</strong>${order.request.uploadNeeded ? "需要" : "不需要"}</p>
      <p><strong>需求描述：</strong>${escapeHtml(order.request.description || "未填写")}</p>
      <p><strong>备注：</strong>${escapeHtml(order.request.note || "无")}</p>
      <div class="card-actions"><a class="ghost-btn" href="/admin">返回后台</a><a class="ghost-btn" href="/orders">用户状态页</a></div>
    </aside>
  `;
  document.querySelector("#adminForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const result = document.querySelector("#adminFormResult");
    try {
      await patchAdminOrder(order.id, {
        orderStatus: data.status,
        assignedTo: data.owner,
        isUrgent: data.urgent === "true",
        internalNotes: data.internalNote,
        resultNotes: data.result,
        paymentStatus: data.paymentStatus,
        paymentReceivedAmountCNY: data.paymentReceivedAmountCNY,
        paymentCheckedAt: data.paymentCheckedAt ? new Date(data.paymentCheckedAt).toISOString() : "",
        paymentCheckedBy: data.paymentCheckedBy,
        paymentCheckNotes: data.paymentCheckNotes,
      });
      result.textContent = "订单修改已保存并同步到服务端。";
      renderAdminDetail(order.id);
    } catch (error) {
      result.textContent = error instanceof Error ? error.message : "订单保存失败，请稍后重试。";
    }
  });
}

function renderNotFound() {
  shell(`<main><section class="section"><div class="container"><div class="card empty">页面未找到。<a href="/">返回首页</a></div></div></section></main>`);
}

function render() {
  const { path } = route();
  document.title = pageTitle(path);
  if (path === "/") return renderHome();
  if (path === "/buyer-service") return renderBuyerService();
  if (path === "/services") return renderServices();
  if (path.startsWith("/services/")) return renderServiceDetail(path.split("/")[2]);
  if (path.startsWith("/order/")) return renderOrderForm(path.split("/")[2]);
  if (path === "/order-success") return renderOrderSuccess();
  if (path === "/orders") return renderOrders();
  if (path === "/contact") {
    renderHome();
    window.requestAnimationFrame(() => document.getElementById("contact")?.scrollIntoView({ block: "start" }));
    return;
  }
  if (path === "/admin") return renderAdmin();
  if (path.startsWith("/admin/")) return renderAdminDetail(path.split("/")[2]);
  return renderNotFound();
}

app.addEventListener("click", (event) => {
  const menuToggle = event.target.closest(".mobile-menu-toggle");
  if (menuToggle) {
    event.preventDefault();
    setMobileMenu(menuToggle.getAttribute("aria-expanded") !== "true");
    return;
  }

  if (event.target.closest(".mobile-menu-backdrop")) {
    event.preventDefault();
    setMobileMenu(false);
    return;
  }

  if (event.target.closest(".mobile-menu a")) {
    setMobileMenu(false);
  }

  const link = event.target.closest(".js-scroll");
  if (link) {
    const targetId = link.dataset.scrollTarget;
    const target = targetId ? document.getElementById(targetId) : null;
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }

  const routeLink = event.target.closest('a[href^="/"]');
  if (!routeLink || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const destination = new URL(routeLink.href, window.location.origin);
  if (destination.origin !== window.location.origin) return;
  event.preventDefault();
  navigate(`${destination.pathname}${destination.search}${destination.hash}`);
  if (!destination.hash) window.scrollTo({ top: 0, behavior: "instant" });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMobileMenu(false);
});

window.addEventListener("popstate", render);
normalizeLegacyRoute();
render();
