// src/components/Navigation.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
// Sidebar is intentionally not imported here; pages will include it when needed

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  const isStaffArea = location.pathname.startsWith("/staff");
  
  const handleLogout = () => {
    // simple client-side logout for demo purposes
    try { localStorage.removeItem('user'); } catch (e) {}
    navigate('/auth');
  };
  
  // Staff-specific nav (shown when visiting /staff)
  if (isStaffArea) {
    // Show compact mobile top bar for staff area; the actual Sidebar is included by pages that need it.
    const user = JSON.parse(localStorage.getItem('user') || JSON.stringify({ name: 'Dr. Ahmed', role: 'Staff' }));
    const initials = user.name.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();
    return (
      <nav className="md:hidden fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-b border-gray-700 z-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/" className="text-2xl font-bold text-yellow-400">Beit-Gedy</Link>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-yellow-500 text-gray-900 font-semibold flex items-center justify-center">{initials}</div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-b border-gray-700 z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <Link to="/" className="text-2xl font-bold text-yellow-400">
          Beit-Gedy
        </Link>
        
        <div className="flex items-center space-x-8">
          <Link 
            to="/auth" 
            className={`text-white hover:text-yellow-400 transition-colors duration-200 ${
              isActive('/auth') ? 'text-yellow-400' : ''
            }`}
          >
            Login
          </Link>
          <button 
            onClick={() => scrollToSection('about-platform')}
            className="text-white hover:text-yellow-400 transition-colors duration-200"
          >
            About Us
          </button>
          <button 
            onClick={() => scrollToSection('what-we-offer')}
            className="bg-gradient-to-r from-red-600 to-yellow-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-red-700 hover:to-yellow-600 transition-all duration-200 hover:transform hover:-translate-y-0.5"
          >
            What We Offer
          </button>
        </div>
      </div>
    </nav>
  );
}
