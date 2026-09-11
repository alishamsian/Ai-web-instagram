# ویترین (Vitrin)

پیج اینستاگرامت، یک سایت هم می‌خواد.

SaaS برای تبدیل حضور عمومی اینستاگرام به یک وب‌سایت حرفه‌ای، قابل ویرایش و قابل انتشار.

## وضعیت فعلی

مسیر کامل محصول با Supabase Auth (ایمیل/رمز + تأیید ایمیل)، Postgres، Apify و ذخیرهٔ رسانه کار می‌کند.
بدون کلیدهای لازم در **development** به mock سوییچ می‌شود؛ در **production** بدون کلید fail می‌شود (مگر `ALLOW_MOCK=true`).

| لایه | اینترفیس | پیاده‌سازی زنده | حالت بدون کلید (فقط dev) |
| --- | --- | --- | --- |
| اینستاگرام | `InstagramCollector` | `ApifyCollector` | `MockInstagramCollector` |
| هوش مصنوعی | `AIAnalyzer` | `OpenAIAnalyzer` | `MockAIAnalyzer` |
| رسانه | `MediaStorage` | Supabase Storage / R2 | `LocalMediaStorage` (`public/media`) |
| دیتابیس / احراز هویت | Store + Session | Supabase Auth + Postgres | فایل `.data/store.json` |

`instagram.com/demo` همیشه دموی نوران را نشان می‌دهد و به عنوان مشتری واقعی معرفی نمی‌شود.

## اجرا

```bash
npm install
cp .env.example .env.local   # سپس کلیدها را پر کنید
npm run dev
```

باز کردن: [http://localhost:3000](http://localhost:3000) → `/fa`

```bash
npm test
npm run typecheck
npm run lint
```

## اتصال سرویس‌های واقعی

فایل `.env.example` را به `.env.local` کپی کنید و کلیدها را پر کنید:

- `APIFY_API_TOKEN` برای ورود واقعی پیج عمومی
- `AI_API_KEY` برای تحلیل ساخت‌یافته JSON
- `SUPABASE_*` برای احراز هویت و PostgreSQL (الزامی در production)
- `JOB_WORKER_SECRET` یا `CRON_SECRET` برای پردازش پایدار جاب import (Vercel Cron هر ۲ دقیقه `/api/jobs/process`)
- `IMPORT_POSTS_LIMIT` پیش‌فرض `12` (۱–۵۰)
- `R2_*` اختیاری؛ در غیر این صورت bucket عمومی `vitrin-media`

اسکیمای دیتابیس و RLS در `supabase/schema.sql` است. مهاجرت‌ها:

- `supabase/migrations/20260910143000_global_slug_and_rls.sql`
- `supabase/migrations/20260911220000_analytics_orders_waitlist.sql` (بازدید، سفارش، waitlist)

سایت‌های منتشرشده: `/s/[slug]`، زیردامنه `{slug}.{ROOT_DOMAIN}`، و دامنه اختصاصی (پلن Pro — CNAME به root).

## مسیر اصلی

1. لندینگ
2. ورود لینک اینستاگرام
3. ساخت حساب (ایمیل + رمز + تأیید ایمیل در صورت فعال بودن در Supabase)
4. جاب ورود: پروفایل → پست‌ها → رسانه → تحلیل → WebsiteConfig
5. پیش‌نمایش و ویرایش
6. انتشار روی `/s/[slug]` / زیردامنه / دامنه اختصاصی

## محدودیت پلن

| | Free | Pro |
| --- | --- | --- |
| تعداد سایت | ۱ | ۲۵ |
| برند ویترین | اجباری | قابل حذف |
| دامنه اختصاصی | خیر | بله |
| همگام‌سازی مجدد IG | خیر | بله |
| آمار بازدید | پایه | پایه |

AI هیچ HTML آزادی تولید نمی‌کند. خروجی Zod-validated است و رندرر قطعی سایت را می‌سازد.
