import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useStore, generateId, getTodayStr, type FoodLogEntry } from '@/lib/store';
import { ScanBarcode, X, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

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
  const [showModal, setShowModal] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [error, setError] = useState('');

  const lookupBarcode = async () => {
    if (!barcode.trim()) return;
    setLoading(true);
    setError('');
    setProduct(null);

    try {
      const resp = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode.trim()}.json`);
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
    } catch {
      setError(lang === 'ar' ? 'خطأ في الاتصال. حاول مرة أخرى.' : 'Connection error. Try again.');
    } finally {
      setLoading(false);
    }
  };

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
    setShowModal(false);
    setBarcode('');
    setProduct(null);
  };

  return (
    <>
      <button onClick={() => setShowModal(true)}
        className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center touch-target">
        <ScanBarcode size={20} className="text-primary" />
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end">
          <div className="bg-card w-full max-w-lg mx-auto rounded-t-3xl p-6 max-h-[70vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{t('nut.barcodeTitle')}</h2>
              <button onClick={() => { setShowModal(false); setProduct(null); setBarcode(''); setError(''); }} className="p-2">
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <ScanBarcode size={18} className="absolute start-3 top-3.5 text-muted-foreground" />
                <input
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && lookupBarcode()}
                  autoFocus
                  inputMode="numeric"
                  className="w-full bg-secondary rounded-xl px-4 py-3 ps-10 outline-none focus:ring-2 focus:ring-primary"
                  placeholder={lang === 'ar' ? 'أدخل رقم الباركود...' : 'Enter barcode number...'}
                />
              </div>
              <button onClick={lookupBarcode} disabled={loading || !barcode.trim()}
                className="px-4 rounded-xl gradient-primary text-primary-foreground font-bold disabled:opacity-40">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              </button>
            </div>

            {error && (
              <div className="text-center py-4 text-destructive text-sm">{error}</div>
            )}

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
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default BarcodeScanner;
