/** Order lifecycle for storefront checkouts. */

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "shipped",
  "delivered",
  "archived",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Map legacy statuses from older rows. */
export function normalizeOrderStatus(status: string): OrderStatus {
  if (status === "seen") return "confirmed";
  if (status === "done") return "delivered";
  if ((ORDER_STATUSES as readonly string[]).includes(status)) {
    return status as OrderStatus;
  }
  return "new";
}

export function orderStatusLabel(
  status: string,
  locale: "fa" | "en",
): string {
  const s = normalizeOrderStatus(status);
  const map = {
    fa: {
      new: "جدید",
      confirmed: "تأیید شد",
      shipped: "ارسال شد",
      delivered: "تحویل شد",
      archived: "بایگانی",
    },
    en: {
      new: "New",
      confirmed: "Confirmed",
      shipped: "Shipped",
      delivered: "Delivered",
      archived: "Archived",
    },
  } as const;
  return map[locale][s];
}

export function orderStatusTone(
  status: string,
): "warning" | "accent" | "success" | "neutral" {
  const s = normalizeOrderStatus(status);
  if (s === "new") return "warning";
  if (s === "confirmed" || s === "shipped") return "accent";
  if (s === "delivered") return "success";
  return "neutral";
}

export function nextOrderStatus(status: string): OrderStatus | null {
  const s = normalizeOrderStatus(status);
  if (s === "new") return "confirmed";
  if (s === "confirmed") return "shipped";
  if (s === "shipped") return "delivered";
  return null;
}

export function nextOrderStatusLabel(
  next: OrderStatus,
  locale: "fa" | "en",
): string {
  const map = {
    fa: {
      confirmed: "تأیید سفارش",
      shipped: "علامت ارسال",
      delivered: "تحویل شد",
    },
    en: {
      confirmed: "Confirm",
      shipped: "Mark shipped",
      delivered: "Mark delivered",
    },
  } as const;
  if (next === "confirmed" || next === "shipped" || next === "delivered") {
    return map[locale][next];
  }
  return orderStatusLabel(next, locale);
}

/** Message seller can send to the customer for a status update. */
export function customerStatusMessage(input: {
  status: string;
  summary: string;
  brandName: string;
  locale: "fa" | "en";
}): string {
  const s = normalizeOrderStatus(input.status);
  const { summary, brandName, locale } = input;
  if (locale === "fa") {
    switch (s) {
      case "confirmed":
        return `سلام 👋 سفارش‌تون در ${brandName} تأیید شد.\n${summary}\nبه‌زودی خبر ارسال می‌دیم.`;
      case "shipped":
        return `سلام 🚚 سفارش‌تون از ${brandName} ارسال شد.\n${summary}\nاگر سوالی بود بگید.`;
      case "delivered":
        return `سلام ✅ امیدواریم از خریدتون راضی باشید.\n${summary}\n— ${brandName}`;
      default:
        return `سلام، درباره سفارش‌تون در ${brandName}:\n${summary}`;
    }
  }
  switch (s) {
    case "confirmed":
      return `Hi — your order at ${brandName} is confirmed.\n${summary}\nWe'll update you when it ships.`;
    case "shipped":
      return `Hi — your order from ${brandName} is on the way.\n${summary}`;
    case "delivered":
      return `Hi — hope you love your order from ${brandName}.\n${summary}`;
    default:
      return `Hi, about your order at ${brandName}:\n${summary}`;
  }
}

export function sellerNewOrderMessage(input: {
  brandName: string;
  summary: string;
  locale: "fa" | "en";
  orderId?: string;
}): string {
  if (input.locale === "fa") {
    return `🛍 سفارش جدید برای ${input.brandName}\n${input.summary}${
      input.orderId ? `\n#${input.orderId.slice(0, 8)}` : ""
    }`;
  }
  return `🛍 New order for ${input.brandName}\n${input.summary}${
    input.orderId ? `\n#${input.orderId.slice(0, 8)}` : ""
  }`;
}
