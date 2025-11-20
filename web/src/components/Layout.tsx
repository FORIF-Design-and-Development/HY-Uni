import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen font-sans text-gray-900">
      <Header />
      {/* flex-grow: 헤더/푸터 제외한 나머지 공간을 꽉 채움 */}
      <main className="flex-grow bg-gray-50">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
