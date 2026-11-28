import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ExternalLink, Newspaper, PlayCircle, Video } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import SectionHeading from "@/components/site/SectionHeading";
import VideoEmbed from "@/components/VideoEmbed";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { getVideoEmbed } from "@/lib/videoEmbed";

const dateLocaleFor = (lang: string) => {
  const code = lang?.split("-")[0] || "ar";
  return { ar: "ar-EG", en: "en-US", fr: "fr-FR", ur: "ur-PK" }[code] || "ar-EG";
};

const getYouTubeId = (url: string): string | null => {
  const match = url.match(
    /(?:youtube\.com\/(?:shorts\/|[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/,
  );
  return match ? match[1] : null;
};
const getYouTubeThumb = (url: string, quality = "maxresdefault"): string | null => {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/${quality}.jpg` : null;
};

type NewsItem = {
  id: string;
  title: string;
  description?: string | null;
  content_type: "news" | "video";
  image_url?: string | null;
  video_url?: string | null;
  link_url?: string | null;
  is_featured?: boolean | null;
  published_at: string;
};

const NewsUpdatesSection = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [emblaApi, setEmblaApi] = useState<CarouselApi | null>(null);
  // Natural aspect ratios measured from the loaded media so posters span the
  // full card width instead of being letterboxed.
  const [mediaRatios, setMediaRatios] = useState<Record<string, number>>({});
  const rememberRatio = (id: string, width: number, height: number) => {
    if (!width || !height) return;
    const ratio = width / height;
    if (!Number.isFinite(ratio) || ratio <= 0) return;
    setMediaRatios((prev) =>
      Math.abs((prev[id] ?? 0) - ratio) < 0.001 ? prev : { ...prev, [id]: ratio },
    );
  };
  // Keep one stable autoplay instance so we can pause/resume it.
  // The plugin's own mouseleave / focusout handlers are disabled because
  // they call startAutoplay() directly and override our manual stop() while
  // the video popup is open.
  const autoplay = useRef(
    Autoplay({
      delay: 4500,
      stopOnInteraction: false,
      stopOnMouseEnter: false,
      stopOnFocusIn: false,
    }),
  );

  // Pause the carousel auto-scroll while the video popup is open,
  // resume normal auto-scroll when it closes. Also re-apply the pause after
  // any carousel re-init so the plugin can never restart behind the popup.
  useEffect(() => {
    if (!emblaApi) return;
    const getPlugin = () =>
      (emblaApi as unknown as {
        plugins?: () => { autoplay?: { stop?: () => void; play?: () => void } };
      }).plugins?.()?.autoplay;
    const syncAutoplay = () => {
      const plugin = getPlugin();
      if (!plugin) return;
      if (selected) {
        plugin.stop?.();
      } else {
        plugin.play?.();
      }
    };
    syncAutoplay();
    emblaApi.on("reInit", syncAutoplay);
    return () => {
      emblaApi.off("reInit", syncAutoplay);
    };
  }, [selected, emblaApi]);

  const { data: items, isLoading } = useQuery({
    queryKey: ["news-updates-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_updates")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as NewsItem[];
    },
  });

  if (isLoading || !items || items.length === 0) return null;

  const openPreview = (item: NewsItem) => {
    const videoSrc = item.video_url || item.link_url;
    if (item.content_type === "video" && videoSrc) {
      setSelected(item);
    } else if (item.link_url) {
      window.open(item.link_url, "_blank", "noopener,noreferrer");
    }
  };

  const selectedProvider = selected
    ? getVideoEmbed(selected.video_url || selected.link_url)?.provider
    : null;
  const openLabelKey =
    selectedProvider === "youtube"
      ? "newsSection.openYouTube"
      : selectedProvider === "facebook"
        ? "newsSection.openFacebook"
        : "newsSection.openExternal";

  return (
    <section className="section-y border-y border-border/70 bg-paper">
      <div className="shell">
        <SectionHeading
          title={t("newsSection.title")}
          highlight={t("newsSection.titleHighlight")}
          description={t("newsSection.description")}
        />

        <div className="mt-8">
          <Carousel
            setApi={setEmblaApi}
            opts={{
              align: "start",
              direction: isRtl ? "rtl" : "ltr",
              loop: items.length > 3,
            }}
            plugins={[autoplay.current]}
            className="w-full"
          >
            <CarouselContent className="items-start -ms-2">
              {items.map((item) => {
                const isVideo = item.content_type === "video";
                const ytThumb =
                  isVideo && item.video_url ? getYouTubeThumb(item.video_url) : null;
                const thumbSrc = ytThumb || item.image_url;
                const isDirectVideo = isVideo && item.video_url && !ytThumb;
                // Fit the media frame to the poster itself: news posters use
                // their measured ratio (square for the current uploads) while
                // YouTube previews keep the standard 16:9 frame.
                const mediaRatio = mediaRatios[item.id];
                const mediaStyle = mediaRatio
                  ? { aspectRatio: String(mediaRatio) }
                  : undefined;

                // YouTube returns a tiny 120x90 placeholder for videos without
                // a maxres thumbnail (with a 404 that still "loads"), so swap
                // those to the always-available hqdefault version.
                const applyThumbFallback = (image: HTMLImageElement) => {
                  if (!isVideo || !item.video_url) return;
                  if (image.dataset.thumbFallback === "1") return;
                  image.dataset.thumbFallback = "1";
                  const fallback = getYouTubeThumb(item.video_url, "hqdefault");
                  if (fallback) image.src = fallback;
                };

                return (
                  <CarouselItem
                    key={item.id}
                    className="basis-full ps-2 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                  >
                    <article className="surface-card group flex h-full w-full flex-col overflow-hidden">
                      <button
                        type="button"
                        onClick={() => openPreview(item)}
                        aria-label={`${isVideo ? t("newsSection.watch") : t("newsSection.readMore")}: ${item.title}`}
                        style={mediaStyle}
                        className={`relative block w-full cursor-pointer overflow-hidden text-start ${
                          mediaStyle
                            ? ""
                            : isVideo
                              ? "aspect-video"
                              : "aspect-square"
                        } ${isVideo ? "bg-zinc-950" : "bg-brand-soft"}`}
                      >
                        {thumbSrc ? (
                          <img
                            src={thumbSrc}
                            alt={item.title}
                            loading="lazy"
                            decoding="async"
                            onError={
                              isVideo && item.video_url
                                ? (event) => applyThumbFallback(event.currentTarget)
                                : undefined
                            }
                            onLoad={
                              isVideo && item.video_url
                                ? (event) => {
                                    if (event.currentTarget.naturalWidth <= 120) {
                                      applyThumbFallback(event.currentTarget);
                                    }
                                  }
                                : (event) =>
                                    rememberRatio(
                                      item.id,
                                      event.currentTarget.naturalWidth,
                                      event.currentTarget.naturalHeight,
                                    )
                            }
                            className={`relative h-full w-full ${ytThumb ? "object-cover" : "object-contain"}`}
                          />
                        ) : isDirectVideo ? (
                          <video
                            src={`${item.video_url}#t=0.5`}
                            preload="metadata"
                            muted
                            playsInline
                            onLoadedMetadata={(event) =>
                              rememberRatio(
                                item.id,
                                event.currentTarget.videoWidth,
                                event.currentTarget.videoHeight,
                              )
                            }
                            className="pointer-events-none h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-primary/35">
                            {isVideo ? (
                              <PlayCircle className="h-10 w-10" aria-hidden />
                            ) : (
                              <Newspaper className="h-10 w-10" aria-hidden />
                            )}
                          </div>
                        )}

                        {isVideo && (thumbSrc || isDirectVideo) && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/35">
                            <PlayCircle className="h-14 w-14 text-white drop-shadow-lg" aria-hidden />
                          </span>
                        )}
                      </button>

                      <div className="flex flex-1 flex-col p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-primary">
                            {isVideo ? (
                              <PlayCircle className="h-3 w-3" aria-hidden />
                            ) : (
                              <Newspaper className="h-3 w-3" aria-hidden />
                            )}
                            {isVideo ? t("newsSection.video") : t("newsSection.news")}
                          </span>
                          <span className="text-[11.5px] text-muted-foreground nums">
                            {new Date(item.published_at).toLocaleDateString(
                              dateLocaleFor(i18n.language),
                            )}
                          </span>
                        </div>

                        <h3 className="line-clamp-2 text-[16px] font-bold leading-7 text-foreground transition-colors group-hover:text-primary">
                          {item.title}
                        </h3>

                        {item.description && (
                          <p className="mt-2 line-clamp-3 flex-1 text-[13.5px] leading-7 text-muted-foreground">
                            {item.description}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => openPreview(item)}
                          className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline self-start"
                        >
                          {isVideo ? t("newsSection.watch") : t("newsSection.readMore")}
                          {isVideo ? (
                            <PlayCircle className="h-3 w-3" aria-hidden />
                          ) : (
                            <ExternalLink className="h-3 w-3" aria-hidden />
                          )}
                        </button>
                      </div>
                    </article>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className={
            (() => {
              const isShort = selected?.video_url
                ? getVideoEmbed(selected.video_url)?.isShort
                : false;
              return isShort
                ? "w-[calc(100vw-1.5rem)] max-w-[420px] sm:max-w-[440px] max-h-[92dvh] overflow-hidden rounded-[24px] border border-white/10 bg-zinc-950 p-0 text-white shadow-2xl shadow-black/60 gap-0 !bg-zinc-950"
                : "w-[calc(100vw-1.5rem)] max-w-3xl sm:max-w-4xl max-h-[92dvh] overflow-hidden rounded-[24px] border border-white/10 bg-zinc-950 p-0 text-white shadow-2xl shadow-black/60 gap-0 !bg-zinc-950";
            })()
          }
        >
          {selected && (
            <div className="flex max-h-[92dvh] flex-col overflow-y-auto">
              {/* Header — leaves room for the close button (end side) */}
              <DialogHeader className="shrink-0 px-5 pb-3 pt-5 text-start sm:px-6 sm:pt-6 sm:pe-14">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/10">
                    <PlayCircle className="h-3.5 w-3.5" aria-hidden />
                    {t("newsSection.video")}
                  </span>
                  <span className="ms-auto text-[11.5px] text-white/50 nums sm:ms-0">
                    {new Date(selected.published_at).toLocaleDateString(
                      dateLocaleFor(i18n.language),
                    )}
                  </span>
                </div>
                <DialogTitle className="mt-3 line-clamp-2 text-[16px] font-bold leading-8 text-white">
                  {selected.title}
                </DialogTitle>

              </DialogHeader>

              {/* Video — flush frame with rounded inset */}
              <div className="shrink-0 px-3 sm:px-4">
                <div className="overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
                  <VideoEmbed
                    key={selected.id}
                    url={selected.video_url || selected.link_url}
                    title={selected.title}
                    autoplay
                    className="rounded-none max-h-[50vh]"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[0.04] px-5 py-3.5 sm:px-6">
                <span className="text-[11.5px] text-white/50 nums">
                  {new Date(selected.published_at).toLocaleDateString(
                    dateLocaleFor(i18n.language),
                    { year: "numeric", month: "long", day: "numeric" },
                  )}
                </span>
                {(selected.video_url || selected.link_url) && (
                  <a
                    href={selected.video_url || selected.link_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[12px] font-bold text-zinc-900 shadow-sm transition hover:bg-zinc-100"
                  >
                    {t(openLabelKey)}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default NewsUpdatesSection;
