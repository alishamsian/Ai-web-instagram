"use client";

import type { WebsiteConfig } from "@/types/website";
import { EditableText } from "@/components/editor/EditContext";
import { isFa } from "@/components/store/variants/shared";

/**
 * Trust / proof section — only renders real content.trust / testimonials.
 * Never invents metrics, quotes, or claims.
 */
export function TrustMetrics({ config }: { config: WebsiteConfig }) {
  const items = config.content.trust?.items?.filter(Boolean) ?? [];
  if (!items.length) return null;
  const fa = isFa(config);

  return (
    <section
      className="store-section store-trust store-trust--metrics"
      id="trust"
      data-variant="metrics"
    >
      <div className="store-wrap">
        <p className="store-kicker">{fa ? "اعتماد" : "Trust"}</p>
        <ul className="store-trust-metrics">
          {items.map((item, index) => (
            <li key={`${index}-${item}`} className="store-trust-metrics__item">
              <span className="store-trust-metrics__value">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function TrustInline({ config }: { config: WebsiteConfig }) {
  const items = config.content.trust?.items?.filter(Boolean) ?? [];
  if (!items.length) return null;

  return (
    <section
      className="store-section store-section--sm store-trust store-trust--inline"
      id="trust"
      data-variant="inline"
    >
      <div className="store-wrap">
        <ul className="store-trust-inline">
          {items.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function TrustQuotes({ config }: { config: WebsiteConfig }) {
  const testimonials = config.content.testimonials;
  const quotes = testimonials?.items?.filter((t) => t.quote?.trim()) ?? [];
  if (!quotes.length) return null;
  const fa = isFa(config);

  return (
    <section
      className="store-section store-section--soft store-trust store-trust--quotes"
      id="trust"
      data-variant="quotes"
    >
      <div className="store-wrap">
        <div className="store-section__head">
          <p className="store-kicker">{fa ? "نظرات" : "Voices"}</p>
          <h2 className="store-heading">
            {testimonials?.title ? (
              <EditableText
                path="testimonials.title"
                value={testimonials.title}
                as="span"
              />
            ) : fa ? (
              "از مشتریان"
            ) : (
              "From customers"
            )}
          </h2>
        </div>
        <div className="store-trust-quotes">
          {quotes.slice(0, 3).map((item, index) => (
            <blockquote
              key={item.id ?? `${index}-${item.author}`}
              className="store-trust-quotes__card"
            >
              <p className="store-trust-quotes__text">{item.quote}</p>
              {item.author ? (
                <footer className="store-trust-quotes__author">
                  {item.author}
                </footer>
              ) : null}
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
