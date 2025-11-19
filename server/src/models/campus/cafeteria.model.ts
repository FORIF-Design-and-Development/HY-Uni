// 식당 정보
export interface Cafeteria {
    cafeteria_id: number;
    name: string;
    location: string;
    operating_hours: string;
}

// 메뉴 정보
export interface Menu {
    menu_id: number;
    cafeteria_id: number;
    served_date: string; // YYYY-MM-DD format
    meal_time: 'breakfast' | 'lunch' | 'dinner';
    description: string;
    price: number;
    image_url: string | null;
}

// 식당 목록
export interface CafeteriaListResponse {
    cafeterias: Cafeteria[];
}

// 오늘의 메뉴(식당 별)
export interface CafeteriaWithMenus {
    cafeteria_id: number;
    cafeteria_name: string;
    breakfast: MenuResponse[];
    lunch: MenuResponse[];
    dinner: MenuResponse[];
}

// 메뉴
export interface MenuResponse {
    menu_id: number;
    description: string;
    price: number;
    image_url: string | null;
}

// 오늘의 전체 메뉴
export interface TodayMenusResponse {
    date: string;
    cafeterias: CafeteriaWithMenus[];
}