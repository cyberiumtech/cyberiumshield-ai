import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowRight,
  BrainCircuit,
  Check,
  Eye,
  FileSearch,
  Link2,
  Menu,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';

import brandLogo from '../../assets/images/Cybershield-AI.png';

const capabilities = [
  {
    number: '01',
    icon: Link2,
    title: 'Suspicious-link analysis',
    description:
      'Inspect a URL or phishing attempt and surface the signals that make it worth a closer look.',
  },
  {
    number: '02',
    icon: FileSearch,
    title: 'Malware & file scanning',
    description:
      'Submit a file for analysis and review clear findings before deciding what to do next.',
  },
  {
    number: '03',
    icon: ScanLine,
    title: 'Vulnerability & threat analysis',
    description:
      'Turn technical indicators into an understandable view of risk and practical next actions.',
  },
];

const workflowSteps = [
  {
    number: '01',
    shortLabel: 'SUBMIT',
    title: 'Send the signal',
    description:
      'Share the file, link, or threat detail you want to investigate. You stay in control of what is analyzed.',
    input: 'File / URL / threat detail',
    output: 'Analysis request',
    icon: Upload,
  },
  {
    number: '02',
    shortLabel: 'ANALYZE',
    title: 'AI reads the context',
    description:
      'CyberShield AI examines available indicators and context to identify suspicious patterns and relevant risk signals.',
    input: 'Context + indicators',
    output: 'Prioritized signals',
    icon: BrainCircuit,
  },
  {
    number: '03',
    shortLabel: 'ACT',
    title: 'Review what matters',
    description:
      'See a clear summary of the findings, understand why they matter, and choose the next action with confidence.',
    input: 'Analyzed signals',
    output: 'Finding + next actions',
    icon: ShieldCheck,
  },
];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35d7ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05080d]';

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const scrollToSection = (event: MouseEvent<HTMLAnchorElement>) => {
    const id = event.currentTarget.getAttribute('href');
    if (!id?.startsWith('#')) return;

    const section = document.querySelector(id);
    if (!section) return;

    event.preventDefault();
    section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    window.history.pushState(null, '', id);
    setMobileMenuOpen(false);
  };

  const activeWorkflow = workflowSteps[activeStep];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#05080d] text-[#eef9ff] selection:bg-[#35d7ff] selection:text-[#05080d]">
      <header className="sticky top-0 z-50 border-b border-[#8eb0c4]/15 bg-[#05080d]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <a
            href="#top"
            onClick={scrollToSection}
            className={`group flex items-center gap-3 ${focusRing}`}
            aria-label="CyberShield AI home"
          >
            <span className="relative h-10 w-10 overflow-hidden rounded-full border border-[#35d7ff]/35 bg-white shadow-[0_0_24px_rgba(53,215,255,0.12)]">
              <img
                src={brandLogo}
                alt="CyberShield AI logo"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </span>
            <span className="text-[15px] font-semibold tracking-[0.02em] text-white sm:text-base">
              CyberShield <span className="text-[#35d7ff]">AI</span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
            <a
              href="#product"
              onClick={scrollToSection}
              className={`text-sm font-medium text-[#a9bcc8] transition-colors hover:text-white ${focusRing}`}
            >
              Product
            </a>
            <a
              href="#how-it-works"
              onClick={scrollToSection}
              className={`text-sm font-medium text-[#a9bcc8] transition-colors hover:text-white ${focusRing}`}
            >
              How it works
            </a>
            <span className="h-4 w-px bg-[#8eb0c4]/20" aria-hidden="true" />
            <Link
              to="/auth/login"
              className={`text-sm font-medium text-[#d7e7ee] transition-colors hover:text-[#35d7ff] ${focusRing}`}
            >
              Sign in
            </Link>
            <Link
              to="/auth/register"
              className={`group inline-flex items-center gap-2 border border-[#35d7ff] bg-[#35d7ff] px-4 py-2.5 text-sm font-semibold text-[#031016] transition-colors hover:bg-[#77e5ff] ${focusRing}`}
            >
              Get protected
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </nav>

          <button
            type="button"
            className={`grid h-11 w-11 place-items-center border border-[#8eb0c4]/25 text-[#d8e8ef] transition-colors hover:border-[#35d7ff]/60 hover:text-[#35d7ff] md:hidden ${focusRing}`}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              id="mobile-navigation"
              aria-label="Mobile navigation"
              initial={reduceMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-[#8eb0c4]/15 bg-[#07101a] md:hidden"
            >
              <div className="mx-auto grid max-w-[1200px] gap-2 px-5 py-5 sm:px-8">
                <a
                  href="#product"
                  onClick={scrollToSection}
                  className={`border-b border-[#8eb0c4]/15 px-1 py-3 text-base text-[#d8e8ef] ${focusRing}`}
                >
                  Product
                </a>
                <a
                  href="#how-it-works"
                  onClick={scrollToSection}
                  className={`border-b border-[#8eb0c4]/15 px-1 py-3 text-base text-[#d8e8ef] ${focusRing}`}
                >
                  How it works
                </a>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <Link
                    to="/auth/login"
                    className={`border border-[#8eb0c4]/30 px-4 py-3 text-center text-sm font-semibold text-white ${focusRing}`}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/auth/register"
                    className={`bg-[#35d7ff] px-4 py-3 text-center text-sm font-semibold text-[#031016] ${focusRing}`}
                  >
                    Get protected
                  </Link>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main>
        <section id="top" className="relative scroll-mt-24 overflow-hidden border-b border-[#8eb0c4]/15">
          <div
            className="pointer-events-none absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                'linear-gradient(rgba(94,137,161,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(94,137,161,.13) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'linear-gradient(to bottom, black 10%, transparent 82%)',
            }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute left-[7%] top-16 h-72 w-72 rounded-full bg-[#35d7ff]/[0.07] blur-[100px]" />

          <div className="relative mx-auto grid min-h-[760px] max-w-[1200px] items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.04fr_.96fr] lg:gap-8 lg:py-24">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
              className="relative z-10 max-w-[650px]"
            >
              <div className="mb-7 inline-flex items-center gap-3 font-mono text-[11px] font-semibold tracking-[0.19em] text-[#9dd9e9]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#a6ff4d] opacity-50 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#a6ff4d]" />
                </span>
                AI-POWERED CYBER DEFENSE
              </div>

              <h1 className="max-w-[630px] font-['Arial_Narrow','Aptos_Display',sans-serif] text-[3.25rem] font-black uppercase leading-[0.92] tracking-[-0.045em] text-white sm:text-6xl lg:text-[5.15rem]">
                See the signal.
                <span className="mt-1 block text-[#35d7ff]">Know the risk.</span>
                Act with clarity.
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-[#a9bcc8] sm:text-lg sm:leading-8">
                Analyze suspicious links, files, and threat signals with AI - then get clear
                findings that help you decide what to do next.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/auth/register"
                  className={`group inline-flex min-h-12 items-center justify-center gap-3 bg-[#35d7ff] px-6 text-sm font-bold text-[#031016] shadow-[0_10px_40px_rgba(53,215,255,0.15)] transition-colors hover:bg-[#77e5ff] ${focusRing}`}
                >
                  Start an analysis
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#how-it-works"
                  onClick={scrollToSection}
                  className={`group inline-flex min-h-12 items-center justify-center gap-3 border border-[#8eb0c4]/30 px-6 text-sm font-semibold text-[#e3f1f6] transition-colors hover:border-[#35d7ff]/60 hover:text-[#35d7ff] ${focusRing}`}
                >
                  See how it works
                  <ArrowDownRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
                </a>
              </div>

            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.12 }}
              className="relative mx-auto grid aspect-square w-full max-w-[530px] place-items-center"
              aria-label="Protection loop: scan, analyze, and protect"
            >
              <div className="absolute inset-[8%] rounded-full border border-[#35d7ff]/20" />
              <div className="absolute inset-[19%] rounded-full border border-dashed border-[#8eb0c4]/20" />
              <div className="absolute left-1/2 top-1/2 h-px w-[64%] -translate-x-1/2 -translate-y-1/2 rotate-[24deg] bg-gradient-to-r from-transparent via-[#35d7ff]/35 to-transparent" />
              <div className="absolute left-1/2 top-1/2 h-px w-[64%] -translate-x-1/2 -translate-y-1/2 rotate-[144deg] bg-gradient-to-r from-transparent via-[#35d7ff]/35 to-transparent" />
              <div className="absolute left-1/2 top-1/2 h-px w-[64%] -translate-x-1/2 -translate-y-1/2 rotate-[264deg] bg-gradient-to-r from-transparent via-[#35d7ff]/35 to-transparent" />

              <motion.div
                className="absolute inset-[8%] rounded-full border-t border-[#35d7ff]/70"
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                aria-hidden="true"
              />

              <div className="relative z-10 grid h-[37%] w-[37%] place-items-center rounded-full border border-[#35d7ff]/40 bg-[#07101a] shadow-[0_0_70px_rgba(53,215,255,0.13)]">
                <div className="absolute inset-3 rounded-full border border-[#8eb0c4]/15" />
                <img
                  src={brandLogo}
                  alt=""
                  className="relative h-[60%] w-[60%] rounded-full object-cover"
                />
                <span className="absolute -bottom-8 font-mono text-[9px] tracking-[0.18em] text-[#7893a2]">
                  PROTECTION CORE
                </span>
              </div>

              {[
                { label: 'SCAN', icon: ScanLine, position: 'left-1/2 top-[1%] -translate-x-1/2' },
                { label: 'ANALYZE', icon: BrainCircuit, position: 'bottom-[12%] right-[1%]' },
                { label: 'PROTECT', icon: ShieldCheck, position: 'bottom-[12%] left-[1%]' },
              ].map((node, index) => (
                <motion.div
                  key={node.label}
                  className={`absolute ${node.position} z-20 flex h-[76px] w-[76px] flex-col items-center justify-center gap-1 border border-[#35d7ff]/30 bg-[#08131e] shadow-[0_8px_30px_rgba(0,0,0,0.4)] sm:h-[88px] sm:w-[88px]`}
                  animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
                  transition={{ duration: 3.2, delay: index * 0.55, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <node.icon className="h-5 w-5 text-[#35d7ff]" />
                  <span className="font-mono text-[9px] font-semibold tracking-[0.13em] text-[#d8e8ef]">
                    {node.label}
                  </span>
                </motion.div>
              ))}

              <span className="absolute right-[9%] top-[19%] font-mono text-[9px] tracking-[0.12em] text-[#a6ff4d]">
                LOOP ACTIVE
              </span>
              <span className="absolute bottom-[3%] left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-[0.12em] text-[#5f7c8d]">
                SCAN → ANALYZE → PROTECT
              </span>
            </motion.div>
          </div>
        </section>

        <section id="product" className="scroll-mt-20 border-b border-[#8eb0c4]/15 bg-[#07101a]">
          <div className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8 lg:py-28">
            <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
              <div>
                <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-[#35d7ff]">
                  01 / PRODUCT
                </p>
                <h2 className="mt-4 font-['Arial_Narrow','Aptos_Display',sans-serif] text-4xl font-black uppercase leading-none tracking-[-0.035em] text-white sm:text-5xl">
                  One clear view of what needs attention.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-[#9eb3bf] lg:justify-self-end">
                Start with the item you are unsure about. CyberShield AI helps you inspect the
                signal, understand the concern, and move forward with context.
              </p>
            </div>

            <div className="mt-14 border-y border-[#8eb0c4]/20 lg:grid lg:grid-cols-3">
              {capabilities.map((capability, index) => (
                <motion.article
                  key={capability.title}
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="group relative border-b border-[#8eb0c4]/20 py-8 last:border-b-0 lg:border-b-0 lg:border-r lg:px-7 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid h-12 w-12 place-items-center border border-[#35d7ff]/25 bg-[#35d7ff]/[0.05] text-[#35d7ff] transition-colors group-hover:border-[#35d7ff]/55">
                      <capability.icon className="h-5 w-5" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-xl font-semibold tracking-[-0.02em] text-white">
                    {capability.title}
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-[#91a8b5]">
                    {capability.description}
                  </p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="relative scroll-mt-20 border-b border-[#8eb0c4]/15">
          <div className="pointer-events-none absolute right-0 top-1/4 h-80 w-80 rounded-full bg-[#35d7ff]/[0.05] blur-[120px]" />
          <div className="relative mx-auto max-w-[1200px] px-5 py-24 sm:px-8 lg:py-32">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-[#35d7ff]">
                02 / HOW IT WORKS
              </p>
              <h2 className="mt-4 font-['Arial_Narrow','Aptos_Display',sans-serif] text-4xl font-black uppercase leading-none tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
                From uncertain signal to clear next step.
              </h2>
            </div>

            <div className="mt-14 grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:gap-14">
              <div className="relative" role="tablist" aria-label="Analysis workflow">
                <div className="absolute bottom-10 left-6 top-10 w-px bg-[#8eb0c4]/20" aria-hidden="true" />
                {workflowSteps.map((step, index) => {
                  const selected = activeStep === index;
                  return (
                    <button
                      key={step.number}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls="workflow-detail"
                      onClick={() => setActiveStep(index)}
                      className={`relative flex w-full gap-5 border-b border-[#8eb0c4]/15 px-0 py-6 text-left transition-colors last:border-b-0 sm:gap-7 ${
                        selected ? 'text-white' : 'text-[#839aa7] hover:text-[#c6d8e0]'
                      } ${focusRing}`}
                    >
                      <span
                        className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center border font-mono text-[11px] font-bold transition-all ${
                          selected
                            ? 'border-[#35d7ff] bg-[#35d7ff] text-[#031016] shadow-[0_0_28px_rgba(53,215,255,0.17)]'
                            : 'border-[#8eb0c4]/25 bg-[#05080d] text-[#7893a2]'
                        }`}
                      >
                        {step.number}
                      </span>
                      <span className="pt-0.5">
                        <span className="block font-mono text-[10px] tracking-[0.16em] text-[#35d7ff]">
                          {step.shortLabel}
                        </span>
                        <span className="mt-2 block text-lg font-semibold sm:text-xl">{step.title}</span>
                        <span className="mt-2 block max-w-md text-sm leading-6 text-[#839aa7]">
                          {step.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                id="workflow-detail"
                role="tabpanel"
                className="relative min-h-[460px] overflow-hidden border border-[#8eb0c4]/20 bg-[#07101a] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.25)] sm:p-8"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(94,137,161,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(94,137,161,.12) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                    maskImage: 'linear-gradient(135deg, black, transparent 80%)',
                  }}
                />
                <div className="relative flex items-center justify-between border-b border-[#8eb0c4]/15 pb-5">
                  <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-[#7893a2]">
                    <span className="h-2 w-2 rounded-full bg-[#a6ff4d]" />
                    ANALYSIS FLOW
                  </div>
                  <span className="font-mono text-[10px] text-[#5f7c8d]">
                    STEP {activeWorkflow.number} / 03
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeWorkflow.number}
                    initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
                    transition={{ duration: 0.25 }}
                    className="relative flex min-h-[365px] flex-col justify-between pt-10"
                  >
                    <div>
                      <div className="grid h-16 w-16 place-items-center border border-[#35d7ff]/35 bg-[#35d7ff]/[0.07] text-[#35d7ff]">
                        <activeWorkflow.icon className="h-7 w-7" />
                      </div>
                      <p className="mt-7 font-mono text-[10px] tracking-[0.15em] text-[#35d7ff]">
                        {activeWorkflow.shortLabel} / ACTIVE STAGE
                      </p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
                        {activeWorkflow.title}
                      </h3>
                      <p className="mt-4 max-w-md text-sm leading-6 text-[#91a8b5]">
                        {activeWorkflow.description}
                      </p>
                    </div>

                    <div className="mt-8 grid gap-px border border-[#8eb0c4]/15 bg-[#8eb0c4]/15 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                      <div className="bg-[#08131e] p-4">
                        <span className="font-mono text-[9px] tracking-[0.16em] text-[#6f8b9a]">INPUT</span>
                        <p className="mt-2 text-xs font-medium text-[#dcebf1]">{activeWorkflow.input}</p>
                      </div>
                      <div className="grid place-items-center bg-[#08131e] px-4 py-2 text-[#35d7ff]">
                        <ArrowRight className="h-4 w-4 rotate-90 sm:rotate-0" />
                      </div>
                      <div className="bg-[#08131e] p-4">
                        <span className="font-mono text-[9px] tracking-[0.16em] text-[#a6ff4d]">OUTPUT</span>
                        <p className="mt-2 text-xs font-medium text-[#dcebf1]">{activeWorkflow.output}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#8eb0c4]/15 bg-[#07101a]">
          <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8">
            <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
              <div>
                <p className="font-mono text-[10px] font-semibold tracking-[0.17em] text-[#a6ff4d]">
                  BUILT FOR DECISIONS
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
                  The findings are yours to review.
                </h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                {[
                  { icon: Eye, label: 'Clear results', text: 'Focus on the signals that matter.' },
                  { icon: Sparkles, label: 'Explainable context', text: 'See why a finding deserves attention.' },
                  { icon: Check, label: 'User control', text: 'Choose the action that fits your situation.' },
                ].map((item) => (
                  <div key={item.label} className="border-l border-[#8eb0c4]/25 pl-4">
                    <item.icon className="h-4 w-4 text-[#35d7ff]" />
                    <h3 className="mt-3 text-sm font-semibold text-[#edf8fc]">{item.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-[#7893a2]">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(53,215,255,0.11),transparent_52%)]" />
          <div className="relative mx-auto max-w-[900px] px-5 py-24 text-center sm:px-8 lg:py-28">
            <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-[#35d7ff]">
              READY WHEN YOU ARE
            </p>
            <h2 className="mt-5 font-['Arial_Narrow','Aptos_Display',sans-serif] text-4xl font-black uppercase leading-none tracking-[-0.035em] text-white sm:text-5xl">
              Bring the uncertainty. Leave with a clearer next step.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#91a8b5]">
              Start with a file, link, or threat signal you want to understand.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/auth/register"
                className={`group inline-flex min-h-12 items-center justify-center gap-3 bg-[#35d7ff] px-6 text-sm font-bold text-[#031016] transition-colors hover:bg-[#77e5ff] ${focusRing}`}
              >
                Get protected
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/auth/login"
                className={`inline-flex min-h-12 items-center justify-center border border-[#8eb0c4]/30 px-6 text-sm font-semibold text-white transition-colors hover:border-[#35d7ff]/60 hover:text-[#35d7ff] ${focusRing}`}
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#8eb0c4]/15 bg-[#030609]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-end md:justify-between">
          <div>
            <a
              href="#top"
              onClick={scrollToSection}
              className={`inline-flex items-center gap-3 ${focusRing}`}
            >
              <span className="h-9 w-9 overflow-hidden rounded-full border border-[#35d7ff]/25 bg-white">
                <img src={brandLogo} alt="" className="h-full w-full object-cover" />
              </span>
              <span className="text-sm font-semibold text-white">
                CyberShield <span className="text-[#35d7ff]">AI</span>
              </span>
            </a>
            <p className="mt-3 max-w-sm text-xs leading-5 text-[#6f8794]">
              AI-assisted analysis for suspicious links, files, vulnerabilities, and threat signals.
            </p>
          </div>

          <div className="md:text-right">
            <nav className="flex flex-wrap gap-x-5 gap-y-3 text-xs text-[#91a8b5]" aria-label="Footer navigation">
              <a href="#product" onClick={scrollToSection} className={`hover:text-[#35d7ff] ${focusRing}`}>
                Product
              </a>
              <a href="#how-it-works" onClick={scrollToSection} className={`hover:text-[#35d7ff] ${focusRing}`}>
                How it works
              </a>
              <Link to="/auth/login" className={`hover:text-[#35d7ff] ${focusRing}`}>
                Sign in
              </Link>
              <Link to="/auth/register" className={`hover:text-[#35d7ff] ${focusRing}`}>
                Register
              </Link>
            </nav>
            <p className="mt-4 font-mono text-[10px] tracking-[0.08em] text-[#506a78]">
              © {new Date().getFullYear()} CYBERSHIELD AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
