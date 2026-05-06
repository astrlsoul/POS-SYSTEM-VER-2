import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      login(data.token, data.user);
      if (data.user.role === 'admin') navigate('/admin');
      else navigate('/pos');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-light tracking-widest text-[#D4AF37] uppercase">AURA</h1>
          <p className="text-xs tracking-widest text-gray-500 uppercase mt-2">Point of Sale</p>
        </div>

        <form onSubmit={handleLogin} className="bg-[#111] border border-gray-800 p-8 rounded-xl shadow-2xl">
          <h2 className="text-xl font-light mb-6 text-center">Enter PIN</h2>
          <div className="mb-6">
            <input
              type="password"
              placeholder="----"
              autoFocus
              className="w-full bg-[#222] text-center text-3xl tracking-widest text-[#D4AF37] p-4 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/, ''))}
              maxLength={4}
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          <button
            type="submit"
            className="w-full bg-[#D4AF37] text-black font-semibold uppercase tracking-widest p-4 rounded-lg hover:bg-yellow-600 transition"
          >
            Access System
          </button>
          
          <div className="mt-8 text-xs text-gray-500 text-center">
            <p>Admin PIN: 1234 | Cashier PIN: 5678</p>
          </div>
        </form>
      </div>
    </div>
  );
}
