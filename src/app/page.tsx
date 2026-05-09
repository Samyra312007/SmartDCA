"use client";

import Link                    from "next/link";
import { useWallet }           from "@solana/wallet-adapter-react";
import { Button }              from "@/components/ui/button";
import { Card, CardContent }   from "@/components/ui/card";
import { VoiceDemoButton }     from "@/components/voice/VoiceDemoButton";
import { Navbar }              from "@/components/layout/Navbar";
import { 
  Target, 
  Zap, 
  Shield, 
  Globe, 
  Volume2, 
  ArrowRight, 
  Workflow, 
  Layers,
  Repeat
} from "lucide-react";


function FeatureCard({
  icon: Icon,
  title,
  description,
  tag,
}: {
  icon:        any;
  title:       string;
  description: string;
  tag:         string;
}) {
  return (
    <Card className="p-6 space-y-4 hover:border-solana-purple/50 transition-all duration-300 bg-card/30 backdrop-blur-sm group">
      <div className="flex items-start justify-between">
        <div className="size-10 rounded-lg bg-solana-purple/10 flex items-center justify-center text-solana-purple group-hover:scale-110 transition-transform">
          <Icon className="size-5" />
        </div>
        <span className="text-[10px] font-bold px-2 py-1 bg-solana-purple/10 
                       text-solana-purple rounded-full border border-solana-purple/20 uppercase tracking-widest">
          {tag}
        </span>
      </div>
      <div className="space-y-2">
        <h3 className="font-bold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </Card>
  );
}


function StepCard({
  number,
  title,
  description,
  icon: Icon,
}: {
  number:      string;
  title:       string;
  description: string;
  icon:        any;
}) {
  return (
    <div className="flex gap-6 group">
      <div className="flex-shrink-0 size-12 rounded-2xl bg-muted/50 
                    border border-border/50 flex items-center justify-center group-hover:border-solana-green/50 transition-colors">
        <span className="text-sm font-black font-mono gradient-text">{number}</span>
      </div>
      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-solana-green" />
          <h3 className="font-bold text-foreground text-sm uppercase tracking-tight">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}


export default function LandingPage() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden pt-20">
          
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 
                          w-[800px] h-[800px] rounded-full
                          bg-solana-purple/15 blur-[160px] animate-pulse-slow" />
            <div className="absolute bottom-1/4 right-1/4 
                          w-[500px] h-[500px] rounded-full
                          bg-solana-green/10 blur-[120px] animate-pulse-slow" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto text-center space-y-12">
            
            <div className="inline-flex items-center gap-3 px-4 py-1.5 
                          rounded-full border border-solana-purple/30 
                          bg-solana-purple/5 text-solana-purple text-xs font-bold uppercase tracking-widest animate-fade-in">
              <span className="size-1.5 rounded-full bg-solana-purple animate-ping" />
              Next-Gen DCA Infrastructure
            </div>

            <div className="space-y-6">
              <h1 className="text-6xl sm:text-8xl font-black text-foreground leading-[0.9] tracking-tighter">
                DCA ON YOUR<br />
                <span className="gradient-text">CONDITIONS</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
                The first condition-based DCA protocol on Solana. 
                Execute trades when <span className="text-foreground font-bold">price drops</span>, 
                not just when time passes. Fully automated, cross-chain, and voice-alerted.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center 
                          justify-center gap-4 pt-4">
              <Link href={connected ? "/create" : "/create"}>
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-10 h-14 text-base font-bold rounded-2xl bg-gradient-to-r from-solana-purple to-solana-green text-black hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] glow-purple"
                >
                  Get Started <ArrowRight className="size-4 ml-2" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto px-10 h-14 text-base font-bold rounded-2xl border-border/50 bg-muted/20 backdrop-blur-sm hover:bg-muted/40 transition-all"
                >
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="py-32 px-6 relative border-t border-border/50">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-4xl font-black text-foreground leading-tight tracking-tighter">
                    PRECISION INVESTING<br />
                    <span className="text-muted-foreground">REDEFINED.</span>
                  </h2>
                  <p className="text-muted-foreground leading-relaxed max-w-md font-medium">
                    Stop letting fixed schedules dictate your entry points. 
                    SmartDCA lets you define the exact market conditions for your trades.
                  </p>
                </div>

                <div className="space-y-10">
                  <StepCard
                    number="01"
                    icon={Target}
                    title="Define Logic"
                    description='Set smart triggers like "Buy SOL when it drops 5% in 24h" or "Execute if BTC < $60k".'
                  />
                  <StepCard
                    number="02"
                    icon={Globe}
                    title="Cross-Chain Funding"
                    description="Deposit USDC from Ethereum, Base, or Polygon. Our LI.FI integration handles the bridge instantly."
                  />
                  <StepCard
                    number="03"
                    icon={Zap}
                    title="Atomic Execution"
                    description="Our Anchor program monitors conditions and executes via Jupiter for the best possible price."
                  />
                  <StepCard
                    number="04"
                    icon={Volume2}
                    title="Voice Synthesis"
                    description="Receive natural voice alerts via ElevenLabs as soon as your strategy executes."
                  />
                </div>
              </div>

              <div className="relative aspect-square bg-gradient-to-br from-solana-purple/10 to-solana-green/5 rounded-[40px] border border-border/50 overflow-hidden shadow-2xl group">
                 <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="size-48 rounded-full bg-solana-purple/20 blur-[60px] group-hover:bg-solana-purple/40 transition-colors duration-500" />
                    <Workflow className="size-32 text-solana-purple opacity-40 group-hover:scale-110 group-hover:opacity-60 transition-all duration-500" />
                 </div>
                 {/* Floating Badges for Visual Interest */}
                 <div className="absolute top-10 left-10 p-4 rounded-2xl bg-card border border-border shadow-xl animate-bounce-slow">
                    <Zap className="size-5 text-solana-green" />
                 </div>
                 <div className="absolute bottom-20 right-10 p-4 rounded-2xl bg-card border border-border shadow-xl animate-pulse">
                    <Shield className="size-5 text-solana-purple" />
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-32 px-6 bg-muted/5 border-y border-border/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-4xl font-black text-foreground tracking-tighter">
                ENGINEERED FOR THE<br />
                <span className="gradient-text uppercase">Solana Ecosystem</span>
              </h2>
              <p className="text-muted-foreground font-medium max-w-xl mx-auto">
                Built with the most robust infrastructure to ensure security, 
                speed, and best-in-class execution.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={Shield}
                title="Non-Custodial"
                description="Your funds remain in your control. The SmartDCA Anchor program is fully non-custodial and secure."
                tag="Security"
              />
              <FeatureCard
                icon={Repeat}
                title="Infinite Scalability"
                description="Create complex nested conditions and multi-token strategies with no performance overhead."
                tag="Architecture"
              />
              <FeatureCard
                icon={Zap}
                title="Jupiter Routing"
                description="Every trade is routed through Jupiter to guarantee the absolute best price across all liquidity."
                tag="Liquidity"
              />
              <FeatureCard
                icon={Globe}
                title="Any-Chain Access"
                description="Deposit capital from any major EVM chain. SmartDCA bridges and converts it seamlessly."
                tag="Connectivity"
              />
              <FeatureCard
                icon={Volume2}
                title="AI Voice Alerts"
                description="Natural ElevenLabs voice synthesis keeps you updated on your portfolio without looking at a screen."
                tag="Interface"
              />
              <FeatureCard
                icon={Layers}
                title="Sub-Second Speed"
                description="Condition monitoring and execution happen in milliseconds, taking full advantage of Solana's speed."
                tag="Performance"
              />
            </div>
          </div>
        </section>

        {/* Voice Demo */}
        <section className="py-32 px-6">
          <div className="max-w-xl mx-auto text-center space-y-10">
            <div className="space-y-4">
              <div className="size-16 rounded-3xl bg-solana-green/10 flex items-center justify-center text-solana-green mx-auto border border-solana-green/20">
                <Volume2 className="size-8" />
              </div>
              <h2 className="text-4xl font-black text-foreground tracking-tighter">
                HEAR THE ALPHA.
              </h2>
              <p className="text-muted-foreground font-medium leading-relaxed">
                Experience natural-sounding trade notifications. 
                Know exactly what triggered and what was bought.
              </p>
            </div>
            <div className="p-1 rounded-[32px] bg-gradient-to-br from-solana-purple/20 to-solana-green/20">
              <div className="bg-card rounded-[28px] p-8 border border-border/50">
                <VoiceDemoButton />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-40 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-solana-purple/5 blur-[120px] -z-10" />
          <div className="max-w-3xl mx-auto space-y-10">
            <h2 className="text-5xl sm:text-7xl font-black text-foreground leading-[0.8] tracking-tighter">
              READY TO<br />
              <span className="gradient-text uppercase">Automate?</span>
            </h2>
            <p className="text-lg text-muted-foreground font-medium max-w-lg mx-auto leading-relaxed">
              Join the future of decentralized cost averaging. 
              Set your rules, fund your vault, and let SmartDCA do the heavy lifting.
            </p>
            <div className="pt-4">
              <Link href="/create">
                <Button size="lg" className="px-12 h-16 text-lg font-black rounded-2xl bg-foreground text-background hover:scale-105 transition-transform glow-green">
                  CREATE STRATEGY <ArrowRight className="size-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}