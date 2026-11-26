import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SectionHeading from "@/components/site/SectionHeading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FileText,
  LayoutTemplate,
  SpellCheck2,
  BookMarked,
  Link2,
  UserCheck,
  ScrollText,
  ListOrdered,
  Send,
  ShieldCheck,
  Target,
  Clock,
  Edit3,
  Info,
} from "lucide-react";
import academicFormatting from "@/assets/academic/academic-formatting.jpg";
import academicLayout from "@/assets/academic/academic-layout.jpg";
import academicProofreading from "@/assets/academic/academic-proofreading.jpg";
import academicIndexing from "@/assets/academic/academic-indexing.jpg";
import academicCitations from "@/assets/academic/academic-citations.jpg";
import academicBiographies from "@/assets/academic/academic-biographies.jpg";
import academicHadith from "@/assets/academic/academic-hadith.jpg";

const WHATSAPP_NUMBER = "201033441054";

const serviceIcons = [FileText, LayoutTemplate, SpellCheck2, BookMarked, Link2, UserCheck, ScrollText];
const serviceImages = [academicFormatting, academicLayout, academicProofreading, academicIndexing, academicCitations, academicBiographies, academicHadith];
const strengthIcons = [ShieldCheck, Target, Clock, Edit3];

const AcademicServicesPage = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");

  const services = t("academicServicesPage.services", { returnObjects: true }) as Array<{
    title: string;
    description: string;
  }>;
  const strengths = t("academicServicesPage.strengths", { returnObjects: true }) as Array<{
    title: string;
    description: string;
  }>;
  const faq = t("academicServicesPage.faq", { returnObjects: true }) as Array<{ q: string; a: string }>;

  const buildWhatsappUrl = (serviceName?: string) => {
    const lines = [t("academicServicesPage.whatsappIntro")];
    if (serviceName) lines[0] += `: ${serviceName}`;
    if (name.trim()) lines.push(`${t("academicServicesPage.whatsappNameLabel")}: ${name.trim()}`);
    if (phone.trim()) lines.push(`${t("academicServicesPage.whatsappPhoneLabel")}: ${phone.trim()}`);
    if (notes.trim()) lines.push(`${t("academicServicesPage.whatsappNotesLabel")}: ${notes.trim()}`);
    const text = encodeURIComponent(lines.join("\n"));
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  };

  const handleServiceCta = (serviceTitle: string) => {
    window.open(buildWhatsappUrl(serviceTitle), "_blank", "noopener,noreferrer");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("academicServicesPage.formNameRequired"));
      return;
    }
    if (!phone.trim()) {
      toast.error(t("academicServicesPage.formPhoneRequired"));
      return;
    }
    if (!service) {
      toast.error(t("academicServicesPage.formServiceRequired"));
      return;
    }
    window.open(buildWhatsappUrl(service), "_blank", "noopener,noreferrer");
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <Helmet>
        <title>{t("academicServicesPage.seoTitle")}</title>
        <meta name="description" content={t("academicServicesPage.seoDescription")} />
        <meta name="keywords" content={t("academicServicesPage.seoKeywords")} />
        <link rel="canonical" href="https://rawasikheg.com/academic-services" />
        <meta property="og:title" content={t("academicServicesPage.seoTitle")} />
        <meta property="og:description" content={t("academicServicesPage.seoDescription")} />
        <meta property="og:type" content="website" />
      </Helmet>

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
        <div className="shell relative z-10 py-6 lg:py-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-4 text-balance text-3xl font-bold leading-[3] text-foreground [word-spacing:0.15em] md:text-5xl">
              {t("academicServicesPage.title1")}
              {" "}
              <span className="text-primary">{t("academicServicesPage.title2")}</span>
            </h1>
            <p className="mx-auto max-w-xl text-base font-medium leading-[3] text-foreground/70 [word-spacing:0.12em] md:text-lg">
              {t("academicServicesPage.subtitle")}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2 rounded-xl px-7">
                <a href={buildWhatsappUrl()} target="_blank" rel="noopener noreferrer">
                  <Send className="h-4 w-4" />
                  {t("academicServicesPage.heroCta")}
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-xl px-7"
                onClick={() => scrollTo("academic-services-list")}
              >
                {t("academicServicesPage.heroSecondaryCta")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="academic-services-list" className="section-y scroll-mt-24 bg-muted/30">
        <div className="shell">
          <SectionHeading
            align="center"
            title={t("academicServicesPage.servicesSectionTitle")}
            description={t("academicServicesPage.servicesSectionSubtitle")}
            className="mb-8"
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => {
              const Icon = serviceIcons[index] ?? FileText;
              const image = serviceImages[index];
              return (
                <article key={index} className="surface-card group flex h-full flex-col overflow-hidden">
                  {image && (
                    <div className="relative aspect-[3/2] overflow-hidden">
                      <img
                        src={image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/5"
                        aria-hidden
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <span className="relative z-10 -mt-9 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-soft text-gold ring-4 ring-card transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <h3 className="mt-5 text-[17px] font-bold text-foreground">{service.title}</h3>
                    <p className="mt-2 flex-1 text-[13.5px] leading-8 text-muted-foreground">{service.description}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 self-start gap-2 px-0 text-primary hover:bg-transparent hover:text-primary"
                      onClick={() => handleServiceCta(service.title)}
                    >
                      <Send className="h-4 w-4" />
                      {t("academicServicesPage.servicesCta")}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Strengths */}
      <section className="section-y bg-muted/30">
        <div className="shell">
          <SectionHeading align="center" title={t("academicServicesPage.strengthsSectionTitle")} className="mb-8" />
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {strengths.map((strength, index) => {
              const Icon = strengthIcons[index] ?? ShieldCheck;
              return (
                <article key={index} className="surface-card p-6 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-primary">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-bold text-foreground">{strength.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-8 text-muted-foreground">{strength.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Request form */}
      <section id="academic-services-form" className="section-y scroll-mt-24 bg-muted/30">
        <div className="shell">
          <div className="mx-auto max-w-xl">
            <SectionHeading
              align="center"
              title={t("academicServicesPage.formSectionTitle")}
              description={t("academicServicesPage.formSectionSubtitle")}
              className="mb-8"
            />
            <Card className="p-6 md:p-8">
              <form onSubmit={handleFormSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="as-name">{t("academicServicesPage.formName")}</Label>
                  <Input
                    id="as-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("academicServicesPage.formNamePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="as-phone">{t("academicServicesPage.formPhone")}</Label>
                  <Input
                    id="as-phone"
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="as-service">{t("academicServicesPage.formService")}</Label>
                  <Select value={service} onValueChange={setService}>
                    <SelectTrigger id="as-service">
                      <SelectValue placeholder={t("academicServicesPage.formServicePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s, index) => (
                        <SelectItem key={index} value={s.title}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="as-notes">{t("academicServicesPage.formNotes")}</Label>
                  <Textarea
                    id="as-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("academicServicesPage.formNotesPlaceholder")}
                    rows={4}
                  />
                </div>
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ListOrdered className="mt-0.5 h-4 w-4 shrink-0" />
                  {t("academicServicesPage.formAttachmentsHint")}
                </p>
                <Button type="submit" size="lg" className="w-full gap-2 rounded-xl">
                  <Send className="h-4 w-4" />
                  {t("academicServicesPage.formSubmit")}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ + disclaimer */}
      <section className="section-y">
        <div className="shell">
          <div className="mx-auto max-w-3xl">
            <SectionHeading align="center" title={t("academicServicesPage.faqSectionTitle")} className="mb-8" />
            <Accordion type="single" collapsible className="space-y-3">
              {faq.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`faq-${index}`}
                  className="rounded-xl border border-border bg-card px-5"
                >
                  <AccordionTrigger className="text-start font-semibold hover:no-underline">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-[13.5px] leading-8 text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <Alert className="mt-8 border-primary/25 bg-primary/5">
              <Info className="h-5 w-5 text-primary" />
              <AlertTitle className="font-bold">{t("academicServicesPage.disclaimerTitle")}</AlertTitle>
              <AlertDescription className="text-[13.5px] leading-8 text-muted-foreground">
                {t("academicServicesPage.disclaimerText")}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pb-12 md:pb-16">
        <div className="shell">
          <div className="panel-ink px-6 py-12 text-center shadow-xl sm:px-12">
            <div className="pattern-lattice-light pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden />
            <div
              className="pointer-events-none absolute -bottom-28 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
              style={{ background: "hsl(var(--gold) / 0.20)" }}
              aria-hidden
            />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-[26px] font-bold leading-[1.4] text-white sm:text-[34px]">
                {t("academicServicesPage.ctaFinalTitle")}
              </h2>
              <div className="divider-gold mx-auto h-px w-40" aria-hidden />
              <p className="mt-4 text-[14.5px] leading-8 text-white/70">
                {t("academicServicesPage.ctaFinalSubtitle")}
              </p>
              <Button asChild size="lg" variant="secondary" className="mt-6 gap-2 rounded-xl px-7">
                <a href={buildWhatsappUrl()} target="_blank" rel="noopener noreferrer">
                  <Send className="h-4 w-4" />
                  {t("academicServicesPage.ctaFinalButton")}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AcademicServicesPage;
