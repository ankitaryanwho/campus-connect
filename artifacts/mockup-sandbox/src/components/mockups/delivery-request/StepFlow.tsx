import React, { useState } from 'react';
import { 
  UtensilsCrossed, 
  BookOpen, 
  Home, 
  Dumbbell, 
  ShoppingBag, 
  Cross, 
  Coffee, 
  CheckCircle2,
  Minus,
  Plus,
  Clock,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

const LOCATIONS = [
  { id: 'cafeteria', name: 'Main Cafeteria', icon: UtensilsCrossed, color: 'text-orange-500' },
  { id: 'library', name: 'Central Library', icon: BookOpen, color: 'text-blue-500' },
  { id: 'block-a', name: 'Block A Hostel', icon: Home, color: 'text-emerald-500' },
  { id: 'block-b', name: 'Block B Hostel', icon: Home, color: 'text-emerald-500' },
  { id: 'sports', name: 'Sports Complex', icon: Dumbbell, color: 'text-rose-500' },
  { id: 'market', name: 'Main Gate Market', icon: ShoppingBag, color: 'text-purple-500' },
  { id: 'health', name: 'Health Center', icon: Cross, color: 'text-red-500' },
  { id: 'canteen', name: 'Tech Block Canteen', icon: Coffee, color: 'text-amber-500' },
];

const CATEGORIES = ['Food', 'Groceries', 'Pharmacy', 'Stationery', 'Other'];

export function StepFlow() {
  const [step, setStep] = useState(2);
  const [category, setCategory] = useState('Food');
  const [itemName, setItemName] = useState('Chicken biryani + cold drink');
  const [quantity, setQuantity] = useState(2);
  const [notes, setNotes] = useState('');
  
  const [pickup, setPickup] = useState('cafeteria');
  const [dropoff, setDropoff] = useState('B-204');

  const selectedLocation = LOCATIONS.find(l => l.id === pickup);

  const Header = () => (
    <div className="bg-[#5B4FE8] pt-12 pb-6 px-6 rounded-b-[32px] text-white flex flex-col items-center shadow-sm z-10 relative">
      <div className="text-sm font-medium mb-3 opacity-90">Step {step} of 3</div>
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div 
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              step === i ? 'w-6 bg-white' : 'w-2 bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-[390px] mx-auto min-h-[100dvh] bg-[#FAF8F4] relative overflow-hidden font-['Inter'] text-[#1A1A2E] flex flex-col">
      <Header />

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-32 no-scrollbar">
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="text-6xl mb-4">📦</div>
              <h1 className="text-2xl font-bold mb-2">What do you need?</h1>
              <p className="text-[#1A1A2E]/60 text-sm">We'll pick it up and bring it to you</p>
            </div>

            <div className="mb-8">
              <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-colors border ${
                      category === cat 
                        ? 'bg-[#5B4FE8] text-white border-[#5B4FE8]' 
                        : 'bg-white text-[#1A1A2E] border-[#E8E4F0] hover:border-[#5B4FE8]/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <input 
                type="text"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                placeholder="e.g. Chicken biryani + cold drink"
                className="w-full text-lg pb-3 border-b-2 border-[#5B4FE8]/20 focus:border-[#5B4FE8] bg-transparent outline-none transition-colors placeholder:text-[#1A1A2E]/30"
              />
            </div>

            <div className="flex items-center justify-between mb-8">
              <span className="font-semibold">Quantity</span>
              <div className="flex items-center gap-4 bg-white rounded-full p-1 border border-[#E8E4F0]">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[#FAF8F4] text-[#1A1A2E] hover:bg-[#E8E4F0]"
                >
                  <Minus size={18} />
                </button>
                <span className="w-4 text-center font-semibold">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[#FAF8F4] text-[#1A1A2E] hover:bg-[#E8E4F0]"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any extras or preferences?"
                className="w-full bg-[#FAF8F4] border-none rounded-xl p-4 min-h-[100px] outline-none focus:bg-white focus:ring-1 focus:ring-[#5B4FE8]/20 transition-all text-sm resize-none placeholder:text-[#1A1A2E]/40 shadow-inner shadow-black/5"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold mb-5">Pick up from...</h2>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
              {LOCATIONS.map(loc => {
                const isSelected = pickup === loc.id;
                const Icon = loc.icon;
                return (
                  <button
                    key={loc.id}
                    onClick={() => setPickup(loc.id)}
                    className={`relative bg-white p-4 rounded-2xl text-left transition-all ${
                      isSelected 
                        ? 'border-2 border-[#5B4FE8] shadow-md' 
                        : 'border-2 border-transparent shadow-sm hover:border-[#E8E4F0]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 text-[#5B4FE8]">
                        <CheckCircle2 size={18} className="fill-[#5B4FE8] text-white" />
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-full bg-[#FAF8F4] flex items-center justify-center mb-3 ${loc.color}`}>
                      <Icon size={20} />
                    </div>
                    <div className="font-bold text-[13px] leading-tight pr-4">{loc.name}</div>
                  </button>
                );
              })}
            </div>

            <h3 className="font-bold mb-3">Drop-off location</h3>
            <div className="bg-white rounded-xl shadow-sm border border-[#E8E4F0] p-1 mb-8">
              <input 
                type="text"
                value={dropoff}
                onChange={e => setDropoff(e.target.value)}
                placeholder="Your room / block (e.g. B-204)"
                className="w-full bg-transparent px-4 py-3 outline-none text-sm placeholder:text-[#1A1A2E]/40"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold mb-5">Confirm Order</h2>
            
            <div className="bg-white rounded-[20px] shadow-sm border border-[#E8E4F0] p-5 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#5B4FE8]/5 rounded-bl-full -mr-4 -mt-4" />
              
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-[#E8E4F0] relative z-10">
                <div>
                  <div className="text-[10px] font-bold tracking-wider uppercase text-[#5B4FE8] mb-1 px-2 py-0.5 bg-[#5B4FE8]/10 rounded-full inline-block">
                    {category}
                  </div>
                  <h3 className="font-bold text-lg leading-tight mt-1">{itemName || 'Custom item'}</h3>
                  <div className="text-sm font-medium text-[#1A1A2E]/60 mt-1">Qty: {quantity}</div>
                </div>
              </div>

              <div className="space-y-4 mb-4 pb-4 border-b border-[#E8E4F0] relative z-10">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FAF8F4] flex items-center justify-center mt-0.5 shrink-0">
                    {selectedLocation && <selectedLocation.icon size={14} className={selectedLocation.color} />}
                  </div>
                  <div>
                    <div className="text-xs text-[#1A1A2E]/50 font-medium mb-0.5">PICKUP FROM</div>
                    <div className="font-semibold text-sm">{selectedLocation?.name}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FAF8F4] flex items-center justify-center mt-0.5 shrink-0 text-[#1A1A2E]">
                    <Home size={14} />
                  </div>
                  <div>
                    <div className="text-xs text-[#1A1A2E]/50 font-medium mb-0.5">DROP-OFF AT</div>
                    <div className="font-semibold text-sm">{dropoff || 'Not specified'}</div>
                  </div>
                </div>
              </div>

              {notes && (
                <div className="text-sm text-[#1A1A2E]/70 bg-[#FAF8F4] p-3 rounded-lg italic relative z-10">
                  "{notes}"
                </div>
              )}
            </div>

            <div className="bg-white rounded-[20px] shadow-sm border border-[#E8E4F0] p-5 mb-6">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-2 text-[#1A1A2E]/60">Items Estimate</td>
                    <td className="py-2 text-right font-medium">₹35</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#1A1A2E]/60 border-b border-[#E8E4F0]">Delivery Fee</td>
                    <td className="py-2 text-right font-medium border-b border-[#E8E4F0]">₹15</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold text-base">Total</td>
                    <td className="py-3 text-right font-bold text-base text-[#5B4FE8]">₹50</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 justify-center text-sm font-medium text-[#10B981] mb-6 bg-[#10B981]/10 py-2 px-4 rounded-full w-max mx-auto">
              <Clock size={16} />
              <span>Estimated time: 20–30 min</span>
            </div>

            <p className="text-center text-xs text-[#1A1A2E]/40 px-6">
              By placing this order, you agree to our delivery terms.
            </p>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#FAF8F4] via-[#FAF8F4] to-[#FAF8F4]/0 pt-12 pb-6 px-5 z-20">
        {step === 1 && (
          <button 
            onClick={() => setStep(2)}
            className="w-full bg-[#5B4FE8] text-white font-semibold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-[#4A3FD6] active:scale-[0.98] transition-all shadow-lg shadow-[#5B4FE8]/20"
          >
            Next <ArrowRight size={18} />
          </button>
        )}
        
        {step === 2 && (
          <div className="flex gap-3">
            <button 
              onClick={() => setStep(1)}
              className="w-[56px] h-[56px] shrink-0 bg-white border border-[#E8E4F0] text-[#1A1A2E] rounded-full flex items-center justify-center hover:bg-[#F0F0F0] active:scale-[0.98] transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <button 
              onClick={() => setStep(3)}
              className="flex-1 bg-[#5B4FE8] text-white font-semibold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-[#4A3FD6] active:scale-[0.98] transition-all shadow-lg shadow-[#5B4FE8]/20"
            >
              Next <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {}}
              className="w-full bg-[#5B4FE8] text-white font-bold text-lg py-4 rounded-full flex items-center justify-center gap-2 hover:bg-[#4A3FD6] active:scale-[0.98] transition-all shadow-lg shadow-[#5B4FE8]/30"
            >
              Place Order 🚀
            </button>
            <button 
              onClick={() => setStep(2)}
              className="w-full py-2 text-sm font-semibold text-[#1A1A2E]/50 hover:text-[#1A1A2E] transition-colors"
            >
              Back to edit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
