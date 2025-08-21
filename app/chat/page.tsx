// app/chat/page.tsx
"use client";

import { useState } from "react";

export default function ChatPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
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
    } catch (err: any) {
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
    </main>
  );
}
