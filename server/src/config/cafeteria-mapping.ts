// 크롤링 데이터에 식당 id가 없어서 우선 이 파일에서 
// 크롤링한 식당 데이터들 id 임의로 부여해뒀습니다.
// 추후에 db 연동하면 수정할게요!

// 식당명 → ID 매핑 테이블 (10-14 사용, 크롤링 ID와 구분)
export const CAFETERIA_ID_MAPPING: { [key: string]: number } = {
    "학생식당": 10,
    "생활과학관 식당": 11, 
    "신소재공학관 식당": 12,
    "체육부실 식당": 13,
    "제2학생생활관 식당": 14  // 크롤링에서 ID=2로 오지만 우리는 14 사용
};

// ID → 식당 정보 매핑
export interface CafeteriaInfo {
    id: number;
    name: string;
    location?: string | null; 
    operating_hours?: string | null;
}

export const CAFETERIA_INFO_MAPPING: { [key: number]: CafeteriaInfo } = {
    10: {
        id: 10,
        name: "학생식당",
        location: null,  // 크롤링 데이터에 없음
        operating_hours: null
    },
    11: {
        id: 11,
        name: "생활과학관 식당",
        location: null,
        operating_hours: null
    },
    12: {
        id: 12,
        name: "신소재공학관 식당",
        location: null,
        operating_hours: null
    },
    13: {
        id: 13,
        name: "체육부실 식당",
        location: null,
        operating_hours: null
    },
    14: {
        id: 14,
        name: "제2학생생활관 식당",
        location: null,
        operating_hours: null
    }
};

// 유틸리티 함수들
export function getCafeteriaIdByName(name: string): number | null {
    return CAFETERIA_ID_MAPPING[name] || null;
}

export function getCafeteriaInfoById(id: number): CafeteriaInfo | null {
    return CAFETERIA_INFO_MAPPING[id] || null;
}

// 이름 정규화 (현재는 단순하게)
export function normalizeCafeteriaName(name: string): string {
    return name.trim();
}

// 매핑 검증 함수
export function validateCafeteriaMapping(crawledNames: string[]): {
    mapped: string[];
    unmapped: string[];
} {
    const mapped: string[] = [];
    const unmapped: string[] = [];
    
    crawledNames.forEach(name => {
        const id = getCafeteriaIdByName(name);
        if (id) {
            mapped.push(name);
        } else {
            unmapped.push(name);
        }
    });
    
    return { mapped, unmapped };
}