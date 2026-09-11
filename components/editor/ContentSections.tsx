"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/editor/MediaPicker";
import { ensureTestimonials, sectionLabel } from "@/components/editor/editor-utils";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";

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

export function ContentPanel({
  config,
  dict,
  onChange,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  onChange: (next: WebsiteConfig) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-[12px] leading-5 text-muted-foreground">
        {dict.editor.contentHint}
      </p>
      <p className="rounded-xl bg-muted px-3 py-2.5 text-[12px] leading-5 text-muted-foreground">
        {dict.editor.inlineHint}
      </p>

      <div className="space-y-3 rounded-2xl border border-border p-3.5">
        <p className="text-[11px] font-semibold tracking-wide text-ink uppercase">
          Hero
        </p>
        <Field label={dict.editor.heroHeadline}>
          <Input
            value={config.content.hero.headline}
            onChange={(event) =>
              onChange({
                ...config,
                content: {
                  ...config.content,
                  hero: { ...config.content.hero, headline: event.target.value },
                },
              })
            }
          />
        </Field>
        <Field label={dict.editor.heroSub}>
          <Textarea
            className="min-h-24 rounded-xl"
            value={config.content.hero.subheadline}
            onChange={(event) =>
              onChange({
                ...config,
                content: {
                  ...config.content,
                  hero: {
                    ...config.content.hero,
                    subheadline: event.target.value,
                  },
                },
              })
            }
          />
        </Field>
        <Field label={dict.editor.heroCta}>
          <Input
            value={config.content.hero.cta}
            onChange={(event) =>
              onChange({
                ...config,
                content: {
                  ...config.content,
                  hero: { ...config.content.hero, cta: event.target.value },
                },
              })
            }
          />
        </Field>
      </div>

      {config.content.about ? (
        <div className="space-y-3 rounded-2xl border border-border p-3.5">
          <Field label={dict.editor.aboutTitle}>
            <Input
              value={config.content.about.title}
              onChange={(event) =>
                onChange({
                  ...config,
                  content: {
                    ...config.content,
                    about: { ...config.content.about!, title: event.target.value },
                  },
                })
              }
            />
          </Field>
          <Field label={dict.editor.aboutBody}>
            <Textarea
              className="min-h-28 rounded-xl"
              value={config.content.about.body}
              onChange={(event) =>
                onChange({
                  ...config,
                  content: {
                    ...config.content,
                    about: { ...config.content.about!, body: event.target.value },
                  },
                })
              }
            />
          </Field>
        </div>
      ) : null}

      {config.content.products ? (
        <div className="space-y-3 rounded-2xl border border-border p-3.5">
          <div className="flex items-center justify-between gap-2">
            <Field label={dict.editor.productsTitle}>
              <Input
                value={config.content.products.title}
                onChange={(event) =>
                  onChange({
                    ...config,
                    content: {
                      ...config.content,
                      products: {
                        ...config.content.products!,
                        title: event.target.value,
                      },
                    },
                  })
                }
              />
            </Field>
          </div>
          {config.content.products.items.map((item, index) => (
            <div
              key={`product-${index}`}
              className="space-y-2 rounded-xl bg-muted/60 p-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {dict.editor.productName} {index + 1}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    const items = config.content.products!.items.filter(
                      (_, i) => i !== index,
                    );
                    onChange({
                      ...config,
                      content: {
                        ...config.content,
                        products: { ...config.content.products!, items },
                      },
                    });
                  }}
                  aria-label={dict.editor.removeItem}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <Input
                value={item.name}
                onChange={(event) => {
                  const items = [...config.content.products!.items];
                  items[index] = { ...item, name: event.target.value };
                  onChange({
                    ...config,
                    content: {
                      ...config.content,
                      products: { ...config.content.products!, items },
                    },
                  });
                }}
              />
              <Field label={dict.editor.productDesc}>
                <Textarea
                  className="min-h-20 rounded-xl"
                  value={item.description}
                  onChange={(event) => {
                    const items = [...config.content.products!.items];
                    items[index] = { ...item, description: event.target.value };
                    onChange({
                      ...config,
                      content: {
                        ...config.content,
                        products: { ...config.content.products!, items },
                      },
                    });
                  }}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={dict.editor.productCategory}>
                  <Input
                    value={item.category}
                    onChange={(event) => {
                      const items = [...config.content.products!.items];
                      items[index] = { ...item, category: event.target.value };
                      onChange({
                        ...config,
                        content: {
                          ...config.content,
                          products: { ...config.content.products!, items },
                        },
                      });
                    }}
                  />
                </Field>
                <Field label={dict.editor.productPrice}>
                  <Input
                    value={item.price == null ? "" : String(item.price)}
                    onChange={(event) => {
                      const raw = event.target.value.trim();
                      const parsed = raw === "" ? null : Number(raw);
                      const items = [...config.content.products!.items];
                      items[index] = {
                        ...item,
                        price:
                          parsed == null || Number.isFinite(parsed)
                            ? parsed
                            : item.price,
                      };
                      onChange({
                        ...config,
                        content: {
                          ...config.content,
                          products: { ...config.content.products!, items },
                        },
                      });
                    }}
                  />
                </Field>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">
                  {dict.editor.productImage}
                </p>
                <MediaPicker
                  config={config}
                  value={item.imageIds[0]}
                  onPick={(id) => {
                    const items = [...config.content.products!.items];
                    items[index] = { ...item, imageIds: [id] };
                    onChange({
                      ...config,
                      content: {
                        ...config.content,
                        products: { ...config.content.products!, items },
                      },
                    });
                  }}
                  clearLabel={dict.editor.clearMedia}
                  emptyLabel={dict.editor.noMedia}
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              const items = [
                ...config.content.products!.items,
                {
                  name: dict.editor.productName,
                  description: "",
                  category: "",
                  price: null,
                  currency: config.settings.language === "fa" ? "تومان" : "USD",
                  imageIds: [] as string[],
                  confidence: 1,
                },
              ];
              onChange({
                ...config,
                content: {
                  ...config.content,
                  products: { ...config.content.products!, items },
                },
              });
            }}
          >
            <Plus size={14} />
            {dict.editor.addProduct}
          </Button>
        </div>
      ) : null}

      {config.content.services ? (
        <div className="space-y-3 rounded-2xl border border-border p-3.5">
          <Field label={dict.editor.servicesTitle}>
            <Input
              value={config.content.services.title}
              onChange={(event) =>
                onChange({
                  ...config,
                  content: {
                    ...config.content,
                    services: {
                      ...config.content.services!,
                      title: event.target.value,
                    },
                  },
                })
              }
            />
          </Field>
          {config.content.services.items.map((item, index) => (
            <div
              key={`service-${index}`}
              className="space-y-2 rounded-xl bg-muted/60 p-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {dict.editor.serviceName} {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const items = config.content.services!.items.filter(
                      (_, i) => i !== index,
                    );
                    onChange({
                      ...config,
                      content: {
                        ...config.content,
                        services: { ...config.content.services!, items },
                      },
                    });
                  }}
                >
                  <Trash2 size={14} className="text-muted-foreground" />
                </button>
              </div>
              <Input
                value={item.name}
                onChange={(event) => {
                  const items = [...config.content.services!.items];
                  items[index] = { ...item, name: event.target.value };
                  onChange({
                    ...config,
                    content: {
                      ...config.content,
                      services: { ...config.content.services!, items },
                    },
                  });
                }}
              />
              <Field label={dict.editor.serviceDesc}>
                <Textarea
                  className="min-h-20 rounded-xl"
                  value={item.description}
                  onChange={(event) => {
                    const items = [...config.content.services!.items];
                    items[index] = { ...item, description: event.target.value };
                    onChange({
                      ...config,
                      content: {
                        ...config.content,
                        services: { ...config.content.services!, items },
                      },
                    });
                  }}
                />
              </Field>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              const items = [
                ...config.content.services!.items,
                {
                  name: dict.editor.serviceName,
                  description: "",
                  imageIds: [] as string[],
                  confidence: 1,
                },
              ];
              onChange({
                ...config,
                content: {
                  ...config.content,
                  services: { ...config.content.services!, items },
                },
              });
            }}
          >
            <Plus size={14} />
            {dict.editor.addService}
          </Button>
        </div>
      ) : null}

      {config.content.gallery ? (
        <Field label={dict.editor.galleryTitle}>
          <Input
            value={config.content.gallery.title}
            onChange={(event) =>
              onChange({
                ...config,
                content: {
                  ...config.content,
                  gallery: {
                    ...config.content.gallery!,
                    title: event.target.value,
                  },
                },
              })
            }
          />
        </Field>
      ) : null}

      {(() => {
        const withTestimonials = ensureTestimonials(config);
        const testimonials = withTestimonials.content.testimonials!;
        return (
          <div className="space-y-3 rounded-2xl border border-border p-3.5">
            <Field label={dict.editor.testimonialsTitle}>
              <Input
                value={testimonials.title}
                onChange={(event) =>
                  onChange({
                    ...withTestimonials,
                    content: {
                      ...withTestimonials.content,
                      testimonials: {
                        ...testimonials,
                        title: event.target.value,
                      },
                    },
                    sections: withTestimonials.sections.some(
                      (s) => s.type === "testimonials",
                    )
                      ? withTestimonials.sections
                      : [
                          ...withTestimonials.sections.filter(
                            (s) => s.type !== "footer",
                          ),
                          {
                            id: `testimonials-${Date.now()}`,
                            type: "testimonials",
                            visible: true,
                          },
                          ...withTestimonials.sections.filter(
                            (s) => s.type === "footer",
                          ),
                        ],
                  })
                }
              />
            </Field>
            {testimonials.items.map((item, index) => (
              <div
                key={`t-${index}`}
                className="space-y-2 rounded-xl bg-muted/60 p-2.5"
              >
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const items = testimonials.items.filter((_, i) => i !== index);
                      onChange({
                        ...withTestimonials,
                        content: {
                          ...withTestimonials.content,
                          testimonials: { ...testimonials, items },
                        },
                      });
                    }}
                  >
                    <Trash2 size={14} className="text-muted-foreground" />
                  </button>
                </div>
                <Field label={dict.editor.testimonialQuote}>
                  <Textarea
                    className="min-h-20 rounded-xl"
                    value={item.quote}
                    onChange={(event) => {
                      const items = [...testimonials.items];
                      items[index] = { ...item, quote: event.target.value };
                      onChange({
                        ...withTestimonials,
                        content: {
                          ...withTestimonials.content,
                          testimonials: { ...testimonials, items },
                        },
                      });
                    }}
                  />
                </Field>
                <Field label={dict.editor.testimonialAuthor}>
                  <Input
                    value={item.author}
                    onChange={(event) => {
                      const items = [...testimonials.items];
                      items[index] = { ...item, author: event.target.value };
                      onChange({
                        ...withTestimonials,
                        content: {
                          ...withTestimonials.content,
                          testimonials: { ...testimonials, items },
                        },
                      });
                    }}
                  />
                </Field>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                const base = ensureTestimonials(config);
                const items = [
                  ...(base.content.testimonials?.items ?? []),
                  {
                    quote:
                      config.settings.language === "fa"
                        ? "تجربه عالی بود."
                        : "An excellent experience.",
                    author:
                      config.settings.language === "fa" ? "مشتری" : "Customer",
                  },
                ];
                onChange({
                  ...base,
                  content: {
                    ...base.content,
                    testimonials: {
                      title:
                        base.content.testimonials?.title ??
                        dict.editor.testimonialsTitle,
                      items,
                    },
                  },
                  sections: base.sections.some((s) => s.type === "testimonials")
                    ? base.sections.map((s) =>
                        s.type === "testimonials" ? { ...s, visible: true } : s,
                      )
                    : [
                        ...base.sections.filter((s) => s.type !== "footer"),
                        {
                          id: `testimonials-${Date.now()}`,
                          type: "testimonials",
                          visible: true,
                        },
                        ...base.sections.filter((s) => s.type === "footer"),
                      ],
                });
              }}
            >
              <Plus size={14} />
              {dict.editor.addTestimonial}
            </Button>
          </div>
        );
      })()}

      {config.content.contact ? (
        <div className="space-y-3 rounded-2xl border border-border p-3.5">
          <Field label={dict.editor.contactTitle}>
            <Input
              value={config.content.contact.title}
              onChange={(event) =>
                onChange({
                  ...config,
                  content: {
                    ...config.content,
                    contact: {
                      ...config.content.contact!,
                      title: event.target.value,
                    },
                  },
                })
              }
            />
          </Field>
          <Field label={dict.editor.contactBody}>
            <Textarea
              className="min-h-24 rounded-xl"
              value={config.content.contact.body}
              onChange={(event) =>
                onChange({
                  ...config,
                  content: {
                    ...config.content,
                    contact: {
                      ...config.content.contact!,
                      body: event.target.value,
                    },
                  },
                })
              }
            />
          </Field>
          {(
            [
              ["phone", dict.editor.contactPhone],
              ["email", dict.editor.contactEmail],
              ["address", dict.editor.contactAddress],
              ["website", dict.editor.contactWebsite],
              ["instagram", dict.editor.contactInstagram],
              ["telegram", dict.editor.contactTelegram],
              ["whatsapp", dict.editor.contactWhatsapp],
              ["location", dict.editor.contactLocation],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <Input
                value={config.content.contact!.info[key] ?? ""}
                onChange={(event) =>
                  onChange({
                    ...config,
                    content: {
                      ...config.content,
                      contact: {
                        ...config.content.contact!,
                        info: {
                          ...config.content.contact!.info,
                          [key]: event.target.value || null,
                        },
                      },
                    },
                  })
                }
              />
            </Field>
          ))}
        </div>
      ) : null}

      {config.content.faq ? (
        <div className="space-y-3 rounded-2xl border border-border p-3.5">
          <Field label={dict.editor.faqTitle}>
            <Input
              value={config.content.faq.title}
              onChange={(event) =>
                onChange({
                  ...config,
                  content: {
                    ...config.content,
                    faq: {
                      ...config.content.faq!,
                      title: event.target.value,
                    },
                  },
                })
              }
            />
          </Field>
          {config.content.faq.items.map((item, index) => (
            <div
              key={`faq-${index}`}
              className="space-y-2 rounded-xl bg-muted/60 p-2.5"
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const items = config.content.faq!.items.filter(
                      (_, i) => i !== index,
                    );
                    onChange({
                      ...config,
                      content: {
                        ...config.content,
                        faq: { ...config.content.faq!, items },
                      },
                    });
                  }}
                >
                  <Trash2 size={14} className="text-muted-foreground" />
                </button>
              </div>
              <Field label={`${dict.editor.faqQuestion} ${index + 1}`}>
                <Input
                  value={item.question}
                  onChange={(event) => {
                    const items = [...config.content.faq!.items];
                    items[index] = { ...item, question: event.target.value };
                    onChange({
                      ...config,
                      content: {
                        ...config.content,
                        faq: { ...config.content.faq!, items },
                      },
                    });
                  }}
                />
              </Field>
              <Field label={dict.editor.faqAnswer}>
                <Textarea
                  className="min-h-20 rounded-xl"
                  value={item.answer}
                  onChange={(event) => {
                    const items = [...config.content.faq!.items];
                    items[index] = { ...item, answer: event.target.value };
                    onChange({
                      ...config,
                      content: {
                        ...config.content,
                        faq: { ...config.content.faq!, items },
                      },
                    });
                  }}
                />
              </Field>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              const items = [
                ...config.content.faq!.items,
                {
                  question:
                    config.settings.language === "fa"
                      ? "سؤال جدید؟"
                      : "New question?",
                  answer:
                    config.settings.language === "fa"
                      ? "پاسخ را اینجا بنویس."
                      : "Write the answer here.",
                },
              ];
              onChange({
                ...config,
                content: {
                  ...config.content,
                  faq: { ...config.content.faq!, items },
                },
              });
            }}
          >
            <Plus size={14} />
            {dict.editor.addFaq}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function SectionsPanel({
  config,
  dict,
  locale,
  onChange,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  locale: Locale;
  onChange: (next: WebsiteConfig) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    const sections = [...config.sections];
    const [item] = sections.splice(from, 1);
    sections.splice(to, 0, item);
    onChange({ ...config, sections });
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-5 text-muted-foreground">
        {dict.editor.sectionsHint}
      </p>
      <p className="text-[11px] text-muted-foreground">{dict.editor.dragHint}</p>
      <ul className="space-y-2">
        {config.sections.map((section, index) => (
          <li
            key={section.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragIndex == null) return;
              reorder(dragIndex, index);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={cn(
              "flex cursor-grab items-center gap-2 rounded-xl border border-border bg-white px-2.5 py-2 active:cursor-grabbing",
              dragIndex === index && "opacity-60",
            )}
          >
            <GripVertical size={15} className="shrink-0 text-muted-foreground" />
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => {
                const sections = [...config.sections];
                sections[index] = { ...section, visible: !section.visible };
                onChange({ ...config, sections });
              }}
            >
              {section.visible ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            <span
              className={cn(
                "min-w-0 flex-1 text-sm",
                section.visible
                  ? "text-ink"
                  : "text-muted-foreground line-through",
              )}
            >
              {sectionLabel(section.type as WebsiteSectionType, locale)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
