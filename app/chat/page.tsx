// app/chat/page.tsx
"use client";

import { useState } from "react";

export default function ChatPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setResult(null);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setResult("Please fill in your name, email, and message.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const j = await res.json();
      if (!res.ok) {
        setResult(j?.error || "Could not send your message.");
      } else {
        setResult("Thanks! Your message has been sent.");
        setName("");
        setEmail("");
        setMessage("");
      }
    } catch (err) {
      setResult(err?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fdfcf9] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl bg-white border rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold text-center">Send me a message</h1>

        <p className="text-center text-sm text-gray-600 mt-1">
          I’ll receive your message by email and reply as soon as I can.
        </p>
        <p className="text-center text-sm text-gray-600 mt-1">
          Or email me directly at STEPHANIE@FRAGRANTIQUE.NET.
        </p>

        {/* ✨ NEW SOCIAL BUTTONS */}
        <div className="mt-5 flex justify-center gap-3 flex-wrap">

          {/* TikTok */}
          <a
            href="https://www.tiktok.com/@fragrantique.net"
            target="_blank"
            rel="noopener noreferrer"
            className="social-pill group"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-black fill-current">
              <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.68h-3.274v13.37a2.96 2.96 0 1 1-2.96-2.96c.244 0 .48.03.707.086V9.157a6.236 6.236 0 0 0-.707-.04A6.233 6.233 0 1 0 15.818 15.35V8.568a8.048 8.048 0 0 0 4.71 1.52V6.686h-.939Z" />
            </svg>
            <span>TikTok</span>
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/fragrantique_net"
            target="_blank"
            rel="noopener noreferrer"
            className="social-pill group"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <defs>
                <linearGradient id="contactIG" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#feda75"/>
                  <stop offset="35%" stopColor="#fa7e1e"/>
                  <stop offset="65%" stopColor="#d62976"/>
                  <stop offset="85%" stopColor="#962fbf"/>
                  <stop offset="100%" stopColor="#4f5bd5"/>
                </linearGradient>
              </defs>
              <path fill="url(#contactIG)" d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Z"/>
            </svg>
            <span>Instagram</span>
          </a>

          {/* YouTube */}
          <a
            href="https://www.youtube.com/@fragrantique"
            target="_blank"
            rel="noopener noreferrer"
            className="social-pill group"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FF0000">
              <path d="M23.498 6.186a2.997 2.997 0 0 0-2.11-2.12C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.388.566a2.997 2.997 0 0 0-2.11 2.12C0 8.08 0 12 0 12s0 3.92.502 5.814a2.997 2.997 0 0 0 2.11 2.12C4.495 20.5 12 20.5 12 20.5s7.505 0 9.388-.566a2.997 2.997 0 0 0 2.11-2.12C24 15.92 24 12 24 12s0-3.92-.502-5.814ZM9.75 15.568V8.432L15.818 12 9.75 15.568Z"/>
            </svg>
            <span>YouTube</span>
          </a>

        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Your name</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Stephanie"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Your email</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 h-36"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message…"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-black text-white rounded-xl py-2.5 font-medium hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </form>

        {result && (
          <div className="mt-4 text-center text-sm">
            {result}
          </div>
        )}
      </div>

      {/* ✨ Styles */}
      <style jsx global>{`
        .social-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 9999px;
          border: 1px solid #ead9b8;
          background: white;
          font-size: 14px;
          font-weight: 500;
          color: #182A39;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.2s ease;
        }

        .social-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 16px rgba(217,195,154,0.4);
        }
      `}</style>
    </main>
  );
}
