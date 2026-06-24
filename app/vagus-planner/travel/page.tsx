'use client';

import Layout from '@/app/components/Layout';

const TRAVEL_CARDS = [
  {
    icon: '🌍',
    title: 'Plan a Trip',
    description: 'Start planning your next adventure',
  },
  {
    icon: '🧳',
    title: 'Packing List',
    description: 'Create and manage packing lists',
  },
  {
    icon: '💰',
    title: 'Budget Tracker',
    description: 'Track your travel expenses',
  },
];

export default function TravelPage() {
  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto pt-24">
        <h1 className="text-3xl font-bold mb-6">✈️ Travel Planner</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {TRAVEL_CARDS.map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="text-3xl mb-2">{card.icon}</div>
              <h3 className="font-semibold">{card.title}</h3>
              <p className="text-sm text-gray-500">{card.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Trips</h2>
          <p className="text-gray-500">
            No trips planned yet. Start planning your next adventure!
          </p>
        </div>
      </div>
    </Layout>
  );
}
