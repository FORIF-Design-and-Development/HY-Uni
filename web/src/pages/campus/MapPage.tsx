import React, { useState } from "react";

// 👇 기존에 작성하신 두 파일을 같은 폴더 혹은 components 폴더에 넣고 불러옵니다.
// 경로(../components/...)는 실제 파일 위치에 맞게 수정해주세요.
import CampusMapView from "./CampusMapView"; 
import HotPlaceView from "./HotPlaceView"; 

export default function MapPage() {
  // 'map'은 캠퍼스 지도, 'hotplace'는 핫플레이스
  const [viewMode, setViewMode] = useState<"map" | "hotplace">("map");

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* 상단 토글 버튼 영역 
        (한양대 테마 컬러 #0E4A84 활용)
      */}
      <div className="pt-6 pb-2 px-4 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-[#0E4A84] mb-4">
          Campus & Places
        </h1>
        
        <div className="bg-white p-1 rounded-full shadow-sm border border-gray-200 inline-flex">
          {/* 캠퍼스 맵 버튼 */}
          <button
            onClick={() => setViewMode("map")}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
              viewMode === "map"
                ? "bg-[#0E4A84] text-white shadow-md"
                : "text-gray-500 hover:text-[#0E4A84] bg-transparent"
            }`}
          >
            🗺️ 캠퍼스 지도
          </button>

          {/* 핫플레이스 버튼 */}
          <button
            onClick={() => setViewMode("hotplace")}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
              viewMode === "hotplace"
                ? "bg-[#0E4A84] text-white shadow-md"
                : "text-gray-500 hover:text-[#0E4A84] bg-transparent"
            }`}
          >
            🍔 핫플레이스
          </button>
        </div>
      </div>

      {/* 화면 렌더링 영역 
        조건부 렌더링을 사용하여 선택된 컴포넌트만 보여줍니다.
      */}
      <div className="w-full transition-opacity duration-300 ease-in-out">
        {viewMode === "map" ? (
          <CampusMapView />
        ) : (
          <HotPlaceView />
        )}
      </div>
    </div>
  );
}