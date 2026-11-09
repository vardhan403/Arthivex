import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="w-full bg-[#0e1320] text-[#dee2f5] min-h-screen font-sans antialiased selection:bg-[#ffb067] selection:text-[#4c2700]">
      {/* FIXED TOP HEADER */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#0e1320]/80 backdrop-blur-xl border-b border-[#283046]/40 shadow-sm">
        <div className="h-20 w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#ffb067] flex items-center justify-center shadow-md shadow-[#ffb067]/20">
                <span className="material-symbols-outlined text-[#4c2700] text-xl">shield_locked</span>
              </div>
              <span className="text-xl font-bold text-[#dee2f5] tracking-tight">
                Arthi<span className="text-[#ffb067]">vex</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <a href="#home" className="text-[#ffb067] font-bold transition-colors">
                Home
              </a>
              <a href="#features" className="text-[#bfc6de] hover:text-[#dee2f5] transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-[#bfc6de] hover:text-[#dee2f5] transition-colors">
                How It Works
              </a>
              <a href="#security" className="text-[#bfc6de] hover:text-[#dee2f5] transition-colors">
                Security
              </a>
              <a href="#about" className="text-[#bfc6de] hover:text-[#dee2f5] transition-colors">
                About
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle size="sm" />

            <Link
              to="/demo"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-[#ffb067]/15 hover:bg-[#ffb067]/25 text-[#ffd5b3] border border-[#ffb067]/40 text-xs font-bold transition-all shadow-sm"
              title="Explore Arthivex Sandbox without registration"
            >
              <span className="material-symbols-outlined text-sm text-[#ffb067]">explore</span>
              <span>Explore Demo</span>
            </Link>

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-4 sm:px-5 py-2 rounded-full bg-[#ffb067] text-[#4c2700] text-xs font-bold shadow-lg shadow-[#ffb067]/20 hover:bg-[#ffa048] transition-all"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-semibold text-[#bfc6de] hover:bg-[#252a38] hover:text-[#dee2f5] transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-4 sm:px-5 py-2 rounded-full bg-[#ffb067] text-[#4c2700] text-xs font-bold shadow-lg shadow-[#ffb067]/20 hover:bg-[#ffa048] transition-all"
                >
                  Get Started
                </Link>
              </>
            )}

            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              className="w-8 h-8 rounded-full bg-[#ffb067] flex items-center justify-center text-[#4c2700] hover:scale-105 transition-transform"
              title={isAuthenticated ? "Open Dashboard" : "Login"}
            >
              <span className="material-symbols-outlined text-base">person</span>
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="w-full pt-20 bg-[#0e1320]" id="home">
        {/* HERO SECTION */}
        <section className="relative w-full overflow-hidden px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          {/* Ambient Background Radial Lighting */}
          <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[780px] h-[520px] bg-[#ffb067]/10 blur-[130px] rounded-full"></div>
          <div className="pointer-events-none absolute top-96 -left-32 w-80 h-80 bg-[#38bdf8]/10 blur-[110px] rounded-full"></div>

          <div className="relative max-w-7xl mx-auto flex flex-col items-center text-center">
            {/* Security Status Pill Chip */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#252a38] text-xs shadow-sm mb-6 border border-[#283046]/60">
              <span className="flex h-2 w-2 rounded-full bg-[#ffb067] animate-pulse"></span>
              <span className="text-[#dbe2fb]">Cryptographic Protocol v4.2 Active</span>
              <span className="text-[#94a3b8]">•</span>
              <span className="text-[#ffb067] flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-sm">verified_user</span> Institutional Tier
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#dee2f5] tracking-tight max-w-4xl leading-[1.1]">
              Take Control of Your Money.{' '}
              <span className="text-[#ffb067] font-extrabold block sm:inline">The Secure Way.</span>
            </h1>

            {/* Subtitle Description */}
            <p className="mt-5 text-base sm:text-lg text-[#94a3b8] max-w-2xl leading-relaxed">
              Manage your financial accounts, monitor transactions, and move money with confidence. Arthivex brings your
              essential financial activities together in one simple and secure platform.
            </p>

            {/* CTA Button Row */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#ffb067] text-[#4c2700] text-sm font-bold shadow-xl shadow-[#ffb067]/25 hover:bg-[#ffa048] hover:scale-[1.02] transition-all"
              >
                <span>Get Started</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </Link>

              <Link
                to="/demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#ffb067]/20 text-[#ffd5b3] text-sm font-bold hover:bg-[#ffb067]/30 transition-all shadow-md border border-[#ffb067]/50"
              >
                <span className="material-symbols-outlined text-lg text-[#ffb067]">explore</span>
                <span>Explore Demo</span>
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#252a38] text-[#dee2f5] text-sm font-semibold hover:bg-[#303443] transition-colors shadow-sm border border-[#283046]"
              >
                <span className="material-symbols-outlined text-lg text-[#ffb067]">lock_open</span>
                <span>Login</span>
              </Link>
            </div>

            {/* Institutional Verification Badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[#94a3b8] text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#38bdf8]">check_circle</span> Zero custodial vulnerability
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#38bdf8]">check_circle</span> Multi-signature vault protection
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#38bdf8]">check_circle</span> Real-time liquidity telemetry
              </span>
            </div>

            {/* INSPIRATION FIDELITY DASHBOARD MOCKUP (Exact from Stitch UI) */}
            <div className="mt-14 w-full max-w-6xl rounded-3xl bg-[#090e1b] p-2 sm:p-4 shadow-2xl border border-[#283046]/80 text-left">
              <div className="w-full bg-[#161b29] rounded-2xl p-4 sm:p-6 flex flex-col gap-5 border border-[#283046]/40">
                {/* Top Mockup Navigation Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#283046]/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#ffb067] flex items-center justify-center text-[#4c2700] font-bold text-xs">
                      FG
                    </div>
                    <span className="text-base font-bold text-[#dee2f5] tracking-tight">Finlytics</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#252a38] text-[#ffd5b3] text-[10px] font-semibold">
                      Live Demo
                    </span>
                  </div>

                  <div className="hidden md:flex items-center bg-[#090e1b] px-4 py-2 rounded-full w-80 text-xs text-[#94a3b8] border border-[#283046]/40">
                    <span className="material-symbols-outlined text-sm mr-2 text-[#475569]">search</span>
                    <span>Search accounts, transfers...</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#252a38] flex items-center justify-center text-[#dee2f5]">
                      <span className="material-symbols-outlined text-base">chat_bubble_outline</span>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[#252a38] flex items-center justify-center text-[#dee2f5] relative">
                      <span className="material-symbols-outlined text-base">notifications</span>
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ffb067]"></span>
                    </div>
                    <div className="flex items-center gap-2 pl-2">
                      <div className="w-8 h-8 rounded-full bg-[#303443] flex items-center justify-center font-bold text-xs text-[#ffb067]">
                        JR
                      </div>
                      <span className="hidden sm:inline text-xs text-[#dee2f5] font-semibold">Jennie Rose</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Grid: Main Analytical Grid + Right Card Rail */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left & Center Analytics Column (8 cols) */}
                  <div className="lg:col-span-8 flex flex-col gap-5">
                    {/* Metric Tiles Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Total Balance Tile */}
                      <div className="bg-[#1a1f2d] rounded-2xl p-5 shadow-sm border border-[#283046]/40 hover:scale-[1.01] transition-transform">
                        <div className="flex items-center justify-between text-[#94a3b8] mb-3">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-[#ffb067]">account_balance_wallet</span>
                            <span className="text-xs font-semibold text-[#dee2f5]">Total Balance</span>
                          </div>
                          <span className="material-symbols-outlined text-sm text-[#475569] cursor-pointer">visibility</span>
                        </div>
                        <div className="text-2xl font-bold font-mono text-[#dee2f5]">₹1,58,300.00</div>
                        <div className="flex items-center justify-between mt-3 text-xs">
                          <span className="text-[#94a3b8]">Across all accounts</span>
                          <span className="font-semibold text-[#34d399] flex items-center gap-0.5 font-mono">
                            <span className="material-symbols-outlined text-xs">arrow_upward</span>12.73%
                          </span>
                        </div>
                      </div>

                      {/* Income Tile */}
                      <div className="bg-[#1a1f2d] rounded-2xl p-5 shadow-sm border border-[#283046]/40 hover:scale-[1.01] transition-transform">
                        <div className="flex items-center justify-between text-[#94a3b8] mb-3">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-[#38bdf8]">trending_up</span>
                            <span className="text-xs font-semibold text-[#dee2f5]">Income</span>
                          </div>
                        </div>
                        <div className="text-2xl font-bold font-mono text-[#dee2f5]">₹2,25,000.00</div>
                        <div className="flex items-center justify-between mt-3 text-xs">
                          <span className="text-[#94a3b8]">Since last month</span>
                          <span className="font-semibold text-[#34d399] flex items-center gap-0.5 font-mono">
                            <span className="material-symbols-outlined text-xs">arrow_upward</span>11.94%
                          </span>
                        </div>
                      </div>

                      {/* Expenses Tile */}
                      <div className="bg-[#1a1f2d] rounded-2xl p-5 shadow-sm border border-[#283046]/40 hover:scale-[1.01] transition-transform">
                        <div className="flex items-center justify-between text-[#94a3b8] mb-3">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-[#f87171]">trending_down</span>
                            <span className="text-xs font-semibold text-[#dee2f5]">Expenses</span>
                          </div>
                        </div>
                        <div className="text-2xl font-bold font-mono text-[#dee2f5]">₹66,700.00</div>
                        <div className="flex items-center justify-between mt-3 text-xs">
                          <span className="text-[#94a3b8]">Since last month</span>
                          <span className="font-semibold text-[#f87171] flex items-center gap-0.5 font-mono">
                            <span className="material-symbols-outlined text-xs">arrow_downward</span>13.00%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Filter Quick Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1a1f2d] p-2.5 rounded-2xl border border-[#283046]/40">
                      <div className="flex items-center gap-2">
                        <button className="px-4 py-2 rounded-full bg-[#ffb067] text-[#4c2700] text-xs font-bold flex items-center gap-1 shadow-sm">
                          <span className="material-symbols-outlined text-sm">add</span> Add new
                        </button>
                        <div className="px-3.5 py-1.5 rounded-full bg-[#252a38] text-[#dee2f5] text-xs flex items-center gap-2 font-mono">
                          <span className="material-symbols-outlined text-sm text-[#ffb067]">calendar_today</span>
                          <span>11 Nov - 11 Dec, 2026</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#252a38] flex items-center justify-center text-[#dee2f5]">
                          <span className="material-symbols-outlined text-sm">tune</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#252a38] flex items-center justify-center text-[#dee2f5]">
                          <span className="material-symbols-outlined text-sm">filter_list</span>
                        </div>
                      </div>
                    </div>

                    {/* Two Mid-Level Widgets: Map Snippet & Cashback/Discount */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Nearby Secure Access Points (Map Reference) */}
                      <div className="bg-[#1a1f2d] rounded-2xl p-5 flex flex-col justify-between border border-[#283046]/40">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-sm font-bold text-[#dee2f5]">ATMs On The Map</h4>
                            <p className="text-xs text-[#94a3b8]">We found 24 verified ATM hubs</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-[#252a38] flex items-center justify-center text-[#ffb067]">
                            <span className="material-symbols-outlined text-sm">north_east</span>
                          </div>
                        </div>

                        <div className="w-full h-32 rounded-xl bg-[#222838] overflow-hidden relative border border-[#283046]">
                          <div className="absolute inset-0 bg-gradient-to-br from-[#161b29] to-[#090e1b] flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-[#38bdf8]/40">map</span>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-[#090e1b]/90 via-transparent to-transparent flex items-end p-2.5">
                            <span className="text-[11px] text-[#dee2f5] flex items-center gap-1 bg-[#161b29]/90 px-2 py-0.5 rounded-full border border-[#283046]">
                              <span className="material-symbols-outlined text-[#ffb067] text-xs">pin_drop</span> Wall St Cluster
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cashback and Discount Metric Widget */}
                      <div className="bg-[#1a1f2d] rounded-2xl p-5 flex flex-col justify-between border border-[#283046]/40">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-sm font-bold text-[#dee2f5]">Cashback & Discount</h4>
                            <p className="text-xs text-[#94a3b8]">Tier 3 Qualified Rewards</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-[#252a38] flex items-center justify-center text-[#ffb067]">
                            <span className="material-symbols-outlined text-sm">north_east</span>
                          </div>
                        </div>

                        <div className="w-full bg-[#252a38] h-3 rounded-full overflow-hidden my-2">
                          <div className="bg-[#ffb067] h-full rounded-full w-2/3"></div>
                        </div>

                        <div className="bg-[#252a38] rounded-2xl p-2.5 flex items-center justify-between mt-2">
                          <div className="flex -space-x-2 overflow-hidden">
                            <div className="w-7 h-7 rounded-full bg-[#ffb067] text-[#4c2700] flex items-center justify-center text-[10px] font-bold ring-2 ring-[#1a1f2d]">
                              S
                            </div>
                            <div className="w-7 h-7 rounded-full bg-[#38bdf8] text-[#090e1b] flex items-center justify-center text-[10px] font-bold ring-2 ring-[#1a1f2d]">
                              J
                            </div>
                            <div className="w-7 h-7 rounded-full bg-[#b8e3ff] text-[#090e1b] flex items-center justify-center text-[10px] font-bold ring-2 ring-[#1a1f2d]">
                              A
                            </div>
                            <div className="w-7 h-7 rounded-full bg-[#ffb877] text-[#4c2700] flex items-center justify-center text-[10px] font-bold ring-2 ring-[#1a1f2d]">
                              L
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-[#ffb067] px-2 py-0.5 rounded-full bg-[#1a1f2d] border border-[#ffb067]/20">
                            +5 partner perks
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expenditures Wave Graphic Card */}
                    <div className="bg-[#1a1f2d] rounded-2xl p-6 relative overflow-hidden border border-[#283046]/40">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-base font-bold text-[#dee2f5]">This Year's Expenditures</h4>
                          <p className="text-xs text-[#94a3b8]">Live algorithmic expenditure distribution</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#252a38] flex items-center justify-center text-[#dee2f5]">
                            <span className="material-symbols-outlined text-sm">tune</span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-[#252a38] flex items-center justify-center text-[#dee2f5]">
                            <span className="material-symbols-outlined text-sm">north_east</span>
                          </div>
                        </div>
                      </div>

                      <div className="relative w-full h-44 my-2">
                        <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 600 180">
                          <path
                            d="M0,150 C70,140 100,80 180,120 C240,150 280,40 330,70 C380,100 440,20 500,80 C550,130 580,110 600,120 L600,180 L0,180 Z"
                            fill="rgba(40,48,70,0.3)"
                          />
                          <path
                            d="M0,160 C80,160 120,110 190,130 C260,150 300,60 360,90 C420,120 480,50 540,90 C570,110 590,105 600,110 L600,180 L0,180 Z"
                            fill="rgba(255,176,103,0.12)"
                          />
                          <path
                            d="M0,150 C70,140 100,80 180,120 C240,150 280,40 330,70 C380,100 440,20 500,80 C550,130 580,110 600,120"
                            stroke="#ffb067"
                            strokeLinecap="round"
                            strokeWidth="2.5"
                          />
                          <circle cx="330" cy="70" fill="#ffb067" r="5" />
                          <line stroke="rgba(255,176,103,0.5)" strokeDasharray="3 3" strokeWidth="1.5" x1="330" x2="330" y1="70" y2="170" />
                        </svg>
                        <div className="absolute top-8 left-[51%] -translate-x-1/2 bg-[#252a38] text-[#dee2f5] px-3 py-1 rounded-full text-xs font-bold shadow-md border border-[#283046]">
                          ₹4,89,200 <span className="text-[#ffb067] font-normal">Peak (Jun)</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[#94a3b8] text-xs pt-2 font-mono">
                        <span>Jan</span>
                        <span>Feb</span>
                        <span>Mar</span>
                        <span>Apr</span>
                        <span>May</span>
                        <span className="bg-[#ffb067] text-[#4c2700] px-2 py-0.5 rounded-full font-bold">Jun</span>
                        <span>Jul</span>
                        <span>Aug</span>
                        <span>Sep</span>
                        <span>Oct</span>
                        <span>Nov</span>
                        <span>Dec</span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#283046]/50 flex items-center justify-between text-xs">
                        <span className="text-base font-bold font-mono text-[#dee2f5]">₹34,74,200.00</span>
                        <span className="text-[#34d399]">This is ₹5,400.00 less than last month</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Rail: Card Preview & Quick Transactions (4 cols) */}
                  <div className="lg:col-span-4 flex flex-col gap-5">
                    {/* Physical / Virtual Card Section */}
                    <div className="bg-[#1a1f2d] rounded-2xl p-5 flex flex-col gap-4 border border-[#283046]/40">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-bold text-[#dee2f5]">Cards</h4>
                        <div className="flex items-center gap-1 text-[#94a3b8]">
                          <span className="material-symbols-outlined text-base cursor-pointer hover:text-[#dee2f5]">chevron_left</span>
                          <span className="material-symbols-outlined text-base cursor-pointer hover:text-[#dee2f5]">chevron_right</span>
                        </div>
                      </div>

                      {/* Deep Navy Credit Card Object */}
                      <div className="rounded-2xl p-5 bg-gradient-to-br from-[#1c2640] via-[#151c2e] to-[#0e1526] text-white shadow-xl relative overflow-hidden border border-[#283046]">
                        <div className="flex items-center justify-between mb-6">
                          <span className="text-xs uppercase tracking-wider font-semibold opacity-80">Arthivex Sovereign</span>
                          <span className="material-symbols-outlined text-[#ffb067] text-lg">contactless</span>
                        </div>
                        <div className="font-mono tracking-widest text-base font-semibold my-4 opacity-95">
                          5789 •••• •••• 2047
                        </div>
                        <div className="flex items-end justify-between pt-2">
                          <div>
                            <div className="text-[9px] uppercase tracking-wider opacity-60">Card Holder</div>
                            <div className="text-xs font-semibold">Albert Ross</div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase tracking-wider opacity-60">Expires</div>
                            <div className="text-xs font-semibold">08/30</div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-[#ffb067]/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#ffb067] text-base">verified</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Settings & Balance Strip */}
                      <div className="grid grid-cols-3 gap-2 text-center py-1">
                        <div className="p-2 rounded-xl bg-[#252a38] flex flex-col items-center">
                          <span className="text-[10px] text-[#94a3b8]">Limit</span>
                          <span className="text-xs font-bold text-[#dee2f5] font-mono">₹4,00,000</span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#252a38] flex flex-col items-center">
                          <span className="text-[10px] text-[#94a3b8]">Income</span>
                          <span className="text-xs font-bold text-[#34d399] font-mono">+₹1,50,000</span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#252a38] flex flex-col items-center">
                          <span className="text-[10px] text-[#94a3b8]">Outcome</span>
                          <span className="text-xs font-bold text-[#f87171] font-mono">-₹35,000</span>
                        </div>
                      </div>

                      {/* Three Micro Actions */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                        <div className="flex flex-col items-center gap-1 cursor-pointer hover:text-[#ffb067] transition-colors">
                          <div className="w-9 h-9 rounded-full bg-[#252a38] flex items-center justify-center text-[#dee2f5]">
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </div>
                          <span className="text-[11px] text-[#94a3b8]">Show Details</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 cursor-pointer hover:text-[#ffb067] transition-colors">
                          <div className="w-9 h-9 rounded-full bg-[#252a38] flex items-center justify-center text-[#dee2f5]">
                            <span className="material-symbols-outlined text-base">ac_unit</span>
                          </div>
                          <span className="text-[11px] text-[#94a3b8]">Freeze</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 cursor-pointer hover:text-[#ffb067] transition-colors">
                          <div className="w-9 h-9 rounded-full bg-[#252a38] flex items-center justify-center text-[#dee2f5]">
                            <span className="material-symbols-outlined text-base">settings</span>
                          </div>
                          <span className="text-[11px] text-[#94a3b8]">Settings</span>
                        </div>
                      </div>

                      {/* Large Add Funds Peach CTA */}
                      <button
                        onClick={() => alert('Add funds modal routing initialized.')}
                        className="w-full py-2.5 rounded-full bg-[#ffb067] text-[#4c2700] text-xs font-bold shadow-md hover:bg-[#ffa048] transition-all"
                      >
                        Add Funds
                      </button>
                    </div>

                    {/* Recent Transactions Feed */}
                    <div className="bg-[#1a1f2d] rounded-2xl p-5 flex flex-col gap-3 border border-[#283046]/40">
                      <div className="flex items-center justify-between pb-1">
                        <h4 className="text-sm font-bold text-[#dee2f5]">Recent Transactions</h4>
                        <Link to={isAuthenticated ? "/transactions" : "/demo"} className="text-xs text-[#ffb067] font-semibold hover:underline">
                          View all &gt;
                        </Link>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#252a38] flex items-center justify-center text-xs font-bold text-[#ffb067]">
                              LJ
                            </div>
                            <div>
                              <div className="font-semibold text-[#dee2f5]">Lina John</div>
                              <div className="text-[10px] text-[#94a3b8]">03 Jun 2026, 05:15 PM</div>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-[#f87171]">-₹12,052.00</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#252a38] flex items-center justify-center text-xs font-bold text-[#38bdf8]">
                              HR
                            </div>
                            <div>
                              <div className="font-semibold text-[#dee2f5]">Henry Ross</div>
                              <div className="text-[10px] text-[#94a3b8]">02 Jun 2026, 06:10 PM</div>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-[#34d399]">+₹25,265.00</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#252a38] flex items-center justify-center text-xs font-bold text-[#ffb067]">
                              TR
                            </div>
                            <div>
                              <div className="font-semibold text-[#dee2f5]">Tina Rose</div>
                              <div className="text-[10px] text-[#94a3b8]">02 Jun 2026, 08:10 PM</div>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-[#34d399]">+₹1,428.00</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#252a38] flex items-center justify-center text-xs font-bold text-[#f87171]">
                              JQ
                            </div>
                            <div>
                              <div className="font-semibold text-[#dee2f5]">Jasmine Quist</div>
                              <div className="text-[10px] text-[#94a3b8]">01 Jun 2026, 08:30 AM</div>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-[#f87171]">-₹2,000.00</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#252a38] flex items-center justify-center text-xs font-bold text-[#f87171]">
                              MR
                            </div>
                            <div>
                              <div className="font-semibold text-[#dee2f5]">Matteo Rossi</div>
                              <div className="text-[10px] text-[#94a3b8]">29 May 2026, 09:30 AM</div>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-[#f87171]">-₹22,000.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KEY FEATURES SECTION */}
        <section className="w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-24 bg-[#090e1b]" id="features">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-wider text-[#ffb067] font-bold">
                Comprehensive Protection Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#dee2f5] mt-2">
                Everything You Need to Manage Your Money
              </h2>
              <p className="text-sm sm:text-base text-[#94a3b8] mt-2">
                One platform to organize your accounts and manage your everyday financial transactions with zero friction.
              </p>
            </div>

            {/* 6 Bento Deep Navy Feature Cards with Peach Accents */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <Link
                to={isAuthenticated ? "/accounts" : "/demo"}
                className="group bg-[#161b29] rounded-2xl p-6 shadow-sm hover:bg-[#1a1f2d] transition-all flex flex-col justify-between border border-[#283046]/40 cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#20273a] flex items-center justify-center mb-4 text-[#ffb067] group-hover:bg-[#ffb067] group-hover:text-[#4c2700] transition-colors">
                    <span className="material-symbols-outlined text-2xl">account_balance</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#dee2f5] mb-2">Account Management</h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    Centralize sovereign checking, corporate treasury, and collateral reserves in real-time with
                    continuous reconciliation and instant ledger audits.
                  </p>
                </div>
                <div className="mt-4 pt-2 flex items-center gap-2 text-[#ffb067] text-xs font-semibold">
                  <span>Instant multi-currency balances</span>
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </div>
              </Link>

              {/* Feature 2 */}
              <Link
                to={isAuthenticated ? "/deposit" : "/demo"}
                className="group bg-[#161b29] rounded-2xl p-6 shadow-sm hover:bg-[#1a1f2d] transition-all flex flex-col justify-between border border-[#283046]/40 cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#20273a] flex items-center justify-center mb-4 text-[#ffb067] group-hover:bg-[#ffb067] group-hover:text-[#4c2700] transition-colors">
                    <span className="material-symbols-outlined text-2xl">input</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#dee2f5] mb-2">Secure Deposits</h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    Deposit via ACH, FedNow, SWIFT, or multi-chain crypto gateways. Zero latency liquidity attribution
                    backed by automated cryptographic validation.
                  </p>
                </div>
                <div className="mt-4 pt-2 flex items-center gap-2 text-[#ffb067] text-xs font-semibold">
                  <span>Multi-rail verification flow</span>
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </div>
              </Link>

              {/* Feature 3 */}
              <Link
                to={isAuthenticated ? "/withdraw" : "/demo"}
                className="group bg-[#161b29] rounded-2xl p-6 shadow-sm hover:bg-[#1a1f2d] transition-all flex flex-col justify-between border border-[#283046]/40 cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#20273a] flex items-center justify-center mb-4 text-[#ffb067] group-hover:bg-[#ffb067] group-hover:text-[#4c2700] transition-colors">
                    <span className="material-symbols-outlined text-2xl">output</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#dee2f5] mb-2">Easy Withdrawals</h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    Deterministic routing algorithms select the fastest, lowest-slippage rails for payouts with real-time
                    liquidity sanity checks and fraud gating.
                  </p>
                </div>
                <div className="mt-4 pt-2 flex items-center gap-2 text-[#ffb067] text-xs font-semibold">
                  <span>Guaranteed balance checks</span>
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </div>
              </Link>

              {/* Feature 4 */}
              <Link
                to={isAuthenticated ? "/transfer" : "/demo"}
                className="group bg-[#161b29] rounded-2xl p-6 shadow-sm hover:bg-[#1a1f2d] transition-all flex flex-col justify-between border border-[#283046]/40 cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#20273a] flex items-center justify-center mb-4 text-[#ffb067] group-hover:bg-[#ffb067] group-hover:text-[#4c2700] transition-colors">
                    <span className="material-symbols-outlined text-2xl">sync_alt</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#dee2f5] mb-2">Fast Transfers</h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    Move capital internally within milliseconds at zero cost, or transmit outbound transfers to global
                    recipients with verified smart receipts.
                  </p>
                </div>
                <div className="mt-4 pt-2 flex items-center gap-2 text-[#ffb067] text-xs font-semibold">
                  <span>Direct P2P & Wire routing</span>
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </div>
              </Link>

              {/* Feature 5 */}
              <div className="group bg-[#161b29] rounded-2xl p-6 shadow-sm hover:bg-[#1a1f2d] transition-all flex flex-col justify-between border border-[#283046]/40">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#20273a] flex items-center justify-center mb-4 text-[#ffb067] group-hover:bg-[#ffb067] group-hover:text-[#4c2700] transition-colors">
                    <span className="material-symbols-outlined text-2xl">receipt_long</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#dee2f5] mb-2">Transaction History</h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    Immutable telemetry log records every state transition. Export tax-ready reports and compliance
                    dossiers with cryptographic proofs in seconds.
                  </p>
                </div>
                <div className="mt-4 pt-2 flex items-center gap-2 text-[#ffb067] text-xs font-semibold">
                  <span>Audit-proof immutable logs</span>
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </div>
              </div>

              {/* Feature 6 */}
              <div className="group bg-[#161b29] rounded-2xl p-6 shadow-sm hover:bg-[#1a1f2d] transition-all flex flex-col justify-between border border-[#283046]/40">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#20273a] flex items-center justify-center mb-4 text-[#ffb067] group-hover:bg-[#ffb067] group-hover:text-[#4c2700] transition-colors">
                    <span className="material-symbols-outlined text-2xl">security</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#dee2f5] mb-2">Security-Focused Design</h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    Every operation mandates cryptographic signing, adaptive biometric verification, session sandboxing,
                    and policy-driven withdrawal quorum limits.
                  </p>
                </div>
                <div className="mt-4 pt-2 flex items-center gap-2 text-[#ffb067] text-xs font-semibold">
                  <span>SOC2 Type II & AES-256 standard</span>
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section className="w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-24 bg-[#0e1320]" id="how-it-works">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-wider text-[#ffb067] font-bold">
                Frictionless Workflow
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#dee2f5] mt-2">
                Manage Your Finances in Four Simple Steps
              </h2>
              <p className="text-sm sm:text-base text-[#94a3b8] mt-2">
                Get started with enterprise-grade capital oversight in under five minutes.
              </p>
            </div>

            {/* 4-Step Horizontal Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="bg-[#161b29] rounded-2xl p-6 flex flex-col border border-[#283046]/40">
                <div className="flex items-center justify-between mb-4">
                  <span className="w-10 h-10 rounded-full bg-[#ffb067] text-[#4c2700] font-bold flex items-center justify-center text-lg">
                    1
                  </span>
                  <span className="material-symbols-outlined text-2xl text-[#ffd5b3]">person_add</span>
                </div>
                <h4 className="text-base font-bold text-[#dee2f5] mb-2">Create Your Account</h4>
                <p className="text-xs text-[#94a3b8] flex-grow leading-relaxed">
                  Register in minutes with verified biometric identity authentication and sovereign key generation.
                </p>
                <div className="mt-4 pt-2 text-xs font-semibold text-[#38bdf8]">
                  Instant KYC verification
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-[#161b29] rounded-2xl p-6 flex flex-col border border-[#283046]/40">
                <div className="flex items-center justify-between mb-4">
                  <span className="w-10 h-10 rounded-full bg-[#ffb067] text-[#4c2700] font-bold flex items-center justify-center text-lg">
                    2
                  </span>
                  <span className="material-symbols-outlined text-2xl text-[#ffd5b3]">dashboard</span>
                </div>
                <h4 className="text-base font-bold text-[#dee2f5] mb-2">Access Your Dashboard</h4>
                <p className="text-xs text-[#94a3b8] flex-grow leading-relaxed">
                  Connect institutional repositories, link deposit rails, and customize telemetry feeds in seconds.
                </p>
                <div className="mt-4 pt-2 text-xs font-semibold text-[#38bdf8]">
                  Unified liquidity console
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-[#161b29] rounded-2xl p-6 flex flex-col border border-[#283046]/40">
                <div className="flex items-center justify-between mb-4">
                  <span className="w-10 h-10 rounded-full bg-[#ffb067] text-[#4c2700] font-bold flex items-center justify-center text-lg">
                    3
                  </span>
                  <span className="material-symbols-outlined text-2xl text-[#ffd5b3]">currency_exchange</span>
                </div>
                <h4 className="text-base font-bold text-[#dee2f5] mb-2">Manage Transactions</h4>
                <p className="text-xs text-[#94a3b8] flex-grow leading-relaxed">
                  Initiate frictionless deposits, peer transfers, and cross-border disbursements through verified pipelines.
                </p>
                <div className="mt-4 pt-2 text-xs font-semibold text-[#38bdf8]">
                  Sub-second execution speeds
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-[#161b29] rounded-2xl p-6 flex flex-col border border-[#283046]/40">
                <div className="flex items-center justify-between mb-4">
                  <span className="w-10 h-10 rounded-full bg-[#ffb067] text-[#4c2700] font-bold flex items-center justify-center text-lg">
                    4
                  </span>
                  <span className="material-symbols-outlined text-2xl text-[#ffd5b3]">insights</span>
                </div>
                <h4 className="text-base font-bold text-[#dee2f5] mb-2">Review and Track</h4>
                <p className="text-xs text-[#94a3b8] flex-grow leading-relaxed">
                  Inspect cryptographic transaction receipts, generate financial reports, and maintain regulatory peace of mind.
                </p>
                <div className="mt-4 pt-2 text-xs font-semibold text-[#38bdf8]">
                  Automated compliance sync
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRANSACTION WORKFLOW SECTION */}
        <section className="w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-24 bg-[#090e1b]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-wider text-[#ffb067] font-bold">
                Algorithmic Precision
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#dee2f5] mt-2">
                Simple Transactions. Clear Steps. Better Control.
              </h2>
              <p className="text-sm sm:text-base text-[#94a3b8] mt-2">
                Every movement of capital follows a strictly governed, transparent five-phase pipeline.
              </p>
            </div>

            {/* 5-Phase Interactive Flow Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
              <div className="bg-[#161b29] rounded-2xl p-4 flex flex-col items-center text-center border border-[#283046]/40">
                <div className="w-10 h-10 rounded-full bg-[#252a38] flex items-center justify-center text-[#ffb067] mb-3">
                  <span className="material-symbols-outlined text-xl">touch_app</span>
                </div>
                <span className="text-[10px] text-[#ffb067] font-bold font-mono">Phase 01</span>
                <h5 className="text-xs font-bold text-[#dee2f5] mt-1">Select Operation</h5>
                <p className="text-[11px] text-[#94a3b8] mt-2">Choose between Deposit, Transfer, or Payout destination.</p>
              </div>

              <div className="bg-[#161b29] rounded-2xl p-4 flex flex-col items-center text-center border border-[#283046]/40">
                <div className="w-10 h-10 rounded-full bg-[#252a38] flex items-center justify-center text-[#ffb067] mb-3">
                  <span className="material-symbols-outlined text-xl">edit_note</span>
                </div>
                <span className="text-[10px] text-[#ffb067] font-bold font-mono">Phase 02</span>
                <h5 className="text-xs font-bold text-[#dee2f5] mt-1">Details & Amount</h5>
                <p className="text-[11px] text-[#94a3b8] mt-2">Enter amount with smart fee estimation and counterparty tags.</p>
              </div>

              <div className="bg-[#161b29] rounded-2xl p-4 flex flex-col items-center text-center border border-[#283046]/40">
                <div className="w-10 h-10 rounded-full bg-[#252a38] flex items-center justify-center text-[#ffb067] mb-3">
                  <span className="material-symbols-outlined text-xl">fact_check</span>
                </div>
                <span className="text-[10px] text-[#ffb067] font-bold font-mono">Phase 03</span>
                <h5 className="text-xs font-bold text-[#dee2f5] mt-1">Review Details</h5>
                <p className="text-[11px] text-[#94a3b8] mt-2">Verify transparent fx rates, network fees, and route limits.</p>
              </div>

              <div className="bg-[#161b29] rounded-2xl p-4 flex flex-col items-center text-center border border-[#283046]/40">
                <div className="w-10 h-10 rounded-full bg-[#252a38] flex items-center justify-center text-[#ffb067] mb-3">
                  <span className="material-symbols-outlined text-xl">fingerprint</span>
                </div>
                <span className="text-[10px] text-[#ffb067] font-bold font-mono">Phase 04</span>
                <h5 className="text-xs font-bold text-[#dee2f5] mt-1">Confirm Operation</h5>
                <p className="text-[11px] text-[#94a3b8] mt-2">Authorize via multi-factor passkey or hardware key module.</p>
              </div>

              <div className="bg-[#161b29] rounded-2xl p-4 flex flex-col items-center text-center border border-[#283046]/40 sm:col-span-2 md:col-span-1">
                <div className="w-10 h-10 rounded-full bg-[#252a38] flex items-center justify-center text-[#34d399] mb-3">
                  <span className="material-symbols-outlined text-xl">task_alt</span>
                </div>
                <span className="text-[10px] text-[#34d399] font-bold font-mono">Phase 05</span>
                <h5 className="text-xs font-bold text-[#dee2f5] mt-1">Verified Status</h5>
                <p className="text-[11px] text-[#94a3b8] mt-2">Instant ledger settlement with cryptographically signed proof.</p>
              </div>
            </div>

            {/* Backend Validation Clarification Card */}
            <div className="mt-8 p-5 rounded-2xl bg-[#161b29] flex items-center gap-4 text-[#94a3b8] border border-[#283046]/60">
              <div className="w-10 h-10 rounded-full bg-[#ffb067]/20 flex-shrink-0 flex items-center justify-center text-[#ffb067]">
                <span className="material-symbols-outlined text-2xl">policy</span>
              </div>
              <div className="text-xs leading-relaxed">
                <strong className="text-[#dee2f5] font-semibold">Real-Time Backend Validation:</strong> Arthivex executes
                automated balance validation, velocity pattern screening, and liquidity solvency checks before every
                operation confirmation to ensure total execution safety.
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY SECTION */}
        <section className="w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-24 bg-[#0e1320]" id="security">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-wider text-[#ffb067] font-bold">
                Institutional Hardening
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#dee2f5] mt-2">
                Security Is Built Into the Experience
              </h2>
              <p className="text-sm sm:text-base text-[#94a3b8] mt-2">
                Arthivex is designed around secure access, responsible transaction handling and clear financial records.
              </p>
            </div>

            {/* 4 Security Highlight Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#161b29] rounded-2xl p-8 flex gap-4 border border-[#283046]/40">
                <div className="w-12 h-12 rounded-2xl bg-[#252a38] flex-shrink-0 flex items-center justify-center text-[#ffb067]">
                  <span className="material-symbols-outlined text-2xl">passkey</span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#dee2f5] mb-2">Secure Authentication</h4>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    FIDO2 WebAuthn passkey infrastructure ensures phishing-resistant sign-in. Zero password vulnerability
                    across all endpoints.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#1a1f2d] text-[10px] font-mono text-[#dbe2fb] border border-[#283046]">
                      Biometric Bound
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#1a1f2d] text-[10px] font-mono text-[#dbe2fb] border border-[#283046]">
                      Hardware Key Ready
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#161b29] rounded-2xl p-8 flex gap-4 border border-[#283046]/40">
                <div className="w-12 h-12 rounded-2xl bg-[#252a38] flex-shrink-0 flex items-center justify-center text-[#ffb067]">
                  <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#dee2f5] mb-2">Role-Based Access Control</h4>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    Granular permission matrix allows administrators, auditors, and operators to execute duties without
                    exposing master keys.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#1a1f2d] text-[10px] font-mono text-[#dbe2fb] border border-[#283046]">
                      Least Privilege
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#1a1f2d] text-[10px] font-mono text-[#dbe2fb] border border-[#283046]">
                      Quorum Approvals
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#161b29] rounded-2xl p-8 flex gap-4 border border-[#283046]/40">
                <div className="w-12 h-12 rounded-2xl bg-[#252a38] flex-shrink-0 flex items-center justify-center text-[#ffb067]">
                  <span className="material-symbols-outlined text-2xl">shield</span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#dee2f5] mb-2">Account Ownership Protection</h4>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    Continuous device fingerprinting, velocity monitoring, and automatic lockout during anomalous egress
                    activity protect capital 24/7.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#1a1f2d] text-[10px] font-mono text-[#dbe2fb] border border-[#283046]">
                      Continuous Heuristics
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#1a1f2d] text-[10px] font-mono text-[#dbe2fb] border border-[#283046]">
                      Kill-Switch Safeguards
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#161b29] rounded-2xl p-8 flex gap-4 border border-[#283046]/40">
                <div className="w-12 h-12 rounded-2xl bg-[#252a38] flex-shrink-0 flex items-center justify-center text-[#ffb067]">
                  <span className="material-symbols-outlined text-2xl">gavel</span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#dee2f5] mb-2">Transaction Integrity & Auditability</h4>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    Every balance modification is committed to an immutable append-only ledger with cryptographic hash
                    chaining and exportable proof.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#1a1f2d] text-[10px] font-mono text-[#dbe2fb] border border-[#283046]">
                      Append-Only Ledger
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#1a1f2d] text-[10px] font-mono text-[#dbe2fb] border border-[#283046]">
                      Zero-Knowledge Attestation
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CALL TO ACTION SECTION */}
        <section className="w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-24 bg-[#090e1b] relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#ffb067]/5 via-transparent to-transparent"></div>
          <div className="relative max-w-5xl mx-auto rounded-3xl bg-[#161b29] p-8 sm:p-14 text-center shadow-2xl border border-[#283046]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#252a38] text-[#ffb067] text-xs font-semibold mb-4 border border-[#ffb067]/20">
              <span className="material-symbols-outlined text-base">rocket_launch</span>
              <span>Get Started in Minutes</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-bold text-[#dee2f5]">
              Your Financial Management Starts Here.
            </h2>

            <p className="mt-4 text-sm sm:text-base text-[#94a3b8] max-w-xl mx-auto">
              Bring your accounts and everyday financial activities together with Arthivex.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#ffb067] text-[#4c2700] text-sm font-bold shadow-xl shadow-[#ffb067]/25 hover:bg-[#ffa048] hover:scale-[1.02] transition-all"
              >
                <span>Create Your Account</span>
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </Link>

              <Link
                to="/demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#ffb067]/20 text-[#ffd5b3] text-sm font-bold hover:bg-[#ffb067]/30 transition-all shadow-md border border-[#ffb067]/50"
              >
                <span className="material-symbols-outlined text-lg text-[#ffb067]">explore</span>
                <span>Explore Demo</span>
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#252a38] text-[#dee2f5] text-sm font-semibold hover:bg-[#303443] transition-colors border border-[#283046]"
              >
                <span>Login</span>
              </Link>
            </div>

            <div className="mt-6 text-[#94a3b8] text-xs">
              No long-term contracts. High-speed onboarding. 24/7 dedicated institutional support.
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#090e1b] py-16 border-t border-[#283046]/60">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#ffb067] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#4c2700] text-lg">shield_locked</span>
                </div>
                <span className="text-xl font-bold text-[#dee2f5]">
                  Arthi<span className="text-[#ffb067]">vex</span>
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] max-w-sm leading-relaxed">
                Next-generation institutional financial protection and algorithmic liquidity telemetry engineered with
                sovereign cryptographic standards.
              </p>
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <span className="text-[#bfc6de] bg-[#252a38] px-2.5 py-1 rounded-full border border-[#283046]">
                  SOC2 Type II Certified
                </span>
                <span className="text-[#bfc6de] bg-[#252a38] px-2.5 py-1 rounded-full border border-[#283046]">
                  256-bit AES
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#dee2f5] uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2.5 text-xs text-[#94a3b8]">
                <li><a className="hover:text-[#dee2f5] transition-colors" href="#features">Features</a></li>
                <li><a className="hover:text-[#dee2f5] transition-colors" href="#security">Security Infrastructure</a></li>
                <li><a className="hover:text-[#dee2f5] transition-colors" href="#how-it-works">Algorithmic Guard</a></li>
                <li><a className="hover:text-[#dee2f5] transition-colors" href="#pricing">Pricing Tiers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#dee2f5] uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2.5 text-xs text-[#94a3b8]">
                <li><a className="hover:text-[#dee2f5] transition-colors" href="#about">About Us</a></li>
                <li><a className="hover:text-[#dee2f5] transition-colors" href="#leadership">Leadership</a></li>
                <li><a className="hover:text-[#dee2f5] transition-colors" href="#compliance">Compliance</a></li>
                <li><a className="hover:text-[#dee2f5] transition-colors" href="#careers">Careers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#dee2f5] uppercase tracking-wider mb-4">Legal & Trust</h4>
              <ul className="space-y-2.5 text-xs text-[#94a3b8]">
                <li><a className="hover:text-[#dee2f5] transition-colors" href="#privacy">Privacy Policy</a></li>
                <li><a className="hover:text-[#dee2f5] transition-colors" href="#terms">Terms of Service</a></li>
                <li><a className="hover:text-[#dee2f5] transition-colors" href="#status">System Status</a></li>
                <li><a className="hover:text-[#dee2f5] transition-colors" href="#bounty">Security Bug Bounty</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#283046]/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94a3b8]">
            <p>© 2026 Arthivex Global Technologies Inc. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a className="hover:text-[#dee2f5] transition-colors" href="#privacy">Privacy</a>
              <a className="hover:text-[#dee2f5] transition-colors" href="#cookies">Cookies</a>
              <a className="hover:text-[#dee2f5] transition-colors" href="#security-center">Security Center</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
