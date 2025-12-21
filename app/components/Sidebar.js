'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname(); // Gets the current URL (e.g., "/remittances")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Helper to determine styles based on active state
  const getLinkClasses = (route) => {
    const isActive = pathname === route;
    return `flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${
      isActive 
        ? "bg-blue-50 text-blue-600 font-medium shadow-sm" // Active Style
        : "text-gray-600 hover:bg-gray-100" // Inactive Style
    }`;
  };

  return (
    <aside className={`flex flex-col bg-white shadow-xl transition-all duration-300 z-20 h-full ${isSidebarOpen ? "w-64" : "w-20"}`}>
      
      {/* Header / Toggle Section */}
      <div className="flex items-center justify-between h-16 border-b px-4 flex-shrink-0">
        <span className={`font-bold text-xl text-blue-600 ${!isSidebarOpen && "hidden"}`}>
          TradeFlow
        </span>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 mt-6 space-y-2 px-3">
        
        {/* Shipping Bill Link */}
        <Link 
          href="/shippingBill" 
          className={getLinkClasses('/shippingBill')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          {isSidebarOpen && <span>Shipping Bill</span>}
        </Link>

        {/* Remittances Link */}
        <Link 
          href="/remittance" 
          className={getLinkClasses('/remittance')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
          {isSidebarOpen && <span>Remittances</span>}
        </Link>

      </nav>
    </aside>
  );
}