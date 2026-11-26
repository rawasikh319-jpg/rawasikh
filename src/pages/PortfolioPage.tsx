import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import SmartImage from "@/components/site/SmartImage";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase } from "lucide-react";
import { portfolioFallbackImage } from "@/lib/portfolioImages";
import portfolioFallbackLibrary from "@/assets/blog-fallback-library.jpg";

const PortfolioPage = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const { data: items, isLoading } = useQuery({
    queryKey: ["portfolio-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <SEO
        title="أعمالنا — معرض المشروعات"
        description="معرض أعمال رواسخ: مشروعات ومبادرات في التعليم والتدريب والخدمات الأكاديمية والترجمة."
        path="/portfolio"
        keywords={["أعمال رواسخ", "مشروعات", "معرض أعمال", "دراسات حالة"]}
      />
      <Header />

      {/* Hero */}
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
        <div className="shell py-6 lg:py-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-balance text-3xl leading-[1.4] md:text-5xl font-bold text-foreground mb-4">
              {t("portfolioSection.title")}
              <span className="text-primary">{t("portfolioSection.titleHighlight")}</span>
            </h1>
            <p className="mx-auto max-w-xl text-base leading-8 text-foreground/70 font-medium md:text-lg">{t("portfolioSection.description")}</p>
          </div>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="py-8 lg:py-12">
        <div className="shell">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-12">{t("portfolioSection.loading")}</p>
          ) : !items || items.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">{t("portfolioSection.empty")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => {
                const image = item.image_url || portfolioFallbackImage(item.title) || portfolioFallbackLibrary;
                return (
                <Card key={item.id} className="h-full flex flex-col overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  {image ? (
                    <SmartImage
                      src={image}
                      alt={item.title}
                      width={480}
                      height={192}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 92vw"
                      quality={72}
                      wrapperClassName="h-48 w-full"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-muted flex items-center justify-center">
                      <Briefcase className="h-14 w-14 text-primary/40" />
                    </div>
                  )}
                  <CardContent className="p-6 flex flex-col flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-1">{item.title}</h3>
                    {item.client && (
                      <p className="text-primary text-sm font-medium mb-3">{item.client}</p>
                    )}
                    <p className="text-muted-foreground text-sm leading-relaxed flex-1">{item.description}</p>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PortfolioPage;
