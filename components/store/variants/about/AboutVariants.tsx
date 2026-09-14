"use client";

import type { WebsiteConfig } from "@/types/website";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { EditableText } from "@/components/editor/EditContext";
import { isFa } from "@/components/store/variants/shared";

/** Classic story split: media + readable copy width. */
export function AboutStory({ config }: { config: WebsiteConfig }) {
  const about = config.content.about;
  if (!about) return null;
  const image = siteMedia(config, about.imageId);
  const fa = isFa(config);

  return (
    <section className="store-section" id="story" data-variant="story">
      <div className="store-wrap store-story">
        <div className="store-story__media">
          {image ? (
            <SiteMedia
              media={image}
              mode="cover"
              width={1100}
              height={1400}
              className="store-story__img"
              sizes="(max-width: 900px) 100vw, 48vw"
            />
          ) : (
            <div className="store-card__ph" />
          )}
        </div>
        <div className="store-story__copy">
          <p className="store-kicker">{fa ? "رویکرد ما" : "Our approach"}</p>
          <h2 className="store-display store-display--sm">
            <EditableText path="about.title" value={about.title} as="span" />
          </h2>
          <p className="store-lead">
            <EditableText
              path="about.body"
              value={about.body}
              as="span"
              className="block"
              multiline
            />
          </p>
          {config.brand.tagline ? (
            <p className="store-quote">{config.brand.tagline}</p>
          ) : null}
          <a href="#shop" className="store-btn store-btn--ghost">
            {fa ? "مشاهده مجموعه" : "Explore the shop"}
          </a>
        </div>
      </div>
    </section>
  );
}

/** Type-led editorial about: copy first, secondary bleed media. */
export function AboutEditorial({ config }: { config: WebsiteConfig }) {
  const about = config.content.about;
  if (!about) return null;
  const image = siteMedia(config, about.imageId);
  const fa = isFa(config);

  return (
    <section
      className="store-section store-about-editorial"
      id="story"
      data-variant="editorial"
    >
      <div className="store-wrap store-about-editorial__copy">
        <p className="store-kicker">{fa ? "داستان برند" : "Brand story"}</p>
        <h2 className="store-display">
          <EditableText path="about.title" value={about.title} as="span" />
        </h2>
        <p className="store-lead store-about-editorial__body">
          <EditableText
            path="about.body"
            value={about.body}
            as="span"
            className="block"
            multiline
          />
        </p>
      </div>
      {image ? (
        <div className="store-about-editorial__bleed">
          <SiteMedia
            media={image}
            mode="cover"
            width={1800}
            height={900}
            className="store-about-editorial__img"
            sizes="100vw"
          />
        </div>
      ) : null}
    </section>
  );
}

/** Image-led about: dominant media, concise copy below/aside. */
export function AboutImageLed({ config }: { config: WebsiteConfig }) {
  const about = config.content.about;
  if (!about) return null;
  const image = siteMedia(config, about.imageId);
  const fa = isFa(config);

  return (
    <section
      className="store-section store-about-image"
      id="story"
      data-variant="image-led"
    >
      <div className="store-wrap store-about-image__grid">
        <div className="store-about-image__media">
          {image ? (
            <SiteMedia
              media={image}
              mode="cover"
              width={1600}
              height={1200}
              className="store-about-image__img"
              sizes="(max-width: 900px) 100vw, 68vw"
            />
          ) : (
            <div className="store-card__ph store-about-image__ph" />
          )}
        </div>
        <div className="store-about-image__copy">
          <p className="store-kicker">{fa ? "درباره" : "About"}</p>
          <h2 className="store-heading">
            <EditableText path="about.title" value={about.title} as="span" />
          </h2>
          <p className="store-muted">
            <EditableText
              path="about.body"
              value={about.body}
              as="span"
              className="block"
              multiline
            />
          </p>
        </div>
      </div>
    </section>
  );
}
