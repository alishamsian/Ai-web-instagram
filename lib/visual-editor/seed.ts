/**
 * Development seed: Modern Agency multi-page project for Visual Editor Phase 1.
 * Not a marketplace template — proves multi-page canvas + save.
 */

import type { ProjectData } from "grapesjs";
import type { WebsiteConfig } from "@/types/website";

function pageHtml(body: string): string {
  return `<body style="margin:0;font-family:system-ui,-apple-system,sans-serif;color:#111;background:#fff;">${body}</body>`;
}

const HOME = pageHtml(`
<header style="padding:20px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee;">
  <strong style="font-size:1.1rem;">Modern Agency</strong>
  <nav style="display:flex;gap:20px;font-size:0.9rem;"><a href="#about" style="color:#444;text-decoration:none;">About</a><a href="#services" style="color:#444;text-decoration:none;">Services</a><a href="#contact" style="color:#444;text-decoration:none;">Contact</a></nav>
</header>
<section data-ve-section="hero" style="padding:96px 24px;background:linear-gradient(160deg,#0f0f12,#1a1a22);color:#fff;text-align:center;">
  <div style="max-width:720px;margin:0 auto;">
    <p style="letter-spacing:0.12em;text-transform:uppercase;font-size:12px;opacity:0.7;margin:0 0 16px;">Modern Agency</p>
    <h1 style="font-size:clamp(2rem,5vw,3.4rem);line-height:1.1;margin:0 0 16px;font-weight:600;">Design that earns attention</h1>
    <p style="font-size:1.1rem;opacity:0.8;margin:0 0 28px;line-height:1.6;">A live visual editor foundation — select, drag, style, and save without leaving the canvas.</p>
    <a href="#contact" style="display:inline-block;padding:14px 28px;background:#ef6351;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;">Start a project</a>
  </div>
</section>
<section data-ve-section="features" style="padding:72px 24px;">
  <div style="max-width:1100px;margin:0 auto;">
    <h2 style="text-align:center;font-size:2rem;margin:0 0 40px;">What we do</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;">
      <div style="padding:24px;border:1px solid #eee;border-radius:12px;"><h3 style="margin:0 0 8px;">Brand sites</h3><p style="margin:0;color:#555;">Editorial clarity for ambitious brands.</p></div>
      <div style="padding:24px;border:1px solid #eee;border-radius:12px;"><h3 style="margin:0 0 8px;">Product launches</h3><p style="margin:0;color:#555;">Landing pages without the clutter.</p></div>
      <div style="padding:24px;border:1px solid #eee;border-radius:12px;"><h3 style="margin:0 0 8px;">Systems</h3><p style="margin:0;color:#555;">Design systems that scale with you.</p></div>
    </div>
  </div>
</section>
<footer data-ve-section="footer" style="padding:40px 24px;background:#0f0f12;color:#aaa;text-align:center;"><p style="margin:0;">© Modern Agency</p></footer>
`);

const ABOUT = pageHtml(`
<section data-ve-section="about" style="padding:80px 24px;background:#fafafa;">
  <div style="max-width:800px;margin:0 auto;">
    <h1 style="font-size:2.5rem;margin:0 0 16px;">About</h1>
    <p style="font-size:1.15rem;line-height:1.7;color:#333;margin:0 0 24px;">Modern Agency is a seed project for the Vitrin Visual Editor. This page exists to prove multi-page navigation and independent canvas content.</p>
    <img src="https://picsum.photos/seed/agency-about/960/540" alt="Studio" style="width:100%;border-radius:12px;display:block;" />
  </div>
</section>
`);

const SERVICES = pageHtml(`
<section data-ve-section="services" style="padding:80px 24px;background:#fff;">
  <div style="max-width:900px;margin:0 auto;">
    <h1 style="font-size:2.5rem;margin:0 0 28px;text-align:center;">Services</h1>
    <div style="display:grid;gap:16px;">
      <div style="padding:28px;border-radius:12px;background:#111;color:#fff;"><h2 style="margin:0 0 8px;font-size:1.25rem;">Website design</h2><p style="margin:0;opacity:0.8;">From concept to published site.</p></div>
      <div style="padding:28px;border-radius:12px;border:1px solid #e8e8e8;"><h2 style="margin:0 0 8px;font-size:1.25rem;">Visual systems</h2><p style="margin:0;color:#555;">Tokens, components, and templates.</p></div>
      <div style="padding:28px;border-radius:12px;border:1px solid #e8e8e8;"><h2 style="margin:0 0 8px;font-size:1.25rem;">Ongoing craft</h2><p style="margin:0;color:#555;">Iterate live without a rebuild.</p></div>
    </div>
  </div>
</section>
`);

const CONTACT = pageHtml(`
<section data-ve-section="contact" id="contact" style="padding:80px 24px;background:#fafafa;">
  <div style="max-width:520px;margin:0 auto;">
    <h1 style="font-size:2.5rem;margin:0 0 24px;text-align:center;">Contact</h1>
    <form style="display:grid;gap:12px;">
      <input placeholder="Name" style="padding:12px 14px;border:1px solid #ddd;border-radius:8px;" />
      <input placeholder="Email" type="email" style="padding:12px 14px;border:1px solid #ddd;border-radius:8px;" />
      <textarea placeholder="Message" rows="5" style="padding:12px 14px;border:1px solid #ddd;border-radius:8px;"></textarea>
      <button type="button" style="padding:12px;background:#111;color:#fff;border:0;border-radius:8px;">Send message</button>
    </form>
  </div>
</section>
`);

export const MODERN_AGENCY_PAGE_IDS = [
  "home",
  "about",
  "services",
  "contact",
] as const;

export function buildModernAgencyProject(config?: WebsiteConfig): ProjectData {
  const brand = config?.brand.name?.trim() || "Modern Agency";
  const home = HOME.replace(/Modern Agency/g, brand);

  return {
    pages: [
      {
        id: "home",
        name: "Home",
        component: home,
      },
      {
        id: "about",
        name: "About",
        component: ABOUT,
      },
      {
        id: "services",
        name: "Services",
        component: SERVICES,
      },
      {
        id: "contact",
        name: "Contact",
        component: CONTACT,
      },
    ],
    styles: [],
    assets: [],
  };
}

export function isVisualProjectEmpty(
  project: Record<string, unknown> | undefined | null,
): boolean {
  if (!project || typeof project !== "object") return true;
  const pages = project.pages;
  if (!Array.isArray(pages) || pages.length === 0) return true;
  return false;
}
