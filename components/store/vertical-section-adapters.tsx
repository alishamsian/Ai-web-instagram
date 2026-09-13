"use client";

import type { StoreSectionContext } from "@/lib/store/registry/render-contract";
import {
  VerticalTaxonomySection,
  VerticalStorySection,
  VerticalStepsSection,
  VerticalFinderSection,
  VerticalLookbookSection,
} from "@/components/store/VerticalSections";

function isFa(ctx: StoreSectionContext) {
  return ctx.config.settings.language === "fa";
}

export function renderShopByConcernSection(ctx: StoreSectionContext) {
  return (
    <VerticalTaxonomySection
      config={ctx.config}
      section={ctx.section}
      products={ctx.shopProducts}
      attribute="concerns"
      defaultKicker={isFa(ctx) ? "نگرانی" : "Concern"}
      defaultTitle={isFa(ctx) ? "خرید بر اساس نگرانی" : "Shop by concern"}
    />
  );
}

export function renderShopBySkinTypeSection(ctx: StoreSectionContext) {
  return (
    <VerticalTaxonomySection
      config={ctx.config}
      section={ctx.section}
      products={ctx.shopProducts}
      attribute="skinType"
      defaultKicker={isFa(ctx) ? "پوست" : "Skin"}
      defaultTitle={isFa(ctx) ? "خرید بر اساس نوع پوست" : "Shop by skin type"}
    />
  );
}

export function renderRoutineSection(ctx: StoreSectionContext) {
  const fa = isFa(ctx);
  return (
    <VerticalStepsSection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={fa ? "روتین" : "Routine"}
      defaultTitle={fa ? "روتین روزانه" : "Daily routine"}
      steps={
        fa
          ? [
              { title: "پاکسازی", body: "پایه تمیز برای جذب بهتر." },
              { title: "درمان", body: "سرم متناسب با نگرانی اصلی." },
              { title: "مرطوب‌کننده", body: "قفل رطوبت و آرامش پوست." },
              { title: "محافظت", body: "ضدآفتاب یا لایه محافظ نهایی." },
            ]
          : [
              { title: "Cleanse", body: "A clean base for better absorption." },
              { title: "Treat", body: "Serum matched to the primary concern." },
              { title: "Moisturize", body: "Lock hydration and calm the barrier." },
              { title: "Protect", body: "SPF or the final protective layer." },
            ]
      }
    />
  );
}

export function renderIngredientStorySection(ctx: StoreSectionContext) {
  return (
    <VerticalStorySection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={isFa(ctx) ? "مواد" : "Ingredients"}
      defaultTitle={isFa(ctx) ? "داستان مواد کلیدی" : "Ingredient story"}
      defaultLead={
        isFa(ctx)
          ? "چرا این فرمول ساخته شد — کوتاه و دقیق."
          : "Why this formula exists — short and precise."
      }
    />
  );
}

export function renderProductFinderSection(ctx: StoreSectionContext) {
  return (
    <VerticalFinderSection
      config={ctx.config}
      section={ctx.section}
      products={ctx.shopProducts}
      attributeKeys={["concerns", "skinType"]}
      defaultKicker={isFa(ctx) ? "یابنده" : "Finder"}
      defaultTitle={isFa(ctx) ? "محصول مناسب شما" : "Find your product"}
      onQuickView={ctx.onQuickView}
    />
  );
}

export function renderLookbookSection(ctx: StoreSectionContext) {
  return (
    <VerticalLookbookSection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={isFa(ctx) ? "لوک‌بوک" : "Lookbook"}
      defaultTitle={isFa(ctx) ? "استایل فصل" : "Season looks"}
    />
  );
}

export function renderShopTheLookSection(ctx: StoreSectionContext) {
  return (
    <VerticalFinderSection
      config={ctx.config}
      section={ctx.section}
      products={ctx.shopProducts}
      attributeKeys={["style", "occasion"]}
      defaultKicker={isFa(ctx) ? "لوک" : "Look"}
      defaultTitle={isFa(ctx) ? "خرید این لوک" : "Shop the look"}
      onQuickView={ctx.onQuickView}
    />
  );
}

export function renderCollectionStorySection(ctx: StoreSectionContext) {
  return (
    <VerticalStorySection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={isFa(ctx) ? "کالکشن" : "Collection"}
      defaultTitle={isFa(ctx) ? "داستان کالکشن" : "Collection story"}
    />
  );
}

export function renderStyleGuideSection(ctx: StoreSectionContext) {
  return (
    <VerticalStorySection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={isFa(ctx) ? "استایل" : "Style"}
      defaultTitle={isFa(ctx) ? "راهنمای استایل" : "Style guide"}
      tone="band"
    />
  );
}

export function renderDesignerSpotlightSection(ctx: StoreSectionContext) {
  return (
    <VerticalStorySection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={isFa(ctx) ? "طراح" : "Designer"}
      defaultTitle={isFa(ctx) ? "اسپات‌لایت طراح" : "Designer spotlight"}
    />
  );
}

export function renderFitGuideSection(ctx: StoreSectionContext) {
  const fa = isFa(ctx);
  return (
    <VerticalStepsSection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={fa ? "فیت" : "Fit"}
      defaultTitle={fa ? "راهنمای سایز" : "Fit guide"}
      steps={
        fa
          ? [
              { title: "اندازه‌گیری", body: "سینه، کمر و باسن را دقیق بگیرید." },
              { title: "جدول سایز", body: "با جدول برند مقایسه کنید." },
              { title: "انتخاب فیت", body: "اسلیم، معمولی یا اورسایز." },
              { title: "تأیید", body: "در صورت تردید، یک سایز بالاتر." },
            ]
          : [
              { title: "Measure", body: "Take bust, waist, and hip carefully." },
              { title: "Size chart", body: "Match against the brand chart." },
              { title: "Choose fit", body: "Slim, regular, or oversized." },
              { title: "Confirm", body: "When unsure, size up once." },
            ]
      }
    />
  );
}

export function renderShopByMaterialSection(ctx: StoreSectionContext) {
  return (
    <VerticalTaxonomySection
      config={ctx.config}
      section={ctx.section}
      products={ctx.shopProducts}
      attribute="material"
      defaultKicker={isFa(ctx) ? "متریال" : "Material"}
      defaultTitle={isFa(ctx) ? "خرید بر اساس متریال" : "Shop by material"}
    />
  );
}

export function renderShopByOccasionSection(ctx: StoreSectionContext) {
  return (
    <VerticalTaxonomySection
      config={ctx.config}
      section={ctx.section}
      products={ctx.shopProducts}
      attribute="occasion"
      defaultKicker={isFa(ctx) ? "مناسبت" : "Occasion"}
      defaultTitle={isFa(ctx) ? "خرید بر اساس مناسبت" : "Shop by occasion"}
    />
  );
}

export function renderStackBuilderSection(ctx: StoreSectionContext) {
  return (
    <VerticalFinderSection
      config={ctx.config}
      section={ctx.section}
      products={ctx.shopProducts}
      attributeKeys={["collection", "metal"]}
      defaultKicker={isFa(ctx) ? "استک" : "Stack"}
      defaultTitle={isFa(ctx) ? "بسازید و لایه‌بندی کنید" : "Build your stack"}
      onQuickView={ctx.onQuickView}
    />
  );
}

export function renderJewelryCareSection(ctx: StoreSectionContext) {
  return (
    <VerticalStorySection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={isFa(ctx) ? "مراقبت" : "Care"}
      defaultTitle={isFa(ctx) ? "نگهداری جواهرات" : "Jewelry care"}
      tone="band"
    />
  );
}

export function renderOriginExplorerSection(ctx: StoreSectionContext) {
  return (
    <VerticalTaxonomySection
      config={ctx.config}
      section={ctx.section}
      products={ctx.shopProducts}
      attribute="origin"
      defaultKicker={isFa(ctx) ? "خاستگاه" : "Origin"}
      defaultTitle={isFa(ctx) ? "کاشف خاستگاه" : "Origin explorer"}
    />
  );
}

export function renderFlavorProfileSection(ctx: StoreSectionContext) {
  return (
    <VerticalStorySection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={isFa(ctx) ? "طعم" : "Flavor"}
      defaultTitle={isFa(ctx) ? "پروفایل طعم" : "Flavor profile"}
    />
  );
}

export function renderBrewGuideSection(ctx: StoreSectionContext) {
  const fa = isFa(ctx);
  return (
    <VerticalStepsSection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={fa ? "دم" : "Brew"}
      defaultTitle={fa ? "راهنمای دم" : "Brew guide"}
      steps={
        fa
          ? [
              { title: "آسیاب", body: "درشتی مناسب روش دم را انتخاب کنید." },
              { title: "نسبت", body: "نقطه شروع: ۱۶ به ۱ آب به قهوه." },
              { title: "دما", body: "حدود ۹۲–۹۶ درجه سانتی‌گراد." },
              { title: "زمان", body: "زمان استخراج را ثابت نگه دارید." },
            ]
          : [
              { title: "Grind", body: "Match grind size to the brew method." },
              { title: "Ratio", body: "Start near 16:1 water to coffee." },
              { title: "Temp", body: "Aim for about 92–96°C." },
              { title: "Time", body: "Keep extraction time consistent." },
            ]
      }
    />
  );
}

export function renderRoasterStorySection(ctx: StoreSectionContext) {
  return (
    <VerticalStorySection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={isFa(ctx) ? "رستر" : "Roaster"}
      defaultTitle={isFa(ctx) ? "داستان رستری" : "Roaster story"}
    />
  );
}

export function renderSubscriptionSection(ctx: StoreSectionContext) {
  return (
    <VerticalStorySection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={isFa(ctx) ? "اشتراک" : "Subscribe"}
      defaultTitle={isFa(ctx) ? "قهوه تازه، منظم" : "Fresh coffee, on schedule"}
      defaultLead={
        isFa(ctx)
          ? "اشتراک دانه تازه — بدون تعهد پیچیده."
          : "Fresh bean subscription — no complicated commitment."
      }
      tone="band"
    />
  );
}

export function renderCoffeeFinderSection(ctx: StoreSectionContext) {
  return (
    <VerticalFinderSection
      config={ctx.config}
      section={ctx.section}
      products={ctx.shopProducts}
      attributeKeys={["roastLevel", "origin", "process"]}
      defaultKicker={isFa(ctx) ? "یابنده" : "Finder"}
      defaultTitle={isFa(ctx) ? "قهوه مناسب شما" : "Find your coffee"}
      onQuickView={ctx.onQuickView}
    />
  );
}

export function renderShopByRoomSection(ctx: StoreSectionContext) {
  return (
    <VerticalTaxonomySection
      config={ctx.config}
      section={ctx.section}
      products={ctx.shopProducts}
      attribute="room"
      defaultKicker={isFa(ctx) ? "فضا" : "Room"}
      defaultTitle={isFa(ctx) ? "خرید بر اساس فضا" : "Shop by room"}
    />
  );
}

export function renderShopByDesignerSection(ctx: StoreSectionContext) {
  return (
    <VerticalTaxonomySection
      config={ctx.config}
      section={ctx.section}
      products={ctx.shopProducts}
      attribute="designer"
      defaultKicker={isFa(ctx) ? "طراح" : "Designer"}
      defaultTitle={isFa(ctx) ? "خرید بر اساس طراح" : "Shop by designer"}
    />
  );
}

export function renderMaterialsSection(ctx: StoreSectionContext) {
  return (
    <VerticalStorySection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={isFa(ctx) ? "متریال" : "Materials"}
      defaultTitle={isFa(ctx) ? "متریال‌ها" : "Materials"}
    />
  );
}

export function renderDimensionsSection(ctx: StoreSectionContext) {
  return (
    <VerticalStorySection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={isFa(ctx) ? "ابعاد" : "Dimensions"}
      defaultTitle={isFa(ctx) ? "راهنمای ابعاد" : "Dimension guide"}
      tone="band"
    />
  );
}

export function renderProjectsSection(ctx: StoreSectionContext) {
  return (
    <VerticalStorySection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={isFa(ctx) ? "پروژه" : "Projects"}
      defaultTitle={isFa(ctx) ? "پروژه‌های منتخب" : "Selected projects"}
    />
  );
}

export function renderRoomInspirationSection(ctx: StoreSectionContext) {
  return (
    <VerticalLookbookSection
      config={ctx.config}
      section={ctx.section}
      defaultKicker={isFa(ctx) ? "الهام" : "Inspiration"}
      defaultTitle={isFa(ctx) ? "الهام فضا" : "Room inspiration"}
    />
  );
}
