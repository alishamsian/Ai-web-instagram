export type AnalyticsInsight = {
  id: string;
  tone: "positive" | "neutral" | "action";
  titleFa: string;
  titleEn: string;
  bodyFa: string;
  bodyEn: string;
  href?: string;
};

export function buildAnalyticsInsights(input: {
  total: number;
  series: { date: string; count: number }[];
  byReferrer: { source: string; count: number }[];
  topProductViews: number;
  publishedCount: number;
  locale: "fa" | "en";
}): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];
  const sorted = [...input.series].sort((a, b) => a.date.localeCompare(b.date));
  const last3 = sorted.slice(-3);
  const prev3 = sorted.slice(-6, -3);
  const lastSum = last3.reduce((s, p) => s + p.count, 0);
  const prevSum = prev3.reduce((s, p) => s + p.count, 0);

  if (input.total === 0) {
    insights.push({
      id: "share",
      tone: "action",
      titleFa: "هنوز بازدیدی نیست",
      titleEn: "No visits yet",
      bodyFa: "لینک بیو یا QR را در اینستاگرام بگذار تا آمار شروع شود.",
      bodyEn: "Share your bio link or QR on Instagram to start collecting visits.",
      href: "dashboard/website",
    });
    return insights;
  }

  if (prevSum > 0 && lastSum > prevSum * 1.15) {
    const pct = Math.round(((lastSum - prevSum) / prevSum) * 100);
    insights.push({
      id: "growth",
      tone: "positive",
      titleFa: `بازدید ${pct}٪ رشد کرده`,
      titleEn: `Visits up ${pct}%`,
      bodyFa: "۳ روز اخیر نسبت به قبل بهتر است — همین روند را نگه دار.",
      bodyEn: "Last 3 days beat the previous window — keep the momentum.",
    });
  } else if (prevSum > 0 && lastSum < prevSum * 0.75) {
    insights.push({
      id: "dip",
      tone: "action",
      titleFa: "افت بازدید",
      titleEn: "Traffic dipped",
      bodyFa: "یک استوری با QR یا پست با لینک بیو بفرست.",
      bodyEn: "Post a story with your QR or a bio-link reminder.",
      href: "dashboard/website",
    });
  }

  const top = input.byReferrer[0];
  if (top && top.count >= Math.max(3, input.total * 0.25)) {
    const label = top.source || "direct";
    insights.push({
      id: "source",
      tone: "neutral",
      titleFa: `بیشترین منبع: ${label}`,
      titleEn: `Top source: ${label}`,
      bodyFa: `${top.count} بازدید از این منبع آمده — روی همان کانال تمرکز کن.`,
      bodyEn: `${top.count} visits from this source — double down there.`,
    });
  }

  if (input.topProductViews === 0 && input.publishedCount > 0) {
    insights.push({
      id: "products",
      tone: "action",
      titleFa: "صفحات محصول کم‌بازدیدند",
      titleEn: "Product pages need love",
      bodyFa: "از کاتالوگ یک محصول را در استوری هایلایت کن.",
      bodyEn: "Highlight one catalog product in a story.",
      href: "dashboard/content",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "steady",
      tone: "neutral",
      titleFa: "ترافیک پایدار",
      titleEn: "Steady traffic",
      bodyFa: `${input.total} بازدید در ۱۴ روز — برای رشد، لینک بیو را تازه نگه دار.`,
      bodyEn: `${input.total} visits in 14 days — keep the bio link fresh to grow.`,
      href: "dashboard/website",
    });
  }

  return insights.slice(0, 3);
}
