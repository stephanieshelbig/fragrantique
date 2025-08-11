'use client';

import { useState } from 'react';

export default function CleanImagesPage() {
  const [processing, setProcessing] = useState(false);
  const [log, setLog] = useState([]);

  async function processAll() {
    setProcessing(true);
    setLog([]);
    try {
      const res = await fetch('/api/remove-bg', {
        method: 'POST',
      });
      const data = await res.json();
      setLog(data.log || ['Done']);
    } catch (err) {
      setLog([`Error: ${err.message}`]);
    }
    setProcessing(false);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Clean All Bottle Images</h1>
      <button
        onClick={processAll}
        disabled={processing}
        className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 disabled:opacity-50"
      >
        {processing ? 'Processing...' : 'Process All'}
      </button>
      <pre className="mt-4 bg-gray-100 p-4 rounded text-sm overflow-x-auto">
        {log.join('\n')}
      </pre>
    </div>
  );
}
