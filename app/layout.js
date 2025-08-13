import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Toast } from '@/components/Toast';
import { AuthProvider } from '@/hooks/useAuth';
import FeedbackButton from '@/components/FeedbackButtonWrapper';

export const metadata = {
  title: 'Personal Hub',
  description: 'Your personal finance and document management system',
  icons: {
    icon: [
      { url: '/favicon/favicon.ico' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon/apple-touch-icon.png' },
    ],
    other: [
      {
        rel: 'android-chrome-192x192',
        url: '/favicon/android-chrome-192x192.png',
      },
      {
        rel: 'android-chrome-512x512',
        url: '/favicon/android-chrome-512x512.png',
      },
    ],
  },
  manifest: '/favicon/site.webmanifest',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col"
        suppressHydrationWarning
      >
        <AuthProvider>
          <Navbar />
          <main
            className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 pt-20 min-h-[calc(100vh-4rem)] overflow-hidden flex flex-col"
          >
            {children}
          </main>
          <Footer />
          <FeedbackButton />
          <Toast />
        </AuthProvider>
      </body>
    </html>
  );
}
