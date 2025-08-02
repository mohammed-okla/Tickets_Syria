import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Wallet, 
  QrCode, 
  Ticket, 
  Shield, 
  Globe, 
  ArrowRight, 
  Smartphone,
  CreditCard,
  MapPin,
  Users,
  Star,
  CheckCircle,
  TrendingUp,
  Zap,
  Lock,
  Sparkles
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Link } from 'react-router-dom'

const features = [
  {
    icon: Wallet,
    title: 'Digital Wallet',
    description: 'Secure digital wallet with instant payments, balance management, and real-time transaction tracking.'
  },
  {
    icon: QrCode,
    title: 'QR Payments', 
    description: 'Lightning-fast QR code payments for transport, events, and merchant transactions.'
  },
  {
    icon: Ticket,
    title: 'Event Tickets',
    description: 'Buy, manage, and validate event tickets with blockchain-secured authenticity.'
  },
  {
    icon: Shield,
    title: 'Bank-Grade Security',
    description: 'End-to-end encryption, multi-factor authentication, and fraud prevention.'
  },
  {
    icon: TrendingUp,
    title: 'Analytics Dashboard',
    description: 'Comprehensive insights into spending patterns, earnings, and financial health.'
  },
  {
    icon: Zap,
    title: 'Instant Transfers',
    description: 'Real-time money transfers with zero fees between Tickets users.'
  }
]

const stats = [
  { icon: Users, value: '50,000+', label: 'Active Users', growth: '+25% this month' },
  { icon: CreditCard, value: '$2.5M+', label: 'Transaction Volume', growth: '+40% this quarter' },
  { icon: MapPin, value: '12+', label: 'Cities Covered', growth: 'Expanding rapidly' },
  { icon: Shield, value: '99.99%', label: 'Uptime', growth: 'Enterprise-grade' }
]

const testimonials = [
  {
    name: 'Ahmed Al-Rashid',
    role: 'Business Owner',
    content: 'Tickets transformed how I handle payments. The QR system is incredibly efficient for my restaurant.',
    avatar: '👨‍💼'
  },
  {
    name: 'Sarah Hassan',
    role: 'University Student',
    content: 'Perfect for buying event tickets and managing my daily transport expenses. Love the analytics!',
    avatar: '👩‍🎓'
  },
  {
    name: 'Omar Farouk',
    role: 'Driver',
    content: 'The driver platform is amazing. I can track my earnings in real-time and get paid instantly.',
    avatar: '🚗'
  }
]

export default function LandingPage() {
  const { t, language, setLanguage } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="relative border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <img src="/logo.svg" alt="Tickets Logo" className="h-10 w-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg blur opacity-50"></div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Tickets
            </h1>
          </motion.div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <Globe className="h-4 w-4 mr-2" />
              {language === 'en' ? 'العربية' : 'English'}
            </Button>
            
            <Link to="/login">
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
            
            <Link to="/register">
              <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-32">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-white/80">The Future of Digital Payments</span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
              <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                Digital Payments
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Reimagined
              </span>
            </h1>

            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Experience the next generation of digital payments with our comprehensive platform for wallets, 
              QR payments, event tickets, and merchant solutions. Built for the modern economy.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link to="/register">
                <Button size="lg" className="group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 text-lg border-0">
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              
              <Link to="/login">
                <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 px-8 py-4 text-lg">
                  Watch Demo
                </Button>
              </Link>
            </div>

            {/* Hero Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative mx-auto max-w-4xl"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl"></div>
                <div className="relative bg-black/40 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-6 border border-blue-400/20">
                      <Wallet className="h-12 w-12 text-blue-400 mb-4" />
                      <h3 className="text-white font-semibold mb-2">Digital Wallet</h3>
                      <p className="text-gray-400 text-sm">Secure & instant</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-6 border border-purple-400/20">
                      <QrCode className="h-12 w-12 text-purple-400 mb-4" />
                      <h3 className="text-white font-semibold mb-2">QR Payments</h3>
                      <p className="text-gray-400 text-sm">Lightning fast</p>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-xl p-6 border border-indigo-400/20">
                      <Ticket className="h-12 w-12 text-indigo-400 mb-4" />
                      <h3 className="text-white font-semibold mb-2">Event Tickets</h3>
                      <p className="text-gray-400 text-sm">Blockchain secured</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 border-y border-white/10 bg-black/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
                  <stat.icon className="h-8 w-8 text-blue-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-300 font-medium mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-green-400">
                  {stat.growth}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Everything You Need
                </span>
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                A comprehensive platform designed for individuals, businesses, and enterprises.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
                  <CardHeader>
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
                      <feature.icon className="h-7 w-7 text-blue-400" />
                    </div>
                    <CardTitle className="text-xl text-white">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-400 leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative py-32 bg-black/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Loved by Users
              </span>
            </h2>
            <p className="text-xl text-gray-400">
              Join thousands of satisfied users across the region
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <Card className="h-full bg-black/40 backdrop-blur-xl border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-300 mb-6 italic">
                      "{testimonial.content}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{testimonial.avatar}</div>
                      <div>
                        <div className="text-white font-semibold">{testimonial.name}</div>
                        <div className="text-gray-400 text-sm">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl"></div>
            <div className="relative bg-black/40 backdrop-blur-xl rounded-3xl p-16 border border-white/10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Ready to Transform
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Your Payments?
                </span>
              </h2>
              <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
                Join the digital payment revolution. Get started in minutes and experience the future of finance.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link to="/register">
                  <Button size="lg" className="group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 text-lg border-0">
                    Get Started Now
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                
                <Link to="/login">
                  <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 px-8 py-4 text-lg">
                    Talk to Sales
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 bg-black/40 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.svg" alt="Tickets Logo" className="h-8 w-8" />
                <h3 className="text-xl font-bold text-white">Tickets</h3>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                The next generation digital payment platform, designed for the modern economy.
              </p>
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">SOC 2 Type II Certified</span>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Digital Wallet</li>
                <li>QR Payments</li>
                <li>Event Tickets</li>
                <li>Analytics</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>About Us</li>
                <li>Careers</li>
                <li>Contact</li>
                <li>Support</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 Tickets. All rights reserved. | Built with ❤️ for the future of payments.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}