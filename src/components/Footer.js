export default function Footer() {
  return (
    <footer className="bg-white mt-8 border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-6 px-4 overflow-hidden sm:px-6 lg:px-8">
        <p className="text-center text-base text-gray-500">
          &copy; {new Date().getFullYear()} Personal Hub. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
