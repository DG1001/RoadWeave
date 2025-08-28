import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import TravelerPWA from './components/TravelerPWA';
import BlogView from './components/BlogView';
import PublicBlogView from './components/PublicBlogView';
import AdminLogin from './components/AdminLogin';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/blog/:tripId" element={<BlogView />} />
          <Route path="/traveler/:token" element={<TravelerPWA />} />
          <Route path="/public/:token" element={<PublicBlogView />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;