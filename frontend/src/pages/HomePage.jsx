import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  GraduationCap,
  Handshake,
  PartyPopper,
  ShoppingBag,
  Users,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';


const HomePage = () => {
  const { theme } = useTheme();
  return (
    <div className={`min-h-screen home-shell ${theme === 'light' ? 'home-shell--light' : 'home-shell--dark'}`}>
      {/* Navigation */}
      <nav className="home-nav bg-black/20 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">
                <span className="bg-gradient-to-r from-red-600 to-yellow-500 bg-clip-text text-transparent">
                  Beit-Gedy
                </span>
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/auth"
                className="px-4 py-2 text-white hover:text-yellow-400 transition-colors duration-200"
              >
                Login
              </Link>
              <button
                onClick={() => document.getElementById('about-section').scrollIntoView({ behavior: 'smooth' })}
                className="px-4 py-2 text-white hover:text-yellow-400 transition-colors duration-200"
              >
                About Us
              </button>
              <button
                onClick={() => document.getElementById('features-section').scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-yellow-500 text-white rounded-lg hover:from-red-700 hover:to-yellow-600 transition-all duration-200 transform hover:scale-105"
              >
                What We Offer
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-red-600 to-yellow-500 bg-clip-text text-transparent">
              GUC Event Management System
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Your gateway to university events, workshops, bazaars, and community engagement. 
            Discover, participate, and connect with your campus community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth"
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-yellow-500 text-white font-semibold rounded-lg hover:from-red-700 hover:to-yellow-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Get Started
            </Link>
            <button
              onClick={() => document.getElementById('about-section').scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-gray-900 transition-all duration-200"
            >
              About Us
            </button>
            <button
              onClick={() => document.getElementById('features-section').scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 border-2 border-yellow-500 text-yellow-400 font-semibold rounded-lg hover:bg-yellow-500 hover:text-gray-900 transition-all duration-200"
            >
              What We Offer
            </button>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about-section" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-8">
              About Our Platform
            </h2>
            
            {/* Image Gallery */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="relative group">
                <div className="aspect-w-16 aspect-h-12 bg-gradient-to-br from-red-600/20 to-yellow-500/20 rounded-xl overflow-hidden border border-gray-600">
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <GraduationCap className="mx-auto mb-4 h-16 w-16 text-yellow-400" strokeWidth={1.5} />
                      <h3 className="text-xl font-semibold text-white mb-2">Student Events</h3>
                      <p className="text-gray-400 text-sm">Workshops, seminars, and academic conferences</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative group">
                <div className="aspect-w-16 aspect-h-12 bg-gradient-to-br from-red-600/20 to-yellow-500/20 rounded-xl overflow-hidden border border-gray-600">
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-yellow-400" strokeWidth={1.5} />
                      <h3 className="text-xl font-semibold text-white mb-2">Tech Bazaars</h3>
                      <p className="text-gray-400 text-sm">Student innovations and startup showcases</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative group">
                <div className="aspect-w-16 aspect-h-12 bg-gradient-to-br from-red-600/20 to-yellow-500/20 rounded-xl overflow-hidden border border-gray-600">
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <Handshake className="mx-auto mb-4 h-16 w-16 text-yellow-400" strokeWidth={1.5} />
                      <h3 className="text-xl font-semibold text-white mb-2">Career Fairs</h3>
                      <p className="text-gray-400 text-sm">Networking and professional opportunities</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <p className="text-xl text-gray-300 leading-relaxed mb-8">
                The GUC Event Management System is a comprehensive digital platform designed to streamline 
                and enhance the university's event ecosystem. Our system serves as the central hub for 
                students, faculty, vendors, and administrators to discover, organize, and participate in 
                various campus activities.
              </p>
              <p className="text-lg text-gray-400 leading-relaxed">
                From tech bazaars showcasing student innovations to professional workshops and career fairs, 
                our platform facilitates meaningful connections and learning opportunities. We provide seamless 
                event registration, vendor management, and community engagement tools that make campus life 
                more vibrant and organized. Whether you're a student looking to expand your network, a vendor 
                seeking to showcase your products, or an administrator managing campus events, our system 
                provides the tools and infrastructure you need to succeed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            What We Offer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Event Management */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700 hover:border-yellow-500 transition-all duration-300">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-400">
                <PartyPopper className="h-6 w-6" strokeWidth={1.7} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Event Management</h3>
              <p className="text-gray-300 mb-6">
                Discover and participate in university events, from tech bazaars to career fairs. 
                Stay updated with upcoming events and never miss out on opportunities.
              </p>
              <Link
                to="/events"
                className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-semibold transition-colors duration-200"
              >
                <span>View Events</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Workshops */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700 hover:border-yellow-500 transition-all duration-300">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-400">
                <GraduationCap className="h-6 w-6" strokeWidth={1.7} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Workshops</h3>
              <p className="text-gray-300 mb-6">
                Enhance your skills with hands-on workshops covering AI, technology, 
                and professional development. Learn from experts and peers.
              </p>
              <Link
                to="/events"
                className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-semibold transition-colors duration-200"
              >
                <span>Join Workshops</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Community */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700 hover:border-yellow-500 transition-all duration-300">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-400">
                <Users className="h-6 w-6" strokeWidth={1.7} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Community</h3>
              <p className="text-gray-300 mb-6">
                Connect with fellow students, vendors, and professionals. 
                Build your network and create lasting relationships within the university community.
              </p>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-semibold transition-colors duration-200"
              >
                <span>Join Community</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-gradient-to-r from-red-600/20 to-yellow-500/20 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
              <div className="text-4xl font-bold text-white mb-2">50+</div>
              <div className="text-gray-300">Events This Year</div>
            </div>
            <div className="bg-gradient-to-r from-red-600/20 to-yellow-500/20 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
              <div className="text-4xl font-bold text-white mb-2">1000+</div>
              <div className="text-gray-300">Active Students</div>
            </div>
            <div className="bg-gradient-to-r from-red-600/20 to-yellow-500/20 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
              <div className="text-4xl font-bold text-white mb-2">25+</div>
              <div className="text-gray-300">Partner Vendors</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-red-600/10 to-yellow-500/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of students who are already discovering amazing events and opportunities.
          </p>
          <Link
            to="/auth"
            className="inline-block px-8 py-4 bg-gradient-to-r from-red-600 to-yellow-500 text-white font-semibold rounded-lg hover:from-red-700 hover:to-yellow-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Create Your Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/50 backdrop-blur-md border-t border-gray-700 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-white mb-4">
            <span className="bg-gradient-to-r from-red-600 to-yellow-500 bg-clip-text text-transparent font-bold text-xl">
              Beit-Gedy
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2024 Beit-Gedy. Connecting students through events and community.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
