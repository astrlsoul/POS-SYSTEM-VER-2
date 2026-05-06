import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { socket } from '../../lib/socket';
import { LogOut, Activity, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Order = {
  id: string;
  type: string;
  status: string;
  total: number;
  created_at: string;
  items: any[];
};

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    socket.connect();
    socket.emit('join_room', 'restaurant');
    
    fetch('/api/orders/active', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(data => {
      setOrders(Array.isArray(data) ? data : []);
    });

    socket.on('new_order', (order) => {
      setOrders(prev => [order, ...prev]);
    });

    socket.on('order_updated', ({ id, status }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    });

    socket.on('order_completed', ({ id }) => {
      setOrders(prev => prev.filter(o => o.id !== id));
    });

    return () => { 
      socket.off('new_order');
      socket.off('order_updated');
      socket.off('order_completed');
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      {/* Sidebar / Header */}
      <header className="h-16 border-b border-gray-800 bg-[#0a0a0a] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-light tracking-widest text-[#D4AF37] uppercase">AURA</h1>
          <span className="text-gray-600">|</span>
          <span className="text-sm tracking-widest text-gray-400 uppercase">Management</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/pos')} className="text-xs uppercase tracking-widest border border-gray-700 px-3 py-1 rounded text-white hover:border-gray-500">
            Open POS
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-400 border-l border-gray-800 pl-6">
            <span>Admin: {user?.name}</span>
            <button onClick={logout} className="ml-4 hover:text-white"><LogOut size={16} /></button>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        <h2 className="text-3xl font-light tracking-wide mb-8">Dashboard Overview</h2>

        {/* Top metrics */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Active Orders', value: orders.length, icon: Activity },
            { label: 'Today Revenue', value: '$' + orders.reduce((sum, o) => sum + o.total, 0).toFixed(2), icon: TrendingUp },
            { label: 'Items Sold', value: orders.reduce((sum, o) => sum + o.items.length, 0), icon: ShoppingBag },
            { label: 'Staff Online', value: '2', icon: Users },
          ].map((metric, i) => (
            <div key={i} className="bg-[#111] border border-gray-800 p-6 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden">
              <metric.icon size={24} className="text-gray-700 absolute top-6 right-6" />
              <div className="text-sm uppercase tracking-widest text-gray-500">{metric.label}</div>
              <div className="text-3xl font-light font-mono text-[#D4AF37]">{metric.value}</div>
            </div>
          ))}
        </div>

        {/* Live Orders Grid */}
        <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-6 border-b border-gray-800 pb-2">Live Orders (Kitchen/Bar)</h3>
        
        <div className="grid grid-cols-3 gap-6">
          {orders.map(order => (
            <div key={order.id} className="bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-800 bg-[#111] flex justify-between items-center">
                <span className="font-mono text-[#D4AF37]">#{order.id.replace('o', '').slice(-4)}</span>
                <span className="text-xs uppercase tracking-wider bg-gray-800 px-2 py-1 rounded text-gray-300">
                  {order.status}
                </span>
              </div>
              <div className="p-4 flex-1">
                <ul className="space-y-3 mb-4">
                  {order.items?.map((item, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="text-gray-500">{item.quantity}x</span>
                      <span className="text-gray-300">{item.name}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end mt-auto text-sm text-gray-500 font-mono">
                  {new Date(order.created_at).toLocaleTimeString()}
                </div>
              </div>
              {order.status !== 'served' && (
                <div className="p-4 border-t border-gray-800 bg-[#111] grid grid-cols-2 gap-2">
                   <button 
                      onClick={() => {
                        fetch(`/api/orders/${order.id}/status`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ status: 'processing' })
                        });
                      }}
                      className="text-xs uppercase tracking-widest border border-yellow-900/50 text-yellow-600 py-2 rounded hover:bg-yellow-900/20"
                    >
                      Prep
                    </button>
                    <button 
                      onClick={() => {
                        fetch(`/api/orders/${order.id}/status`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ status: 'served' })
                        });
                      }}
                      className="text-xs uppercase tracking-widest border border-green-900/50 text-green-500 py-2 rounded hover:bg-green-900/20"
                    >
                      Serve
                    </button>
                </div>
              )}
            </div>
          ))}
          {orders.length === 0 && (
             <div className="col-span-3 py-12 text-center text-gray-600 font-light border border-dashed border-gray-800 rounded-xl">
               No active orders right now.
             </div>
          )}
        </div>
      </main>
    </div>
  );
}
