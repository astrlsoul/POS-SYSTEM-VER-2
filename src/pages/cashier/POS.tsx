import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { socket } from '../../lib/socket';
import { LogOut, LayoutGrid, Search, Plus, Minus, CreditCard, Banknotes, Utensils } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

type Category = { id: string; name: string; sort_order: number };
type MenuItem = { id: string; category_id: string; name: string; price: number; is_available: number };
type CartItem = MenuItem & { quantity: number; notes: string; cartId: string };

export default function POS() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    socket.connect();
    socket.emit('join_room', 'restaurant');
    
    fetch('/api/menu', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(data => {
      setCategories(data.categories);
      setItems(data.items);
      if (data.categories.length > 0) setActiveCategory(data.categories[0].id);
    });

    return () => { socket.disconnect(); };
  }, [token]);

  const displayedItems = items.filter(i => i.category_id === activeCategory);

  const addToCart = (item: MenuItem) => {
    setCart([...cart, { ...item, quantity: 1, notes: '', cartId: Math.random().toString() }]);
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.cartId === cartId) {
        return { ...c, quantity: Math.max(1, c.quantity + delta) };
      }
      return c;
    }));
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(c => c.cartId !== cartId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleCheckout = async (method: 'cash' | 'card') => {
    if (cart.length === 0) return;
    
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          type: 'dine_in',
          table_number: '1', // Hardcoded for demo
          items: cart.map(c => ({
            menu_item_id: c.id,
            name: c.name,
            price: c.price,
            quantity: c.quantity,
            notes: c.notes
          }))
        })
      });
      if (!res.ok) throw new Error('Order failed');
      const order = await res.json();
      
      // Auto-pay to simulate fast checkout
      await fetch(`/api/orders/${order.id}/pay`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ method, amount: total })
      });

      setCart([]);
      alert('Order completed successfully!');
      
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="h-screen flex bg-black text-white overflow-hidden">
      {/* Left: Menu Area */}
      <div className="flex-1 flex flex-col h-full bg-[#0a0a0a]">
        {/* Header */}
        <header className="h-20 bg-[#111] border-b border-gray-800 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-light tracking-widest text-[#D4AF37] uppercase">AURA</h1>
            <span className="text-gray-600">|</span>
            <span className="text-sm tracking-widest text-gray-400 uppercase">Cashier Module</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm text-gray-400">
              User: <span className="text-white">{user?.name}</span>
            </div>
            {user?.role === 'admin' && (
              <button 
                onClick={() => navigate('/admin')}
                className="text-xs uppercase tracking-widest border border-gray-700 px-3 py-1 rounded text-white hover:border-gray-500"
              >
                Admin
              </button>
            )}
            <button onClick={logout} className="text-gray-500 hover:text-white transition">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Category Pills */}
        <div className="p-6 pb-0 flex gap-4 overflow-x-auto no-scrollbar">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={cn(
                "px-6 py-3 rounded-full text-sm font-medium tracking-wide uppercase transition whitespace-nowrap border",
                activeCategory === c.id 
                  ? "bg-[#D4AF37] text-black border-[#D4AF37]" 
                  : "bg-transparent text-gray-400 border-gray-800 hover:border-gray-600"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedItems.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="bg-[#151515] hover:bg-[#222] border border-gray-800 rounded-2xl p-6 flex flex-col items-start transition group text-left h-40"
              >
                <div className="flex-1 w-full">
                  <h3 className="font-light text-lg mb-1 leading-tight">{item.name}</h3>
                </div>
                <div className="text-[#D4AF37] font-mono">${item.price.toFixed(2)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Checkout Sidebar */}
      <div className="w-[420px] bg-[#111] border-l border-gray-800 flex flex-col h-full shrink-0">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0a0a0a]">
          <h2 className="text-lg uppercase tracking-widest font-light">Current Order</h2>
          <div className="bg-[#222] text-[#D4AF37] text-xs font-mono px-3 py-1 rounded-full">
            T-01
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-600 italic">
              Order is empty
            </div>
          ) : (
            cart.map(c => (
              <div key={c.cartId} className="bg-[#151515] border border-gray-800 p-4 rounded-xl flex gap-4 items-center">
                <div className="flex-1 min-w-0">
                  <h4 className="truncate font-medium">{c.name}</h4>
                  <div className="text-[#D4AF37] font-mono text-sm">${(c.price * c.quantity).toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-3 bg-black rounded-lg p-1 border border-gray-800">
                  <button onClick={() => c.quantity > 1 ? updateQuantity(c.cartId, -1) : removeFromCart(c.cartId)} className="p-1 hover:text-white text-gray-400">
                    <Minus size={16} />
                  </button>
                  <span className="w-4 text-center text-sm">{c.quantity}</span>
                  <button onClick={() => updateQuantity(c.cartId, 1)} className="p-1 hover:text-[#D4AF37] text-gray-400">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Pay */}
        <div className="p-6 bg-[#0a0a0a] border-t border-gray-800">
          <div className="flex justify-between text-gray-400 text-sm mb-2">
            <span>Subtotal</span>
            <span className="font-mono text-white">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-400 text-sm mb-4 border-b border-gray-800 pb-4">
            <span>Tax (8%)</span>
            <span className="font-mono text-white">${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-end mb-6">
            <span className="text-gray-200 uppercase tracking-widest text-sm">Total</span>
            <span className="text-4xl font-mono text-[#D4AF37] leading-none">${total.toFixed(2)}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleCheckout('cash')}
              disabled={cart.length === 0}
              className="bg-[#222] hover:bg-[#333] border border-gray-700 text-white p-4 rounded-xl flex flex-col items-center gap-2 transition disabled:opacity-50"
            >
              {}
              <span className="font-medium text-sm tracking-wide">CASH</span>
            </button>
            <button 
              onClick={() => handleCheckout('card')}
              disabled={cart.length === 0}
              className="bg-[#D4AF37] hover:bg-yellow-600 text-black p-4 rounded-xl flex flex-col items-center gap-2 transition disabled:opacity-50"
            >
              {}
              <span className="font-medium text-sm tracking-wide">CARD</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
