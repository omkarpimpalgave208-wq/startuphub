import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './pages/Home';

const TrendingPage = lazy(() => import('./pages/TrendingPage').then(module => ({ default: module.TrendingPage })));
const RecentPage = lazy(() => import('./pages/RecentPage').then(module => ({ default: module.RecentPage })));
const MakersPage = lazy(() => import('./pages/MakersPage').then(module => ({ default: module.MakersPage })));
const CategoryPage = lazy(() => import('./pages/CategoryPage').then(module => ({ default: module.CategoryPage })));
const LoungePage = lazy(() => import('./pages/LoungePage').then(module => ({ default: module.LoungePage })));
const ProductPage = lazy(() => import('./pages/ProductPage').then(module => ({ default: module.ProductPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const LaunchPage = lazy(() => import('./pages/LaunchPage').then(module => ({ default: module.LaunchPage })));
const DiscussionsPage = lazy(() => import('./pages/DiscussionsPage').then(module => ({ default: module.DiscussionsPage })));
const DiscussionPage = lazy(() => import('./pages/DiscussionPage').then(module => ({ default: module.DiscussionPage })));
const NewDiscussionPage = lazy(() => import('./pages/NewDiscussionPage').then(module => ({ default: module.NewDiscussionPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then(module => ({ default: module.SignupPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const ConnectionsPage = lazy(() => import('./pages/ConnectionsPage').then(module => ({ default: module.ConnectionsPage })));
const AdminVerificationsPage = lazy(() => import('./pages/AdminVerificationsPage').then(module => ({ default: module.AdminVerificationsPage })));
const EditProductPage = lazy(() => import('./pages/EditProductPage').then(module => ({ default: module.EditProductPage })));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage').then(module => ({ default: module.BookmarksPage })));
const MessagesPage = lazy(() => import('./pages/MessagesPage').then(module => ({ default: module.MessagesPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })));
const HackathonsPage = lazy(() => import('./pages/HackathonsPage').then(module => ({ default: module.HackathonsPage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then(module => ({ default: module.LeaderboardPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(module => ({ default: module.AdminDashboardPage })));

import { supabase } from './lib/supabase';

if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Main Navigation Routes */}
            <Route index element={<Home />} />
            <Route path="trending" element={<TrendingPage />} />
            <Route path="recent" element={<RecentPage />} />
            <Route path="discussions" element={<DiscussionsPage />} />
            <Route path="makers" element={<MakersPage />} />
            <Route path="lounge" element={<LoungePage />} />
            <Route path="hackathons" element={<HackathonsPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            
            {/* Category Routes */}
            <Route path="category/:slug" element={<CategoryPage />} />
            
            {/* Legacy category routes - redirect to new format */}
            <Route path="saas" element={<Navigate to="/category/saas" replace />} />
            <Route path="mobile-apps" element={<Navigate to="/category/mobile" replace />} />
            <Route path="ai-tools" element={<Navigate to="/category/ai" replace />} />
            
            {/* Product Routes */}
            <Route path="product/:id" element={<ProductPage />} />
            <Route path="product/:id/edit" element={<EditProductPage />} />
            <Route path="launch" element={<LaunchPage />} />
            
            {/* Discussion Routes */}
            <Route path="discussion/:id" element={<DiscussionPage />} />
            <Route path="discussions/new" element={<NewDiscussionPage />} />
            
            {/* User Routes */}
            <Route path="profile/:username" element={<ProfilePage />} />
            <Route path="connections" element={<ConnectionsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="messages/:conversationId" element={<MessagesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin/verifications" element={<AdminVerificationsPage />} />
            
            <Route path="bookmarks" element={<BookmarksPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="admin" element={<AdminDashboardPage />} />
            
            {/* 404 Catch All */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;