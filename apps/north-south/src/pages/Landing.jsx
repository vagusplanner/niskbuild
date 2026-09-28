import Navbar from "../components/Navbar";
import FAQ from "../components/landing/FAQ";
import Hero from "../components/landing/Hero";
import Services from "../components/landing/Services";
import Tiers from "../components/landing/Tiers";
import About from "../components/landing/About";
import TestimonialsSection from "../components/landing/TestimonialsSection";
import FooterSection from "../components/landing/FooterSection";
import WhatWeDoSection from "../components/landing/WhatWeDoSection";
import PressBar from "../components/landing/PressBar";
import AccreditationsSection from "../components/landing/AccreditationsSection";
import LeadMagnet from "../components/landing/LeadMagnet";
import BrochureDownload from "../components/BrochureDownload";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <PressBar />
      <Services />
      <About />

      {/* Brochure download banner */}
      <div className="py-10 border-y" style={{ backgroundColor: "#F5F0E0", borderColor: "#B8952A30" }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-cormorant text-2xl font-light text-foreground">Download our Company Brochure</p>
            <p className="font-inter text-sm text-muted-foreground mt-0.5">Services, about Nishat, and our full client list — in one elegant PDF.</p>
          </div>
          <BrochureDownload />
        </div>
      </div>

      <AccreditationsSection />
      <WhatWeDoSection />
      <Tiers />
      {/* TestimonialsSection removed */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <LeadMagnet />
      </div>
      <FAQ />
      <FooterSection />
    </div>
  );
}