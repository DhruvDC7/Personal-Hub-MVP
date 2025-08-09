export default function Footer() {
  return (
    <footer className="bg-slate-800 mt-8 border-t border-slate-700">
      <div className="max-w-7xl mx-auto py-6 px-4 overflow-hidden sm:px-6 lg:px-8">
        <p className="text-center text-base text-slate-400">
          &copy; {new Date().getFullYear()} Personal Hub. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
