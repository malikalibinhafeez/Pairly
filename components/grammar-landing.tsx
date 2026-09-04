'use client'

import { useRouter } from 'next/navigation'

export default function GrammarLanding() {
  const router = useRouter()

  // Hidden login trigger — double-click footer year
  const handleCopyrightDoubleClick = () => {
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 select-none">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Grammar<span className="text-emerald-600">Master</span></span>
          </div>

          {/* Nav Links */}
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#lessons" className="hover:text-emerald-600 transition-colors">Lessons</a>
            <a href="#tenses" className="hover:text-emerald-600 transition-colors">Tenses</a>
            <a href="#exercises" className="hover:text-emerald-600 transition-colors">Exercises</a>
            <a href="#tips" className="hover:text-emerald-600 transition-colors">Tips</a>
            {/* HIDDEN LOGIN — Members par click = quick access ya full login */}
            <button
              onClick={() => router.push('/auth/quick')}
              className="text-gray-300 hover:text-gray-400 transition-colors text-xs font-normal"
              title=""
            >
              Members
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Members — mobile par bhi dikha, faded text so only known users notice */}
            <button
              onClick={() => router.push('/auth/quick')}
              className="text-gray-300 hover:text-gray-500 transition-colors text-xs font-normal px-2 py-1 sm:hidden"
            >
              Members
            </button>
            <a
              href="#lessons"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow"
            >
              Start Learning
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white py-16 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold tracking-wide uppercase mb-5">Free English Grammar Course</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Master English Grammar<br />
            <span className="text-emerald-600">the Smart Way</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            From basic tenses to complex sentence structures — clear explanations, real examples, and interactive exercises to help you write and speak English with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#lessons" className="px-7 py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
              Browse All Lessons →
            </a>
            <a href="#tenses" className="px-7 py-3.5 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-bold text-base hover:border-emerald-400 hover:text-emerald-600 transition-all">
              Explore Tenses
            </a>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="bg-white border-y border-gray-100 py-6 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { val: '120+', label: 'Grammar Lessons' },
            { val: '50+', label: 'Practice Exercises' },
            { val: '12', label: 'Verb Tenses Covered' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{s.val}</p>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* LESSONS GRID */}
      <section id="lessons" className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Popular Lessons</h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">Start with the fundamentals and work your way up to advanced grammar topics.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {LESSONS.map((l) => (
              <LessonCard key={l.title} {...l} />
            ))}
          </div>
        </div>
      </section>

      {/* TENSES TABLE */}
      <section id="tenses" className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">English Verb Tenses</h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">A complete reference for all 12 English tenses with structure and examples.</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-emerald-600 text-white">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Tense</th>
                  <th className="px-5 py-3.5 font-semibold">Structure</th>
                  <th className="px-5 py-3.5 font-semibold hidden sm:table-cell">Example</th>
                </tr>
              </thead>
              <tbody>
                {TENSES.map((t, i) => (
                  <tr key={t.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-5 py-3 font-semibold text-gray-800">{t.name}</td>
                    <td className="px-5 py-3 font-mono text-emerald-700 text-xs">{t.structure}</td>
                    <td className="px-5 py-3 text-gray-500 italic hidden sm:table-cell">{t.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PARTS OF SPEECH */}
      <section className="py-16 px-4 bg-gradient-to-br from-teal-50 to-emerald-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Parts of Speech</h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">Every word in English belongs to one of these eight categories.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PARTS_OF_SPEECH.map((p) => (
              <div key={p.name} className="bg-white rounded-2xl p-5 text-center border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
                <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-2xl ${p.bg}`}>{p.emoji}</div>
                <p className="font-bold text-gray-800 text-sm">{p.name}</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{p.desc}</p>
                <p className="text-xs font-mono text-emerald-600 mt-2 font-semibold">{p.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED LESSON — CONDITIONALS */}
      <section id="exercises" className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-8 sm:p-12 text-white shadow-xl">
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold tracking-wide uppercase mb-5">Featured Lesson</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">Conditional Sentences</h2>
            <p className="text-emerald-100 text-base mb-8 max-w-2xl leading-relaxed">
              Conditional sentences describe situations and their possible results. There are four main types, each expressing a different level of possibility.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {CONDITIONALS.map((c) => (
                <div key={c.type} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <p className="text-xs font-bold text-emerald-200 uppercase tracking-wide mb-1">{c.type}</p>
                  <p className="font-mono text-sm text-white mb-2">{c.structure}</p>
                  <p className="text-emerald-100 italic text-sm">{c.example}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GRAMMAR TIPS */}
      <section id="tips" className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Quick Grammar Tips</h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">Common mistakes and how to avoid them.</p>
          </div>
          <div className="space-y-4">
            {TIPS.map((tip) => (
              <div key={tip.rule} className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm flex gap-4 items-start hover:border-emerald-200 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-lg">{tip.icon}</div>
                <div>
                  <p className="font-bold text-gray-800 mb-1">{tip.rule}</p>
                  <p className="text-gray-500 text-sm leading-relaxed">{tip.explanation}</p>
                  <div className="mt-2 flex flex-col sm:flex-row gap-2 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-100">✗ {tip.wrong}</span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">✓ {tip.correct}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER / CTA */}
      <section className="py-16 px-4 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Improve Your English Every Day</h2>
          <p className="text-emerald-100 text-base mb-8 leading-relaxed">
            Get a grammar tip delivered to your inbox every morning. Join thousands of learners worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email address"
              className="flex-1 px-4 py-3 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 placeholder-gray-400"
            />
            <button className="px-6 py-3 rounded-xl bg-white text-emerald-700 font-bold text-sm hover:bg-emerald-50 transition-colors shadow-md whitespace-nowrap">
              Subscribe Free
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <span className="font-bold text-white text-sm">GrammarMaster</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <a href="#lessons" className="hover:text-white transition-colors">Lessons</a>
              <a href="#tenses" className="hover:text-white transition-colors">Tenses</a>
              <a href="#exercises" className="hover:text-white transition-colors">Exercises</a>
              <a href="#tips" className="hover:text-white transition-colors">Tips</a>
              <a href="/sitemap" className="hover:text-white transition-colors">Sitemap</a>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
            {/* Hidden trigger: double-click the year */}
            <p>
              ©{' '}
              <span
                onDoubleClick={handleCopyrightDoubleClick}
                className="cursor-default select-none"
                title=""
              >
                2024
              </span>
              {' '}GrammarMaster. All rights reserved.
            </p>
            <p className="text-gray-700 text-xs">Made with ♥ for English learners worldwide</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function LessonCard({ title, level, desc, icon, color }: {
  title: string; level: string; desc: string; icon: string; color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group cursor-pointer">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4 ${color}`}>{icon}</div>
      <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
        level === 'Beginner' ? 'bg-green-100 text-green-700' :
        level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
        'bg-red-100 text-red-700'
      }`}>{level}</span>
      <h3 className="font-bold text-gray-900 mt-2 mb-1 text-base group-hover:text-emerald-600 transition-colors">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      <div className="mt-4 flex items-center gap-1 text-emerald-600 text-sm font-semibold">
        Read lesson <span>→</span>
      </div>
    </div>
  )
}

// ─── DATA ────────────────────────────────────────────────────────────────────

const LESSONS = [
  {
    icon: '📝',
    color: 'bg-blue-100',
    level: 'Beginner',
    title: 'Nouns & Pronouns',
    desc: 'Learn how nouns name people, places, and things, and how pronouns replace them in sentences.',
  },
  {
    icon: '⚡',
    color: 'bg-yellow-100',
    level: 'Beginner',
    title: 'Action Verbs',
    desc: 'Understand how action verbs express what the subject does, did, or will do.',
  },
  {
    icon: '🎯',
    color: 'bg-emerald-100',
    level: 'Intermediate',
    title: 'Articles: A, An, The',
    desc: 'Master when to use definite and indefinite articles — one of the trickiest areas for learners.',
  },
  {
    icon: '🔗',
    color: 'bg-purple-100',
    level: 'Intermediate',
    title: 'Conjunctions',
    desc: 'Connect words, phrases, and clauses using coordinating, subordinating, and correlative conjunctions.',
  },
  {
    icon: '🔠',
    color: 'bg-orange-100',
    level: 'Intermediate',
    title: 'Active vs. Passive Voice',
    desc: 'Know when to use active voice for directness and passive voice for formal or impersonal writing.',
  },
  {
    icon: '🏆',
    color: 'bg-red-100',
    level: 'Advanced',
    title: 'Subjunctive Mood',
    desc: 'Learn the subjunctive form used for hypothetical situations, wishes, and formal suggestions.',
  },
]

const TENSES = [
  { name: 'Simple Present', structure: 'S + V1 (s/es)', example: 'She reads every day.' },
  { name: 'Present Continuous', structure: 'S + am/is/are + V-ing', example: 'She is reading now.' },
  { name: 'Present Perfect', structure: 'S + have/has + V3', example: 'She has read the book.' },
  { name: 'Present Perfect Cont.', structure: 'S + have/has + been + V-ing', example: 'She has been reading for an hour.' },
  { name: 'Simple Past', structure: 'S + V2', example: 'She read yesterday.' },
  { name: 'Past Continuous', structure: 'S + was/were + V-ing', example: 'She was reading at 5 PM.' },
  { name: 'Past Perfect', structure: 'S + had + V3', example: 'She had read before dinner.' },
  { name: 'Past Perfect Cont.', structure: 'S + had + been + V-ing', example: 'She had been reading for hours.' },
  { name: 'Simple Future', structure: 'S + will + V1', example: 'She will read tomorrow.' },
  { name: 'Future Continuous', structure: 'S + will + be + V-ing', example: 'She will be reading at 8 PM.' },
  { name: 'Future Perfect', structure: 'S + will + have + V3', example: 'She will have read by Monday.' },
  { name: 'Future Perfect Cont.', structure: 'S + will + have + been + V-ing', example: 'She will have been reading for 2 hours.' },
]

const PARTS_OF_SPEECH = [
  { emoji: '👤', bg: 'bg-blue-50', name: 'Noun', desc: 'Names a person, place, thing, or idea', example: 'dog, city, love' },
  { emoji: '🔄', bg: 'bg-green-50', name: 'Pronoun', desc: 'Replaces a noun', example: 'he, she, they' },
  { emoji: '💥', bg: 'bg-yellow-50', name: 'Verb', desc: 'Expresses action or state', example: 'run, be, seem' },
  { emoji: '✨', bg: 'bg-purple-50', name: 'Adjective', desc: 'Describes a noun', example: 'big, red, fast' },
  { emoji: '🏃', bg: 'bg-orange-50', name: 'Adverb', desc: 'Modifies verbs, adjectives, or adverbs', example: 'quickly, very' },
  { emoji: '📍', bg: 'bg-teal-50', name: 'Preposition', desc: 'Shows relation between words', example: 'in, on, under' },
  { emoji: '🔗', bg: 'bg-rose-50', name: 'Conjunction', desc: 'Connects words or clauses', example: 'and, but, because' },
  { emoji: '❗', bg: 'bg-amber-50', name: 'Interjection', desc: 'Expresses strong emotion', example: 'Oh! Wow! Ouch!' },
]

const CONDITIONALS = [
  { type: 'Zero Conditional', structure: 'If + Present, Present', example: 'If you heat water, it boils.' },
  { type: 'First Conditional', structure: 'If + Present, will + V1', example: 'If it rains, I will stay home.' },
  { type: 'Second Conditional', structure: 'If + Past, would + V1', example: 'If I had money, I would travel.' },
  { type: 'Third Conditional', structure: 'If + Past Perfect, would have + V3', example: 'If I had studied, I would have passed.' },
]

const TIPS = [
  {
    icon: '📌',
    rule: 'Your vs. You\'re',
    explanation: '"Your" shows possession. "You\'re" is a contraction of "you are". Test by replacing with "you are" — if it fits, use you\'re.',
    wrong: 'Your welcome.',
    correct: 'You\'re welcome.',
  },
  {
    icon: '📌',
    rule: 'Less vs. Fewer',
    explanation: 'Use "fewer" for countable nouns and "less" for uncountable nouns.',
    wrong: 'Less people came today.',
    correct: 'Fewer people came today.',
  },
  {
    icon: '📌',
    rule: 'Who vs. Whom',
    explanation: '"Who" is a subject pronoun (like he/she). "Whom" is an object pronoun (like him/her). If you can answer with "him", use "whom".',
    wrong: 'Who did you speak to?',
    correct: 'Whom did you speak to?',
  },
  {
    icon: '📌',
    rule: 'Affect vs. Effect',
    explanation: '"Affect" is usually a verb (to influence). "Effect" is usually a noun (the result). The cold affects me → the effect of cold.',
    wrong: 'The medicine had a positive affect.',
    correct: 'The medicine had a positive effect.',
  },
  {
    icon: '📌',
    rule: 'Apostrophe in Plurals',
    explanation: 'Never use an apostrophe to form a plural. Apostrophes show possession or contractions only.',
    wrong: 'I have three cat\'s.',
    correct: 'I have three cats.',
  },
]
