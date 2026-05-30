"use client";

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/lib/supabaseClient';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (!user) {
      alert('Please sign in first');
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          email: user.email,
          successUrl: `${window.location.origin}/dashboard`,
          cancelUrl: `${window.location.origin}/pricing`
        }),
      });
      
      const { url, error } = await response.json();
      
      if (error) throw new Error(error);
      if (url) window.location.href = url;
      
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-white mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-center text-gray-400 mb-12">
          Choose the plan that works for you
        </p>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Free</h2>
            <p className="text-gray-400 mb-4">Perfect for getting started</p>
            <p className="text-4xl font-bold text-white mb-6">$0<span className="text-sm text-gray-400">/month</span></p>
            <ul className="space-y-3 mb-8">
              <li className="text-gray-300">✅ 3 saved projects</li>
              <li className="text-gray-300">✅ Local AI generation</li>
              <li className="text-gray-300">✅ Live preview</li>
              <li className="text-gray-300">✅ ZIP export</li>
              <li className="text-gray-500">❌ Unlimited projects</li>
              <li className="text-gray-500">❌ Cloud sync</li>
            </ul>
            <button className="w-full py-3 rounded-lg bg-gray-800 text-white font-medium cursor-default">
              Current Plan
            </button>
          </div>
          
          {/* Pro Tier */}
          <div className="bg-gradient-to-b from-purple-900/30 to-gray-900 rounded-2xl border border-purple-500/50 p-8 relative">
            <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs px-3 py-1 rounded-bl-xl rounded-tr-xl">
              POPULAR
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Pro</h2>
            <p className="text-gray-400 mb-4">For power users and creators</p>
            <p className="text-4xl font-bold text-white mb-6">$12<span className="text-sm text-gray-400">/month</span></p>
            <ul className="space-y-3 mb-8">
              <li className="text-gray-300">✅ Unlimited saved projects</li>
              <li className="text-gray-300">✅ Local AI generation</li>
              <li className="text-gray-300">✅ Live preview</li>
              <li className="text-gray-300">✅ ZIP export</li>
              <li className="text-gray-300">✅ Cloud sync & backup</li>
              <li className="text-gray-300">✅ Priority support</li>
            </ul>
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Upgrade to Pro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}