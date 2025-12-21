import Sidebar from './components/Sidebar'; // Import your sidebar component
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-50">
        {/* Sidebar stays fixed on the left */}
        <Sidebar />

        {/* This is where your page.js content will appear */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </body>
    </html>
  );
}