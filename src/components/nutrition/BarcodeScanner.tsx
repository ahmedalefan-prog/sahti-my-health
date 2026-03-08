import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useStore, generateId, getTodayStr, type FoodLogEntry } from '@/lib/store';
import { ScanBarcode, X, Loader2, Search, Camera, Keyboard } from 'lucide-react';
import { toast } from 'sonner';
import { useAnimatedModal } from '@/hooks/use-animated-modal';

interface BarcodeProduct {
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  sodium: number;
  sugar: number;
}

interface BarcodeScannerProps {
  selectedMeal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

const BarcodeScanner = ({ selectedMeal }: BarcodeScannerProps) => {
  const { t, lang } = useLanguage();
  const { addFoodLogEntry } = useStore();
  const modal = useAnimatedModal();
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);
  const scanRegionRef = useRef<HTMLDivElement>(null);

  const stopCamera = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().catch(() => {});
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  const lookupBarcode = useCallback(async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setProduct(null);

    try {
      const resp = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code.trim()}.json`);
      const data = await resp.json();

      if (data.status !== 1 || !data.product) {
        setError(lang === 'ar' ? 'لم يتم العثور على المنتج. تأكد من الباركود.' : 'Product not found. Check the barcode.');
        return;
      }

      const p = data.product;
      const nutriments = p.nutriments || {};

      setProduct({
        name: p.product_name_ar || p.product_name || p.generic_name || 'Unknown',
        calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0),
        carbs: Math.round(nutriments.carbohydrates_100g || 0),
        protein: Math.round(nutriments.proteins_100g || 0),
        fat: Math.round(nutriments.fat_100g || 0),
        sodium: Math.round((nutriments.sodium_100g || 0) * 1000),
        sugar: Math.round(nutriments.sugars_100g || 0),
      });
      stopCamera();
    } catch {
      setError(lang === 'ar' ? 'خطأ في الاتصال. حاول مرة أخرى.' : 'Connection error. Try again.');
    } finally {
      setLoading(false);
    }
  }, [lang, stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      // Wait for DOM element
      await new Promise(r => setTimeout(r, 100));
      
      if (!scanRegionRef.current) return;
      
      const scannerId = 'barcode-scanner-region';
      scanRegionRef.current.id = scannerId;
      
      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 120 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          setBarcode(decodedText);
          lookupBarcode(decodedText);
          scanner.stop().catch(() => {});
          scannerRef.current = null;
        },
        () => {} // ignore scan failures
      );
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(
        lang === 'ar' 
          ? 'لا يمكن الوصول للكاميرا. استخدم الإدخال اليدوي.' 
          : 'Cannot access camera. Use manual input.'
      );
      setMode('manual');
    }
  }, [lang, lookupBarcode]);

  useEffect(() => {
    if (modal.isOpen && mode === 'camera' && !product) {
      startCamera();
    }
    return () => stopCamera();
  }, [modal.isOpen, mode, product, startCamera, stopCamera]);

  const addProduct = () => {
    if (!product) return;
    const entry: FoodLogEntry = {
      id: generateId(),
      date: getTodayStr(),
      meal: selectedMeal,
      foodName: product.name,
      calories: product.calories,
      carbs: product.carbs,
      protein: product.protein,
      fat: product.fat,
      sodium: product.sodium,
      potassium: 0,
      sugar: product.sugar,
    };
    addFoodLogEntry(entry);
    toast.success(lang === 'ar' ? 'تمت الإضافة ✅' : 'Added ✅');
    handleClose();
  };

  const handleClose = () => {
    stopCamera();
    modal.close();
    setBarcode('');
    setProduct(null);
    setError('');
    setCameraError('');
    setMode('camera');
  };

  return (
    <>
      <button onClick={() => modal.open()}
        className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center touch-target">
        <ScanBarcode size={20} className="text-primary" />
      </button>

      {modal.isOpen && (
        <div className={`fixed inset-0 bg-foreground/40 z-50 flex items-end ${modal.isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={handleClose}>
          <div className={`bg-card w-full max-w-lg mx-auto rounded-t-3xl p-6 pb-24 max-h-[90vh] flex flex-col overflow-y-auto ${modal.isClosing ? 'animate-sheet-down' : 'animate-sheet-up'}`} onClick={e => e.stopPropagation()} onAnimationEnd={modal.afterClose}>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-lg font-bold">{t('nut.barcodeTitle')}</h2>
              <button onClick={handleClose} className="p-2 touch-target">
                <X size={20} />
              </button>
            </div>

            {/* Mode Toggle */}
            {!product && (
              <div className="flex gap-2 mb-4 flex-shrink-0">
                <button 
                  onClick={() => setMode('camera')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    mode === 'camera' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                  }`}>
                  <Camera size={16} />
                  {lang === 'ar' ? 'كاميرا' : 'Camera'}
                </button>
                <button 
                  onClick={() => { stopCamera(); setMode('manual'); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    mode === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                  }`}>
                  <Keyboard size={16} />
                  {lang === 'ar' ? 'إدخال يدوي' : 'Manual'}
                </button>
              </div>
            )}

            {/* Camera View */}
            {mode === 'camera' && !product && (
              <div className="mb-4 flex-shrink-0">
                <div 
                  ref={scanRegionRef}
                  className="w-full rounded-2xl overflow-hidden bg-foreground/5 min-h-[220px]"
                />
                {cameraError && (
                  <p className="text-destructive text-sm text-center mt-2">{cameraError}</p>
                )}
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {lang === 'ar' ? 'وجّه الكاميرا نحو الباركود' : 'Point camera at the barcode'}
                </p>
              </div>
            )}

            {/* Manual Input */}
            {mode === 'manual' && !product && (
              <div className="flex gap-2 mb-4 flex-shrink-0">
                <div className="relative flex-1">
                  <ScanBarcode size={18} className="absolute start-3 top-3.5 text-muted-foreground" />
                  <input
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && lookupBarcode(barcode)}
                    autoFocus
                    inputMode="numeric"
                    className="w-full bg-secondary rounded-xl px-4 py-3 ps-10 outline-none focus:ring-2 focus:ring-primary"
                    placeholder={lang === 'ar' ? 'أدخل رقم الباركود...' : 'Enter barcode number...'}
                  />
                </div>
                <button onClick={() => lookupBarcode(barcode)} disabled={loading || !barcode.trim()}
                  className="px-4 rounded-xl gradient-primary text-primary-foreground font-bold disabled:opacity-40">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={28} className="animate-spin text-primary" />
                <span className="ms-2 text-muted-foreground">{lang === 'ar' ? 'جارٍ البحث...' : 'Searching...'}</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-center py-4 text-destructive text-sm">{error}</div>
            )}

            {/* Product Result */}
            {product && (
              <div className="space-y-3">
                <div className="medical-card">
                  <h3 className="font-bold text-lg mb-2">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{lang === 'ar' ? 'القيم الغذائية لكل 100 غرام' : 'Per 100g'}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center bg-secondary/50 rounded-xl p-2">
                      <p className="text-xs text-muted-foreground">{t('nut.caloriesLabel')}</p>
                      <p className="font-bold text-primary">{product.calories}</p>
                    </div>
                    <div className="text-center bg-secondary/50 rounded-xl p-2">
                      <p className="text-xs text-muted-foreground">{t('protein')}</p>
                      <p className="font-bold">{product.protein}g</p>
                    </div>
                    <div className="text-center bg-secondary/50 rounded-xl p-2">
                      <p className="text-xs text-muted-foreground">{t('carbs')}</p>
                      <p className="font-bold">{product.carbs}g</p>
                    </div>
                    <div className="text-center bg-secondary/50 rounded-xl p-2">
                      <p className="text-xs text-muted-foreground">{t('fat')}</p>
                      <p className="font-bold">{product.fat}g</p>
                    </div>
                    <div className="text-center bg-secondary/50 rounded-xl p-2">
                      <p className="text-xs text-muted-foreground">{t('nut.sodium')}</p>
                      <p className="font-bold">{product.sodium}mg</p>
                    </div>
                    <div className="text-center bg-secondary/50 rounded-xl p-2">
                      <p className="text-xs text-muted-foreground">{t('nut.sugar')}</p>
                      <p className="font-bold">{product.sugar}g</p>
                    </div>
                  </div>
                </div>

                <button onClick={addProduct}
                  className="w-full gradient-primary text-primary-foreground font-bold py-3 rounded-xl">
                  {lang === 'ar' ? `إضافة إلى ${t(`meal.${selectedMeal}`)}` : `Add to ${t(`meal.${selectedMeal}`)}`}
                </button>
                
                <button onClick={() => { setProduct(null); setBarcode(''); setError(''); setMode('camera'); }}
                  className="w-full bg-secondary font-bold py-3 rounded-xl">
                  {lang === 'ar' ? 'مسح منتج آخر' : 'Scan another'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default BarcodeScanner;
