"use client";

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/lib/supabaseClient';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (tier: string, priceId: string) => {
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
          priceId: priceId,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`
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

  const tiers = [
    {
      name: 'Sandbox',
      price: '$0',
      period: '/month',
      description: 'Test the waters',
      features: [
        '✅ 1 project',
        '✅ WebGPU local AI',
        '✅ Live preview',
        '❌ Export (locked)',
        '❌ Cloud credits',
      ],
      buttonText: 'Current Plan',
      buttonClass: 'bg-gray-800 cursor-default',
      highlighted: false,
      priceId: null,
    },
    {
      name: 'Builder Pro',
      price: '$69',
      period: '/month',
      description: 'For serious freelancers',
      features: [
        '✅ 3 active projects',
        '✅ 600 cloud credits/mo',
        '✅ Unlimited local AI',
        '✅ Clean ZIP export',
        '✅ Priority support',
      ],
      buttonText: 'Upgrade to Pro',
      buttonClass: 'bg-purple-600 hover:bg-purple-500',
      highlighted: false,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'pro_price_id',
    },
    {
      name: 'Agency Studio',
      price: '$199',
      period: '/month',
      description: 'For growing agencies',
      features: [
        '✅ 15 active projects',
        '✅ 2,500 cloud credits/mo',
        '✅ 1-click Vercel deploy',
        '✅ 5 client preview links',
        '✅ Team collaboration',
      ],
      buttonText: 'Upgrade to Agency',
      buttonClass: 'bg-purple-600 hover:bg-purple-500',
      highlighted: true,
      priceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID || 'agency_price_id',
    },
    {
      name: 'Agency Scale',
      price: '$549',
      period: '/month',
      description: 'For high-volume teams',
      features: [
        '✅ Unlimited projects',
        '✅ 10,000 cloud credits/mo',
        '✅ 10 team seats',
        '✅ Priority AI queue',
        '✅ Unlimited previews',
      ],
      buttonText: 'Upgrade to Scale',
      buttonClass: 'bg-purple-600 hover:bg-purple-500',
      highlighted: false,
      priceId: process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID || 'scale_price_id',
    },
    {
      name: 'White-Label',
      price: '$1,199',
      period: '/month',
      description: 'For resellers',
      features: [
        '✅ Complete rebranding',
        '✅ Custom domain',
        '✅ 15,000 pooled credits',
        '✅ Unlimited child users',
        '✅ Stripe integration',
      ],
      buttonText: 'Contact Sales',
      buttonClass: 'bg-emerald-600 hover:bg-emerald-500',
      highlighted: false,
      priceId: null,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0F] py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-white mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
          Choose the plan that works for you. No hidden fees. Cancel anytime.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-6 transition-all ${
                tier.highlighted
                  ? 'bg-gradient-to-b from-purple-900/30 to-[#111118] border-2 border-purple-500 scale-105 shadow-xl'
                  : 'bg-[#111118] border border-gray-800 hover:border-purple-500/50'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs px-3 py-1 rounded-full">
                  MOST POPULAR
                </div>
              )}
              <h2 className="text-xl font-bold text-white mb-1">{tier.name}</h2>
              <p className="text-gray-400 text-sm mb-4">{tier.description}</p>
              <p className="text-3xl font-bold text-white mb-6">
                {tier.price}<span className="text-sm text-gray-400">{tier.period}</span>
              </p>
              <ul className="space-y-2 mb-8 text-sm">
                {tier.features.map((feature, i) => (
                  <li key={i} className="text-gray-300">{feature}</li>
                ))}
              </ul>
              <button
                onClick={() => tier.priceId && handleSubscribe(tier.name.toLowerCase(), tier.priceId)}
                disabled={loading || !tier.priceId}
                className={`w-full py-2 rounded-lg font-medium transition-all disabled:opacity-50 ${tier.buttonClass}`}
              >
                {tier.buttonText}
              </button>
            </div>
          ))}
        </div>

        {/* Enterprise Contact */}
        <div className="text-center mt-12 pt-8 border-t border-gray-800">
          <p className="text-gray-400 text-sm">
            Need on-premise or dedicated instance?{' '}
            <a href="/contact" className="text-purple-400 hover:text-purple-300">
              Contact Enterprise Sales →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}