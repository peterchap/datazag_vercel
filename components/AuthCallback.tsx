import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
      setMessage('Authentication failed. Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      return;
    }

    // Check if we have a user after OAuth callback
    if (!loading && user) {
      setMessage('Authentication successful! Redirecting...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } else if (!loading && !user) {
      setMessage('Authentication incomplete. Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Completing Sign In
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;