// server/src/controllers/campus/cafeteria.controller
import { Request, Response } from 'express';
import type { Cafeteria } from '../../services/campus/cafeteria/cafeteria-crawler';
import { cafeteriaCrawlerService } from '../../services/campus/cafeteria/crawler.service';

// 매핑 테이블 import 추가. 추후 수정
import {
    getCafeteriaIdByName,
    getCafeteriaInfoById,
    normalizeCafeteriaName
} from '../../config/cafeteria-mapping.js';

export class CafeteriaController {
    
    // 2-10-1. 식당 목록 조회(List) - 매핑 테이블 적용
    // GET: /api/cafeterias
    async getCafeteriaList(req: Request, res: Response) {
        try {
            const menuData = await cafeteriaCrawlerService.getMenuData();
            
            // 크롤링 데이터를 매핑 테이블로 변환
            const cafeterias = menuData.cafeterias.map((cafeteria: Cafeteria) => {
                const normalizedName = normalizeCafeteriaName(cafeteria.name);
                const cafeteriaId = getCafeteriaIdByName(normalizedName);
                const cafeteriaInfo = cafeteriaId ? getCafeteriaInfoById(cafeteriaId) : null;
                
                return {
                    cafeteria_id: cafeteriaId || 0,
                    cafeteria_name: cafeteriaInfo?.name || cafeteria.name,
                    location: cafeteriaInfo?.location || null,
                    operating_hours: cafeteriaInfo?.operating_hours || null
                };
            }).filter(c => c.cafeteria_id > 0);  // 매핑된 식당만 반환

            // 명세서 응답 형태
            res.json({
                data: {
                    cafeterias: cafeterias
                },
                error: null,
                meta: null
            });

        } catch (error) {
            console.error('[API] 식당 목록 조회 오류:', error);
            res.status(500).json({
                data: null,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to retrieve cafeteria list"
                },
                meta: null
            });
        }
    }

    // 2-10-2. 식당 상세 조회(read)
    // GET: /api/cafeterias/{cafeteria_id}
    async getCafeteriaDetail(req: Request, res: Response) {
        try {
            const { cafeteria_id } = req.params;
            
            if (!cafeteria_id) {
                return res.status(400).json({
                    data: null,
                    error: {
                        code: "BAD_REQUEST",
                        message: "Cafeteria ID is required"
                    },
                    meta: null
                });
            }

            const targetId = parseInt(cafeteria_id);
            const cafeteriaInfo = getCafeteriaInfoById(targetId);
            
            if (!cafeteriaInfo) {
                return res.status(404).json({
                    data: null,
                    error: {
                        code: "NOT_FOUND",
                        message: "Cafeteria not found"
                    },
                    meta: null
                });
            }

            // 크롤링 데이터에서 해당 식당의 메뉴 데이터 확인
            const menuData = await cafeteriaCrawlerService.getMenuData();
            const crawledCafeteria = menuData.cafeterias.find((c: Cafeteria) => {
                const normalizedName = normalizeCafeteriaName(c.name);
                const mappedId = getCafeteriaIdByName(normalizedName);
                return mappedId === targetId;
            });

            res.json({
                data: {
                    cafeteria_id: cafeteriaInfo.id,
                    cafeteria_name: cafeteriaInfo.name,
                    location: cafeteriaInfo.location,
                    operating_hours: cafeteriaInfo.operating_hours,
                    average_rating: null,     // 리뷰 시스템 미구현
                    review_count: null,       // 리뷰 시스템 미구현
                    has_menu_data: !!crawledCafeteria  // 메뉴 데이터 존재 여부
                },
                error: null,
                meta: null
            });

        } catch (error) {
            console.error('[API] 식당 상세 조회 오류:', error);
            res.status(500).json({
                data: null,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to retrieve cafeteria details"
                },
                meta: null
            });
        }
    }

    // 2-10-3. 오늘의 학식 조회
    // GET: /api/menus/today
    async getTodayMenus(req: Request, res: Response) {
        try {
            const { meal_time } = req.query;  // optional parameter
            const menuData = await cafeteriaCrawlerService.getMenuData();

            // 각 식당의 메뉴를 매핑 테이블로 변환
            const cafeterias = menuData.cafeterias.map((cafeteria: Cafeteria) => {
                const normalizedName = normalizeCafeteriaName(cafeteria.name);
                const cafeteriaId = getCafeteriaIdByName(normalizedName);
                const cafeteriaInfo = cafeteriaId ? getCafeteriaInfoById(cafeteriaId) : null;

                if (!cafeteriaId || !cafeteriaInfo) {
                    return null;  // 매핑되지 않은 식당 제외
                }

                const result: any = {
                    cafeteria_id: cafeteriaId,
                    cafeteria_name: cafeteriaInfo.name
                };

                // meal_time 파라미터에 따라 필터링
                if (!meal_time || meal_time === 'breakfast') {
                    result.breakfast = cafeteria.meals.breakfast.map((menu: any, index: number) => ({
                        menu_id: cafeteriaId * 1000 + index + 1,  // 식당별 고유 ID
                        description: menu.name || menu,
                        price: menu.price || null,
                        image_url: null
                    }));
                }

                if (!meal_time || meal_time === 'lunch') {
                    result.lunch = cafeteria.meals.lunch.map((menu: any, index: number) => ({
                        menu_id: cafeteriaId * 1000 + index + 100,
                        description: menu.name || menu,
                        price: menu.price || null,
                        image_url: null
                    }));
                }

                if (!meal_time || meal_time === 'dinner') {
                    result.dinner = cafeteria.meals.dinner.map((menu: any, index: number) => ({
                        menu_id: cafeteriaId * 1000 + index + 200,
                        description: menu.name || menu,
                        price: menu.price || null,
                        image_url: null
                    }));
                }

                return result;
            }).filter(c => c !== null);  // null 제거

            res.json({
                data: {
                    date: menuData.menuDate || new Date().toISOString().split('T')[0],
                    cafeterias: cafeterias
                },
                error: null,
                meta: null
            });

        } catch (error) {
            console.error('[API] 오늘의 메뉴 조회 오류:', error);
            res.status(500).json({
                data: null,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to retrieve today's menus"
                },
                meta: null
            });
        }
    }

    // 2-10-4. 특정 식당 메뉴 조회 (List) - 매핑 테이블 적용
    // GET: /api/cafeterias/{cafeteria_id}/menus
    async getCafeteriaMenus(req: Request, res: Response) {
        try {
            const { cafeteria_id } = req.params;
            const { served_date, meal_time } = req.query;  // optional parameters
            
            if (!cafeteria_id) {
                return res.status(400).json({
                    data: null,
                    error: {
                        code: "BAD_REQUEST",
                        message: "Cafeteria ID is required"
                    },
                    meta: null
                });
            }

            const targetId = parseInt(cafeteria_id);
            const cafeteriaInfo = getCafeteriaInfoById(targetId);
            
            if (!cafeteriaInfo) {
                return res.status(404).json({
                    data: null,
                    error: {
                        code: "NOT_FOUND",
                        message: "Cafeteria not found"
                    },
                    meta: null
                });
            }

            const menuData = await cafeteriaCrawlerService.getMenuData();
            const cafeteria = menuData.cafeterias.find((c: Cafeteria) => {
                const normalizedName = normalizeCafeteriaName(c.name);
                const mappedId = getCafeteriaIdByName(normalizedName);
                return mappedId === targetId;
            });

            if (!cafeteria) {
                return res.status(404).json({
                    data: null,
                    error: {
                        code: "NOT_FOUND",
                        message: "Menu data not available for this cafeteria"
                    },
                    meta: null
                });
            }

            // 메뉴 데이터 변환
            const result: any = {
                served_date: served_date || menuData.menuDate || new Date().toISOString().split('T')[0]
            };

            // meal_time 파라미터에 따라 필터링
            if (!meal_time || meal_time === 'breakfast') {
                result.breakfast = cafeteria.meals.breakfast.map((menu: any, index: number) => ({
                    menu_id: targetId * 1000 + index + 1,
                    description: menu.name || menu,
                    price: menu.price || null,
                    image_url: null
                }));
            }

            if (!meal_time || meal_time === 'lunch') {
                result.lunch = cafeteria.meals.lunch.map((menu: any, index: number) => ({
                    menu_id: targetId * 1000 + index + 100,
                    description: menu.name || menu,
                    price: menu.price || null,
                    image_url: null
                }));
            }

            if (!meal_time || meal_time === 'dinner') {
                result.dinner = cafeteria.meals.dinner.map((menu: any, index: number) => ({
                    menu_id: targetId * 1000 + index + 200,
                    description: menu.name || menu,
                    price: menu.price || null,
                    image_url: null
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
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to retrieve cafeteria menus"
                },
                meta: null
            });
        }
    }


    // 전체 메뉴 조회
    // 크롤링 원본 데이터 확인
    // 디버깅: 매핑 전 실제 크롤링 결과 점검
    // 백업 API: 매핑 시스템 오류 시 대안
    async getAllMenus(req: Request, res: Response) {
        try {
            const forceRefresh = req.query.refresh === 'true';
            const menuData = await cafeteriaCrawlerService.getMenuData(forceRefresh);
            
            res.json({
                data: menuData,
                error: null,
                meta: null
            });

        } catch (error) {
            console.error('[API] 전체 메뉴 조회 오류:', error);
            res.status(500).json({
                data: null,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to retrieve all menus"
                },
                meta: null
            });
        }
    }

    // 캐시 상태 조회
    async getCacheStatus(req: Request, res: Response) {
        try {
            const cacheInfo = cafeteriaCrawlerService.getCacheInfo();
            
            res.json({
                data: cacheInfo,
                error: null,
                meta: null
            });

        } catch (error) {
            console.error('[API] 캐시 상태 조회 오류:', error);
            res.status(500).json({
                data: null,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to retrieve cache status"
                },
                meta: null
            });
        }
    }

    // 캐시 강제 새로고침
    async refreshCache(req: Request, res: Response) {
        try {
            cafeteriaCrawlerService.clearCache();
            const menuData = await cafeteriaCrawlerService.getMenuData(true);
            
            res.json({
                data: {
                    message: "Cache refreshed successfully",
                    totalMenus: menuData.totalMenus,
                    totalCafeterias: menuData.cafeterias.length,
                    timestamp: menuData.timestamp
                },
                error: null,
                meta: null
            });

        } catch (error) {
            console.error('[API] 캐시 새로고침 오류:', error);
            res.status(500).json({
                data: null,
                error: {
                    code: "INTERNAL_ERROR", 
                    message: "Failed to refresh cache"
                },
                meta: null
            });
        }
    }
}

// 싱글톤 인스턴스
export const cafeteriaController = new CafeteriaController();