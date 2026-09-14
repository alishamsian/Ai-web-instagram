"use client";

import type { Dictionary } from "@/lib/i18n/dictionary";
import type { WebsiteConfig } from "@/types/website";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/editor/MediaPicker";
import {
  applyCommandResult,
  commandAddFaqItem,
  commandAddProduct,
  commandAddService,
  commandAddTestimonial,
  commandAssignMedia,
  commandDeleteFaqItem,
  commandDeleteProduct,
  commandDeleteService,
  commandDeleteTestimonial,
  commandDuplicateFaqItem,
  commandEnsureTestimonials,
  commandReorderFaqItem,
  commandReorderProduct,
  commandReorderService,
  commandReorderTestimonial,
  commandSetContactInfo,
  commandSetContentPath,
  commandSetGalleryImages,
  commandToggleGalleryImage,
  commandUpdateFaqItem,
  commandUpdateProduct,
  commandUpdateService,
  commandUpdateTestimonial,
} from "@/lib/editor";
import { ChevronDown, Plus, Trash2 } from "lucide-react";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function setPath(
  config: WebsiteConfig,
  path: string,
  value: string,
  onChange: (next: WebsiteConfig) => void,
) {
  applyCommandResult(commandSetContentPath(config, path, value), onChange);
}

export function ContentPanel({
  config,
  dict,
  onChange,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  onChange: (next: WebsiteConfig) => void;
}) {
  const isFa = config.settings.language === "fa";
  const products = config.content.products;
  const services = config.content.services;
  const gallery = config.content.gallery;
  const faq = config.content.faq;
  const testimonials = config.content.testimonials
    ? config.content.testimonials
    : null;
  const contact = config.content.contact;

  return (
    <div className="space-y-5">
      <p className="text-[12px] leading-5 text-muted-foreground">
        {dict.editor.contentHint}
      </p>

      <div className="space-y-3 rounded-2xl border border-border p-3.5">
        <p className="text-[11px] font-semibold tracking-wide text-ink uppercase">
          Hero
        </p>
        <Field label={dict.editor.heroHeadline}>
          <Input
            value={config.content.hero.headline}
            onChange={(e) =>
              setPath(config, "content.hero.headline", e.target.value, onChange)
            }
          />
        </Field>
        <Field label={dict.editor.heroSub}>
          <Textarea
            className="min-h-24 rounded-xl"
            value={config.content.hero.subheadline}
            onChange={(e) =>
              setPath(
                config,
                "content.hero.subheadline",
                e.target.value,
                onChange,
              )
            }
          />
        </Field>
        <Field label={dict.editor.heroCta}>
          <Input
            value={config.content.hero.cta}
            onChange={(e) =>
              setPath(config, "content.hero.cta", e.target.value, onChange)
            }
          />
        </Field>
        <Field label={isFa ? "لینک دکمه" : "CTA link"}>
          <Input
            dir="ltr"
            className="font-mono text-[12px]"
            value={config.content.hero.ctaHref ?? ""}
            placeholder="#shop · https:// · tel: · mailto:"
            onChange={(e) =>
              setPath(config, "content.hero.ctaHref", e.target.value, onChange)
            }
          />
        </Field>
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground">
            {dict.editor.heroImage}
          </p>
          <MediaPicker
            config={config}
            value={config.content.hero.imageId}
            clearLabel={dict.editor.clearMedia}
            emptyLabel={dict.editor.noMedia}
            onPick={(id) =>
              applyCommandResult(
                commandAssignMedia(config, "content.hero.imageId", id),
                onChange,
              )
            }
            onClear={() =>
              applyCommandResult(
                commandAssignMedia(config, "content.hero.imageId", null),
                onChange,
              )
            }
          />
        </div>
      </div>

      {config.content.about ? (
        <div className="space-y-3 rounded-2xl border border-border p-3.5">
          <Field label={dict.editor.aboutTitle}>
            <Input
              value={config.content.about.title}
              onChange={(e) =>
                setPath(config, "content.about.title", e.target.value, onChange)
              }
            />
          </Field>
          <Field label={dict.editor.aboutBody}>
            <Textarea
              className="min-h-28 rounded-xl"
              value={config.content.about.body}
              onChange={(e) =>
                setPath(config, "content.about.body", e.target.value, onChange)
              }
            />
          </Field>
          <MediaPicker
            config={config}
            value={config.content.about.imageId}
            clearLabel={dict.editor.clearMedia}
            emptyLabel={dict.editor.noMedia}
            onPick={(id) =>
              applyCommandResult(
                commandAssignMedia(config, "content.about.imageId", id),
                onChange,
              )
            }
            onClear={() =>
              applyCommandResult(
                commandAssignMedia(config, "content.about.imageId", null),
                onChange,
              )
            }
          />
        </div>
      ) : null}

      {products ? (
        <div className="space-y-3 rounded-2xl border border-border p-3.5">
          <Field label={dict.editor.productsTitle}>
            <Input
              value={products.title}
              onChange={(e) =>
                setPath(
                  config,
                  "content.products.title",
                  e.target.value,
                  onChange,
                )
              }
            />
          </Field>
          {products.items.map((item, index) => {
            const productId = item.id || item.slug;
            return (
              <div
                key={productId ?? `product-${index}`}
                className="space-y-2 rounded-xl bg-muted/60 p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {dict.editor.productName} {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={dict.editor.moveUp}
                      disabled={index === 0}
                      onClick={() => {
                        if (!productId) return;
                        applyCommandResult(
                          commandReorderProduct(config, productId, index - 1),
                          onChange,
                        );
                      }}
                    >
                      <ChevronDown size={14} className="rotate-180" />
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={dict.editor.moveDown}
                      disabled={index >= products.items.length - 1}
                      onClick={() => {
                        if (!productId) return;
                        applyCommandResult(
                          commandReorderProduct(config, productId, index + 1),
                          onChange,
                        );
                      }}
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={dict.editor.removeItem}
                      onClick={() => {
                        if (!productId) return;
                        applyCommandResult(
                          commandDeleteProduct(config, productId),
                          onChange,
                        );
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <Input
                  value={item.name}
                  onChange={(e) => {
                    if (!productId) return;
                    applyCommandResult(
                      commandUpdateProduct(config, productId, {
                        name: e.target.value,
                      }),
                      onChange,
                    );
                  }}
                />
                <Field label={dict.editor.productDesc}>
                  <Textarea
                    className="min-h-20 rounded-xl"
                    value={item.description}
                    onChange={(e) => {
                      if (!productId) return;
                      applyCommandResult(
                        commandUpdateProduct(config, productId, {
                          description: e.target.value,
                        }),
                        onChange,
                      );
                    }}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label={dict.editor.productCategory}>
                    <Input
                      value={item.category}
                      onChange={(e) => {
                        if (!productId) return;
                        applyCommandResult(
                          commandUpdateProduct(config, productId, {
                            category: e.target.value,
                          }),
                          onChange,
                        );
                      }}
                    />
                  </Field>
                  <Field label={dict.editor.productPrice}>
                    <Input
                      value={item.price == null ? "" : String(item.price)}
                      onChange={(e) => {
                        if (!productId) return;
                        const raw = e.target.value.trim();
                        const parsed = raw === "" ? null : Number(raw);
                        if (parsed != null && !Number.isFinite(parsed)) return;
                        applyCommandResult(
                          commandUpdateProduct(config, productId, {
                            price: parsed,
                          }),
                          onChange,
                        );
                      }}
                    />
                  </Field>
                </div>
                <MediaPicker
                  config={config}
                  value={item.imageIds[0]}
                  clearLabel={dict.editor.clearMedia}
                  emptyLabel={dict.editor.noMedia}
                  onPick={(id) => {
                    if (!productId) return;
                    applyCommandResult(
                      commandUpdateProduct(config, productId, {
                        imageIds: [id],
                      }),
                      onChange,
                    );
                  }}
                  onClear={() => {
                    if (!productId) return;
                    applyCommandResult(
                      commandUpdateProduct(config, productId, {
                        imageIds: [],
                      }),
                      onChange,
                    );
                  }}
                />
              </div>
            );
          })}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() =>
              applyCommandResult(
                commandAddProduct(config, {
                  name: dict.editor.productName,
                  currency:
                    config.settings.language === "fa" ? "تومان" : "USD",
                }),
                onChange,
              )
            }
          >
            <Plus size={14} />
            {dict.editor.addProduct}
          </Button>
        </div>
      ) : null}

      {services ? (
        <div className="space-y-3 rounded-2xl border border-border p-3.5">
          <Field label={dict.editor.servicesTitle ?? "Services"}>
            <Input
              value={services.title}
              onChange={(e) =>
                setPath(
                  config,
                  "content.services.title",
                  e.target.value,
                  onChange,
                )
              }
            />
          </Field>
          {services.items.map((item, index) => {
            const serviceId = item.id;
            if (!serviceId) return null;
            return (
            <div
              key={serviceId}
              className="space-y-2 rounded-xl bg-muted/60 p-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {index + 1}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={dict.editor.moveUp}
                    onClick={() =>
                      applyCommandResult(
                        commandReorderService(config, serviceId, index - 1),
                        onChange,
                      )
                    }
                  >
                    <ChevronDown size={14} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    disabled={index >= services.items.length - 1}
                    aria-label={dict.editor.moveDown}
                    onClick={() =>
                      applyCommandResult(
                        commandReorderService(config, serviceId, index + 1),
                        onChange,
                      )
                    }
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={dict.editor.removeItem}
                    onClick={() =>
                      applyCommandResult(
                        commandDeleteService(config, serviceId),
                        onChange,
                      )
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <Input
                value={item.name}
                onChange={(e) =>
                  applyCommandResult(
                    commandUpdateService(config, serviceId, {
                      name: e.target.value,
                    }),
                    onChange,
                  )
                }
              />
              <Textarea
                className="min-h-20 rounded-xl"
                value={item.description}
                onChange={(e) =>
                  applyCommandResult(
                    commandUpdateService(config, serviceId, {
                      description: e.target.value,
                    }),
                    onChange,
                  )
                }
              />
              <MediaPicker
                config={config}
                value={item.imageIds[0]}
                clearLabel={dict.editor.clearMedia}
                emptyLabel={dict.editor.noMedia}
                onPick={(id) =>
                  applyCommandResult(
                    commandUpdateService(config, serviceId, { imageIds: [id] }),
                    onChange,
                  )
                }
                onClear={() =>
                  applyCommandResult(
                    commandUpdateService(config, serviceId, { imageIds: [] }),
                    onChange,
                  )
                }
              />
            </div>
            );
          })}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() =>
              applyCommandResult(commandAddService(config), onChange)
            }
          >
            <Plus size={14} />
            {dict.editor.addProduct}
          </Button>
        </div>
      ) : null}

      {gallery ? (
        <div className="space-y-3 rounded-2xl border border-border p-3.5">
          <Field label={dict.editor.galleryTitle ?? "Gallery"}>
            <Input
              value={gallery.title}
              onChange={(e) =>
                setPath(
                  config,
                  "content.gallery.title",
                  e.target.value,
                  onChange,
                )
              }
            />
          </Field>
          <MediaPicker
            config={config}
            multi
            values={gallery.imageIds}
            clearLabel={dict.editor.clearMedia}
            emptyLabel={dict.editor.noMedia}
            onPick={(id) =>
              applyCommandResult(commandToggleGalleryImage(config, id), onChange)
            }
            onClear={() =>
              applyCommandResult(commandSetGalleryImages(config, []), onChange)
            }
          />
        </div>
      ) : null}

      {faq ? (
        <div className="space-y-3 rounded-2xl border border-border p-3.5">
          <Field label={dict.editor.faqTitle ?? "FAQ"}>
            <Input
              value={faq.title}
              onChange={(e) =>
                setPath(config, "content.faq.title", e.target.value, onChange)
              }
            />
          </Field>
          {faq.items.map((item, index) => {
            const faqId = item.id;
            if (!faqId) return null;
            return (
            <div
              key={faqId}
              className="space-y-2 rounded-xl bg-muted/60 p-2.5"
            >
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  aria-label={dict.editor.moveUp}
                  onClick={() =>
                    applyCommandResult(
                      commandReorderFaqItem(config, faqId, index - 1),
                      onChange,
                    )
                  }
                >
                  <ChevronDown size={14} className="rotate-180" />
                </button>
                <button
                  type="button"
                  disabled={index >= faq.items.length - 1}
                  aria-label={dict.editor.moveDown}
                  onClick={() =>
                    applyCommandResult(
                      commandReorderFaqItem(config, faqId, index + 1),
                      onChange,
                    )
                  }
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  aria-label={dict.editor.duplicate}
                  onClick={() =>
                    applyCommandResult(
                      commandDuplicateFaqItem(config, faqId),
                      onChange,
                    )
                  }
                >
                  <Plus size={14} />
                </button>
                <button
                  type="button"
                  aria-label={dict.editor.removeItem}
                  onClick={() =>
                    applyCommandResult(
                      commandDeleteFaqItem(config, faqId),
                      onChange,
                    )
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <Input
                value={item.question}
                onChange={(e) =>
                  applyCommandResult(
                    commandUpdateFaqItem(config, faqId, {
                      question: e.target.value,
                    }),
                    onChange,
                  )
                }
              />
              <Textarea
                className="min-h-20 rounded-xl"
                value={item.answer}
                onChange={(e) =>
                  applyCommandResult(
                    commandUpdateFaqItem(config, faqId, {
                      answer: e.target.value,
                    }),
                    onChange,
                  )
                }
              />
            </div>
            );
          })}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() =>
              applyCommandResult(commandAddFaqItem(config), onChange)
            }
          >
            <Plus size={14} />
            {dict.editor.addProduct}
          </Button>
        </div>
      ) : null}

      {testimonials ? (
        <TestimonialsBlock
          config={config}
          dict={dict}
          onChange={onChange}
        />
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            applyCommandResult(commandEnsureTestimonials(config), onChange)
          }
        >
          {isFa ? "فعال‌سازی نظرات" : "Enable testimonials"}
        </Button>
      )}

      {contact ? (
        <div className="space-y-3 rounded-2xl border border-border p-3.5">
          <Field label={dict.editor.contactTitle ?? "Contact"}>
            <Input
              value={contact.title}
              onChange={(e) =>
                setPath(
                  config,
                  "content.contact.title",
                  e.target.value,
                  onChange,
                )
              }
            />
          </Field>
          {(
            [
              ["phone", isFa ? "تلفن" : "Phone"],
              ["email", isFa ? "ایمیل" : "Email"],
              ["website", dict.editor.website],
              ["instagram", "Instagram"],
              ["whatsapp", "WhatsApp"],
              ["address", isFa ? "آدرس" : "Address"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <Input
                dir={
                  key === "email" ||
                  key === "website" ||
                  key === "phone" ||
                  key === "whatsapp"
                    ? "ltr"
                    : undefined
                }
                value={contact.info[key] ?? ""}
                onChange={(e) =>
                  applyCommandResult(
                    commandSetContactInfo(
                      config,
                      key,
                      e.target.value || null,
                    ),
                    onChange,
                  )
                }
              />
            </Field>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TestimonialsBlock({
  config,
  dict,
  onChange,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  onChange: (next: WebsiteConfig) => void;
}) {
  const testimonials = config.content.testimonials!;
  return (
    <div className="space-y-3 rounded-2xl border border-border p-3.5">
      <Field label={dict.editor.testimonialsTitle ?? "Testimonials"}>
        <Input
          value={testimonials.title}
          onChange={(e) =>
            setPath(
              config,
              "content.testimonials.title",
              e.target.value,
              onChange,
            )
          }
        />
      </Field>
      {testimonials.items.map((item, index) => {
        const testimonialId = item.id;
        if (!testimonialId) return null;
        return (
        <div
          key={testimonialId}
          className="space-y-2 rounded-xl bg-muted/60 p-2.5"
        >
          <div className="flex justify-end gap-1">
            <button
              type="button"
              disabled={index === 0}
              aria-label={dict.editor.moveUp}
              onClick={() =>
                applyCommandResult(
                  commandReorderTestimonial(config, testimonialId, index - 1),
                  onChange,
                )
              }
            >
              <ChevronDown size={14} className="rotate-180" />
            </button>
            <button
              type="button"
              disabled={index >= testimonials.items.length - 1}
              aria-label={dict.editor.moveDown}
              onClick={() =>
                applyCommandResult(
                  commandReorderTestimonial(config, testimonialId, index + 1),
                  onChange,
                )
              }
            >
              <ChevronDown size={14} />
            </button>
            <button
              type="button"
              aria-label={dict.editor.removeItem}
              onClick={() =>
                applyCommandResult(
                  commandDeleteTestimonial(config, testimonialId),
                  onChange,
                )
              }
            >
              <Trash2 size={14} />
            </button>
          </div>
          <Textarea
            className="min-h-20 rounded-xl"
            value={item.quote}
            onChange={(e) =>
              applyCommandResult(
                commandUpdateTestimonial(config, testimonialId, {
                  quote: e.target.value,
                }),
                onChange,
              )
            }
          />
          <Input
            value={item.author}
            onChange={(e) =>
              applyCommandResult(
                commandUpdateTestimonial(config, testimonialId, {
                  author: e.target.value,
                }),
                onChange,
              )
            }
          />
        </div>
        );
      })}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() =>
          applyCommandResult(commandAddTestimonial(config), onChange)
        }
      >
        <Plus size={14} />
          {dict.editor.addProduct}
      </Button>
    </div>
  );
}
