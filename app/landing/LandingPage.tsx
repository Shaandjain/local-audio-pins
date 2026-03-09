'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './landing.module.css';
import Reveal from './components/Reveal';
import Parallax from './components/Parallax';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const spring = { type: 'spring' as const, stiffness: 400, damping: 25 };

const steps = [
  {
    title: 'Drop a pin where the story lives',
    copy: 'Capture sound in the exact place it belongs. Every note is anchored to the earth.',
    label: 'Step One - Pin the place',
  },
  {
    title: 'Record the memory in your own voice',
    copy: 'Short, immersive audio stories become the new layer of the city.',
    label: 'Step Two - Record the story',
  },
  {
    title: 'Walk and listen to the hidden map',
    copy: 'Explore neighborhoods through sound, guided by real-world signals.',
    label: 'Step Three - Listen in motion',
  },
];

const useCases = [
  {
    title: 'Travelers',
    copy: 'Follow the hush of alleyways, the lore of plazas, the voice of a new city.',
  },
  {
    title: 'Locals',
    copy: 'Preserve the stories that never made the guidebooks, in the places they happened.',
  },
  {
    title: 'Creators',
    copy: 'Publish location-based audio stories that feel like living exhibits.',
  },
];

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className="flex items-center justify-between py-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border border-[var(--line)] flex items-center justify-center">
              <span className="text-xs tracking-[0.2em]">LAP</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Local Audio Pins</p>
              <p className="text-xs text-[var(--muted)]">Field edition</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            <a href="#concept" className="hover:text-white transition-colors">Concept</a>
            <a href="#how" className="hover:text-white transition-colors">How</a>
            <a href="#map" className="hover:text-white transition-colors">Map</a>
            <a href="#use" className="hover:text-white transition-colors">Use Cases</a>
          </nav>
          <div className="flex items-center gap-3">
            <motion.div whileHover={prefersReducedMotion ? {} : { scale: 1.05 }} whileTap={prefersReducedMotion ? {} : { scale: 0.96 }} transition={spring}>
              <Link href="/" className={styles.ctaSecondary}>Open Map</Link>
            </motion.div>
          </div>
        </header>
      </div>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center" id="hero">
        <div className={`${styles.container} grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center py-16`}>
          <Reveal>
            <div className="space-y-8">
              <span className={styles.tag}>Editorial Release 2026</span>
              <h1 className={styles.headline}>Unlock the hidden layers of the world through sound.</h1>
              <p className={styles.subhead}>
                Local Audio Pins layers immersive audio stories onto real places, turning every map into a living archive.
              </p>
              <p className="text-sm text-[var(--muted)] max-w-md">
                Walk a street and hear its memory. Press play and the city speaks.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <motion.div whileHover={prefersReducedMotion ? {} : { scale: 1.05, boxShadow: '0 8px 24px rgba(255,255,255,0.1)' }} whileTap={prefersReducedMotion ? {} : { scale: 0.96 }} transition={spring}>
                  <Link href="/" className={styles.ctaPrimary}>Start exploring</Link>
                </motion.div>
                <motion.div whileHover={prefersReducedMotion ? {} : { scale: 1.05 }} whileTap={prefersReducedMotion ? {} : { scale: 0.96 }} transition={spring}>
                  <a href="#concept" className={styles.ctaSecondary}>Listen to a sample</a>
                </motion.div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <Parallax>
              <figure className={styles.illustrationFrame}>
                <div className={`${styles.illustrationSurface} relative`}>
                  <div className={`${styles.halftone} absolute inset-0`} />
                  <div className={`${styles.engravingLines} absolute inset-0`} />
                  <div className={`${styles.statueBlock} ${styles.floatSlow}`} />
                  <div className="absolute right-[10%] top-[12%] w-[32%] h-[28%] border border-white/20 rounded-2xl bg-white/5" />
                  <div className={styles.column} style={{ left: '58%', bottom: '12%' }} />
                  <div className={styles.column} style={{ left: '70%', bottom: '20%', height: '130px' }} />
                  <svg className="absolute left-[18%] top-[18%] w-[64%] h-[30%]" viewBox="0 0 600 120">
                    <path
                      className={styles.waveform}
                      d="M0 60 L40 60 L55 20 L70 100 L90 40 L120 60 L150 60 L170 30 L190 90 L210 60 L250 60 L270 10 L295 110 L320 60 L350 60 L370 35 L390 85 L420 60 L460 60 L480 25 L500 95 L530 60 L600 60"
                    />
                  </svg>
                  <div className={styles.signalLine} style={{ top: '18%', left: '0', right: '0' }} />
                  <div className={styles.pin} style={{ top: '32%', left: '60%' }} />
                  <div className={styles.pin} style={{ top: '58%', left: '40%', animationDelay: '1.2s' }} />
                  <div className="absolute bottom-4 right-4 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Hero illustration placeholder
                  </div>
                </div>
                <figcaption className={styles.caption}>
                  Classical statue, columns, and map lines fused with waveform overlays.
                </figcaption>
              </figure>
            </Parallax>
          </Reveal>
        </div>
      </section>

      <div className={styles.sectionDivider} />

      {/* Concept Section */}
      <section id="concept" className="py-24">
        <div className={`${styles.container} grid lg:grid-cols-[1fr_0.9fr] gap-14 items-center`}>
          <Reveal>
            <div className="space-y-6">
              <p className={styles.eyebrow}>Concept</p>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">A cartography of sound.</h2>
              <p className="text-base text-[var(--muted)]">
                We map memory, mood, and story as audio - an invisible layer you can only feel by walking through it.
              </p>
              <p className="text-sm text-[var(--muted)] max-w-md">
                Discovery becomes intimate: a whisper at a corner, a chorus at a trailhead, a voice etched into the pavement.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <figure className={styles.illustrationFrame}>
              <div className={`${styles.illustrationSurface} relative`}>
                <div className={`${styles.halftone} absolute inset-0`} />
                <div className={`${styles.mapGrid} absolute inset-0`} />
                <div className="absolute inset-6 border border-white/20 rounded-3xl" />
                <div className="absolute left-[12%] top-[18%] w-[76%] h-[64%] border border-white/20 rounded-[40%]" />
                <div className={styles.pin} style={{ top: '38%', left: '28%' }} />
                <div className={styles.pin} style={{ top: '55%', left: '62%', animationDelay: '0.8s' }} />
                <div className={styles.pin} style={{ top: '30%', left: '70%', animationDelay: '1.6s' }} />
                <div className="absolute bottom-4 right-4 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Concept illustration placeholder
                </div>
              </div>
              <figcaption className={styles.caption}>
                Abstract map layers with living audio signals.
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      <div className={styles.sectionDivider} />

      {/* How It Works */}
      <section id="how" className="py-24">
        <div className={`${styles.container} space-y-12`}>
          <Reveal>
            <div className="flex items-end justify-between flex-wrap gap-6">
              <div className="space-y-3 max-w-2xl">
                <p className={styles.eyebrow}>How It Works</p>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Three movements. One living map.</h2>
              </div>
              <p className="text-sm text-[var(--muted)] max-w-sm">
                Designed like a field journal. Each step is deliberate, tactile, and anchored in place.
              </p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 120}>
                <div className={styles.card}>
                  <div className="space-y-4">
                    <figure className={`${styles.illustrationSurface} relative h-40 rounded-2xl overflow-hidden border border-white/10`}>
                      <div className={`${styles.chessboard} absolute inset-0`} />
                      <div className="absolute inset-6 border border-white/20 rounded-2xl" />
                      <div className={styles.pin} style={{ top: '40%', left: '45%' }} />
                      <div className="absolute bottom-3 right-3 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                        {step.label}
                      </div>
                    </figure>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-[var(--muted)]">{step.copy}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.sectionDivider} />

      {/* Interactive Map Concept */}
      <section id="map" className="py-24">
        <div className={`${styles.container} grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center`}>
          <Reveal>
            <div className="space-y-6">
              <p className={styles.eyebrow}>Interactive Map Concept</p>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">A world map that breathes.</h2>
              <p className="text-sm text-[var(--muted)] max-w-md">
                Audio pins pulse softly, guiding you toward stories without ever feeling like controls.
              </p>
              <p className="text-sm text-[var(--muted)] max-w-md">
                Exploration is the interface - the map is alive with signal.
              </p>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <Parallax speed={0.08}>
              <figure className={styles.illustrationFrame}>
                <div className={`${styles.illustrationSurface} relative`}>
                  <div className={`${styles.mapGrid} absolute inset-0`} />
                  <div className={styles.mapSilhouette} />
                  <div className={styles.signalLine} style={{ top: '38%', left: '10%', right: '15%' }} />
                  <div className={styles.signalLine} style={{ top: '60%', left: '18%', right: '20%' }} />
                  <div className={styles.pin} style={{ top: '32%', left: '30%' }} />
                  <div className={styles.pin} style={{ top: '52%', left: '55%', animationDelay: '1s' }} />
                  <div className={styles.pin} style={{ top: '40%', left: '72%', animationDelay: '2s' }} />
                  <div className="absolute bottom-4 right-4 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Map illustration placeholder
                  </div>
                </div>
                <figcaption className={styles.caption}>
                  Stylized world map with animated audio pins.
                </figcaption>
              </figure>
            </Parallax>
          </Reveal>
        </div>
      </section>

      <div className={styles.sectionDivider} />

      {/* Use Cases */}
      <section id="use" className="py-24">
        <div className={`${styles.container} space-y-12`}>
          <Reveal>
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div>
                <p className={styles.eyebrow}>Use Cases</p>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Who listens to the city.</h2>
              </div>
              <p className="text-sm text-[var(--muted)] max-w-sm">
                Built for travelers, locals, and creators who want more than a map.
              </p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {useCases.map((useCase, index) => (
              <Reveal key={useCase.title} delay={index * 120}>
                <div className={styles.card}>
                  <div className="space-y-4">
                    <figure className={`${styles.illustrationSurface} relative h-32 rounded-2xl overflow-hidden border border-white/10`}>
                      <div className={`${styles.engravingLines} absolute inset-0`} />
                      <div className="absolute inset-5 border border-white/15 rounded-2xl" />
                      <div className={styles.pin} style={{ top: '40%', left: '60%' }} />
                      <div className="absolute bottom-3 right-3 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                        Editorial card placeholder
                      </div>
                    </figure>
                    <h3 className="text-lg font-semibold">{useCase.title}</h3>
                    <p className="text-sm text-[var(--muted)]">{useCase.copy}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.sectionDivider} />

      {/* Closing Section */}
      <section className="py-24">
        <div className={`${styles.container} grid lg:grid-cols-[1fr_0.9fr] gap-14 items-center`}>
          <Reveal>
            <div className="space-y-6">
              <p className={styles.eyebrow}>Closing Statement</p>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Every place has a voice. Hear yours on the map.</h2>
              <p className="text-sm text-[var(--muted)] max-w-md">
                Local Audio Pins is the quiet infrastructure for a new kind of discovery.
              </p>
              <motion.div whileHover={prefersReducedMotion ? {} : { scale: 1.05, boxShadow: '0 8px 24px rgba(255,255,255,0.1)' }} whileTap={prefersReducedMotion ? {} : { scale: 0.96 }} transition={spring}>
                <Link href="/" className={styles.ctaPrimary}>Start the journey</Link>
              </motion.div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <Parallax speed={0.05}>
              <figure className={styles.illustrationFrame}>
                <div className={`${styles.illustrationSurface} relative`}>
                  <div className={styles.mapSilhouette} />
                  <div className={styles.zoomHalo} />
                  <div className={styles.pin} style={{ top: '45%', left: '48%' }} />
                  <div className="absolute bottom-4 right-4 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    World zoom-out placeholder
                  </div>
                </div>
                <figcaption className={styles.caption}>
                  Global perspective with a single glowing signal.
                </figcaption>
              </figure>
            </Parallax>
          </Reveal>
        </div>
      </section>

      <footer className="py-12">
        <div className={`${styles.container} flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs text-[var(--muted)]`}>
          <p>Local Audio Pins. A living map for sound.</p>
          <p>Editorial concept landing page.</p>
        </div>
      </footer>
    </main>
  );
}
