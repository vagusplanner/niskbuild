'use client';

import Layout from '@/app/components/Layout';

export default function FinancePage() {
  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto pt-24">
        <h1 className="text-3xl font-bold mb-6">💰 Finance & Zakat</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
            <p className="text-sm opacity-80">Total Balance</p>
            <p className="text-3xl font-bold">$12,450</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
            <p className="text-sm opacity-80">Zakat Due</p>
            <p className="text-3xl font-bold">$311</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
            <p className="text-sm opacity-80">Donations</p>
            <p className="text-3xl font-bold">$1,245</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
          <p className="text-gray-500">No transactions yet. Start tracking your finances!</p>
        </div>
      </div>
    </Layout>
  );
}
