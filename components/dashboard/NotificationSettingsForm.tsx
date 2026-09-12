"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NotificationSettings } from "@/lib/orders/notify";

export function NotificationSettingsForm({
  locale,
  initial,
}: {
  locale: "fa" | "en";
  initial: NotificationSettings;
}) {
  const isFa = locale === "fa";
  const [settings, setSettings] = useState(initial);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState("");

  async function save() {
    setPending(true);
    setToast("");
    const response = await fetch("/api/account/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
    });
    setPending(false);
    setToast(
      response.ok
        ? isFa
          ? "ذخیره شد"
          : "Saved"
        : isFa
          ? "ذخیره نشد"
          : "Could not save",
    );
  }

  return (
    <div className="space-y-4 p-5">
      <p className="text-sm leading-6 text-muted-foreground">
        {isFa
          ? "وقتی سفارش جدید ثبت شد خبرت می‌کنیم. ایمیل با Resend و تلگرام با Bot Token کار می‌کند."
          : "Get notified on new orders. Email needs Resend; Telegram needs a bot token."}
      </p>

      <label className="flex items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          className="size-4 rounded border-border"
          checked={settings.emailEnabled}
          onChange={(e) =>
            setSettings((s) => ({ ...s, emailEnabled: e.target.checked }))
          }
        />
        {isFa ? "ایمیل به صاحب حساب" : "Email workspace owner"}
      </label>

      <label className="flex items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          className="size-4 rounded border-border"
          checked={settings.telegramEnabled}
          onChange={(e) =>
            setSettings((s) => ({ ...s, telegramEnabled: e.target.checked }))
          }
        />
        {isFa ? "پیام تلگرام" : "Telegram message"}
      </label>

      <label className="block text-[11px] font-medium text-muted-foreground">
        {isFa ? "Chat ID تلگرام" : "Telegram chat ID"}
        <Input
          className="mt-1.5"
          value={settings.telegramChatId}
          onChange={(e) =>
            setSettings((s) => ({ ...s, telegramChatId: e.target.value }))
          }
          placeholder="123456789"
          disabled={!settings.telegramEnabled}
        />
      </label>

      <label className="block text-[11px] font-medium text-muted-foreground">
        {isFa ? "واتساپ اعلان (اختیاری)" : "Notify WhatsApp (optional)"}
        <Input
          className="mt-1.5"
          value={settings.whatsappNotify}
          onChange={(e) =>
            setSettings((s) => ({ ...s, whatsappNotify: e.target.value }))
          }
          placeholder="98912…"
        />
      </label>

      <div className="flex items-center gap-3">
        <Button type="button" size="sm" disabled={pending} onClick={() => void save()}>
          {pending ? "…" : isFa ? "ذخیره اعلان‌ها" : "Save notifications"}
        </Button>
        {toast ? (
          <span className="text-xs text-muted-foreground">{toast}</span>
        ) : null}
      </div>
    </div>
  );
}
