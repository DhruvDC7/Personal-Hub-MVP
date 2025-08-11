export default function Footer() {
  return (
    <footer className="bg-[var(--card)] mt-12 border-t border-[var(--border)]">
      <div className="max-w-7xl mx-auto py-6 px-4 overflow-hidden sm:px-6 lg:px-8">
        <p className="text-center text-sm text-[var(--muted)]">
          &copy; {new Date().getFullYear()} Personal Hub. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
