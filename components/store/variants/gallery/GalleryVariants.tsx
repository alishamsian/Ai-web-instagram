"use client";

import type { WebsiteConfig } from "@/types/website";
import type { StoreCatalogProduct } from "@/lib/store/theme";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { EditableText } from "@/components/editor/EditContext";
import { useSiteNav } from "@/components/website/SiteNavContext";
import { productHref } from "@/lib/website/product";
import { cn } from "@/lib/utils";
import { isFa } from "@/components/store/variants/shared";

function productForGalleryImage(
  catalog: StoreCatalogProduct[],
  mediaId: string,
) {
  return catalog.find((p) => p.imageIds.includes(mediaId));
}

function GalleryHead({
  config,
  galleryTitle,
}: {
  config: WebsiteConfig;
  galleryTitle: string;
}) {
  const fa = isFa(config);
  return (
    <div className="store-section__head store-section__head--row">
      <div>
        <p className="store-kicker">
          {fa ? "گالری" : "Gallery"}
        </p>
        <h2 className="store-heading">
          <EditableText path="gallery.title" value={galleryTitle} as="span" />
        </h2>
      </div>
    </div>
  );
}

function GalleryEmpty({ config }: { config: WebsiteConfig }) {
  const fa = isFa(config);
  return (
    <section className="store-section store-section--soft" id="lookbook">
      <div className="store-wrap store-empty">
        <h2 className="store-heading">{fa ? "گالری" : "Gallery"}</h2>
        <p className="store-muted">
          {fa
            ? "هنوز تصویری به گالری اضافه نشده است."
            : "No gallery images yet."}
        </p>
      </div>
    </section>
  );
}

type GalleryProps = {
  config: WebsiteConfig;
  catalog: StoreCatalogProduct[];
};

function GalleryItems({
  config,
  catalog,
  ids,
  itemClass,
  leadFirst = false,
}: GalleryProps & {
  ids: string[];
  itemClass: (index: number) => string;
  leadFirst?: boolean;
}) {
  const { basePath, onProductNavigate } = useSiteNav();

  return (
    <>
      {ids.map((id, index) => {
        const image = siteMedia(config, id);
        if (!image) return null;
        const matched = productForGalleryImage(catalog, id);
        const href = matched
          ? productHref(basePath, matched.slug)
          : undefined;
        const open = (event: React.MouseEvent) => {
          if (!matched || !onProductNavigate) return;
          event.preventDefault();
          onProductNavigate(matched.slug);
        };
        const className = itemClass(index);
        const media = (
          <SiteMedia
            media={image}
            mode="cover"
            width={leadFirst && index === 0 ? 1400 : 900}
            height={leadFirst && index === 0 ? 1600 : 900}
            className="store-gallery__img"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        );
        if (href) {
          return (
            <a
              key={id}
              href={href}
              className={className}
              onClick={open}
              aria-label={matched?.name}
            >
              {media}
            </a>
          );
        }
        return (
          <figure key={id} className={className}>
            {media}
          </figure>
        );
      })}
    </>
  );
}

/** Editorial lookbook with lead tile + supporting rhythm. */
export function GalleryLookbook({ config, catalog }: GalleryProps) {
  const gallery = config.content.gallery;
  if (!gallery?.imageIds.length) return <GalleryEmpty config={config} />;

  return (
    <section
      className="store-section store-section--soft"
      id="lookbook"
      data-variant="lookbook"
    >
      <div className="store-wrap">
        <GalleryHead config={config} galleryTitle={gallery.title} />
        <div className="store-lookbook">
          <GalleryItems
            config={config}
            catalog={catalog}
            ids={gallery.imageIds.slice(0, 6)}
            leadFirst
            itemClass={(index) =>
              cn(
                "store-lookbook__item",
                index === 0 && "store-lookbook__item--lead",
              )
            }
          />
        </div>
      </div>
    </section>
  );
}

/** Uniform aspect-ratio grid. */
export function GalleryGrid({ config, catalog }: GalleryProps) {
  const gallery = config.content.gallery;
  if (!gallery?.imageIds.length) return <GalleryEmpty config={config} />;

  return (
    <section
      className="store-section"
      id="lookbook"
      data-variant="grid"
    >
      <div className="store-wrap">
        <GalleryHead config={config} galleryTitle={gallery.title} />
        <div className="store-gallery-grid">
          <GalleryItems
            config={config}
            catalog={catalog}
            ids={gallery.imageIds.slice(0, 12)}
            itemClass={() => "store-gallery-grid__item"}
          />
        </div>
      </div>
    </section>
  );
}

/** Variable-height masonry-style flow. */
export function GalleryMasonry({ config, catalog }: GalleryProps) {
  const gallery = config.content.gallery;
  if (!gallery?.imageIds.length) return <GalleryEmpty config={config} />;

  return (
    <section
      className="store-section store-section--soft"
      id="lookbook"
      data-variant="masonry"
    >
      <div className="store-wrap">
        <GalleryHead config={config} galleryTitle={gallery.title} />
        <div className="store-gallery-masonry">
          <GalleryItems
            config={config}
            catalog={catalog}
            ids={gallery.imageIds.slice(0, 9)}
            itemClass={(index) =>
              cn(
                "store-gallery-masonry__item",
                index % 3 === 0 && "store-gallery-masonry__item--tall",
                index % 5 === 1 && "store-gallery-masonry__item--wide",
              )
            }
          />
        </div>
      </div>
    </section>
  );
}

/** Offset / overlapping collage rhythm. */
export function GalleryCollage({ config, catalog }: GalleryProps) {
  const gallery = config.content.gallery;
  if (!gallery?.imageIds.length) return <GalleryEmpty config={config} />;

  return (
    <section
      className="store-section"
      id="lookbook"
      data-variant="collage"
    >
      <div className="store-wrap">
        <GalleryHead config={config} galleryTitle={gallery.title} />
        <div className="store-gallery-collage">
          <GalleryItems
            config={config}
            catalog={catalog}
            ids={gallery.imageIds.slice(0, 5)}
            itemClass={(index) =>
              cn(
                "store-gallery-collage__item",
                `store-gallery-collage__item--${index + 1}`,
              )
            }
          />
        </div>
      </div>
    </section>
  );
}
