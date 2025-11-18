// server/src/services/campus/cafeteria/cafeteria-crawler.ts
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface MenuItem {
    timeSlot: string;     
    menuType: string;     
    name: string;         
    price: number;        
    originalPrice: string; 
    spicy?: string;       
    imageUrl?: string;    
    cafeteriaName?: string; 
}

export interface Cafeteria {
    id: string;
    name: string;
    meals: {
        breakfast: MenuItem[];
        lunch: MenuItem[];
        dinner: MenuItem[];
    };
}

export interface CrawlResult {
    timestamp: string;
    menuDate?: string;    
    cafeterias: Cafeteria[];
    totalMenus: number;
    errors: string[];
}

export class HanyangCrawler {
    private baseUrl = 'https://fnb.hanyang.ac.kr';
    private menuPageUrl = '/front/fnbmMdMenu';

    async crawl(): Promise<CrawlResult> {
        try {
            const htmlResponse = await axios.get(this.baseUrl + this.menuPageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9',
                }
            });

            const menuDate = this.parseMenuDate(htmlResponse.data);
            const allMenus = this.parseDirectFromHtml(htmlResponse.data);
            
            const result: CrawlResult = {
                timestamp: new Date().toISOString(),
                menuDate: menuDate,
                cafeterias: this.groupMenusByCafeteria(allMenus),
                totalMenus: allMenus.length,
                errors: []
            };

            return result;

        } catch (error) {
            console.error('❌ 크롤링 실패:', error);
            throw error;
        }
    }

    private parseMenuDate(html: string): string {
        const $ = cheerio.load(html);
        
        let menuDate = '';
        
        const dateElement = $('.date, [class*="date"]').first();
        if (dateElement.length > 0) {
            menuDate = dateElement.text().trim();
        }
        
        if (!menuDate) {
            const datePatterns = [
                /\d{4}[.-]\d{1,2}[.-]\d{1,2}/,
                /\d{1,2}[.-]\d{1,2}[.-]\d{4}/,
                /\d{4}년\s*\d{1,2}월\s*\d{1,2}일/,
                /\d{1,2}월\s*\d{1,2}일/
            ];
            
            for (const pattern of datePatterns) {
                const match = html.match(pattern);
                if (match) {
                    menuDate = match[0];
                    break;
                }
            }
        }
        
        if (!menuDate) {
            const today = new Date();
            menuDate = today.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        return menuDate;
    }

    private parseDirectFromHtml(html: string): MenuItem[] {
        const $ = cheerio.load(html);
        const menus: MenuItem[] = [];

        $('.menu-slide-item').each((index, sectionElement) => {
            const $section = $(sectionElement);
            
            const cafeteriaName = $section.find('.location, .cafeteria-name, h3, h2').text().trim() || 
                                 $section.find('[class*="location"]').text().trim() ||
                                 this.getCafeteriaNameFromIndex(index);
            
            const cafeteriaMenus = this.parseMenusFromSection($section, $, cafeteriaName);
            menus.push(...cafeteriaMenus);
        });

        if (menus.length === 0) {
            const allMenus = this.parseMenusFromSection($('body'), $, '학생식당');
            menus.push(...allMenus);
        }

        return menus;
    }

    private parseMenusFromSection($section: any, $: any, cafeteriaName: string): MenuItem[] {
        const menus: MenuItem[] = [];
        
        $section.find('.menu-slide.menuSlideContainer li, .menuSlideContainer li, [class*="menu"] li, .menu-slide li').each((_index: number, element: any) => {
            const $el = $(element);
            
            const category = $el.find('.category, [class*="category"]').text().trim() || 
                            $el.find('span').first().text().trim();
            
            let title = $el.find('.title, [class*="title"]').first().text().trim();
            title = title.replace(/\s+/g, ' ').replace(/^\s*-\s*|\s*-\s*$/g, '').trim();
            
            let price = $el.find('.price, [class*="price"]').text().trim();
            if (!price) {
                const priceMatch = $el.text().match(/\d{1,2},?\d{3}원/);
                price = priceMatch ? priceMatch[0] : '';
            }
            price = price.replace(/[\s\-]+/g, '').trim();
            
            const spicy = $el.find('.spicy, [data-spicy]').attr('data-spicy') || '-';
            
            let imageUrl = '';
            const thumbImg = $el.find('.thumb-img, [class*="thumb"]').attr('style');
            if (thumbImg) {
                const match = thumbImg.match(/url\(([^)]+)\)/);
                if (match) {
                    imageUrl = match[1].replace(/['"]/g, '');
                    if (imageUrl.startsWith('/')) {
                        imageUrl = this.baseUrl + imageUrl;
                    }
                }
            }

            if (title && price && title !== price && title.length > 2) {
                const menu: MenuItem = {
                    timeSlot: this.extractTimeSlot(category),
                    menuType: this.extractMenuType(category),
                    name: title,
                    price: this.extractPrice(price),
                    originalPrice: price,
                    spicy,
                    imageUrl,
                    cafeteriaName
                };

                menus.push(menu);
            }
        });

        return menus;
    }

    private getCafeteriaNameFromIndex(index: number): string {
        const cafeteriaNames = [
            '학생복지관',
            '생활과학관',
            '신소재공학관',
            '체육부실',
            '제2학생생활관',
            'HIT(이심식기)'
        ];
        
        return cafeteriaNames[index] || `식당${index + 1}`;
    }

    private extractTimeSlot(category: string): string {
        if (category.includes('조식')) return '조식';
        if (category.includes('중식')) return '중식';
        if (category.includes('석식')) return '석식';
        
        return '중식';
    }

    private extractMenuType(category: string): string {
        let type = category.replace(/(조식|중식|석식)/g, '').trim();
        type = type.replace(/^[-\s]+|[-\s]+$/g, '');
        
        if (!type) {
            type = '일반';
        }
        
        return type;
    }

    private extractPrice(priceText: string): number {
        const matches = priceText.match(/[\d,]+/);
        if (matches) {
            const numericPrice = parseInt(matches[0].replace(/,/g, ''));
            return numericPrice;
        }
        return 0;
    }

    private groupMenusByCafeteria(menus: MenuItem[]): Cafeteria[] {
        const cafeteriaMap = new Map<string, Cafeteria>();

        menus.forEach(menu => {
            const cafeteriaName = menu.cafeteriaName || '학생식당';
            
            if (!cafeteriaMap.has(cafeteriaName)) {
                cafeteriaMap.set(cafeteriaName, {
                    id: cafeteriaName.toLowerCase().replace(/[^a-z0-9]/g, ''),
                    name: cafeteriaName,
                    meals: {
                        breakfast: [],
                        lunch: [],
                        dinner: []
                    }
                });
            }

            const cafeteria = cafeteriaMap.get(cafeteriaName)!;
            
            if (menu.timeSlot === '조식') {
                cafeteria.meals.breakfast.push(menu);
            } else if (menu.timeSlot === '석식') {
                cafeteria.meals.dinner.push(menu);
            } else {
                cafeteria.meals.lunch.push(menu);
            }
        });

        return Array.from(cafeteriaMap.values());
    }
}