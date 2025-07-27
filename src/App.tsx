
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './Home';
import Boutique from './Boutique';
import { SessionProvider } from './auth/SessionProvider';

export default function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:handle" element={<Boutique />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </SessionProvider>
  );
}
