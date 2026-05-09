"use client";

import Link                    from "next/link";
import { useWallet }           from "@solana/wallet-adapter-react";
import { Button }              from "@/components/ui/Button";
import { Card, CardContent }   from "@/components/ui/Card";
import { VoiceDemoButton }     from "@/components/voice/VoiceDemoButton";
import { Navbar }              from "@/components/layout/Navbar";


function FeatureCard({
  icon,
  title,
  description,
  tag,
}: {
  icon:        string;
  title:       string;
  description: string;
  tag:         string;
}) {
  return (
    <Card className="p-6 space-y-3 hover:border-purple-500/30 transition-all">
      <div className="flex items-start justify-between">
        <span className="text-3xl">{icon}</span>
        <span className="text-xs px-2 py-1 bg-purple-500/10 
                       text-purple-400 rounded-full border border-purple-500/20">
          {tag}
        </span>
      </div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </Card>
  );
}


function StepCard({
  number,
  title,
  description,
  icon,
}: {
  number:      string;
  title:       string;
  description: string;
  icon:        string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-500/20 
                    border border-purple-500/30 flex items-center justify-center">
        <span className="text-sm font-bold gradient-text">{number}</span>
      </div>
      <div className="space-y-1 pt-1">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <h3 className="font-semibold text-white text-sm">{title}</h3>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}


export default function LandingPage() {
  const { connected } = useWallet();

  return (
    <>
      <Navbar />

      <main className="pt-16">
        <section className="relative min-h-[90vh] flex items-center justify-center px-6 overflow-hidden">

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 
                          w-[600px] h-[600px] rounded-full
                          bg-purple-500/10 blur-[120px]" />
            <div className="absolute top-1/3 left-1/3 
                          w-[400px] h-[400px] rounded-full
                          bg-green-500/5 blur-[100px]" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">

            <div className="inline-flex items-center gap-2 px-4 py-2 
                          rounded-full border border-purple-500/30 
                          bg-purple-500/10 text-purple-300 text-sm">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              Built on Solana · Powered by Jupiter · Cross-chain via LI.FI
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold text-white leading-tight">
              DCA on your{" "}
              <span className="gradient-text">conditions</span>
              <br />
              not a schedule
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Set conditions like{" "}
              <span className="text-white">"Buy SOL when it drops 5%"</span>.
              Fund from any chain. SmartDCA executes automatically on Solana
              and tells you what happened — out loud.
            </p>

            <div className="flex flex-col sm:flex-row items-center 
                          justify-center gap-4">
              <Link href={connected ? "/create" : "#"}>
                <Button
                  variant="gradient"
                  size="lg"
                  className="w-full sm:w-auto px-8"
                >
                  Create Strategy →
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto px-8"
                >
                  View Dashboard
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-8 
                          pt-4 border-t border-white/5">
              {[
                { label: "Built on",     value: "Solana"        },
                { label: "Swaps via",    value: "Jupiter"       },
                { label: "Bridge via",   value: "LI.FI"         },
                { label: "Voice via",    value: "ElevenLabs"    },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-sm font-semibold text-white">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16 space-y-3">
              <h2 className="text-3xl font-bold text-white">
                How SmartDCA Works
              </h2>
              <p className="text-gray-400">
                Four steps to automated, condition-based investing
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <StepCard
                number="01"
                icon="🎯"
                title="Set Your Condition"
                description='Choose what triggers a buy: "SOL drops 5% in 24h", "price below $130", or a fixed day of week. Your rules, your strategy.'
              />
              <StepCard
                number="02"
                icon="🌉"
                title="Fund from Any Chain"
                description="Send USDC from Ethereum, Base, Arbitrum, or Polygon. LI.FI bridges it to Solana automatically. No manual bridging."
              />
              <StepCard
                number="03"
                icon="⚡"
                title="Auto-Execute on Solana"
                description="When your condition triggers, Jupiter finds the best price across all Solana DEXes. Trade executes in under a second."
              />
              <StepCard
                number="04"
                icon="🔊"
                title="Get Voice Alerts"
                description="ElevenLabs reads your trade summary out loud. Know exactly what happened, when it happened, and what you paid."
              />
            </div>
          </div>
        </section>

        <section className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 space-y-3">
              <h2 className="text-3xl font-bold text-white">
                Everything you need
              </h2>
              <p className="text-gray-400">
                Built with the best infrastructure on Solana
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FeatureCard
                icon="⛓️"
                title="On-Chain Escrow"
                description="Your USDC sits in a smart contract on Solana devnet. Only you can withdraw. The program executes trades automatically."
                tag="Anchor"
              />
              <FeatureCard
                icon="🔀"
                title="Best Price Always"
                description="Jupiter aggregates all Solana DEXes — Raydium, Orca, Meteora and more. You always get the best available price."
                tag="Jupiter"
              />
              <FeatureCard
                icon="🌐"
                title="Any Chain Funding"
                description="Start from USDC on Ethereum, Base, or Arbitrum. LI.FI finds the optimal bridge route and handles everything."
                tag="LI.FI"
              />
              <FeatureCard
                icon="🎙️"
                title="Voice Notifications"
                description="Natural-sounding voice alerts tell you exactly what executed, at what price, and what conditions triggered the trade."
                tag="ElevenLabs"
              />
              <FeatureCard
                icon="🛡️"
                title="Non-Custodial"
                description="Your keys, your funds. The smart contract is open source. Withdraw anytime. No middlemen, no trust required."
                tag="Solana"
              />
              <FeatureCard
                icon="⚡"
                title="Sub-Second Execution"
                description="Solana confirms transactions in 400ms. When your condition triggers, the trade is done before you read this sentence."
                tag="Solana"
              />
            </div>
          </div>
        </section>

        <section className="py-24 px-6">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-10 space-y-3">
              <h2 className="text-3xl font-bold text-white">
                Hear it in action
              </h2>
              <p className="text-gray-400">
                Click any scenario to hear a live voice alert
              </p>
            </div>
            <VoiceDemoButton />
          </div>
        </section>

        <section className="py-24 px-6 text-center border-t border-white/5">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-4xl font-bold text-white">
              Stop watching charts.
              <br />
              <span className="gradient-text">Set conditions instead.</span>
            </h2>
            <p className="text-gray-400">
              SmartDCA runs 24/7 on Solana.
              When your condition hits, it buys.
              You hear about it immediately.
            </p>
            <Link href="/create">
              <Button variant="gradient" size="lg" className="px-10">
                Create Your First Strategy →
              </Button>
            </Link>
          </div>
        </section>

        <footer className="border-t border-white/5 py-8 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-xs text-gray-600">
              SmartDCA — Built for Solana Hackathon 2025
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>Solana Devnet</span>
              <span>·</span>
              <a
                href={`https://github.com/your-repo/smartdca`}
                target="_blank"
                className="hover:text-gray-400"
              >
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}