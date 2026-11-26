import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Handshake } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import Reveal from "@/components/site/Reveal";

const TrustStrip = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const { data: items } = useQuery({
    queryKey: ["portfolio-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  if (!items || items.length === 0) return null;

  return (
    <section className="border-y border-border/70 bg-background">
      <div className="shell grid gap-5 py-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-8">
        <Reveal className="lg:justify-self-start">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-gold">
              <Handshake className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-[12.5px] font-bold text-foreground">{t("trust.badge")}</p>
              <p className="text-[11px] text-muted-foreground">{t("trust.description")}</p>
            </div>
          </div>
        </Reveal>

        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3 lg:justify-center">
          {items.filter((item) => item.client?.trim()).slice(0, 4).map((item, index) => (
            <Reveal key={item.id} delay={index * 60}>
              <span className="inline-flex items-center gap-6">
                {index > 0 && (
                  <span className="hidden h-1 w-1 rotate-45 bg-gold/60 sm:inline-block" aria-hidden />
                )}
                <span
                  className="font-display text-[14px] font-semibold text-foreground/65 transition-colors hover:text-primary"
                  data-no-auto-translate
                >
                  {item.client}
                </span>
              </span>
            </Reveal>
          ))}
        </div>

        <Reveal className="lg:justify-self-end">
          <Link
            to="/portfolio"
            className="group inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary"
          >
            <span className="border-b border-transparent pb-0.5 transition-colors group-hover:border-primary">
              {t("trust.viewAll")}
            </span>
            <ArrowIcon
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5"
              aria-hidden
            />
          </Link>
        </Reveal>
      </div>
    </section>
  );
};

export default TrustStrip;
