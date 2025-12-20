import { CafeteriaWithMenus, MealTime } from "../../api/campus/cafeteria.api";
import { MenuCard } from "./MenuCard";

interface CafeteriaCardProps {
  cafeteria: CafeteriaWithMenus;
  selectedMealTime: MealTime | "all";
}

export function CafeteriaCard({
  cafeteria,
  selectedMealTime,
}: CafeteriaCardProps) {
  const renderMeals = () => {
    if (selectedMealTime === "all") {
      return (
        <>
          {cafeteria.breakfast.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#0E4A84",
                  marginBottom: 12,
                }}
              >
                🌅 조식
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
                  gap: 12,
                }}
              >
                {cafeteria.breakfast.map((menu) => (
                  <MenuCard key={menu.menu_id} menu={menu} />
                ))}
              </div>
            </div>
          )}
          {cafeteria.lunch.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#0E4A84",
                  marginBottom: 12,
                }}
              >
                ☀️ 중식
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
                  gap: 12,
                }}
              >
                {cafeteria.lunch.map((menu) => (
                  <MenuCard key={menu.menu_id} menu={menu} />
                ))}
              </div>
            </div>
          )}
          {cafeteria.dinner.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#0E4A84",
                  marginBottom: 12,
                }}
              >
                🌙 석식
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
                  gap: 12,
                }}
              >
                {cafeteria.dinner.map((menu) => (
                  <MenuCard key={menu.menu_id} menu={menu} />
                ))}
              </div>
            </div>
          )}
        </>
      );
    }

    const menus = cafeteria[selectedMealTime];
    if (menus.length === 0) {
      return (
        <p
          style={{
            textAlign: "center",
            color: "#898C8E",
            padding: 20,
          }}
        >
          메뉴 정보가 없습니다.
        </p>
      );
    }

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: 12,
        }}
      >
        {menus.map((menu) => (
          <MenuCard key={menu.menu_id} menu={menu} />
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        overflow: "hidden",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          backgroundColor: "#F7F9FA",
          padding: "16px 20px",
          borderBottom: "1px solid #ECEFF1",
        }}
      >
        <h3
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#0E4A84",
            margin: 0,
          }}
        >
          {cafeteria.cafeteria_name}
        </h3>
      </div>
      <div style={{ padding: 20 }}>{renderMeals()}</div>
    </div>
  );
}
