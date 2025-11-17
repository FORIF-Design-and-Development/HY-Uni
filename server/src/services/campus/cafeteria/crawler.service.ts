// server/src/services/campus/cafeteria/crawler.service.ts
import { CrawlResult, HanyangCrawler } from './cafeteria-crawler.js';

interface CacheItem {
    data: CrawlResult;
    timestamp: number;
}

export class CafeteriaCrawlerService {
    private crawler: HanyangCrawler;
    private cache: CacheItem | null = null;
    private CACHE_DURATION = 30 * 60 * 1000; // 30분 캐시

    constructor() {
        this.crawler = new HanyangCrawler();
    }

    async getMenuData(forceRefresh: boolean = false): Promise<CrawlResult> {
        try {
            // 캐시 확인
            if (!forceRefresh && this.isValidCache()) {
                console.log('📦 [캠퍼스-학식] 캐시된 데이터 반환');
                return this.cache!.data;
            }

            console.log('🔄 [캠퍼스-학식] 새로운 데이터 크롤링 중...');
            const result = await this.crawler.crawl();
            
            // 캐시 업데이트
            this.cache = {
                data: result,
                timestamp: Date.now()
            };

            console.log(`✅ [캠퍼스-학식] 크롤링 완료: ${result.totalMenus}개 메뉴, ${result.cafeterias.length}개 식당`);
            return result;

        } catch (error) {
            console.error('❌ [캠퍼스-학식] 크롤링 서비스 오류:', error);
            
            // 크롤링 실패 시 캐시된 데이터라도 반환
            if (this.cache) {
                console.log('⚠️ [캠퍼스-학식] 크롤링 실패, 캐시된 데이터 반환');
                return {
                    ...this.cache.data,
                    errors: [`크롤링 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`]
                };
            }

            throw new Error(`메뉴 데이터를 가져올 수 없습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
    }

    private isValidCache(): boolean {
        if (!this.cache) return false;
        
        const now = Date.now();
        const cacheAge = now - this.cache.timestamp;
        
        return cacheAge < this.CACHE_DURATION;
    }

    getCacheStatus() {
        if (!this.cache) {
            return { 
                cached: false, 
                age: 0,
                valid: false,
                lastUpdate: null
            };
        }

        const age = Date.now() - this.cache.timestamp;
        const valid = this.isValidCache();
        
        return {
            cached: true,
            age: Math.floor(age / 1000), // 초 단위
            valid: valid,
            lastUpdate: new Date(this.cache.timestamp).toISOString(),
            expiresIn: valid ? Math.floor((this.CACHE_DURATION - age) / 1000) : 0
        };
    }

    clearCache(): void {
        this.cache = null;
        console.log('🗑️ [캠퍼스-학식] 캐시 클리어됨');
    }

    // 캐시 설정 변경 (필요시)
    setCacheDuration(minutes: number): void {
        this.CACHE_DURATION = minutes * 60 * 1000;
        console.log(`⏰ [캠퍼스-학식] 캐시 지속 시간 변경: ${minutes}분`);
    }

    // 캐시된 데이터 요약 정보
    getCacheInfo() {
        const status = this.getCacheStatus();
        
        if (!status.cached) {
            return {
                ...status,
                summary: null
            };
        }

        const data = this.cache!.data;
        return {
            ...status,
            summary: {
                totalMenus: data.totalMenus,
                totalCafeterias: data.cafeterias.length,
                menuDate: data.menuDate,
                lastCrawlTime: data.timestamp
            }
        };
    }
}

// 싱글톤 인스턴스 export
export const cafeteriaCrawlerService = new CafeteriaCrawlerService();