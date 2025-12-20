import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { getPlaces, Place, PlaceCategory } from "../../api/campusApi";
import "./PlaceListPage.css";

// TypeScript에서 window.kakao 인식을 위해 선언
declare global {
  interface Window {
    kakao: any;
  }
}

// 카테고리별 정보
const CATEGORY_MAP: Record<PlaceCategory, { label: string; icon: string }> = {
  RESTAURANT: { label: "식당", icon: "🍽️" },
  CAFE: { label: "카페", icon: "☕" },
  BAR: { label: "주점", icon: "🍺" },
  STUDY_ROOM: { label: "스터디", icon: "📚" },
  ETC: { label: "기타", icon: "🏢" },
};

const PLACEHOLDER_IMGS: Record<PlaceCategory, string> = {
  RESTAURANT:
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=500&q=60",
  CAFE: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=500&q=60",
  BAR: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=500&q=60",
  STUDY_ROOM:
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=500&q=60",
  ETC: "https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=500&q=60",
};

export default function PlaceListPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PlaceCategory | "ALL">("ALL");

  // 지도 관련 refs & state
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]); // 현재 지도에 표시된 마커 객체들

  // 1. 장소 데이터 로딩
  useEffect(() => {
    getPlaces()
      .then(setPlaces)
      .catch((err) => console.error("Failed to load places:", err))
      .finally(() => setLoading(false));
  }, []);

  // 2. 카카오맵 초기화 (최초 1회)
  useEffect(() => {
    if (!loading && window.kakao && mapRef.current) {
      const container = mapRef.current;
      const options = {
        center: new window.kakao.maps.LatLng(37.5572, 127.0453), // 한양대 서울캠퍼스 중심
        level: 3, // 확대 레벨
      };
      const newMap = new window.kakao.maps.Map(container, options);
      setMap(newMap);
    }
  }, [loading]);

  // 필터링된 장소 목록
  const filteredPlaces =
    filter === "ALL" ? places : places.filter((p) => p.category === filter);

  // 3. 마커 렌더링 (지도나 데이터가 변경될 때)
  useEffect(() => {
    if (!map || !window.kakao) return;

    // 기존 마커 모두 제거
    markers.forEach((marker) => marker.setMap(null));

    // 새 마커 생성
    const newMarkers = filteredPlaces.map((place) => {
      const position = new window.kakao.maps.LatLng(
        place.latitude,
        place.longitude
      );

      const marker = new window.kakao.maps.Marker({
        position: position,
        title: place.name, // 마우스 오버 시 이름 표시
        clickable: true,
      });

      // 인포윈도우 (마우스 오버 시 표시)
      const iwContent = `<div style="padding:5px;font-size:12px;color:#333;white-space:nowrap;">${place.name}</div>`;
      const infowindow = new window.kakao.maps.InfoWindow({
        content: iwContent,
      });

      window.kakao.maps.event.addListener(marker, "mouseover", function () {
        infowindow.open(map, marker);
      });
      window.kakao.maps.event.addListener(marker, "mouseout", function () {
        infowindow.close();
      });

      marker.setMap(map);
      return marker;
    });

    setMarkers(newMarkers);

    // 마커가 있다면 지도 범위 재설정
    if (newMarkers.length > 0) {
      const bounds = new window.kakao.maps.LatLngBounds();
      filteredPlaces.forEach((p) => {
        bounds.extend(new window.kakao.maps.LatLng(p.latitude, p.longitude));
      });
      map.setBounds(bounds);
    }
  }, [map, filteredPlaces]); // 필터가 바뀌면 마커도 다시 그림

  if (loading) {
    return (
      <div className="place-list-container loading">
        <div className="loading-spinner">핫플레이스 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="place-list-container">
      {/* 헤더 */}
      <div className="place-header-card">
        <div className="header-content">
          <div className="sub-title">HYU Hot Place</div>
          <h2 className="title">🍔 학교 주변 핫플레이스</h2>
        </div>
      </div>

      {/* ⭐️ 카카오 맵 영역 */}
      <div className="kakao-map-container">
        <div ref={mapRef} className="kakao-map" />
        {!window.kakao && (
          <div className="map-error">
            카카오맵 스크립트를 로드할 수 없습니다. index.html을 확인해주세요.
          </div>
        )}
      </div>

      {/* 카테고리 필터 */}
      <div className="category-filter">
        <button
          className={`filter-btn ${filter === "ALL" ? "active" : ""}`}
          onClick={() => setFilter("ALL")}
        >
          전체
        </button>
        {(Object.keys(CATEGORY_MAP) as PlaceCategory[]).map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${filter === cat ? "active" : ""}`}
            onClick={() => setFilter(cat)}
          >
            {CATEGORY_MAP[cat].icon} {CATEGORY_MAP[cat].label}
          </button>
        ))}
      </div>

      {/* 장소 리스트 */}
      <div className="place-grid">
        {filteredPlaces.length === 0 ? (
          <div className="no-data">
            {filter === "ALL"
              ? "등록된 장소가 없습니다."
              : "해당 카테고리의 장소가 없습니다."}
          </div>
        ) : (
          filteredPlaces.map((place) => {
            const catInfo = CATEGORY_MAP[place.category] || CATEGORY_MAP.ETC;

            // 1. 이미지 우선순위 로직
            // DB에 저장된 구체적인 이미지가 있으면 그걸 쓰고, 없으면 카테고리 기본 이미지 사용
            const displayImage = place.image_url
              ? place.image_url
              : PLACEHOLDER_IMGS[place.category] || PLACEHOLDER_IMGS.ETC;
            console.log(displayImage);
            return (
              /* 2. Link 대신 a 태그 사용 (새 탭에서 카카오맵 열기) */
              <a
                href={
                  place.kakaoPlaceUrl || "#"
                } /* 카카오 URL이 없으면 # 처리 */
                target="_blank" /* 새 탭에서 열기 */
                rel="noopener noreferrer" /* 보안 및 성능 최적화 */
                key={place.placeId}
                className="place-card"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "block" /* 레이아웃 안정성 추가 */,
                }} /* a태그 밑줄 제거 */
              >
                {/* [수정됨] div(backgroundImage) -> img 태그로 변경 
      - referrerPolicy="no-referrer"를 적용하여 외부 이미지 차단 회피
      - objectFit: "cover"를 사용하여 기존 background-size: cover 효과 유지
    */}
                <img
                  src={displayImage}
                  alt={place.name}
                  referrerPolicy="no-referrer"
                  className="place-img"
                  style={{
                    width: "100%", // 가로 꽉 채우기
                    height: "180px", // 💡 팁: 기존 CSS의 높이와 맞춰주세요 (예: 180px, 200px 등)
                    objectFit: "cover", // 이미지가 찌그러지지 않고 영역에 꽉 차게 함
                    display: "block", // 이미지 하단 공백 제거
                    borderTopLeftRadius: "calc(0.25rem - 1px)", // (선택) 부트스트랩/기본 카드 스타일 모서리
                    borderTopRightRadius: "calc(0.25rem - 1px)", // (선택)
                  }}
                />

                <div className="place-info">
                  <div className="place-meta">
                    <span className="place-category">{catInfo.label}</span>
                    <span className="place-rating">
                      ⭐{" "}
                      {place.averageRating
                        ? place.averageRating.toFixed(1)
                        : "0.0"}
                    </span>
                  </div>
                  <h3 className="place-name">{place.name}</h3>
                  <p className="place-addr">
                    📍 {place.roadAddress || place.address}
                  </p>
                  <p className="place-review-count">
                    리뷰 {place.reviewCount || 0}개
                  </p>
                </div>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}
