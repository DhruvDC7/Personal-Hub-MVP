import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Toast } from '@/components/Toast';
import { AuthProvider } from '@/hooks/useAuth';

export const metadata = {
  title: 'Personal Hub',
  description: 'Your personal finance and document management system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
          <Footer />
          <Toast />
        </AuthProvider>
      </body>
    </html>
  );
}
