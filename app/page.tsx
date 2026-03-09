'use client';

import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

/* ── animation helpers ─────────────────────────────────── */

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const spring = { type: 'spring' as const, stiffness: 350, damping: 30 };

const fadeUp = {
  hidden: { opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 32 },
  visible: { opacity: 1, y: 0, transition: { ...spring, delay: 0.1 } },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: prefersReducedMotion ? 0 : 0.12 },
  },
};

const staggerItem = {
  hidden: { opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 28 },
  visible: { opacity: 1, y: 0, transition: spring },
};

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ── section label ─────────────────────────────────────── */

function SectionLabel({ label }: { label: string }) {
  return (
    <motion.div variants={staggerItem} className="flex items-center gap-2 mb-4">
      <div className="flex gap-0.5">
        <div className="w-1 h-1 bg-gray-400 rounded-full" />
        <div className="w-1 h-1 bg-gray-400 rounded-full" />
      </div>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        {label}
      </span>
    </motion.div>
  );
}

/* ── CTA button ────────────────────────────────────────── */

function CtaButton({ href, children, secondary = false }: { href: string; children: string; secondary?: boolean }) {
  if (secondary) {
    return (
      <motion.div whileHover={prefersReducedMotion ? {} : { scale: 1.03 }} whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}>
        <Link
          href={href}
          className="inline-flex h-14 items-center justify-between gap-6 px-8 rounded-[24px] font-bold text-sm uppercase tracking-widest transition-all"
          style={{
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(255,255,255,0.5)',
            color: '#1f2937',
          }}
        >
          <span>{children}</span>
          <div className="w-9 h-9 bg-white/70 rounded-xl flex items-center justify-center text-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div whileHover={prefersReducedMotion ? {} : { scale: 1.03, y: -2 }} whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}>
      <Link
        href={href}
        className="inline-flex h-14 items-center justify-between gap-6 px-8 bg-[#d9f99d] rounded-[24px] font-bold text-sm text-gray-900 uppercase tracking-widest hover:bg-[#bef264] transition-all shadow-lg shadow-lime-200/50"
      >
        <span>{children}</span>
        <div className="w-9 h-9 bg-white/80 rounded-xl flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── feature data ──────────────────────────────────────── */

const features = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
      </svg>
    ),
    title: 'Record & Pin',
    description: 'Record audio at any location on the map. Your stories are automatically transcribed and geo-tagged to exact coordinates.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
    title: 'AI Walking Tours',
    description: 'Select an area and let AI generate narrated walking tours from your pins, complete with synthesized voice guidance.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
      </svg>
    ),
    title: 'Share & Discover',
    description: 'Share your pin collections with anyone via unique links. Explore public pins from travelers around the world.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Drop a pin on the map',
    description: 'Click anywhere on the map to place a pin. Choose a category and name your location.',
  },
  {
    num: '02',
    title: 'Record your audio story',
    description: 'Hit record and capture your voice. Add a photo for context. Your audio is transcribed automatically.',
  },
  {
    num: '03',
    title: 'Share your collection',
    description: 'Organize pins into collections. Share a link or generate an AI-narrated walking tour.',
  },
];

const useCases = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    title: 'Travelers',
    description: 'Capture stories and tips at every stop. Build a living travel journal others can walk through.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
    ),
    title: 'Local Guides',
    description: 'Share hidden gems only locals know. Create neighborhood audio guides for visitors.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    title: 'Content Creators',
    description: 'Publish immersive location-based audio content. Build an audience through place-anchored stories.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
    title: 'Tourism Boards',
    description: 'Create official audio walking tours for cities. Enhance visitor experiences with curated local stories.',
  },
];

/* ── main component ────────────────────────────────────── */

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* ═══ Hero ═══ */}
      <div className="relative min-h-screen flex flex-col">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2560&q=80)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.02), rgba(0,0,0,0.15))',
          }}
        />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
          <div
            className="flex items-center gap-3 px-5 py-2.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(255,255,255,0.5)',
            }}
          >
            <div className="w-7 h-7 rounded-full bg-[#d9f99d] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900 tracking-tight">Audio Pins</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/signin"
              className="hidden sm:inline-flex px-5 py-2.5 rounded-full text-sm font-semibold text-gray-800 transition-colors hover:text-gray-600"
              style={{
                background: 'rgba(255,255,255,0.45)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.4)',
              }}
            >
              Sign In
            </Link>
            <Link
              href="/auth/signin"
              className="inline-flex px-5 py-2.5 rounded-full text-sm font-bold text-gray-900 bg-[#d9f99d] hover:bg-[#bef264] transition-all shadow-lg shadow-lime-200/40"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex items-center px-6 md:px-12 pb-20">
          <div className="max-w-3xl">
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.2 }}
            >
              <h1
                className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6"
                style={{
                  color: '#fff',
                  textShadow: '0 2px 40px rgba(0,0,0,0.15)',
                }}
              >
                Drop Audio Pins{' '}
                <span className="block">Anywhere in the World</span>
              </h1>
            </motion.div>

            <motion.p
              className="text-lg sm:text-xl font-medium max-w-xl mb-10"
              style={{ color: 'rgba(255,255,255,0.88)' }}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.35 }}
            >
              Record stories, tips, and memories at any location. Build walking tours. Share with anyone.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center gap-4"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.5 }}
            >
              <CtaButton href="/auth/signin">Get Started Free</CtaButton>
              <CtaButton href="/explore" secondary>Explore</CtaButton>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-8 h-12 rounded-full border-2 border-white/40 flex items-start justify-center pt-2">
            <div className="w-1.5 h-3 bg-white/60 rounded-full" />
          </div>
        </motion.div>
      </div>

      {/* ═══ Features ═══ */}
      <div className="bg-[#f8f7f4] py-24 md:py-32 px-6 md:px-12">
        <Section className="max-w-6xl mx-auto">
          <SectionLabel label="Features" />
          <motion.h2
            variants={staggerItem}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4"
          >
            Everything you need to pin your world
          </motion.h2>
          <motion.p variants={staggerItem} className="text-base text-gray-500 max-w-xl mb-14">
            From recording to sharing, Audio Pins gives you the tools to create immersive location-based experiences.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                className="glass-card p-8 hover:shadow-lift transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#d9f99d]/40 flex items-center justify-center text-gray-700 mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </Section>
      </div>

      {/* ═══ How It Works ═══ */}
      <div className="bg-white py-24 md:py-32 px-6 md:px-12">
        <Section className="max-w-6xl mx-auto">
          <SectionLabel label="How It Works" />
          <motion.h2
            variants={staggerItem}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4"
          >
            Three steps to your first pin
          </motion.h2>
          <motion.p variants={staggerItem} className="text-base text-gray-500 max-w-xl mb-14">
            It takes less than a minute to drop your first audio pin and start building your sound map.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <motion.div
                key={step.num}
                variants={staggerItem}
                className="glass-card p-8 hover:shadow-lift transition-all duration-300"
              >
                <div className="text-3xl font-bold text-[#d9f99d] mb-4 font-mono">{step.num}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </Section>
      </div>

      {/* ═══ Use Cases ═══ */}
      <div className="bg-[#f8f7f4] py-24 md:py-32 px-6 md:px-12">
        <Section className="max-w-6xl mx-auto">
          <SectionLabel label="Built For" />
          <motion.h2
            variants={staggerItem}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4"
          >
            Made for anyone who explores
          </motion.h2>
          <motion.p variants={staggerItem} className="text-base text-gray-500 max-w-xl mb-14">
            Whether you are a solo traveler or a city tourism board, Audio Pins adapts to your story.
          </motion.p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase) => (
              <motion.div
                key={useCase.title}
                variants={staggerItem}
                className="glass-card p-7 hover:shadow-lift transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-[#d9f99d]/40 flex items-center justify-center text-gray-700 mb-4">
                  {useCase.icon}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{useCase.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </Section>
      </div>

      {/* ═══ Final CTA ═══ */}
      <div
        className="relative py-28 md:py-36 px-6 md:px-12"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2560&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 70%',
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.25))' }}
        />
        <Section className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.h2
            variants={staggerItem}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-5"
            style={{ textShadow: '0 2px 30px rgba(0,0,0,0.15)' }}
          >
            Start Pinning Your World
          </motion.h2>
          <motion.p
            variants={staggerItem}
            className="text-lg font-medium mb-10"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            Join a growing community of explorers who capture the world through sound.
          </motion.p>
          <motion.div variants={staggerItem} className="flex justify-center">
            <CtaButton href="/auth/signin">Get Started Free</CtaButton>
          </motion.div>
        </Section>
      </div>

      {/* ═══ Footer ═══ */}
      <footer className="bg-white border-t border-gray-100 py-12 px-6 md:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#d9f99d] flex items-center justify-center">
              <svg className="w-3 h-3 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900">Audio Pins</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-gray-600 transition-colors">About</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
            <a href="mailto:shaan@casperstudios.xyz" className="hover:text-gray-600 transition-colors">Contact</a>
          </nav>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Audio Pins. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
