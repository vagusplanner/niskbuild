'use client';

import Link from 'next/link';
import Layout from '@/app/components/Layout';

const FEATURES = [
  {
    icon: '🕌',
    title: 'Prayer Times',
    description: 'Track daily prayers with accurate times',
    link: '/vagus-planner/islam/prayer-times',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: '📖',
    title: 'Quran Study',
    description: 'Read, study, and reflect on the Quran',
    link: '/vagus-planner/islam/quran',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    icon: '🤲',
    title: 'Zakat Calculator',
    description: 'Calculate your Zakat accurately',
    link: '/vagus-planner/islam/zakat',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: '🕋',
    title: 'Hajj & Umrah',
    description: 'Plan and track your pilgrimage',
    link: '/vagus-planner/islam/hajj',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: '🌙',
    title: 'Ramadan Tracker',
    description: 'Track fasting days and progress',
    link: '/vagus-planner/islam/ramadan',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: '📿',
    title: 'Dhikr Counter',
    description: 'Track your daily dhikr and duas',
    link: '/vagus-planner/islam/dhikr',
    color: 'from-rose-500 to-pink-500',
  },
];

export default function IslamPage() {
  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            🕌 Islamic Features
          </h1>
          <p className="text-gray-600 mt-2">
            Explore tools and resources for your spiritual journey
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <Link
              key={feature.link}
              href={feature.link}
              className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}
              >
                {feature.icon}
              </div>
              <h3 className="font-semibold text-lg group-hover:text-purple-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-500 text-sm mt-1">{feature.description}</p>
              <div className="mt-4 text-purple-600 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                Explore <span className="text-xs">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
