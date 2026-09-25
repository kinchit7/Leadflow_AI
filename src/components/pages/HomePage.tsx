// HPI 1.7-G
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMember } from '@/integrations';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, Clock, Users, Ticket, ArrowRight, ChevronRight, Shield, Zap, BarChart } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Image } from '@/components/ui/image';

// --- Animation Variants ---
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const lineDraw = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 1.2, ease: "easeInOut" } }
};

export default function HomePage() {
  const { member, isAuthenticated } = useMember();
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Canonical Data Source Preserved
  const operationalCards = [
    {
      title: 'Hot Leads',
      icon: TrendingUp,
      count: 0,
      description: 'High-priority leads requiring immediate attention',
      color: 'text-primary',
      link: '/leads?filter=hot'
    },
    {
      title: 'Follow-ups Due',
      icon: Clock,
      count: 0,
      description: 'Follow-ups scheduled for today',
      color: 'text-secondary',
      link: '/follow-ups?view=today'
    },
    {
      title: 'Needs Attention',
      icon: AlertCircle,
      count: 0,
      description: 'Items requiring your immediate action',
      color: 'text-accent-gold',
      link: '/inbox'
    },
    {
      title: 'Open Support Issues',
      icon: Ticket,
      count: 0,
      description: 'Active support tickets',
      color: 'text-destructive',
      link: '/support?status=open'
    },
    {
      title: 'Active Opportunities',
      icon: Users,
      count: 0,
      description: 'Opportunities in progress',
      color: 'text-secondary',
      link: '/leads?view=opportunities'
    }
  ];

  // Prevent hydration mismatch on initial render for auth-dependent UI
  return (
    <div className="min-h-screen bg-background flex flex-col font-paragraph selection:bg-primary/20 selection:text-primary" ref={containerRef}>
      <Header />
      
      <main className="flex-1 flex flex-col w-full overflow-clip">
        
        {mounted && (
          <>
            {/* ==========================================
                UNAUTHENTICATED VIEW: The Elegant Pitch
                ========================================== */}
            {!isAuthenticated && (
              <>
                {/* HERO SECTION: Cinematic & Structural */}
                <section className="relative w-full min-h-[90vh] flex items-center justify-center pt-20 pb-32 px-6 lg:px-12 overflow-hidden bg-background">
                  {/* Parallax Background Element */}
                  <motion.div 
                    style={{ y: heroY, opacity: heroOpacity }}
                    className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-5"
                  >
                    <div className="w-[120vw] h-[120vw] rounded-full border-[1px] border-foreground/10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    <div className="w-[90vw] h-[90vw] rounded-full border-[1px] border-foreground/10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    <div className="w-[60vw] h-[60vw] rounded-full border-[1px] border-foreground/10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </motion.div>

                  <div className="relative z-10 w-full max-w-[100rem] mx-auto flex flex-col items-center text-center">
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      variants={staggerContainer}
                      className="max-w-5xl flex flex-col items-center"
                    >
                      <motion.div variants={fadeUp} className="mb-6 flex items-center gap-4">
                        <span className="h-px w-12 bg-primary"></span>
                        <span className="text-sm font-semibold tracking-[0.2em] uppercase text-primary">LeadFlow AI</span>
                        <span className="h-px w-12 bg-primary"></span>
                      </motion.div>
                      
                      <motion.h1 
                        variants={fadeUp}
                        className="font-heading text-6xl md:text-7xl lg:text-8xl text-foreground leading-[1.05] tracking-tight mb-8"
                      >
                        The Intelligent Command Center for <span className="italic text-deep-charcoal/80">Ambitious</span> SMEs.
                      </motion.h1>
                      
                      <motion.p 
                        variants={fadeUp}
                        className="font-paragraph text-xl md:text-2xl text-muted-grey-foreground max-w-3xl leading-relaxed mb-12 font-light"
                      >
                        Every customer. Every enquiry. One intelligent system. Elevate your operational clarity and drive growth with precision.
                      </motion.p>
                      
                      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-6 items-center">
                        <Link to="/login">
                          <Button className="bg-deep-charcoal text-background hover:bg-primary transition-colors duration-500 px-10 py-7 text-lg rounded-none group relative overflow-hidden">
                            <span className="relative z-10 flex items-center gap-2">
                              Commence Journey <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                          </Button>
                        </Link>
                        <Link to="/login" className="group flex items-center gap-2 text-foreground font-medium hover:text-primary transition-colors">
                          <span className="border-b border-transparent group-hover:border-primary transition-colors pb-1">Explore the Platform</span>
                        </Link>
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* Decorative Bottom Rule */}
                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={lineDraw}
                    className="absolute bottom-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent origin-left"
                  />
                </section>

                {/* STICKY NARRATIVE SECTION: The Problem/Solution Flow */}
                <section className="relative w-full bg-white">
                  <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-32">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                      
                      {/* Left: Sticky Text Content */}
                      <div className="relative h-full">
                        <div className="sticky top-32 flex flex-col gap-16">
                          <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8 }}
                          >
                            <h2 className="font-heading text-4xl md:text-5xl text-foreground mb-6 leading-tight">
                              Chaos is the enemy of scale. <br/>
                              <span className="text-muted-grey">Structure is its catalyst.</span>
                            </h2>
                            <p className="text-lg text-muted-grey-foreground leading-relaxed font-light">
                              Stop losing context between scattered tools. LeadFlow AI unifies your sales pipeline, customer support, and operational insights into a single, elegant interface designed for clarity and action.
                            </p>
                          </motion.div>

                          <div className="flex flex-col gap-8 border-l border-gray-200 pl-8">
                            {[
                              { title: "Unified Inbox", desc: "Consolidate WhatsApp, Email, and Social channels." },
                              { title: "Intelligent Routing", desc: "Automatically assign leads to the right team member." },
                              { title: "Actionable Insights", desc: "Real-time metrics without the spreadsheet fatigue." }
                            ].map((item, i) => (
                              <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="group cursor-default"
                              >
                                <h4 className="font-heading text-2xl text-foreground group-hover:text-primary transition-colors mb-2">{item.title}</h4>
                                <p className="text-muted-grey-foreground text-sm">{item.desc}</p>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Scrolling Images */}
                      <div className="flex flex-col gap-12">
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 1 }}
                          className="relative aspect-[4/5] w-full overflow-hidden bg-gray-100"
                        >
                          <Image 
                            src="https://static.wixstatic.com/media/7ab5f2_12c6445a65f44696b4ccc7f193c2a05b~mv2.png?originWidth=768&originHeight=960" 
                            alt="Abstract representation of structured data"
                            className="w-full h-full object-cover mix-blend-multiply opacity-80 hover:scale-105 transition-transform duration-1000"
                          />
                          <div className="absolute inset-0 border border-foreground/10 m-4 pointer-events-none" />
                        </motion.div>
                      </div>

                    </div>
                  </div>
                </section>

                {/* FEATURES SECTION: Architectural Grid */}
                <section className="w-full bg-background py-32 border-t border-gray-200">
                  <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
                      <div className="max-w-2xl">
                        <h2 className="font-heading text-5xl lg:text-6xl text-foreground mb-6">
                          Engineered for Excellence
                        </h2>
                        <p className="font-paragraph text-xl text-muted-grey-foreground font-light">
                          A suite of tools designed not just to manage, but to elevate your business operations.
                        </p>
                      </div>
                      <Link to="/login" className="hidden md:flex items-center gap-2 text-primary font-medium hover:text-deep-charcoal transition-colors pb-2 border-b border-primary hover:border-deep-charcoal">
                        View All Capabilities <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>

                    {/* Hairline Grid Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-200 border border-gray-200">
                      {[
                        {
                          icon: TrendingUp,
                          title: "Lead Management",
                          desc: "Track and convert leads through every stage of your bespoke sales pipeline with absolute precision.",
                          img: "https://static.wixstatic.com/media/7ab5f2_8c0254af56fb4dc781463617a393de7e~mv2.png?originWidth=640&originHeight=448"
                        },
                        {
                          icon: Users,
                          title: "Customer 360",
                          desc: "A complete, unified view of every customer interaction, history, and preference at your fingertips.",
                          img: "https://static.wixstatic.com/media/7ab5f2_6d911ba610764d7b933d3d6fec5b6ba3~mv2.png?originWidth=640&originHeight=448"
                        },
                        {
                          icon: Ticket,
                          title: "Support Resolution",
                          desc: "Manage customer support issues efficiently, turning potential friction into brand loyalty.",
                          img: "https://static.wixstatic.com/media/7ab5f2_cebc285d703c4b2fa82e0b1578bb8d6b~mv2.png?originWidth=640&originHeight=448"
                        }
                      ].map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="bg-white group relative overflow-hidden flex flex-col h-full"
                          >
                            <div className="p-10 flex-1 flex flex-col">
                              <div className="w-12 h-12 rounded-none border border-gray-200 flex items-center justify-center mb-8 group-hover:border-primary group-hover:bg-primary/5 transition-all duration-500">
                                <Icon className="w-5 h-5 text-deep-charcoal group-hover:text-primary transition-colors" />
                              </div>
                              <h3 className="font-heading text-3xl text-foreground mb-4">{feature.title}</h3>
                              <p className="font-paragraph text-muted-grey-foreground font-light leading-relaxed mb-8">
                                {feature.desc}
                              </p>
                            </div>
                            <div className="relative h-48 w-full overflow-hidden mt-auto border-t border-gray-100">
                              <Image 
                                src={feature.img} 
                                alt={feature.title}
                                className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-12 md:hidden flex justify-center">
                       <Link to="/login" className="flex items-center gap-2 text-primary font-medium hover:text-deep-charcoal transition-colors pb-2 border-b border-primary">
                        View All Capabilities <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* ==========================================
                AUTHENTICATED VIEW: The Command Center
                ========================================== */}
            {isAuthenticated && (
              <section className="w-full min-h-screen bg-background pt-24 pb-32">
                <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
                  
                  {/* Personalized Header */}
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 border-b border-gray-200 pb-12"
                  >
                    <div>
                      <p className="text-sm font-semibold tracking-widest uppercase text-primary mb-3">Command Center</p>
                      <h1 className="font-heading text-5xl lg:text-6xl text-foreground">
                        Welcome back, <span className="italic">{member?.profile?.nickname || member?.contact?.firstName || 'Director'}</span>.
                      </h1>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                        <p className="text-sm text-muted-grey-foreground">System Status</p>
                        <p className="text-sm font-medium text-emerald-600 flex items-center gap-2 justify-end">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Optimal
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Operational Grid - Architectural Bento Box */}
                  <div className="mb-8">
                    <h2 className="font-heading text-3xl text-foreground mb-6 flex items-center gap-3">
                      <span className="w-8 h-px bg-foreground/20"></span>
                      Today's Overview
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200 border border-gray-200 shadow-sm">
                    {operationalCards.map((card, index) => {
                      const Icon = card.icon;
                      // Determine span for visual interest (make the first card span 2 cols on large screens if desired, but keeping uniform for elegance here)
                      return (
                        <motion.div
                          key={card.title}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, delay: index * 0.05 }}
                          className="bg-white relative group"
                        >
                          <Link to={card.link} className="block h-full p-8 outline-none focus-visible:ring-2 focus-visible:ring-primary inset-0">
                            <div className="flex flex-col h-full justify-between">
                              
                              <div className="flex items-start justify-between mb-12">
                                <div className={`w-12 h-12 rounded-none border border-gray-100 flex items-center justify-center bg-gray-50 group-hover:bg-white group-hover:border-primary/30 transition-colors`}>
                                  <Icon className={`h-5 w-5 ${card.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
                                </div>
                                <span className="font-heading text-5xl text-deep-charcoal group-hover:text-primary transition-colors">
                                  {card.count}
                                </span>
                              </div>
                              
                              <div>
                                <h3 className="font-heading text-2xl text-foreground mb-2 flex items-center justify-between">
                                  {card.title}
                                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </h3>
                                <p className="font-paragraph text-sm text-muted-grey-foreground font-light">
                                  {card.description}
                                </p>
                              </div>

                            </div>
                            
                            {/* Hover Accent Line */}
                            <div className="absolute bottom-0 left-0 h-1 w-0 bg-primary group-hover:w-full transition-all duration-500 ease-out" />
                          </Link>
                        </motion.div>
                      );
                    })}
                    
                    {/* Empty State / Action Card to fill grid if needed (assuming 5 cards, we need 1 more for a 3-col grid to be perfect) */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="bg-gray-50 relative group flex items-center justify-center p-8"
                    >
                      <Link to="/insights" className="text-center flex flex-col items-center gap-4 group-hover:scale-105 transition-transform duration-500">
                        <div className="w-16 h-16 rounded-full border border-dashed border-gray-300 flex items-center justify-center group-hover:border-primary group-hover:text-primary transition-colors">
                          <BarChart className="w-6 h-6 text-muted-grey group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <h3 className="font-heading text-xl text-foreground">View Full Insights</h3>
                          <p className="text-xs text-muted-grey-foreground mt-1">Access detailed analytics</p>
                        </div>
                      </Link>
                    </motion.div>
                  </div>

                </div>
              </section>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
