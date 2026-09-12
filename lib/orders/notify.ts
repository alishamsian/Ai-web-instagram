import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sellerNewOrderMessage } from "@/lib/orders/status";

export type NotificationSettings = {
  emailEnabled: boolean;
  telegramEnabled: boolean;
  /** Telegram chat id for the owner bot DM */
  telegramChatId: string;
  /** Optional extra WhatsApp digits to notify (defaults to store WA) */
  whatsappNotify: string;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailEnabled: true,
  telegramEnabled: false,
  telegramChatId: "",
  whatsappNotify: "",
};

export function parseNotificationSettings(
  raw: unknown,
): NotificationSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_NOTIFICATION_SETTINGS };
  const o = raw as Record<string, unknown>;
  return {
    emailEnabled: o.emailEnabled !== false,
    telegramEnabled: Boolean(o.telegramEnabled),
    telegramChatId: String(o.telegramChatId ?? "").trim(),
    whatsappNotify: String(o.whatsappNotify ?? "").trim(),
  };
}

export async function getWorkspaceNotificationSettings(
  workspaceId: string,
): Promise<NotificationSettings> {
  if (!(isSupabaseConfigured() && (await isSupabaseSchemaReady()))) {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("workspaces")
    .select("notification_settings")
    .eq("id", workspaceId)
    .maybeSingle();
  return parseNotificationSettings(data?.notification_settings);
}

export async function saveWorkspaceNotificationSettings(
  workspaceId: string,
  settings: NotificationSettings,
): Promise<boolean> {
  if (!(isSupabaseConfigured() && (await isSupabaseSchemaReady()))) {
    return false;
  }
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("workspaces")
    .update({ notification_settings: settings })
    .eq("id", workspaceId);
  return !error;
}

async function sendResendEmail(input: {
  to: string;
  subject: string;
  text: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false as const, reason: "NO_RESEND" };
  const from =
    process.env.RESEND_FROM_EMAIL || "Vitrin <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.warn("[notify] resend failed", response.status, body);
    return { ok: false as const, reason: "RESEND_FAILED" };
  }
  return { ok: true as const };
}

async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return { ok: false as const, reason: "NO_TELEGRAM" };
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    },
  );
  if (!response.ok) {
    console.warn("[notify] telegram failed", await response.text().catch(() => ""));
    return { ok: false as const, reason: "TELEGRAM_FAILED" };
  }
  return { ok: true as const };
}

export async function notifyNewOrder(input: {
  workspaceId: string;
  ownerEmail: string | null;
  brandName: string;
  summary: string;
  orderId: string;
  locale: "fa" | "en";
  storeWhatsapp?: string | null;
  dashboardOrdersUrl: string;
}) {
  try {
    const settings = await getWorkspaceNotificationSettings(input.workspaceId);
    const text = `${sellerNewOrderMessage({
      brandName: input.brandName,
      summary: input.summary,
      locale: input.locale,
      orderId: input.orderId,
    })}\n${input.dashboardOrdersUrl}`;

    const tasks: Promise<unknown>[] = [];

    if (settings.emailEnabled && input.ownerEmail) {
      tasks.push(
        sendResendEmail({
          to: input.ownerEmail,
          subject:
            input.locale === "fa"
              ? `سفارش جدید — ${input.brandName}`
              : `New order — ${input.brandName}`,
          text,
        }),
      );
    }

    if (settings.telegramEnabled && settings.telegramChatId) {
      tasks.push(sendTelegramMessage(settings.telegramChatId, text));
    }

    // WhatsApp can't push without a Business API; we log a deep-link target for ops.
    const wa =
      settings.whatsappNotify.replace(/[^\d]/g, "") ||
      input.storeWhatsapp?.replace(/[^\d]/g, "") ||
      "";
    if (wa) {
      console.info(
        "[notify] whatsapp deep link",
        `https://wa.me/${wa}?text=${encodeURIComponent(text.slice(0, 800))}`,
      );
    }

    await Promise.allSettled(tasks);
  } catch (error) {
    console.warn("[notify] new order failed", error);
  }
}
