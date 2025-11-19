import { Request, Response } from 'express';
import { pool } from '../../config/db';
import type { Cafeteria, MenuItem } from '../../services/campus/cafeteria/cafeteria-crawler';
import { cafeteriaCrawlerService } from '../../services/campus/cafeteria/crawler.service';

export class CafeteriaController {
    
    // 한국어 → 영어 변환 함수
    private convertMealTime(koreanTimeSlot: string): 'breakfast' | 'lunch' | 'dinner' {
        switch(koreanTimeSlot) {
            case '조식': return 'breakfast';
            case '중식': return 'lunch';  
            case '석식': return 'dinner';
            default: return 'lunch';  // 기본값
        }
    }

    // 오늘 날짜를 안전하게 가져오는 함수
    private getTodayDateString(): string {
        return new Date().toISOString().substring(0, 10);  // YYYY-MM-DD 형태
    }
    
    // 날짜 확인 및 메뉴 데이터 관리
    private async ensureTodayMenus(): Promise<void> {
        const today = this.getTodayDateString();
        
        // 1. DB에서 최신 날짜 확인
        const [rows] = await pool.execute(
            'SELECT DISTINCT served_date FROM menu ORDER BY served_date DESC LIMIT 1'
        ) as any[];
        
        // 타입 안전하게 처리
        const latestDate = Array.isArray(rows) && rows.length > 0 ? rows[0].served_date : null;
        
        // Date 객체를 문자열로 변환
        let latestDateString: string | null = null;
        if (latestDate) {
            if (latestDate instanceof Date) {
                latestDateString = latestDate.toISOString().substring(0, 10);
            } else if (typeof latestDate === 'string') {
                latestDateString = latestDate;
            }
        }
        
        // 2. 날짜가 다르거나 데이터가 없으면 새로 크롤링
        if (!latestDateString || latestDateString !== today) {
            console.log(`📅 날짜 변경 감지: ${latestDateString} → ${today}`);
            console.log('🔄 새로운 메뉴 데이터 크롤링 중...');
            
            // 기존 메뉴 데이터 삭제
            await pool.execute('DELETE FROM menu');
            console.log('🗑️ 기존 메뉴 데이터 삭제 완료');
            
            // 새 메뉴 데이터 크롤링
            const menuData = await cafeteriaCrawlerService.getMenuData(true);
            
            // DB에 저장
            await this.saveMenusToDB(menuData.cafeterias, today);
            console.log(`✅ ${today} 메뉴 데이터 저장 완료`);
        } else {
            console.log(`📋 오늘(${today}) 메뉴 데이터 이미 존재 - DB에서 조회`);
        }
    }
    
    // 메뉴 데이터를 DB에 저장
    private async saveMenusToDB(cafeterias: Cafeteria[], date: string): Promise<void> {
        for (const cafeteria of cafeterias) {
            // DB에서 cafeteria_id 찾기 (name으로)
            const [cafeteriaRows] = await pool.execute(
                'SELECT cafeteria_id FROM cafeteria WHERE name = ?',
                [cafeteria.name]
            ) as any[];
            
            if (!Array.isArray(cafeteriaRows) || cafeteriaRows.length === 0) {
                console.log(`⚠️ 식당을 찾을 수 없음: ${cafeteria.name}`);
                continue;
            }
            
            const cafeteriaId = cafeteriaRows[0].cafeteria_id;
            
            // 각 시간대별 메뉴 저장
            await this.saveMenusByTime(cafeteriaId, date, 'breakfast', cafeteria.meals.breakfast);
            await this.saveMenusByTime(cafeteriaId, date, 'lunch', cafeteria.meals.lunch);
            await this.saveMenusByTime(cafeteriaId, date, 'dinner', cafeteria.meals.dinner);
        }
    }
    
    // 시간대별 메뉴 저장
    private async saveMenusByTime(cafeteriaId: number, date: string, mealTime: string, menus: MenuItem[]): Promise<void> {
        for (const menu of menus) {
            // 메뉴의 timeSlot이 한국어로 되어있으면 영어로 변환
            const convertedMealTime = this.convertMealTime(menu.timeSlot);
            
            // mealTime 파라미터와 일치하는 것만 저장
            if (convertedMealTime === mealTime) {
                try {
                    await pool.execute(
                        'INSERT INTO menu (cafeteria_id, served_date, meal_time, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)',
                        [cafeteriaId, date, mealTime, menu.name, menu.price || 0, menu.imageUrl || null]
                    );
                } catch (error) {
                    console.log(`⚠️ 메뉴 저장 오류: ${menu.name} - ${error}`);
                }
            }
        }
    }

    // 2-10-1. 식당 목록 조회(List) - DB에서 직접 조회
    async getCafeteriaList(req: Request, res: Response) {
        try {
            const [cafeterias] = await pool.execute('SELECT * FROM cafeteria ORDER BY cafeteria_id') as any[];
            
            res.json({
                data: { cafeterias },
                error: null,
                meta: null
            });
        } catch (error) {
            console.error('[API] 식당 목록 조회 오류:', error);
            res.status(500).json({
                data: null,
                error: { code: "INTERNAL_ERROR", message: "Failed to retrieve cafeteria list" },
                meta: null
            });
        }
    }

    // 2-10-2. 식당 상세 조회(read) - DB에서 직접 조회
    async getCafeteriaDetail(req: Request, res: Response) {
        try {
            const { cafeteria_id } = req.params;
            
            if (!cafeteria_id) {
                return res.status(400).json({
                    data: null,
                    error: { code: "BAD_REQUEST", message: "Cafeteria ID is required" },
                    meta: null
                });
            }

            const [rows] = await pool.execute(
                'SELECT * FROM cafeteria WHERE cafeteria_id = ?',
                [cafeteria_id]
            ) as any[];
            
            if (!Array.isArray(rows) || rows.length === 0) {
                return res.status(404).json({
                    data: null,
                    error: { code: "NOT_FOUND", message: "Cafeteria not found" },
                    meta: null
                });
            }

            const cafeteria = rows[0];
            
            // 오늘 메뉴가 있는지 확인
            const [menuRows] = await pool.execute(
                'SELECT COUNT(*) as count FROM menu WHERE cafeteria_id = ? AND served_date = ?',
                [cafeteria_id, this.getTodayDateString()]
            ) as any[];
            
            const hasMenuData = Array.isArray(menuRows) && menuRows.length > 0 ? menuRows[0].count > 0 : false;

            res.json({
                data: {
                    cafeteria_id: cafeteria.cafeteria_id,
                    cafeteria_name: cafeteria.name,
                    location: cafeteria.location,
                    operating_hours: cafeteria.operating_hours,
                    average_rating: null,
                    review_count: null,
                    has_menu_data: hasMenuData
                },
                error: null,
                meta: null
            });
        } catch (error) {
            console.error('[API] 식당 상세 조회 오류:', error);
            res.status(500).json({
                data: null,
                error: { code: "INTERNAL_ERROR", message: "Failed to retrieve cafeteria details" },
                meta: null
            });
        }
    }

    // 2-10-3. 오늘의 학식 조회 - DB에서 조회 (날짜 기반 로직)
    async getTodayMenus(req: Request, res: Response) {
        try {
            const { meal_time } = req.query;
            const today = this.getTodayDateString();
            
            // 1. 오늘 메뉴 데이터 확인/업데이트
            await this.ensureTodayMenus();
            
            // 2. 식당별 메뉴 데이터 조회
            let query = `
                SELECT 
                    c.cafeteria_id,
                    c.name as cafeteria_name,
                    m.menu_id,
                    m.meal_time,
                    m.description,
                    m.price,
                    m.image_url
                FROM cafeteria c
                LEFT JOIN menu m ON c.cafeteria_id = m.cafeteria_id AND m.served_date = ?
                WHERE m.menu_id IS NOT NULL
            `;
            
            const params = [today];
            
            if (meal_time) {
                query += ' AND m.meal_time = ?';
                params.push(meal_time as string);
            }
            
            query += ' ORDER BY c.cafeteria_id, m.meal_time, m.menu_id';
            
            const [menuRows] = await pool.execute(query, params) as any[];
            
            // 3. 데이터 구조화
            const cafeteriaMap = new Map();
            
            if (Array.isArray(menuRows)) {
                menuRows.forEach((row: any) => {
                    if (!cafeteriaMap.has(row.cafeteria_id)) {
                        cafeteriaMap.set(row.cafeteria_id, {
                            cafeteria_id: row.cafeteria_id,
                            cafeteria_name: row.cafeteria_name,
                            breakfast: [],
                            lunch: [],
                            dinner: []
                        });
                    }
                    
                    const cafe = cafeteriaMap.get(row.cafeteria_id);
                    const menuItem = {
                        menu_id: row.menu_id,
                        description: row.description,
                        price: row.price,
                        image_url: row.image_url
                    };
                    
                    if (row.meal_time === 'breakfast') cafe.breakfast.push(menuItem);
                    else if (row.meal_time === 'lunch') cafe.lunch.push(menuItem);
                    else if (row.meal_time === 'dinner') cafe.dinner.push(menuItem);
                });
            }
            
            res.json({
                data: {
                    date: today,
                    cafeterias: Array.from(cafeteriaMap.values())
                },
                error: null,
                meta: null
            });
            
        } catch (error) {
            console.error('[API] 오늘의 메뉴 조회 오류:', error);
            res.status(500).json({
                data: null,
                error: { code: "INTERNAL_ERROR", message: "Failed to retrieve today's menus" },
                meta: null
            });
        }
    }

    // 2-10-4. 특정 식당 메뉴 조회 - DB에서 조회
    async getCafeteriaMenus(req: Request, res: Response) {
        try {
            const { cafeteria_id } = req.params;
            const { served_date, meal_time } = req.query;
            const today = this.getTodayDateString();
            const targetDate = (served_date as string) || today;
            
            if (!cafeteria_id) {
                return res.status(400).json({
                    data: null,
                    error: { code: "BAD_REQUEST", message: "Cafeteria ID is required" },
                    meta: null
                });
            }

            // 오늘 날짜면 최신 데이터 확인
            if (targetDate === today) {
                await this.ensureTodayMenus();
            }
            
            // 식당 정보 조회
            const [cafeteriaRows] = await pool.execute(
                'SELECT * FROM cafeteria WHERE cafeteria_id = ?',
                [cafeteria_id]
            ) as any[];
            
            if (!Array.isArray(cafeteriaRows) || cafeteriaRows.length === 0) {
                return res.status(404).json({
                    data: null,
                    error: { code: "NOT_FOUND", message: "Cafeteria not found" },
                    meta: null
                });
            }

            const cafeteria = cafeteriaRows[0];
            
            // 메뉴 데이터 조회
            let query = 'SELECT * FROM menu WHERE cafeteria_id = ? AND served_date = ?';
            const params = [cafeteria_id, targetDate];
            
            if (meal_time) {
                query += ' AND meal_time = ?';
                params.push(meal_time as string);
            }
            
            query += ' ORDER BY meal_time, menu_id';
            
            const [menuRows] = await pool.execute(query, params) as any[];
            
            // 데이터 구조화
            const result: any = {
                served_date: targetDate,
                cafeteria_info: {
                    cafeteria_id: cafeteria.cafeteria_id,
                    cafeteria_name: cafeteria.name,
                    location: cafeteria.location,
                    operating_hours: cafeteria.operating_hours
                }
            };
            
            const menus = Array.isArray(menuRows) ? menuRows : [];
            
            if (!meal_time || meal_time === 'breakfast') {
                result.breakfast = menus.filter(m => m.meal_time === 'breakfast')
                    .map(m => ({ 
                        menu_id: m.menu_id, 
                        description: m.description, 
                        price: m.price, 
                        image_url: m.image_url 
                    }));
            }
            
            if (!meal_time || meal_time === 'lunch') {
                result.lunch = menus.filter(m => m.meal_time === 'lunch')
                    .map(m => ({ 
                        menu_id: m.menu_id, 
                        description: m.description, 
                        price: m.price, 
                        image_url: m.image_url 
                    }));
            }
            
            if (!meal_time || meal_time === 'dinner') {
                result.dinner = menus.filter(m => m.meal_time === 'dinner')
                    .map(m => ({ 
                        menu_id: m.menu_id, 
                        description: m.description, 
                        price: m.price, 
                        image_url: m.image_url 
                    }));
            }
            
            res.json({
                data: result,
                error: null,
                meta: null
            });
            
        } catch (error) {
            console.error('[API] 식당 메뉴 조회 오류:', error);
            res.status(500).json({
                data: null,
                error: { code: "INTERNAL_ERROR", message: "Failed to retrieve cafeteria menus" },
                meta: null
            });
        }
    }
}

export const cafeteriaController = new CafeteriaController();