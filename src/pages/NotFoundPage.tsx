import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="w-full max-w-full min-h-[60vh] flex items-center justify-center">
      <div className="text-center px-4">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500" />
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-bold text-zinc-900 dark:text-white mb-4">
          404
        </h1>
        
        <h2 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-white mb-2">
          Page Not Found
        </h2>
        
        <p className="text-zinc-600 dark:text-zinc-400 mb-8 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        
        <Link to="/">
          <Button variant="primary" size="lg">
            <Home className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}