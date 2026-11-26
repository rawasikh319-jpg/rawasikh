import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Building2,
  CalendarCheck,
  Check,
  Compass,
  FlaskConical,
  Flag,
  Gem,
  GraduationCap,
  Handshake,
  Landmark,
  School,
  Sprout,
  Target,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/site/SectionHeading";
import Reveal from "@/components/site/Reveal";
import StatsGrid from "@/components/site/StatsGrid";
import MetricRing from "@/components/site/MetricRing";
import CtaBand from "@/components/site/CtaBand";
import { Button } from "@/components/ui/button";
import { usePlatformCounts } from "@/hooks/usePlatformCounts";
import individualLearning from "@/assets/individual-learning.jpg";
import impactCourses from "@/assets/impact/impact-courses.jpg";
import impactTrainers from "@/assets/impact/impact-trainers.jpg";
import impactLevels from "@/assets/impact/impact-levels.jpg";
import impactArticles from "@/assets/impact/impact-articles.jpg";

const AboutPage = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const { data: aboutVideoSetting } = useQuery({
    queryKey: ["site_setting_about_video"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", "about_video_url")
        .maybeSingle();
      return data?.setting_value || null;
    },
  });
  const aboutVideoUrl = aboutVideoSetting || "https://www.youtube.com/embed/FrAx3-Sgqho";

  const { data: counts, isLoading: countsLoading } = usePlatformCounts();

  const stats = [
    { value: counts?.courses ?? 0, label: t("impact.courses"), suffix: "+", image: impactCourses },
    { value: counts?.teachers ?? 0, label: t("impact.teachers"), suffix: "+", image: impactTrainers },
    { value: counts?.levels ?? 0, label: t("impact.levels"), suffix: "+", image: impactLevels },
    { value: counts?.articles ?? 0, label: t("impact.articles"), suffix: "+", image: impactArticles },
  ];

  const metrics = [
    { value: 96, label: t("metrics.satisfaction") },
    { value: 98, label: t("metrics.punctuality") },
    { value: 95, label: t("metrics.quality") },
    { value: 94, label: t("metrics.response") },
  ];

  const values = [
    { icon: Gem, title: t("values.qualityTitle"), description: t("values.qualityDesc") },
    { icon: CalendarCheck, title: t("values.commitmentTitle"), description: t("values.commitmentDesc") },
    { icon: Landmark, title: t("values.heritageTitle"), description: t("values.heritageDesc") },
    { icon: Sprout, title: t("values.growthTitle"), description: t("values.growthDesc") },
    { icon: Handshake, title: t("values.partnershipTitle"), description: t("values.partnershipDesc") },
  ];

  const audienceIcons = [Users, GraduationCap, FlaskConical, BookMarked, School, Building2];
  const audiences = (
    t("aboutPage.audiences", { returnObjects: true }) as Array<{
      title: string;
      description: string;
    }>
  ).map((item, index) => ({ ...item, icon: audienceIcons[index] }));

  const portfolio = t("aboutPage.portfolio", { returnObjects: true }) as Array<{
    title: string;
    client: string;
    description: string;
  }>;

  const trustPoints = [
    t("aboutExtras.trust1"),
    t("aboutExtras.trust2"),
    t("aboutExtras.trust3"),
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <SEO
        title="من نحن — قصة رواسخ"
        description="تعرّف على رواسخ: شركة مصرية متخصصة في التعليم والتدريب وتنمية المهارات، برؤية واضحة ورسالة تركز على بناء الإنسان ومهاراته."
        path="/about"
        keywords={["عن رواسخ", "رؤية الشركة", "رسالة", "تعليم وتدريب", "قيم"]}
      />
      <Header />

      <main>
        {/* ================= HERO ================= */}
        <section className="relative overflow-hidden bg-ink text-white">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(75% 90% at 100% 0%, hsl(var(--primary) / 0.55) 0%, transparent 58%), radial-gradient(60% 70% at 0% 100%, hsl(var(--gold) / 0.14) 0%, transparent 65%)",
            }}
            aria-hidden
          />
          <div className="pattern-lattice-light pointer-events-none absolute inset-0 opacity-[0.055]" aria-hidden />

          <div className="shell relative grid items-center gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-16">
            <div className="max-w-xl">
              <Reveal delay={80}>
                <h1 className="text-[34px] font-bold leading-[1.4] tracking-tight text-white sm:text-[44px] lg:text-[52px]">
                  <span className="block">{t("aboutExtras.heroTitle1")}</span>
                  <span className="mt-1 block text-gold">{t("aboutExtras.heroTitle2")}</span>
                </h1>
              </Reveal>

              <Reveal delay={160}>
                <p className="mt-5 max-w-lg text-[14.5px] leading-9 text-white/65">
                  {t("aboutExtras.heroDescription")}
                </p>
              </Reveal>

              <Reveal delay={240}>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="gap-2 rounded-xl bg-gold px-7 text-ink hover:bg-gold/90">
                    <Link to="/courses">
                      {t("hero.browseCourses")}
                      <ArrowIcon className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-xl border-white/25 bg-transparent px-6 text-white hover:bg-white hover:text-ink"
                  >
                    <Link to="/contact">{t("cta.contactUs")}</Link>
                  </Button>
                </div>
              </Reveal>

            </div>

            <Reveal delay={180} className="relative">
              <div className="relative mx-auto max-w-[470px]">
                <div
                  className="absolute -inset-3 rounded-[34px] opacity-60 blur-2xl"
                  style={{ background: "hsl(var(--gold) / 0.16)" }}
                  aria-hidden
                />
                <div className="relative overflow-hidden rounded-[28px] border border-white/12 bg-white/5 shadow-2xl">
                  <img
                    src={individualLearning}
                    alt={t("aboutExtras.learnAlt")}
                    width={512}
                    height={512}
                    loading="eager"
                    decoding="async"
                    className="aspect-[5/4] w-full object-cover"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent"
                    aria-hidden
                  />

                  <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/12 bg-ink/75 p-4 backdrop-blur-md sm:inset-x-5 sm:bottom-5 sm:p-5">
                    <div className="flex items-center gap-2">
                      <span className="h-px w-6 bg-gold/70" aria-hidden />
                      <p className="text-[10.5px] font-semibold tracking-[0.16em] text-gold">
                        {t("aboutExtras.valuesSummary")}
                      </p>
                    </div>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                      {trustPoints.map((point) => (
                        <li key={point} className="flex items-center gap-1.5 text-[11.5px] text-white/70">
                          <Check className="h-3 w-3 shrink-0 text-gold" aria-hidden />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================= STATS ================= */}
        <section className="border-b border-border/70 bg-paper">
          <div className="shell grid items-center gap-8 py-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-12">
            <Reveal>
              <div>
                <p className="font-display text-[19px] font-bold leading-8 text-foreground">
                  {t("impact.title")}{" "}
                  <span className="text-gradient-brand">{t("impact.titleHighlight")}</span>
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">{t("impact.note")}</p>
              </div>
            </Reveal>

            <div>
              <StatsGrid stats={stats} loading={countsLoading} />
            </div>
          </div>
        </section>

        {/* ================= VISION / MISSION / GOAL ================= */}
        <section className="section-y bg-background">
          <div className="shell">
            <SectionHeading
              title={t("aboutExtras.directionTitle")}
              highlight={t("aboutExtras.directionHighlight")}
              description={t("aboutExtras.directionDesc")}
            />

            <div className="mt-8 grid gap-5 lg:grid-cols-[1.02fr_0.98fr]">
              <Reveal className="h-full">
                <article className="panel-ink flex h-full flex-col p-7 sm:p-10">
                  <div className="pattern-lattice-light pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
                  <div
                    className="pointer-events-none absolute -top-20 end-0 h-56 w-56 rounded-full blur-3xl"
                    style={{ background: "hsl(var(--primary) / 0.5)" }}
                    aria-hidden
                  />

                  <div className="relative flex h-full flex-col">
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.07] text-gold">
                        <Target className="h-6 w-6" aria-hidden />
                      </span>
                      <span className="font-display text-[11px] font-semibold tracking-[0.18em] text-white/35 nums">
                        01
                      </span>
                    </div>

                    <h3 className="mt-6 text-[22px] font-bold text-white sm:text-[26px]">
                      {t("aboutPage.vision")}
                    </h3>
                    <p className="mt-3 text-[14px] leading-8 text-white/65">
                      {t("aboutPage.visionText")}
                    </p>

                    <div className="mt-auto pt-8">
                      <div className="h-px w-full bg-white/10" aria-hidden />
                      <p className="mt-4 font-display text-[13px] font-semibold text-gold">
                        {t("aboutExtras.heroTitle2")}
                      </p>
                    </div>
                  </div>
                </article>
              </Reveal>

              <div className="grid gap-5">
                <Reveal delay={90} className="h-full">
                  <article className="surface-card relative flex h-full gap-5 overflow-hidden p-6 sm:p-7">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary">
                      <Compass className="h-6 w-6" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[18px] font-bold text-foreground">
                          {t("aboutPage.mission")}
                        </h3>
                        <span className="font-display text-[11px] font-semibold tracking-[0.18em] text-muted-foreground/40 nums">
                          02
                        </span>
                      </div>
                      <p className="mt-2 text-[13.5px] leading-7 text-muted-foreground">
                        {t("aboutPage.missionText")}
                      </p>
                    </div>
                  </article>
                </Reveal>

                <Reveal delay={150} className="h-full">
                  <article className="surface-card relative flex h-full gap-5 overflow-hidden p-6 sm:p-7">
                    <span
                      className="pointer-events-none absolute inset-y-6 start-0 w-[3px] rounded-full bg-gold"
                      aria-hidden
                    />
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold">
                      <Flag className="h-6 w-6" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[18px] font-bold text-foreground">
                          {t("aboutExtras.goal")}
                        </h3>
                        <span className="font-display text-[11px] font-semibold tracking-[0.18em] text-muted-foreground/40 nums">
                          03
                        </span>
                      </div>
                      <p className="mt-2 text-[13.5px] leading-7 text-muted-foreground">
                        {t("aboutExtras.goalText")}
                      </p>
                    </div>
                  </article>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* ================= VALUES ================= */}
        <section className="section-y border-y border-border/70 bg-paper">
          <div className="shell">
            <SectionHeading
              title={t("values.title")}
              highlight={t("values.titleHighlight")}
              description={t("values.description")}
            />

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {values.map((value, index) => (
                <Reveal key={value.title} delay={index * 55} className="h-full">
                  <article className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                        <value.icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="font-display text-[11px] font-semibold tracking-[0.16em] text-muted-foreground/45 nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <h3 className="mt-5 text-[14.5px] font-bold text-foreground">{value.title}</h3>
                    <p className="mt-1.5 text-[12.5px] leading-7 text-muted-foreground">
                      {value.description}
                    </p>

                    <span className="mt-auto block pt-5" aria-hidden>
                      <span className="block h-px w-8 bg-gold/60 transition-all duration-500 group-hover:w-14" />
                    </span>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================= METRICS ================= */}
        <section className="section-y bg-background">
          <div className="shell">
            <div className="panel-ink p-7 sm:p-10 lg:p-14">
              <div className="pattern-lattice-light pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
              <div
                className="pointer-events-none absolute -bottom-28 start-1/4 h-72 w-72 rounded-full blur-3xl"
                style={{ background: "hsl(var(--gold) / 0.14)" }}
                aria-hidden
              />

              <div className="relative grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-12">
                <div>
                  <h2 className="text-[26px] font-bold leading-[1.45] text-white sm:text-[32px]">
                    {t("metrics.title")}{" "}
                    <span className="text-gold">{t("metrics.titleHighlight")}</span>
                  </h2>
                  <div className="rule-gold" aria-hidden />
                  <p className="mt-4 max-w-md text-[13.5px] leading-8 text-white/60">
                    {t("metrics.description")}
                  </p>
                  <p className="mt-4 text-[11px] text-white/35">{t("metrics.note")}</p>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4 lg:gap-x-2">
                  {metrics.map((metric, index) => (
                    <Reveal key={metric.label} delay={index * 70}>
                      <div className="flex flex-col items-center text-center">
                        <MetricRing value={metric.value} label={metric.label} tone="dark" />
                        <p className="mt-2 max-w-[7.5rem] text-[11.5px] leading-5 text-white/55">
                          {metric.label}
                        </p>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= AUDIENCE ================= */}
        <section className="section-y border-y border-border/70 bg-paper">
          <div className="shell">
            <SectionHeading
              title={t("aboutPage.audienceTitle")}
              highlight={t("aboutPage.audienceTitleHighlight")}
              description={t("aboutPage.audienceDesc")}
              align="center"
            />

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {audiences.map((item, index) => (
                <Reveal key={item.title} delay={Math.min(index, 5) * 55} className="h-full">
                  <article className="group flex h-full items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                      <item.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14.5px] font-bold text-foreground">{item.title}</h3>
                      <p className="mt-1 text-[12.5px] leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <span className="font-display text-[10.5px] font-semibold tracking-[0.16em] text-muted-foreground/35 nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================= VIDEO ================= */}
        <section className="section-y bg-background">
          <div className="shell grid items-center gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-12">
            <Reveal>
              <div className="relative">
                <div
                  className="absolute -inset-3 rounded-[30px] opacity-60 blur-2xl"
                  style={{ background: "hsl(var(--gold) / 0.16)" }}
                  aria-hidden
                />
                <div className="relative overflow-hidden rounded-3xl border border-border bg-ink shadow-xl">
                  <div className="aspect-video">
                    <iframe
                      src={aboutVideoUrl}
                      title={t("aboutExtras.videoTitle")}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                      loading="lazy"
                    />
                  </div>
                </div>
                <div
                  className="pointer-events-none absolute inset-3 rounded-[18px] border border-white/10"
                  aria-hidden
                />
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div>
                <h2 className="text-[26px] font-bold leading-[1.45] text-foreground sm:text-[32px]">
                  {t("aboutExtras.videoTitle")}
                </h2>
                <div className="rule-gold" aria-hidden />
                <p className="mt-4 text-[14px] leading-8 text-muted-foreground">
                  {t("aboutExtras.videoDesc")}
                </p>
                <p className="mt-3 text-[14px] leading-8 text-muted-foreground">
                  {t("aboutPage.intro2")}
                </p>

                <ul className="mt-6 space-y-3 border-t border-border pt-5">
                  {trustPoints.map((point) => (
                    <li key={point} className="flex items-center gap-3 text-[13px] text-foreground/75">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-soft text-gold">
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================= PORTFOLIO ================= */}
        <section className="section-y border-t border-border/70 bg-paper">
          <div className="shell">
            <SectionHeading
              title={t("aboutPage.portfolioTitle")}
              highlight={t("aboutPage.portfolioTitleHighlight")}
              action={
                <Button asChild variant="outline" className="gap-2 rounded-xl">
                  <Link to="/portfolio">
                    {t("trust.viewAll")}
                    <ArrowIcon className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              }
            />

            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {portfolio.map((item, index) => (
                <Reveal key={item.title} delay={Math.min(index, 5) * 55} className="h-full">
                  <article className="surface-card group flex h-full flex-col p-6">
                    <div className="flex items-start justify-between gap-3">
                      {item.client && (
                        <span className="rounded-full bg-gold-soft px-3 py-1 text-[11px] font-bold text-gold-strong">
                          {item.client}
                        </span>
                      )}
                      <span className="ms-auto font-display text-[11px] font-semibold tracking-[0.16em] text-muted-foreground/35 nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <h3 className="mt-5 text-[16px] font-bold leading-7 text-foreground transition-colors group-hover:text-primary">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-7 text-muted-foreground">
                      {item.description}
                    </p>

                    <span className="mt-auto block pt-6" aria-hidden>
                      <span className="block h-px w-9 bg-gold/60 transition-all duration-500 group-hover:w-16" />
                    </span>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================= CTA ================= */}
        <CtaBand />
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
