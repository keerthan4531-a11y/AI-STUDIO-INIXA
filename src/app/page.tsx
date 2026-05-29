"use client";

import dynamic from 'next/dynamic';

const LandingPage = dynamic(() => import('../components/LandingPage'), {
  ssr: false,
  loading: () => (
    <div className="h-screen bg-[#030712] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="w-8 h-8 mx-auto border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    </div>
  ),
});

export default function Home() {
  return <LandingPage />;
}
