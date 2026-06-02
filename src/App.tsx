import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './pages/Home';
import { TrendingPage } from './pages/TrendingPage';
import { RecentPage } from './pages/RecentPage';
import { MakersPage } from './pages/MakersPage';
import { CategoryPage } from './pages/CategoryPage';
import { LoungePage } from './pages/LoungePage';
import { ProductPage } from './pages/ProductPage';
import { ProfilePage } from './pages/ProfilePage';
import { LaunchPage } from './pages/LaunchPage';
import { DiscussionsPage } from './pages/DiscussionsPage';
import { DiscussionPage } from './pages/DiscussionPage';
import { NewDiscussionPage } from './pages/NewDiscussionPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { SettingsPage } from './pages/SettingsPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { EditProductPage } from './pages/EditProductPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { MessagesPage } from './pages/MessagesPage';
import { NotFoundPage } from './pages/NotFoundPage';

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
            <Route path="bookmarks" element={<BookmarksPage />} />
            
            {/* Auth Routes */}
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            
            {/* 404 Catch All */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;