import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

const ASSET_FIELDS = [
  {
    section: 'Assets',
    color: 'emerald',
    fields: [
      { key: 'cash_savings',     label: 'Cash & Savings',        emoji: '💵', hint: 'All bank accounts, cash at home, money market accounts' },
      { key: 'gold_value',       label: 'Gold (market value)',   emoji: '🥇', hint: 'Current market value of all gold jewellery & bullion you own (above personal use)' },
      { key: 'silver_value',     label: 'Silver (market value)', emoji: '🥈', hint: 'Current market value of all silver you own' },
      { key: 'investments',      label: 'Investments',           emoji: '📈', hint: 'Stocks, shares, unit trusts, crypto, pension (accessible portion)' },
      { key: 'business_assets',  label: 'Business Assets',       emoji: '🏢', hint: 'Stock/inventory of trading goods at current market value' },
      { key: 'receivables',      label: 'Money Owed to You',     emoji: '📋', hint: 'Loans you gave to others that are likely to be repaid' },
    ]
  },
  {
    section: 'Deductions',
    color: 'red',
    fields: [
      { key: 'liabilities',      label: 'Debts & Liabilities',   emoji: '🏦', hint: 'Immediate debts due within the year (not long-term mortgages)' },
    ]
  }
];

const colorMap = {
  emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', label: 'text-emerald-400', input: 'focus:border-emerald-400/50', section: 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400' },
  red:     { border: 'border-red-500/20',     bg: 'bg-red-500/5',     label: 'text-red-400',     input: 'focus:border-red-400/50',     section: 'bg-red-500/8 border-red-500/20 text-red-400' },
};

function Tooltip({ text }) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative inline-block ml-1">
      <button onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} className="text-white/20 hover:text-white/50 transition-colors">
        <Info className="w-3 h-3" />
      </button>
      {show && (
        <div className="absolute bottom-5 left-0 z-50 bg-slate-800 border border-slate-600 rounded-xl p-3 text-xs text-white/80 w-56 shadow-xl leading-relaxed">{text}</div>
      )}
    </div>
  );
}

export default function AssetInputPanel({ assets, onChange, currency }) {
  const currencySymbol = { GBP: '£', USD: '$', EUR: '€', AED: 'د.إ', SAR: '﷼', MYR: 'RM', PKR: '₨', TRY: '₺' }[currency] || '£';

  return (
    <div className="space-y-5">
      {ASSET_FIELDS.map(({ section, color, fields }) => {
        const c = colorMap[color];
        return (
          <div key={section}>
            <div className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full border mb-3 ${c.section}`}>
              {section === 'Assets' ? '↑' : '↓'} {section}
            </div>
            <div className="space-y-2">
              {fields.map(({ key, label, emoji, hint }) => (
                <motion.div key={key} whileFocus={{ scale: 1.01 }}
                  className={`flex items-center gap-3 ${c.bg} border ${c.border} rounded-2xl px-4 py-3`}>
                  <span className="text-xl flex-shrink-0">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <label className={`text-xs font-bold ${c.label}`}>{label}</label>
                      <Tooltip text={hint} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-white/40 text-sm font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={assets[key] || ''}
                      onChange={e => onChange(key, e.target.value)}
                      placeholder="0.00"
                      className={`w-28 bg-transparent border-b border-white/20 ${c.input} text-white font-bold text-right text-sm py-0.5 focus:outline-none transition-colors`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}