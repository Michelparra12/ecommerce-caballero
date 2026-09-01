'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { login, signup } = useAuth();
  const router = useRouter();

  const [modo, setModo] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      if (modo === 'login') {
        await login(email, password);
      } else {
        await signup(email, password, nombre);
      }
      router.push('/carrito');
    } catch (err) {
      // Firebase da códigos como 'auth/invalid-credential'; se muestra
      // un mensaje genérico en vez del código crudo al usuario.
      setError(modo === 'login' ? 'Correo o contraseña incorrectos' : 'No se pudo crear la cuenta (¿correo ya registrado?)');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="contenedor" style={{ maxWidth: 420, paddingTop: '3rem', paddingBottom: '4rem' }}>
      <h1>{modo === 'login' ? 'Ingresar' : 'Crear cuenta'}</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
        {modo === 'signup' && (
          <input
            type="text"
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        )}
        <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        {error && <p style={{ color: '#e05252' }}>{error}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? 'Un momento...' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
        </button>
      </form>

      <button
        onClick={() => setModo(modo === 'login' ? 'signup' : 'login')}
        style={{ background: 'none', border: 'none', color: 'var(--color-accent)', marginTop: '1rem', cursor: 'pointer' }}
      >
        {modo === 'login' ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Ingresar'}
      </button>
    </main>
  );
}
