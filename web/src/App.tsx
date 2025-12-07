import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import CommunityHomePage from './pages/community/CommunityHomePage';
import SettingsPage from './pages/community/SettingsPage';
import NotificationsPage from './pages/community/NotificationsPage';
import KeywordSettingsPage from './pages/community/KeywordSettingsPage';
import FilteringKeywordSettingsPage from './pages/community/FilteringKeywordSettingsPage';
import HashtagSettingsPage from './pages/community/HashtagSettingsPage';
import BoardListPage from './pages/community/BoardListPage';
import SearchPage from './pages/community/SearchPage';
import MyBoardPage from './pages/community/MyBoardPage';
import BoardDetailPage from './pages/community/BoardDetailPage';
import InternationalBoardPage from './pages/community/InternationalBoardPage';
import CreatePostPage from './pages/community/CreatePostPage';
import PostDetailPage from './pages/community/PostDetailPage';
import PollCreationPage from './pages/community/PollCreationPage';

// --- Components ---

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Wrapper for applying animation to each page
const PageTransition = ({ children }: { children?: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="min-h-screen bg-white"
    >
      {children}
    </motion.div>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/community" replace />} />
        
        <Route path="/community" element={
          <PageTransition><CommunityHomePage /></PageTransition>
        } />
        
        {/* Notifications Page Route */}
        <Route path="/community/notifications" element={
          <PageTransition><NotificationsPage /></PageTransition>
        } />
        
        <Route path="/community/create" element={
          <PageTransition><CreatePostPage /></PageTransition>
        } />
        <Route path="/community/create/poll" element={
          <PageTransition><PollCreationPage /></PageTransition>
        } />
        
        {/* Board List Page Route */}
        <Route path="/community/board-list" element={
          <PageTransition><BoardListPage /></PageTransition>
        } />
        
        {/* Search Page Route */}
        <Route path="/community/search" element={
          <PageTransition><SearchPage /></PageTransition>
        } />

        {/* My Board Page Route */}
        <Route path="/community/board/my" element={
          <PageTransition><MyBoardPage /></PageTransition>
        } />

        {/* International Board Page Route */}
        <Route path="/community/board/international" element={
          <PageTransition><InternationalBoardPage /></PageTransition>
        } />

        {/* Generic Board Detail Page Route (recommended, hot, free, etc.) */}
        <Route path="/community/board/:type" element={
          <PageTransition><BoardDetailPage /></PageTransition>
        } />
        
        {/* Settings Page Route */}
        <Route path="/community/settings" element={
          <PageTransition><SettingsPage /></PageTransition>
        } />
        
        {/* Keyword Settings Page Route */}
        <Route path="/community/keywords" element={
          <PageTransition><KeywordSettingsPage /></PageTransition>
        } />
        
        {/* Filtering Keyword Settings Page Route */}
        <Route path="/community/filtering-keywords" element={
          <PageTransition><FilteringKeywordSettingsPage /></PageTransition>
        } />
        
        {/* Hashtag Settings Page Route */}
        <Route path="/community/hashtags" element={
          <PageTransition><HashtagSettingsPage /></PageTransition>
        } />
        
        {/* Post Detail Page Route */}
        <Route path="/community/post/:id" element={
          <PageTransition><PostDetailPage /></PageTransition>
        } />
        
        {/* Edit Post Page Route - reuses CreatePostPage */}
        <Route path="/community/post/:id/edit" element={
          <PageTransition><CreatePostPage /></PageTransition>
        } />
        
        <Route path="*" element={<Navigate to="/community" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="max-w-md mx-auto min-h-screen bg-white border-x border-gray-100 shadow-2xl overflow-hidden relative">
        <ScrollToTop />
        <AnimatedRoutes />
      </div>
    </HashRouter>
  );
};

export default App;