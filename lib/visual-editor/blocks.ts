/**
 * Foundation blocks + section snippets for GrapesJS BlockManager.
 * Markup is self-contained HTML — Phase 2 will map to WebsiteConfig sections.
 */

export type VisualBlockDef = {
  id: string;
  label: { fa: string; en: string };
  category: "blocks" | "sections";
  media?: string;
  content: string;
};

export const VISUAL_BLOCKS: VisualBlockDef[] = [
  {
    id: "container",
    label: { fa: "کانتینر", en: "Container" },
    category: "blocks",
    content:
      '<div class="ve-container" style="max-width:1100px;margin:0 auto;padding:24px;min-height:80px;" data-ve="container"></div>',
  },
  {
    id: "section",
    label: { fa: "سکشن", en: "Section" },
    category: "blocks",
    content:
      '<section class="ve-section" style="padding:64px 24px;min-height:120px;" data-ve="section"><div class="ve-container" style="max-width:1100px;margin:0 auto;"></div></section>',
  },
  {
    id: "columns",
    label: { fa: "ستون‌ها", en: "Columns" },
    category: "blocks",
    content:
      '<div class="ve-columns" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:16px;" data-ve="columns"><div style="min-height:80px;padding:12px;background:#f8f8f8;"></div><div style="min-height:80px;padding:12px;background:#f8f8f8;"></div></div>',
  },
  {
    id: "grid",
    label: { fa: "گرید", en: "Grid" },
    category: "blocks",
    content:
      '<div class="ve-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:16px;" data-ve="grid"><div style="min-height:64px;background:#f3f3f3;"></div><div style="min-height:64px;background:#f3f3f3;"></div><div style="min-height:64px;background:#f3f3f3;"></div></div>',
  },
  {
    id: "heading",
    label: { fa: "عنوان", en: "Heading" },
    category: "blocks",
    content:
      '<h2 class="ve-heading" style="font-size:2rem;font-weight:600;line-height:1.2;margin:0;" data-ve="heading">Heading</h2>',
  },
  {
    id: "text",
    label: { fa: "متن", en: "Text" },
    category: "blocks",
    content:
      '<p class="ve-text" style="font-size:1rem;line-height:1.6;margin:0;color:#444;" data-ve="text">Edit this paragraph.</p>',
  },
  {
    id: "button",
    label: { fa: "دکمه", en: "Button" },
    category: "blocks",
    content:
      '<a class="ve-button" href="#" style="display:inline-block;padding:12px 22px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:500;" data-ve="button">Button</a>',
  },
  {
    id: "image",
    label: { fa: "تصویر", en: "Image" },
    category: "blocks",
    content:
      '<img class="ve-image" src="https://picsum.photos/seed/vitrin/800/500" alt="Image" style="display:block;width:100%;height:auto;border-radius:8px;" data-ve="image" />',
  },
  {
    id: "video",
    label: { fa: "ویدیو", en: "Video" },
    category: "blocks",
    content:
      '<div class="ve-video" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;background:#111;" data-ve="video"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen title="Video"></iframe></div>',
  },
  {
    id: "spacer",
    label: { fa: "فاصله", en: "Spacer" },
    category: "blocks",
    content:
      '<div class="ve-spacer" style="height:48px;width:100%;" data-ve="spacer"></div>',
  },
  {
    id: "divider",
    label: { fa: "جداکننده", en: "Divider" },
    category: "blocks",
    content:
      '<hr class="ve-divider" style="border:0;border-top:1px solid #e5e5e5;margin:24px 0;" data-ve="divider" />',
  },
  {
    id: "card",
    label: { fa: "کارت", en: "Card" },
    category: "blocks",
    content:
      '<div class="ve-card" style="padding:24px;border:1px solid #e8e8e8;border-radius:12px;background:#fff;" data-ve="card"><h3 style="margin:0 0 8px;font-size:1.15rem;">Card title</h3><p style="margin:0;color:#555;line-height:1.5;">Short supporting text for this card.</p></div>',
  },
];

export const VISUAL_SECTIONS: VisualBlockDef[] = [
  {
    id: "sec-hero",
    label: { fa: "هیرو", en: "Hero" },
    category: "sections",
    content: `<section data-ve-section="hero" style="padding:96px 24px;background:linear-gradient(160deg,#0f0f12,#1a1a22);color:#fff;text-align:center;">
  <div style="max-width:720px;margin:0 auto;">
    <p style="letter-spacing:0.12em;text-transform:uppercase;font-size:12px;opacity:0.7;margin:0 0 16px;">Studio</p>
    <h1 style="font-size:clamp(2rem,5vw,3.5rem);line-height:1.1;margin:0 0 16px;font-weight:600;">Build something memorable</h1>
    <p style="font-size:1.1rem;opacity:0.8;margin:0 0 28px;line-height:1.6;">A clean hero foundation for your brand story and primary call to action.</p>
    <a href="#contact" style="display:inline-block;padding:14px 28px;background:#ef6351;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;">Get started</a>
  </div>
</section>`,
  },
  {
    id: "sec-features",
    label: { fa: "ویژگی‌ها", en: "Features" },
    category: "sections",
    content: `<section data-ve-section="features" style="padding:72px 24px;background:#fff;">
  <div style="max-width:1100px;margin:0 auto;">
    <h2 style="text-align:center;font-size:2rem;margin:0 0 40px;">Features</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;">
      <div style="padding:24px;border:1px solid #eee;border-radius:12px;"><h3 style="margin:0 0 8px;">Fast</h3><p style="margin:0;color:#555;">Ship pages quickly with reusable blocks.</p></div>
      <div style="padding:24px;border:1px solid #eee;border-radius:12px;"><h3 style="margin:0 0 8px;">Flexible</h3><p style="margin:0;color:#555;">Compose layouts without fighting the canvas.</p></div>
      <div style="padding:24px;border:1px solid #eee;border-radius:12px;"><h3 style="margin:0 0 8px;">Polished</h3><p style="margin:0;color:#555;">Typography and spacing that feel intentional.</p></div>
    </div>
  </div>
</section>`,
  },
  {
    id: "sec-about",
    label: { fa: "درباره", en: "About" },
    category: "sections",
    content: `<section data-ve-section="about" style="padding:72px 24px;background:#fafafa;">
  <div style="max-width:900px;margin:0 auto;display:grid;grid-template-columns:1.1fr 0.9fr;gap:40px;align-items:center;">
    <div>
      <h2 style="font-size:2rem;margin:0 0 16px;">About the studio</h2>
      <p style="margin:0;color:#444;line-height:1.7;">We craft digital experiences that feel calm, precise, and premium — built for brands that care about craft.</p>
    </div>
    <img src="https://picsum.photos/seed/about/640/480" alt="About" style="width:100%;border-radius:12px;display:block;" />
  </div>
</section>`,
  },
  {
    id: "sec-services",
    label: { fa: "خدمات", en: "Services" },
    category: "sections",
    content: `<section data-ve-section="services" style="padding:72px 24px;background:#fff;">
  <div style="max-width:1100px;margin:0 auto;">
    <h2 style="font-size:2rem;margin:0 0 32px;text-align:center;">Services</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div style="padding:28px;border-radius:12px;background:#111;color:#fff;"><h3 style="margin:0 0 8px;">Brand sites</h3><p style="margin:0;opacity:0.8;">Marketing sites with editorial clarity.</p></div>
      <div style="padding:28px;border-radius:12px;background:#f4f4f5;"><h3 style="margin:0 0 8px;">Product launches</h3><p style="margin:0;color:#555;">Landing pages that convert without clutter.</p></div>
    </div>
  </div>
</section>`,
  },
  {
    id: "sec-testimonials",
    label: { fa: "نظرات", en: "Testimonials" },
    category: "sections",
    content: `<section data-ve-section="testimonials" style="padding:72px 24px;background:#0f0f12;color:#fff;">
  <div style="max-width:720px;margin:0 auto;text-align:center;">
    <p style="font-size:1.35rem;line-height:1.6;margin:0 0 20px;">“The editor feels like a real design tool — not a form with a preview.”</p>
    <p style="margin:0;opacity:0.65;font-size:0.9rem;">— Founder, Modern Agency</p>
  </div>
</section>`,
  },
  {
    id: "sec-pricing",
    label: { fa: "قیمت‌ها", en: "Pricing" },
    category: "sections",
    content: `<section data-ve-section="pricing" style="padding:72px 24px;background:#fff;">
  <div style="max-width:900px;margin:0 auto;text-align:center;">
    <h2 style="font-size:2rem;margin:0 0 32px;">Pricing</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
      <div style="padding:32px;border:1px solid #e8e8e8;border-radius:16px;"><h3 style="margin:0 0 8px;">Starter</h3><p style="font-size:2rem;margin:0 0 12px;font-weight:600;">$29</p><p style="margin:0;color:#666;">For early-stage brands.</p></div>
      <div style="padding:32px;border:2px solid #111;border-radius:16px;"><h3 style="margin:0 0 8px;">Pro</h3><p style="font-size:2rem;margin:0 0 12px;font-weight:600;">$79</p><p style="margin:0;color:#666;">For growing teams.</p></div>
    </div>
  </div>
</section>`,
  },
  {
    id: "sec-cta",
    label: { fa: "CTA", en: "CTA" },
    category: "sections",
    content: `<section data-ve-section="cta" style="padding:64px 24px;background:#ef6351;color:#fff;text-align:center;">
  <h2 style="font-size:2rem;margin:0 0 12px;">Ready when you are</h2>
  <p style="margin:0 0 24px;opacity:0.9;">Start editing live — no refresh required.</p>
  <a href="#contact" style="display:inline-block;padding:12px 24px;background:#fff;color:#111;text-decoration:none;border-radius:8px;font-weight:600;">Contact us</a>
</section>`,
  },
  {
    id: "sec-contact",
    label: { fa: "تماس", en: "Contact" },
    category: "sections",
    content: `<section data-ve-section="contact" id="contact" style="padding:72px 24px;background:#fafafa;">
  <div style="max-width:560px;margin:0 auto;">
    <h2 style="font-size:2rem;margin:0 0 24px;text-align:center;">Contact</h2>
    <form style="display:grid;gap:12px;">
      <input placeholder="Name" style="padding:12px 14px;border:1px solid #ddd;border-radius:8px;" />
      <input placeholder="Email" type="email" style="padding:12px 14px;border:1px solid #ddd;border-radius:8px;" />
      <textarea placeholder="Message" rows="4" style="padding:12px 14px;border:1px solid #ddd;border-radius:8px;resize:vertical;"></textarea>
      <button type="button" style="padding:12px;background:#111;color:#fff;border:0;border-radius:8px;font-weight:500;">Send</button>
    </form>
  </div>
</section>`,
  },
  {
    id: "sec-footer",
    label: { fa: "فوتر", en: "Footer" },
    category: "sections",
    content: `<footer data-ve-section="footer" style="padding:40px 24px;background:#0f0f12;color:#aaa;text-align:center;">
  <p style="margin:0;font-size:0.9rem;">© Modern Agency — Built with Vitrin Visual Editor</p>
</footer>`,
  },
];
