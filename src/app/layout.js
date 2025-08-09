import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Toast } from '@/components/Toast';

export const metadata = {
  title: 'Personal Hub',
  description: 'Your personal finance and document management system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-900 text-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
          {children}
        </main>
        <Footer />
        <Toast />
      </body>
    </html>
  );
}
