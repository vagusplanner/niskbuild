import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2, XCircle, AlertTriangle, ScanLine, Edit3, Save, RotateCcw } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// ── Local cache helpers ───────────────────────────────────────────────────────
const CACHE_KEY = 'halal_barcode_cache';

function getCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}

function setCache(barcode, data) {
  try {
    const cache = getCache();
    cache[barcode] = { ...data, cached_at: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

function getCached(barcode) {
  const cache = getCache();
  const entry = cache[barcode];
  // Cache valid for 30 days
  if (entry && Date.now() - entry.cached_at < 30 * 24 * 60 * 60 * 1000) return entry;
  return null;
}

// ── Halal lookup ─────────────────────────────────────────────────────────────
async function lookupProduct(barcode) {
  // Check cache first
  const cached = getCached(barcode);
  if (cached) return { ...cached, from_cache: true };

  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  const data = await res.json();

  if (data.status !== 1) return null;

  const p = data.product;
  const name = p.product_name_en || p.product_name || 'Unknown Product';
  const ingredients = p.ingredients_text_en || p.ingredients_text || '';
  const labels = (p.labels || '').toLowerCase();
  const categories = (p.categories || '').toLowerCase();

  const explicitHalal = labels.includes('halal');
  const explicitHaram =
    labels.includes('haram') ||
    /pork|lard|bacon|wine|beer|alcohol|gelatin/i.test(ingredients);

  const aiResult = await SDK.integrations.Core.InvokeLLM({
    prompt: `You are an Islamic Halal food expert. Assess whether this product is Halal for a Muslim consumer.

Product: ${name}
Ingredients: ${ingredients || 'Not listed'}
Labels: ${labels || 'None'}
Categories: ${categories || 'Unknown'}
Explicit halal label: ${explicitHalal}
Contains suspect ingredient: ${explicitHaram}

Return halal_status (one of: "halal", "haram", "mashbooh", "unknown"), a short reason (max 20 words), and the cleaned product name.`,
    response_json_schema: {
      type: 'object',
      properties: {
        product_name: { type: 'string' },
        halal_status: { type: 'string' },
        reason: { type: 'string' },
        is_halal: { type: 'boolean' },
      }
    }
  });

  const result = {
    barcode,
    name: aiResult.product_name || name,
    halal_status: aiResult.halal_status || (explicitHalal ? 'halal' : explicitHaram ? 'haram' : 'unknown'),
    reason: aiResult.reason || '',
    is_halal: aiResult.is_halal ?? explicitHalal,
    ingredients_snippet: ingredients.slice(0, 120),
    from_cache: false,
  };

  setCache(barcode, result);
  return result;
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  halal:    { color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/25', icon: CheckCircle2,  label: '✅ Halal' },
  haram:    { color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/25',         icon: XCircle,       label: '🚫 Haram' },
  mashbooh: { color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/25',     icon: AlertTriangle, label: '⚠️ Doubtful (Mashbooh)' },
  unknown:  { color: 'text-slate-400',   bg: 'bg-slate-400/10 border-slate-400/25',     icon: AlertTriangle, label: '❓ Unknown' },
};

const HALAL_OPTIONS = ['halal', 'haram', 'mashbooh', 'unknown'];

export default function BarcodeScanner({ onAdd, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const scanLoopRef = useRef(null);

  const [phase, setPhase] = useState('init'); // init | scanning | looking_up | result | manual
  const [result, setResult] = useState(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraSupported, setCameraSupported] = useState(true);
  const [lastScanned, setLastScanned] = useState(null);

  // Correction state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('unknown');
  const [editReason, setEditReason] = useState('');

  // ── Camera init ─────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      if (!('BarcodeDetector' in window)) {
        setCameraSupported(false);
        setPhase('manual');
        return;
      }
      try {
        detectorRef.current = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
        });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setPhase('scanning');
        startScanLoop();
      } catch {
        setCameraSupported(false);
        setPhase('manual');
      }
    };
    init();
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  const startScanLoop = () => {
    const detect = async () => {
      if (!videoRef.current || !detectorRef.current) return;
      try {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          if (code !== lastScanned) {
            setLastScanned(code);
            stopCamera();
            await processBarcode(code);
            return;
          }
        }
      } catch { /* ignore */ }
      scanLoopRef.current = requestAnimationFrame(detect);
    };
    scanLoopRef.current = requestAnimationFrame(detect);
  };

  const processBarcode = async (code) => {
    setPhase('looking_up');
    try {
      const product = await lookupProduct(code);
      if (!product) {
        toast.error('Product not found in database');
        setPhase('manual');
        return;
      }
      setResult(product);
      setEditName(product.name);
      setEditStatus(product.halal_status);
      setEditReason(product.reason);
      setPhase('result');
      if (product.from_cache) toast.info('Loaded from local cache ⚡');
    } catch {
      toast.error('Lookup failed — try manual entry');
      setPhase('manual');
    }
  };

  const handleManualLookup = async () => {
    if (!manualBarcode.trim()) return;
    stopCamera();
    await processBarcode(manualBarcode.trim());
  };

  const saveCorrection = () => {
    const updated = {
      ...result,
      name: editName.trim() || result.name,
      halal_status: editStatus,
      reason: editReason,
      is_halal: editStatus === 'halal',
    };
    // Update cache with user correction
    setCache(updated.barcode, updated);
    setResult(updated);
    setEditing(false);
    toast.success('Correction saved to local cache');
  };

  const handleAddToList = () => {
    if (!result) return;
    onAdd({
      name: result.name,
      quantity: '1',
      category: result.is_halal ? 'meat_halal' : 'other',
      is_halal_verified: result.is_halal,
      notes: `Barcode: ${result.barcode} · ${result.reason}`,
      halal_status: result.halal_status,
    });
    onClose();
  };

  const handleRejectHaram = () => {
    toast.error(`"${result?.name}" marked as Not Halal and not added.`);
    onClose();
  };

  const handleRescan = async () => {
    setResult(null);
    setLastScanned(null);
    setEditing(false);
    setPhase('init');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setPhase('scanning');
      startScanLoop();
    } catch { setPhase('manual'); }
  };

  const statusCfg = result ? (STATUS_CONFIG[result.halal_status] || STATUS_CONFIG.unknown) : null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3">
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        className="bg-[#0a1f44] border border-white/15 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-teal-400" />
            <h3 className="font-black text-white text-base">Halal Barcode Scanner</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Camera viewfinder */}
          {(phase === 'scanning' || phase === 'init') && (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-36 border-2 border-teal-400 rounded-xl relative">
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-teal-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-teal-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-teal-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-teal-400 rounded-br-lg" />
                  <motion.div animate={{ y: [0, 120, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 right-0 h-0.5 bg-teal-400/80 rounded-full" />
                </div>
              </div>
              <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/60 font-medium">Point at barcode to scan</p>
            </div>
          )}

          {/* Looking up */}
          {phase === 'looking_up' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
              <div className="text-center">
                <p className="font-bold text-white text-sm">Checking Halal Status…</p>
                <p className="text-white/40 text-xs mt-1">Open Food Facts + AI verification</p>
              </div>
            </div>
          )}

          {/* Result */}
          {phase === 'result' && result && statusCfg && (
            <div className="space-y-3">
              {/* Cache badge */}
              {result.from_cache && (
                <div className="flex items-center gap-1.5 text-[10px] text-teal-400/70 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                  Loaded from local cache
                </div>
              )}

              {/* Status badge */}
              <div className={`flex items-center gap-3 p-4 rounded-2xl border ${statusCfg.bg}`}>
                <statusCfg.icon className={`w-6 h-6 ${statusCfg.color} flex-shrink-0`} />
                <div className="flex-1">
                  <p className={`font-black text-sm ${statusCfg.color}`}>{statusCfg.label}</p>
                  {result.reason && <p className="text-white/50 text-xs mt-0.5">{result.reason}</p>}
                </div>
              </div>

              {/* Product info / edit form */}
              <AnimatePresence mode="wait">
                {editing ? (
                  <motion.div key="edit" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="bg-white/[0.04] border border-white/15 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-black text-white/50 uppercase tracking-widest">Correct Details</p>
                    <div>
                      <label className="text-[10px] text-white/40 font-bold mb-1 block">Product Name</label>
                      <Input value={editName} onChange={e => setEditName(e.target.value)}
                        className="bg-white/5 border-white/20 text-white text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 font-bold mb-1.5 block">Halal Status</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {HALAL_OPTIONS.map(opt => {
                          const cfg = STATUS_CONFIG[opt];
                          return (
                            <button key={opt} onClick={() => setEditStatus(opt)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${editStatus === opt ? `${cfg.bg} ${cfg.color}` : 'border-white/10 text-white/30 hover:text-white'}`}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 font-bold mb-1 block">Reason / Notes</label>
                      <Input value={editReason} onChange={e => setEditReason(e.target.value)}
                        placeholder="e.g. Contains E471 (plant-based confirmed)"
                        className="bg-white/5 border-white/20 text-white text-sm placeholder:text-white/20" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button onClick={() => setEditing(false)} variant="outline" size="sm"
                        className="flex-1 border-white/15 text-white/50 bg-transparent text-xs">
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Cancel
                      </Button>
                      <Button onClick={saveCorrection} size="sm"
                        className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs">
                        <Save className="w-3.5 h-3.5 mr-1" /> Save & Cache
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="info" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white font-black text-base leading-tight flex-1">{result.name}</p>
                      <button onClick={() => setEditing(true)}
                        className="p-1.5 text-white/25 hover:text-teal-400 transition-colors flex-shrink-0" title="Correct this info">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-white/30 text-xs font-mono">Barcode: {result.barcode}</p>
                    {result.ingredients_snippet && (
                      <p className="text-white/40 text-xs leading-relaxed line-clamp-2">
                        <span className="text-white/25 font-bold">Ingredients: </span>{result.ingredients_snippet}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              {!editing && (
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleRescan} variant="outline"
                    className="border-white/15 text-white/60 bg-transparent text-sm">
                    Scan Again
                  </Button>
                  {result.halal_status === 'haram' ? (
                    <Button onClick={handleRejectHaram}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-400/20 text-sm font-bold">
                      <XCircle className="w-4 h-4 mr-1" /> Not Halal
                    </Button>
                  ) : (
                    <Button onClick={handleAddToList}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Add to List
                    </Button>
                  )}
                </div>
              )}

              {/* "Not Halal" reject for non-haram items too (mashbooh / unknown) */}
              {!editing && result.halal_status !== 'haram' && result.halal_status !== 'halal' && (
                <button onClick={handleRejectHaram}
                  className="w-full text-center text-xs text-red-400/60 hover:text-red-400 transition-colors py-1">
                  Mark as Not Halal & discard →
                </button>
              )}
            </div>
          )}

          {/* Manual entry */}
          {phase === 'manual' && (
            <div className="space-y-4">
              {!cameraSupported && (
                <div className="flex items-center gap-2 p-3 bg-amber-400/8 border border-amber-400/15 rounded-2xl text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Camera / BarcodeDetector not supported. Enter barcode manually.
                </div>
              )}
              <div>
                <label className="text-xs text-white/40 font-bold uppercase mb-2 block">Enter Barcode Manually</label>
                <div className="flex gap-2">
                  <Input value={manualBarcode} onChange={e => setManualBarcode(e.target.value)}
                    placeholder="e.g. 5000169066416"
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/25 font-mono tracking-wider flex-1"
                    onKeyDown={e => e.key === 'Enter' && handleManualLookup()} />
                  <Button onClick={handleManualLookup} disabled={!manualBarcode.trim()}
                    className="bg-teal-500 hover:bg-teal-600 text-white font-bold flex-shrink-0">
                    Check
                  </Button>
                </div>
              </div>
              <p className="text-white/25 text-xs text-center">Powered by Open Food Facts + AI Islamic verification</p>
            </div>
          )}

          {/* Manual fallback while scanning */}
          {phase === 'scanning' && (
            <button onClick={() => { stopCamera(); setPhase('manual'); }}
              className="w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors py-1">
              Enter barcode manually instead →
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}