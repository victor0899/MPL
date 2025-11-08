import '../../../App.css';
import Navbar from './Navbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main>
        {children}
      </main>
    </div>
  );
}
