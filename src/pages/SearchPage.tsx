import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  BookOpen,
  Briefcase,
  ClipboardList,
  Code2,
  FileText,
  GraduationCap,
  Home,
  Info,
  Layers,
  Mail,
  Newspaper,
  SearchX,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import SearchField from "@/components/site/SearchField";
import SmartImage from "@/components/site/SmartImage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getBlogImageUrl } from "@/lib/blogImageFallbacks";
import { portfolioFallbackImage } from "@/lib/portfolioImages";
import { useTermsTranslation } from "@/hooks/useTermsTranslation";
import portfolioFallbackLibrary from "@/assets/blog-fallback-library.jpg";

type CourseResult = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  instructor_name: string | null;
};

type PostResult = {
  id: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  image_url: string | null;
  read_time: string | null;
};

type ProductResult = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  price: number;
};

type PortfolioResult = {
  id: string;
  title: string;
  client: string;
  description: string;
  image_url: string | null;
};

type ExamResult = {
  id: string;
  name: string;
  description: string | null;
};

type SearchResults = {
  courses: CourseResult[];
  posts: PostResult[];
  products: ProductResult[];
  portfolio: PortfolioResult[];
  exams: ExamResult[];
};

type StaticPage = {
  to: string;
  title: string;
  description: string;
  keywords: string[];
  icon: LucideIcon;
};

const EMPTY_RESULTS: SearchResults = {
  courses: [],
  posts: [],
  products: [],
  portfolio: [],
  exams: [],
};

/** Normalises Arabic letter variants and diacritics so a query like "لغه"
 * still matches "اللغة" in the static page index. */
const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();

/** PostgREST splits `or=(...)` on commas and parentheses, so those characters
 * cannot be sent inside an `ilike` value. LIKE wildcards are stripped too. */
const sanitizeTerm = (value: string) =>
  value
    .replace(/[(),%\\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildOrFilter = (fields: string[], terms: string[]) =>
  terms
    .flatMap((term) => fields.map((field) => `${field}.ilike.%${term}%`))
    .join(",");

/** Adds Arabic source terms when the visitor searches in another language.
 * The translation cache is populated by useTermsTranslation across the site,
 * so no extra network request is needed for terms the visitor already saw. */
const translatedQueryCache = new Map<string, string>();

const translateQueryToArabic = async (text: string, sourceLanguage: string) => {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=ar` +
    `&dt=t&q=${encodeURIComponent(text)}`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`gtranslate ${response.status}`);
    const data = await response.json();
    return Array.isArray(data?.[0])
      ? data[0].map((segment: unknown[]) => (segment?.[0] as string) || "").join("")
      : text;
  } finally {
    window.clearTimeout(timeout);
  }
};

/** Arabic plurals and the definite article are the main reason a query like
 * "دورات" misses a title containing "دورة". Generate a few cheap variants
 * instead of shipping a stemming library. */
const arabicVariants = (term: string) => {
  const variants: string[] = [];
  const add = (value: string) => {
    if (value.length >= 2 && value !== term) variants.push(value);
  };

  const withoutArticle = term.startsWith("ال") && term.length > 4 ? term.slice(2) : term;
  add(withoutArticle);

  if (withoutArticle.endsWith("ات") && withoutArticle.length > 4) {
    const stem = withoutArticle.slice(0, -2);
    add(`${stem}ة`);
    add(stem);
  }
  if (withoutArticle.endsWith("ين") && withoutArticle.length > 4) {
    add(withoutArticle.slice(0, -2));
  }
  if (withoutArticle.endsWith("ون") && withoutArticle.length > 4) {
    add(withoutArticle.slice(0, -2));
  }

  return variants;
};

const expandSearchTerms = async (query: string, language: string) => {
  const terms = new Set<string>();
  const add = (value: string) => {
    const cleaned = sanitizeTerm(value);
    if (cleaned.length < 2) return;
    terms.add(cleaned);
    if (/[\u0600-\u06FF]/.test(cleaned)) {
      arabicVariants(cleaned).forEach((variant) => terms.add(variant));
    }
  };

  add(query);
  query.split(/\s+/).forEach(add);

  if (language !== "ar") {
    try {
      const raw = localStorage.getItem(`terms-tr:${language}`);
      if (raw) {
        const cached = JSON.parse(raw) as Record<string, unknown>;
        const needle = query.toLowerCase();
        for (const [source, translated] of Object.entries(cached)) {
          if (typeof translated !== "string") continue;
          if (translated.toLowerCase().includes(needle)) add(source);
          if (terms.size >= 6) break;
        }
      }
    } catch {
      /* A broken cache should never break search. */
    }

    // The database content is Arabic. Translate the query so English, French
    // and Urdu visitors can find it without knowing the Arabic wording.
    if (query.length >= 3 && !/[\u0600-\u06FF]/.test(query)) {
      try {
        const cacheKey = `${language}:${query.toLowerCase()}`;
        let arabic = translatedQueryCache.get(cacheKey);
        if (arabic === undefined) {
          if (translatedQueryCache.size > 100) translatedQueryCache.clear();
          arabic = await translateQueryToArabic(query, language);
          translatedQueryCache.set(cacheKey, arabic);
        }
        add(arabic);
      } catch {
        /* Offline or rate-limited: keep searching with the original term. */
      }
    }
  }

  return Array.from(terms).slice(0, 6);
};

const plainText = (value?: string | null) =>
  (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const truncate = (value: string, max = 170) =>
  value.length > max ? `${value.slice(0, max).trimEnd()}…` : value;

const Highlight = ({ text, query }: { text: string; query: string }) => {
  const term = query.trim();
  if (!term) return <>{text}</>;

  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark key={index} className="rounded bg-gold/35 px-0.5 text-inherit">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
};

const ResultSection = ({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  children: ReactNode;
}) => (
  <section className="mb-10 last:mb-0">
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
      <span className="nums rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
        {count}
      </span>
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);

const ResultLink = ({
  to,
  icon: Icon,
  image,
  imageAlt,
  eyebrow,
  title,
  description,
  meta,
  query,
}: {
  to: string;
  icon: LucideIcon;
  image?: string | null;
  imageAlt?: string;
  eyebrow?: string;
  title: string;
  description?: string | null;
  meta?: string;
  query: string;
}) => (
  <Link
    to={to}
    className="group flex items-start gap-3.5 rounded-2xl border border-border bg-card p-3.5 transition-all duration-300 hover:border-primary/40 hover:shadow-md sm:gap-4 sm:p-4"
  >
    {image ? (
      <SmartImage
        src={image}
        alt={imageAlt || title}
        width={160}
        height={112}
        sizes="(min-width: 640px) 104px, 64px"
        quality={70}
        wrapperClassName="h-16 w-16 shrink-0 rounded-xl sm:h-[74px] sm:w-[104px]"
      />
    ) : (
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-[74px] sm:w-[104px]">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
    )}

    <div className="min-w-0 flex-1">
      {eyebrow && (
        <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
          {eyebrow}
        </p>
      )}
      <h3 className="text-[14.5px] font-bold leading-7 text-foreground transition-colors group-hover:text-primary sm:text-[15.5px]">
        <Highlight text={title} query={query} />
      </h3>
      {description && (
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-6 text-muted-foreground sm:text-[13px]">
          <Highlight text={truncate(plainText(description))} query={query} />
        </p>
      )}
      {meta && <p className="mt-1.5 text-[11.5px] text-muted-foreground">{meta}</p>}
    </div>

    <ArrowUpRight
      className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary"
      aria-hidden
    />
  </Link>
);

const SearchPage = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim();
  const [input, setInput] = useState(searchParams.get("q") || "");

  // Keep the field in sync with back/forward navigation and header searches.
  useEffect(() => {
    setInput(searchParams.get("q") || "");
  }, [searchParams]);

  // Live search: reflect typing in the URL after a short pause so results can
  // be shared/bookmarked and back/forward still works.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = input.trim();
      if (next === query) return;
      setSearchParams(next ? { q: next } : {}, { replace: true });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [input, query, setSearchParams]);

  const submitSearch = (value: string) => {
    const term = value.trim();
    setSearchParams(term ? { q: term } : {}, { replace: false });
  };

  const staticPages = useMemo<StaticPage[]>(
    () => [
      {
        to: "/",
        title: t("nav.home"),
        description: t("searchPage.pageDescriptions.home"),
        keywords: ["الرئيسية", "رواسخ", "home", "rawasikh"],
        icon: Home,
      },
      {
        to: "/about",
        title: t("nav.about"),
        description: t("searchPage.pageDescriptions.about"),
        keywords: ["من نحن", "رؤية", "رسالة", "قيم", "about", "vision", "mission", "values"],
        icon: Info,
      },
      {
        to: "/courses",
        title: t("nav.courses"),
        description: t("searchPage.pageDescriptions.courses"),
        keywords: ["دورات", "كورسات", "برامج تدريبية", "courses", "training", "programs"],
        icon: BookOpen,
      },
      {
        to: "/services",
        title: t("nav.services"),
        description: t("searchPage.pageDescriptions.services"),
        keywords: ["خدمات", "تدريب", "تعليم", "ترجمة", "services", "training", "education", "translation"],
        icon: Wrench,
      },
      {
        to: "/academic-services",
        title: t("nav.academicServices"),
        description: t("searchPage.pageDescriptions.academicServices"),
        keywords: ["خدمات أكاديمية", "بحث", "رسائل", "ماجستير", "دكتوراه", "academic", "research", "thesis"],
        icon: GraduationCap,
      },
      {
        to: "/digital-solutions",
        title: t("nav.digitalSolutions"),
        description: t("searchPage.pageDescriptions.digitalSolutions"),
        keywords: ["منصات", "مواقع", "تطبيقات", "برمجة", "digital", "platform", "website", "app", "software"],
        icon: Code2,
      },
      {
        to: "/level-assessment",
        title: t("nav.levelAssessment"),
        description: t("searchPage.pageDescriptions.levelAssessment"),
        keywords: ["تحديد المستوى", "اختبار مستوى", "level", "placement", "assessment"],
        icon: GraduationCap,
      },
      {
        to: "/evaluation-tests",
        title: t("searchPage.sections.exams"),
        description: t("searchPage.pageDescriptions.evaluationTests"),
        keywords: ["اختبارات", "تقييم", "امتحانات", "evaluation", "tests", "exam"],
        icon: ClipboardList,
      },
      {
        to: "/store",
        title: t("nav.store"),
        description: t("searchPage.pageDescriptions.store"),
        keywords: ["متجر", "كتب", "منتجات", "store", "shop", "products", "books"],
        icon: ShoppingBag,
      },
      {
        to: "/blog",
        title: t("nav.blog"),
        description: t("searchPage.pageDescriptions.blog"),
        keywords: ["مقالات", "مدونة", "أبحاث", "blog", "articles", "research"],
        icon: Newspaper,
      },
      {
        to: "/portfolio",
        title: t("portfolioSection.title") + t("portfolioSection.titleHighlight"),
        description: t("searchPage.pageDescriptions.portfolio"),
        keywords: ["أعمال", "مشروعات", "portfolio", "projects", "work"],
        icon: Briefcase,
      },
      {
        to: "/contact",
        title: t("nav.contact"),
        description: t("searchPage.pageDescriptions.contact"),
        keywords: ["اتصل", "تواصل", "هاتف", "واتساب", "contact", "phone", "whatsapp"],
        icon: Mail,
      },
      {
        to: "/policies",
        title: t("nav.policies"),
        description: t("searchPage.pageDescriptions.policies"),
        keywords: ["سياسات", "خصوصية", "استرداد", "policies", "privacy", "refund"],
        icon: FileText,
      },
      {
        to: "/cart",
        title: t("nav.cart"),
        description: t("searchPage.pageDescriptions.cart"),
        keywords: ["سلة", "مشتريات", "cart", "checkout"],
        icon: ShoppingCart,
      },
    ],
    [t],
  );

  const browseLinks = useMemo(
    () => [
      {
        to: "/courses",
        title: t("nav.courses"),
        description: t("coursesPage.subtitle"),
        icon: BookOpen,
      },
      {
        to: "/services",
        title: t("nav.services"),
        description: t("servicesPage.subtitle"),
        icon: Layers,
      },
      {
        to: "/blog",
        title: t("nav.blog"),
        description: t("blogPage.subtitle"),
        icon: Newspaper,
      },
      {
        to: "/store",
        title: t("nav.store"),
        description: t("storePage.subtitle"),
        icon: ShoppingBag,
      },
      {
        to: "/portfolio",
        title: t("portfolioSection.title") + t("portfolioSection.titleHighlight"),
        description: t("portfolioSection.description"),
        icon: Briefcase,
      },
      {
        to: "/evaluation-tests",
        title: t("searchPage.sections.exams"),
        description: t("searchPage.pageDescriptions.evaluationTests"),
        icon: ClipboardList,
      },
      {
        to: "/level-assessment",
        title: t("nav.levelAssessment"),
        description: t("searchPage.pageDescriptions.levelAssessment"),
        icon: GraduationCap,
      },
      {
        to: "/contact",
        title: t("nav.contact"),
        description: t("searchPage.pageDescriptions.contact"),
        icon: Mail,
      },
    ],
    [t],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["site-search", query, i18n.language],
    enabled: query.length >= 2,
    staleTime: 60_000,
    queryFn: async (): Promise<SearchResults> => {
      const terms = await expandSearchTerms(query, i18n.language);
      if (terms.length === 0) return EMPTY_RESULTS;

      const [coursesResult, postsResult, productsResult, portfolioResult, examsResult] =
        await Promise.all([
          supabase
            .from("courses")
            .select("id, title, description, thumbnail_url, instructor_name")
            .eq("is_published", true)
            .or(buildOrFilter(["title", "description", "instructor_name"], terms))
            .order("display_order", { ascending: true })
            .limit(12),
          supabase
            .from("blog_posts")
            .select("id, title, excerpt, category, image_url, read_time")
            .eq("is_published", true)
            .or(buildOrFilter(["title", "excerpt", "category"], terms))
            .order("created_at", { ascending: false })
            .limit(12),
          supabase
            .from("products")
            .select("id, name, description, category, image_url, price")
            .eq("is_active", true)
            .gt("stock_quantity", 0)
            .or(buildOrFilter(["name", "description", "category"], terms))
            .order("created_at", { ascending: false })
            .limit(12),
          supabase
            .from("portfolio")
            .select("id, title, client, description, image_url")
            .eq("is_active", true)
            .or(buildOrFilter(["title", "client", "description"], terms))
            .order("order_index", { ascending: true })
            .limit(12),
          supabase
            .from("exam_categories")
            .select("id, name, description")
            .eq("is_active", true)
            .or(buildOrFilter(["name", "description"], terms))
            .order("order_index", { ascending: true })
            .limit(12),
        ]);

      for (const [label, result] of [
        ["courses", coursesResult],
        ["blog", postsResult],
        ["products", productsResult],
        ["portfolio", portfolioResult],
        ["exams", examsResult],
      ] as const) {
        if (result.error) console.error(`Site search (${label}) failed:`, result.error);
      }

      const tokens = query.split(/\s+/).filter((token) => token.length >= 2);
      const score = (value: string) => {
        const haystack = normalize(value);
        const full = normalize(query);
        const exact = full && haystack.includes(full) ? 100 : 0;
        return (
          exact +
          tokens.reduce(
            (total, token) => total + (haystack.includes(normalize(token)) ? 10 : 0),
            0,
          )
        );
      };

      const rank = <T,>(items: T[], getText: (item: T) => string) =>
        items
          .map((item) => ({ item, value: score(getText(item)) }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
          .map(({ item }) => item);

      return {
        courses: rank(
          (coursesResult.data ?? []) as CourseResult[],
          (course) => `${course.title} ${course.description || ""} ${course.instructor_name || ""}`,
        ),
        posts: rank(
          (postsResult.data ?? []) as PostResult[],
          (post) => `${post.title} ${post.excerpt || ""} ${post.category || ""}`,
        ),
        products: rank(
          (productsResult.data ?? []) as ProductResult[],
          (product) => `${product.name} ${product.description || ""} ${product.category || ""}`,
        ),
        portfolio: rank(
          (portfolioResult.data ?? []) as PortfolioResult[],
          (item) => `${item.title} ${item.client} ${item.description}`,
        ),
        exams: rank(
          (examsResult.data ?? []) as ExamResult[],
          (exam) => `${exam.name} ${exam.description || ""}`,
        ),
      };
    },
  });

  const results = data ?? EMPTY_RESULTS;

  const translatedTerms = useMemo(
    () => [
      ...results.courses.flatMap((course) => [course.title, course.instructor_name]),
      ...results.posts.flatMap((post) => [post.title, post.category, post.read_time]),
      ...results.products.flatMap((product) => [product.name, product.category]),
      ...results.portfolio.flatMap((item) => [item.title, item.client]),
      ...results.exams.map((exam) => exam.name),
    ],
    [results],
  );
  const { tt } = useTermsTranslation(translatedTerms);

  // DB copy is Arabic-only. In other languages the titles and metadata are
  // translated, but showing the untranslated paragraphs would mix scripts.
  const showDescriptions = i18n.language === "ar";

  const staticMatches = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (normalizedQuery.length < 2) return [];

    const tokens = normalizedQuery.split(" ").filter(Boolean);
    return staticPages.filter((page) => {
      const haystack = normalize(
        `${page.title} ${page.description} ${page.keywords.join(" ")}`,
      );
      return tokens.every((token) => haystack.includes(token));
    });
  }, [query, staticPages]);

  const totalResults =
    staticMatches.length +
    results.courses.length +
    results.posts.length +
    results.products.length +
    results.portfolio.length +
    results.exams.length;

  const showLoading = query.length >= 2 && isLoading;
  const showNoResults = query.length >= 2 && !showLoading && totalResults === 0;

  return (
    <div className="flex min-h-screen flex-col bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <SEO
        title={query ? `${t("searchPage.title")}: ${query}` : t("searchPage.title")}
        description={t("searchPage.subtitle")}
        path="/search"
        noIndex
      />
      <Header />

      <main className="flex-1">
        {/* ---- Hero ---- */}
        <section className="relative overflow-hidden border-b border-border/70 bg-paper">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(80% 90% at 90% 0%, hsl(var(--primary) / 0.10) 0%, transparent 60%), radial-gradient(60% 70% at 0% 100%, hsl(var(--gold) / 0.12) 0%, transparent 65%)",
            }}
            aria-hidden
          />
          <div className="pattern-lattice pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden />

          <div className="shell relative z-10 py-8 lg:py-10">
            <nav
              className="mb-3 flex items-center gap-2 text-[12.5px] text-muted-foreground"
              aria-label="مسار التنقل"
            >
              <Link to="/" className="transition-colors hover:text-primary">
                {t("nav.home")}
              </Link>
              <span aria-hidden>/</span>
              <span className="font-medium text-foreground">{t("searchPage.badge")}</span>
            </nav>

            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11.5px] font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {t("searchPage.badge")}
              </span>
              <h1 className="mt-3 text-balance text-[28px] font-bold leading-[1.35] text-foreground sm:text-[36px] lg:text-[42px]">
                {t("searchPage.title")}
              </h1>
              <span className="rule-gold mx-auto" aria-hidden />
              <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-8 text-muted-foreground sm:text-[15px]">
                {t("searchPage.subtitle")}
              </p>

              <div className="mx-auto mt-5 max-w-2xl text-start">
                <SearchField
                  value={input}
                  onChange={setInput}
                  onSubmit={submitSearch}
                  placeholder={t("searchPage.placeholder")}
                  ariaLabel={t("searchPage.placeholder")}
                  size="lg"
                  action={
                    <Button type="submit" className="h-10 shrink-0 rounded-full px-4 text-sm sm:px-5">
                      {t("common.search")}
                    </Button>
                  }
                />
                {isFetching && !showLoading && (
                  <p className="mt-2 ps-2 text-[11.5px] text-muted-foreground">
                    {t("searchPage.loading")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ---- Results / start state ---- */}
        <section className="py-8 lg:py-12">
          <div className="shell">
            {query.length < 2 ? (
              <div>
                <div className="mx-auto max-w-2xl text-center">
                  <h2 className="text-2xl font-bold text-foreground">
                    {t("searchPage.startTitle")}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {query.length === 1 ? t("searchPage.typeMore") : t("searchPage.startDesc")}
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {browseLinks.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <item.icon className="h-5 w-5" aria-hidden />
                      </span>
                      <h3 className="mt-4 text-[15px] font-bold text-foreground transition-colors group-hover:text-primary">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-3 flex-1 text-[12.5px] leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
                        {t("searchPage.browseTitle")}
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : showLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-52 rounded-full" />
                {[1, 2, 3, 4, 5].map((item) => (
                  <Skeleton key={item} className="h-[104px] w-full rounded-2xl" />
                ))}
              </div>
            ) : showNoResults ? (
              <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
                <SearchX className="mx-auto h-14 w-14 text-muted-foreground/35" aria-hidden />
                <h2 className="mt-4 text-xl font-bold text-foreground">
                  {t("searchPage.noResultsTitle", { query })}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                  {t("searchPage.noResultsDesc")}
                </p>
                <Button asChild variant="outline" className="mt-6 rounded-full">
                  <Link to="/">{t("common.backToHome")}</Link>
                </Button>
              </div>
            ) : (
              <div>
                <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <p className="text-sm text-muted-foreground">
                    {t("searchPage.resultsFor")}{" "}
                    <span className="font-semibold text-foreground">«{query}»</span>
                  </p>
                  <span className="nums rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                    {t("searchPage.resultsCount", { count: totalResults })}
                  </span>
                </div>

                {results.courses.length > 0 && (
                  <ResultSection
                    icon={BookOpen}
                    title={t("searchPage.sections.courses")}
                    count={results.courses.length}
                  >
                    {results.courses.map((course) => (
                      <ResultLink
                        key={course.id}
                        to={`/courses/${course.id}`}
                        icon={BookOpen}
                        image={course.thumbnail_url}
                        imageAlt={course.title}
                        eyebrow={t("searchPage.labels.course")}
                        title={tt(course.title)}
                        description={showDescriptions ? course.description : undefined}
                        meta={course.instructor_name ? tt(course.instructor_name) : undefined}
                        query={query}
                      />
                    ))}
                  </ResultSection>
                )}

                {results.posts.length > 0 && (
                  <ResultSection
                    icon={Newspaper}
                    title={t("searchPage.sections.articles")}
                    count={results.posts.length}
                  >
                    {results.posts.map((post) => (
                      <ResultLink
                        key={post.id}
                        to={`/blog/${post.id}`}
                        icon={Newspaper}
                        image={getBlogImageUrl(post)}
                        imageAlt={post.title}
                        eyebrow={t("searchPage.labels.article")}
                        title={tt(post.title)}
                        description={showDescriptions ? post.excerpt : undefined}
                        meta={[post.category ? tt(post.category) : "", post.read_time ? tt(post.read_time) : ""]
                          .filter(Boolean)
                          .join(" · ")}
                        query={query}
                      />
                    ))}
                  </ResultSection>
                )}

                {results.products.length > 0 && (
                  <ResultSection
                    icon={ShoppingBag}
                    title={t("searchPage.sections.products")}
                    count={results.products.length}
                  >
                    {results.products.map((product) => (
                      <ResultLink
                        key={product.id}
                        to={`/store/${product.id}`}
                        icon={ShoppingBag}
                        image={product.image_url}
                        imageAlt={product.name}
                        eyebrow={t("searchPage.labels.product")}
                        title={tt(product.name)}
                        description={showDescriptions ? product.description : undefined}
                        meta={[
                          product.category ? tt(product.category) : "",
                          `${product.price.toLocaleString()} ${t("storePage.currency")}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        query={query}
                      />
                    ))}
                  </ResultSection>
                )}

                {results.portfolio.length > 0 && (
                  <ResultSection
                    icon={Briefcase}
                    title={t("searchPage.sections.portfolio")}
                    count={results.portfolio.length}
                  >
                    {results.portfolio.map((item) => (
                      <ResultLink
                        key={item.id}
                        to="/portfolio"
                        icon={Briefcase}
                        image={
                          item.image_url ||
                          portfolioFallbackImage(item.title) ||
                          portfolioFallbackLibrary
                        }
                        imageAlt={item.title}
                        eyebrow={t("searchPage.labels.project")}
                        title={tt(item.title)}
                        description={showDescriptions ? item.description : undefined}
                        meta={item.client ? tt(item.client) : undefined}
                        query={query}
                      />
                    ))}
                  </ResultSection>
                )}

                {results.exams.length > 0 && (
                  <ResultSection
                    icon={ClipboardList}
                    title={t("searchPage.sections.exams")}
                    count={results.exams.length}
                  >
                    {results.exams.map((exam) => (
                      <ResultLink
                        key={exam.id}
                        to={`/evaluation-tests/${exam.id}`}
                        icon={ClipboardList}
                        eyebrow={t("searchPage.labels.exam")}
                        title={tt(exam.name)}
                        description={showDescriptions ? exam.description : undefined}
                        query={query}
                      />
                    ))}
                  </ResultSection>
                )}

                {staticMatches.length > 0 && (
                  <ResultSection
                    icon={Layers}
                    title={t("searchPage.sections.pages")}
                    count={staticMatches.length}
                  >
                    {staticMatches.map((page) => (
                      <ResultLink
                        key={page.to}
                        to={page.to}
                        icon={page.icon}
                        eyebrow={t("searchPage.labels.page")}
                        title={page.title}
                        description={page.description}
                        query={query}
                      />
                    ))}
                  </ResultSection>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SearchPage;
