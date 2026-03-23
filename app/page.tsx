import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Benefits } from "@/components/Benefits";
import { Services } from "@/components/Services";
import { HowItWorks } from "@/components/HowItWorks";
import { Conditions } from "@/components/Conditions";
import { PriceExamples } from "@/components/PriceExamples";
import { ActivityFeed } from "@/components/ActivityFeed";
import { AnonymityBlock } from "@/components/AnonymityBlock";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { getServiceItemListJsonLd } from "@/lib/service-details";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl.replace(/\/$/, "")}/#website`,
      name: "Raketa Pay",
      url: siteUrl.replace(/\/$/, ""),
      inLanguage: "ru-RU",
      description:
        "Сервис оплаты зарубежных подписок, софта, путешествий, маркетплейсов и игр из России.",
      publisher: { "@id": `${siteUrl.replace(/\/$/, "")}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl.replace(/\/$/, "")}/#organization`,
      name: "Raketa Pay",
      url: siteUrl.replace(/\/$/, ""),
      sameAs: ["https://t.me/raketa_pay"],
    },
    getServiceItemListJsonLd(),
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <Nav />
      <main className="pt-20 sm:pt-24 pb-16 sm:pb-20 px-3 sm:px-4 md:px-8 max-w-7xl mx-auto noise-bg safe-area-pb">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 auto-rows-min">
          <Hero />
          <Benefits />
          <Services />
          <HowItWorks />
          <Conditions />
          <PriceExamples />
          <ActivityFeed />
          <AnonymityBlock />
          <CTA />
        </div>
      </main>
      <Footer />
    </>
  );
}
