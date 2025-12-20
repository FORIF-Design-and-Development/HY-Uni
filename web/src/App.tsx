import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import FindEmailTest from "./pages/auth/FindEmailTest";
import LoginTest from "./pages/auth/LoginTest";
import RegisterTest from "./pages/auth/RegisterTest";
import ResetPasswordTest from "./pages/auth/ResetPasswordTest";

import DashboardPage from "./pages/DashboardPage";
import CafeteriaPage from "./pages/campus/CafeteriaPage";

import MapPage from "./pages/campus/MapPage";
import CampusMapPage from "./pages/campus/CampusMapView";
import PlaceListPage from "./pages/campus/HotPlaceView";

import ChatbotPage from "./pages/campus/ChatbotPage";
import HylionPage from "./pages/campus/HylionPage";
import NoticePage from "./pages/campus/NoticePage";
import ReviewPage from "./pages/campus/ReviewPage";
import Timetable from "./pages/campus/TimetablePage";

import BoardDetailPage from "./pages/community/BoardDetailPage";
import BoardListPage from "./pages/community/BoardListPage";
import CommunityHomePage from "./pages/community/CommunityHomePage";
import CreatePostPage from "./pages/community/CreatePostPage";
import FilteringKeywordSettingsPage from "./pages/community/FilteringKeywordSettingsPage";
import HashtagSettingsPage from "./pages/community/HashtagSettingsPage";
import InternationalBoardPage from "./pages/community/InternationalBoardPage";
import KeywordSettingsPage from "./pages/community/KeywordSettingsPage";
import MyBoardPage from "./pages/community/MyBoardPage";
import NotificationsPage from "./pages/community/NotificationsPage";
import PollCreationPage from "./pages/community/PollCreationPage";
import PostDetailPage from "./pages/community/PostDetailPage";
import SearchPage from "./pages/community/SearchPage";
import SettingsPage from "./pages/community/SettingsPage";

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
      <PageTransition>
        <Routes location={location} key={location.pathname}>
          <Route path="/register" element={<RegisterTest />} />
          <Route path="/login" element={<LoginTest />} />
          <Route path="/test/find-email" element={<FindEmailTest />} />
          <Route path="/test/reset-password" element={<ResetPasswordTest />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/campus/notices" element={<NoticePage />} />
          <Route path="/campus/cafeteria" element={<CafeteriaPage />} />
          <Route path="/campus/map" element={<MapPage />} />
          <Route path="/campus/place" element={<PlaceListPage />} />

          <Route path="/reviews/:courseId" element={<ReviewPage />} />
          <Route path="/hylion" element={<HylionPage />} />

          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/community" element={<CommunityHomePage />} />
          <Route
            path="/community/notifications"
            element={<NotificationsPage />}
          />
          <Route path="/community/create" element={<CreatePostPage />} />
          <Route path="/community/create/poll" element={<PollCreationPage />} />
          <Route path="/community/board-list" element={<BoardListPage />} />
          <Route path="/community/search" element={<SearchPage />} />
          <Route path="/community/board/my" element={<MyBoardPage />} />
          <Route
            path="/community/board/international"
            element={<InternationalBoardPage />}
          />
          <Route path="/community/board/:type" element={<BoardDetailPage />} />
          <Route path="/community/settings" element={<SettingsPage />} />
          <Route path="/community/keywords" element={<KeywordSettingsPage />} />
          <Route
            path="/community/filtering-keywords"
            element={<FilteringKeywordSettingsPage />}
          />
          <Route path="/community/hashtags" element={<HashtagSettingsPage />} />
          <Route path="/community/post/:id" element={<PostDetailPage />} />
          <Route path="/community/post/:id/edit" element={<CreatePostPage />} />

          <Route path="*" element={<Navigate to="/campus/notices" replace />} />
        </Routes>
      </PageTransition>
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="max-w-md mx-auto min-h-screen bg-white border-x border-gray-100 shadow-2xl overflow-hidden relative">
        <nav>
          <Link to="/dashboard">dashboard</Link>
        </nav>
        <AnimatedRoutes />
      </div>
    </BrowserRouter>
  );
}
