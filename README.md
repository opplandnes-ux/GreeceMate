# 希友帮｜GreeceMate MVP 原型

这是「希友帮｜GreeceMate｜中国人在希腊的本地服务助手」第一阶段 MVP。当前版本已加入 Cloudflare Pages Functions + D1 服务端订单层，页面仍可静态浏览，正式订单以 D1 为准。

## 品牌与域名

- 中文品牌：希友帮
- 英文品牌：GreeceMate
- 品牌组合：希友帮｜GreeceMate
- Slogan：中国人在希腊的本地服务助手
- 规划域名：GreeceMate.com

## 如何运行

仅查看静态页面可直接用浏览器打开：

```bash
open index.html
```

需要测试正式订单 API 时，请安装依赖、初始化本地 D1 并启动 Wrangler：

```bash
npm install
npm run d1:migrate:local
npm run dev
```

然后访问：

```text
http://localhost:8788
```

## 已实现页面

- 首页：品牌、主标题、副标题、CTA、五大服务入口、热门服务、选择理由、流程、合规说明和联系方式。
- Buyer Service 买方代表页：自选房源安心购入口、痛点、定位、流程、套餐、服务边界和房源初筛表单。
- 服务列表页：支持全部服务和五大分类筛选。
- 服务详情页：包含简介、适合人群、服务内容、不包含内容、所需资料、流程、时间、价格、退款规则和合规提示。
- 下单表单页：姓名、微信、WhatsApp、邮箱、国家、希腊城市、时间、服务类型、描述、加急、中文陪同、上传资料和备注。
- 订单提交成功页：显示订单信息、服务说明、免责声明和支付占位按钮。
- 用户订单状态页：展示 11 个订单状态流转。
- 后台订单管理页：订单列表、订单详情、修改状态、分派负责人、内部备注、加急、付款标记和服务结果说明。

## 项目结构

```text
xiyoubang-mvp/
├── index.html
├── buyer-service.html
├── buyer-service/
│   └── index.html
├── assets/
│   └── images/
│       ├── qr-wechat.png
│       └── qr-whatsapp.png
└── src/
    ├── app.js
    ├── data.js
    ├── orders.js
    └── styles.css
```

## 数据说明

12 个种子服务在 `src/data.js` 中维护：

1. 希腊机场接送服务
2. 希腊银行开户协助
3. 希腊 AFM 税号申请协助
4. 希腊数字身份与联系方式维护
5. 希腊黄金签证续期协助
6. 房屋出租前状态体检
7. 购房前房屋现场核验
8. 换中介前收房与资产交接
9. 上门维修核验与报价复核
10. 希腊房产税 / 电费 / 水费 / 物业费代缴协助
11. 希腊船票代订协助
12. 希腊自由行行程定制咨询

正式订单写入 Cloudflare D1。浏览器 `localStorage` 仅保存订单查看令牌和显示缓存，键名为：

```text
xiyoubang.orders.v1
```

## Cloudflare D1 部署配置

1. 在 Cloudflare 控制台创建 D1 数据库 `greecemate-orders`。
2. 在 GreeceMate Pages 项目的 Settings > Bindings 中添加 D1 binding，变量名必须为 `DB`。
3. 在 Pages Settings > Variables and Secrets 中添加加密变量：
   - `ORDER_TOKEN_SECRET`：至少 32 位随机字符；
   - `ADMIN_SECRET`：后台过渡期管理员凭证。
4. `GOOGLE_APPS_SCRIPT_ENDPOINT` 已保持为现有地址，可由环境变量覆盖，但不要更换现有生产 URL。
5. 使用 Cloudflare 控制台或已登录的 Wrangler 应用 `migrations/0001_orders.sql`。

生产环境不要提交 `.dev.vars`、真实密钥或数据库凭证。

## 后续接入建议

- 支付：将成功页的微信支付、支付宝、银行转账占位按钮替换为后端创建支付单接口。
- 数据库：把 `src/orders.js` 替换为 REST API 或 GraphQL 请求，数据库可选 PostgreSQL、MySQL 或 Supabase。
- Buyer Service 表单：当前提交到 Google Apps Script Web App，地址为 `https://script.google.com/macros/s/AKfycbw4hGSztT7i_g3Kr8cgOeGu7rECxEuJfTqMf9vhHNQe5LoS220qAkvOYGu3mnD8XtpY/exec`。线索默认状态为「新提交」，状态列建议使用「新提交、已联系、待补资料、已报价、已成交、已关闭」。页面展示对外欧元起价，最终报价按房源复杂程度、家庭成员数量、区域、商改住情况、文件整改和实际服务范围确认。
- 小程序：当前服务数据结构、订单字段和状态流转可直接迁移到微信小程序页面。
- 多语言：当前为简体中文，后续可把 `src/data.js` 中的展示文案迁移到 `i18n/zh-CN.json`、`i18n/en.json`、`i18n/el.json`。
- 淘宝入口：可把服务详情页作为外部客服承接页，淘宝店仅展示服务入口和客服引导，不承诺政府、银行或居留结果。

## Buyer Service 线索处理

- 每天固定负责人检查 `sunmixbn@gmail.com` 是否收到新线索邮件。
- 每天固定负责人检查 Google Sheet 中是否有「新提交」线索。
- 联系客户后，把状态改为「已联系」；需要补资料时改为「待补资料」；进入报价阶段改为「已报价」；成交后改为「已成交」；无效或结束线索改为「已关闭」。
- Google Sheet 中的 Codex 测试行仅用于字段映射验证，正式使用前建议删除，避免客服误处理。

## 合规自检

- 政府、银行、居留相关服务统一使用「协助、预约、陪同、资料整理、提醒、核验」等表达。
- 页面提示「以银行 / 政府 / 供应商最终要求为准」。
- 页面提示「不替代律师、会计师或持证专业人员意见」。
- 第一阶段未接入真实微信支付、支付宝、淘宝、地图定位或复杂权限系统。
