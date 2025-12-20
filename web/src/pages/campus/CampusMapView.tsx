import React, { useState, useEffect } from "react";
import { getCampusBuildings, CampusBuilding } from "../../api/campusApi";
import "./CampusMapPage.css";

// ⭐️ 서버(public 폴더)에 저장된 지도 이미지 경로
// public/images/campus_map.jpg 경로에 이미지가 있어야 합니다.
const MAP_IMAGE_URL = "/한양대 맵.jpg";

export default function CampusMapPage() {
  const [buildings, setBuildings] = useState<CampusBuilding[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] =
    useState<CampusBuilding | null>(null);

  // 마우스가 올라간 건물 ID 저장 (강조용)
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // 1. 건물 데이터 로딩
  useEffect(() => {
    const fetchData = async () => {
      try {
        // API를 통해 건물 데이터(x, y 좌표 포함)를 가져옵니다.
        const data = await getCampusBuildings();
        setBuildings(data);
      } catch (error) {
        console.error("건물 데이터를 불러오지 못했습니다.", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. 검색 필터링
  const filteredBuildings = buildings.filter(
    (b) =>
      searchTerm === "" ||
      b.name.includes(searchTerm) ||
      b.buildingCode.includes(searchTerm)
  );

  // 검색 결과가 1개일 때 해당 핀을 자동으로 강조하기 위함
  const activeId =
    filteredBuildings.length === 1 ? filteredBuildings[0].id : null;

  // 로딩 화면 (CafeteriaPage 스타일 유지)
  if (loading) {
    return (
      <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            fontSize: 16,
            color: "#898C8E",
          }}
        >
          지도를 펼치는 중...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      {/* 3. 헤더 영역 (검색창 포함) */}
      <div
        style={{
          backgroundColor: "#0E4A84", // 한양 블루
          color: "#ffffff",
          padding: "5px 24px",
          borderRadius: 12,
          marginBottom: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>
              HYU Campus Map
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>캠퍼스 MAP</div>
          </div>
        </div>

        {/* 검색 인풋 */}
        <input
          type="text"
          className="map-search-input"
          placeholder="건물 이름 또는 번호 검색 (예: 본관, 102)"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSelectedBuilding(null); // 검색 시 선택 초기화
          }}
        />
      </div>

      {/* 4. 지도 영역 (반응형 컨테이너) */}
      <div className="map-container-wrapper">
        <div className="map-content">
          {/* 지도 이미지 */}
          <img
            src={MAP_IMAGE_URL}
            alt="한양대 캠퍼스 지도"
            className="campus-map-image"
          />

          {/* 📍 건물 핀 (Markers) */}
          {buildings.map((building) => {
            // 검색어에 의해 필터링된 건물인지 확인 (나머지 흐리게 처리)
            const isMatch = filteredBuildings.some(
              (fb) => fb.id === building.id
            );
            // 현재 강조되어야 하는지 (호버, 선택, 검색결과 1개)
            const isHighlighted =
              hoveredId === building.id ||
              selectedBuilding?.id === building.id ||
              activeId === building.id;

            // ⭐️ 핵심: x, y 좌표가 %이므로 이미지 크기에 맞춰 자동 조절됨
            return (
              <div
                key={building.id}
                className={`map-pin ${isHighlighted ? "highlight" : ""} ${
                  !isMatch && searchTerm ? "dimmed" : ""
                }`}
                style={{
                  left: `${building.x}%`,
                  top: `${building.y}%`,
                }}
                onMouseEnter={() => setHoveredId(building.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelectedBuilding(building)}
              >
                {/* 핀 아이콘 */}
                <div className="pin-icon">📍</div>

                {/* 건물 이름 라벨 */}
                <div className="pin-label">
                  <span className="building-name">{building.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. 하단 정보 (선택된 건물 상세) */}
      {selectedBuilding && (
        <div className="building-info-card">
          <div className="info-header">
            <h3 style={{ margin: 0, color: "#0E4A84" }}>
              {selectedBuilding.name}{" "}
              <span style={{ fontSize: "0.8em", color: "#666" }}>
                ({selectedBuilding.buildingCode})
              </span>
            </h3>
            <button
              onClick={() => setSelectedBuilding(null)}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.2rem",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
          {selectedBuilding.imageUrl && (
            <img
              src={selectedBuilding.imageUrl}
              alt={selectedBuilding.name}
              className="building-detail-img"
            />
          )}
          <p style={{ marginTop: 10, color: "#444", lineHeight: "1.5" }}>
            {selectedBuilding.description || "건물 설명 정보가 없습니다."}
          </p>
        </div>
      )}
    </div>
  );
}
