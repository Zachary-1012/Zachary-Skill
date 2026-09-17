/**
 * Seed brand/company universe for Professional Intelligence v2.
 *
 * This is an entity-resolution seed, not a closed whitelist. Workspaces may add arbitrary
 * brands, companies, products and aliases. Parent/child links prevent group-level and
 * brand-level mentions from being silently double-counted.
 */

export type BrandSector =
  | "luxury-fashion"
  | "sports-fashion"
  | "beauty"
  | "technology"
  | "automotive"
  | "commerce-retail"
  | "consumer-food-beverage"
  | "finance"
  | "travel-hospitality";

export interface BrandEntity {
  id: string;
  name: string;
  aliases: string[];
  sector: BrandSector;
  region: "CN" | "GLOBAL";
  priority: "P0" | "P1" | "P2";
  parentId?: string;
  officialDomains?: string[];
}

function e(
  id: string,
  name: string,
  aliases: string[],
  sector: BrandSector,
  region: "CN" | "GLOBAL",
  priority: "P0" | "P1" | "P2" = "P0",
  parentId?: string,
  officialDomains?: string[],
): BrandEntity {
  return { id, name, aliases, sector, region, priority, parentId, officialDomains };
}

export const BRAND_ENTITY_CATALOG: BrandEntity[] = [
  // Luxury groups / houses
  e("lvmh", "LVMH", ["路威酩轩", "Moët Hennessy Louis Vuitton"], "luxury-fashion", "GLOBAL", "P0", undefined, ["lvmh.com"]),
  e("louis-vuitton", "Louis Vuitton", ["LV", "路易威登", "LouisVuitton"], "luxury-fashion", "GLOBAL", "P0", "lvmh", ["louisvuitton.com"]),
  e("dior", "Dior", ["Christian Dior", "迪奥"], "luxury-fashion", "GLOBAL", "P0", "lvmh", ["dior.com"]),
  e("fendi", "Fendi", ["芬迪"], "luxury-fashion", "GLOBAL", "P1", "lvmh", ["fendi.com"]),
  e("celine", "Celine", ["思琳", "赛琳"], "luxury-fashion", "GLOBAL", "P1", "lvmh", ["celine.com"]),
  e("bulgari", "Bulgari", ["BVLGARI", "宝格丽"], "luxury-fashion", "GLOBAL", "P1", "lvmh", ["bulgari.com"]),
  e("tiffany", "Tiffany & Co.", ["Tiffany", "蒂芙尼"], "luxury-fashion", "GLOBAL", "P1", "lvmh", ["tiffany.com"]),
  e("kering", "Kering", ["开云集团", "开云"], "luxury-fashion", "GLOBAL", "P0", undefined, ["kering.com"]),
  e("gucci", "Gucci", ["古驰"], "luxury-fashion", "GLOBAL", "P0", "kering", ["gucci.com"]),
  e("saint-laurent", "Saint Laurent", ["YSL", "Yves Saint Laurent", "圣罗兰"], "luxury-fashion", "GLOBAL", "P0", "kering", ["ysl.com"]),
  e("bottega-veneta", "Bottega Veneta", ["BV", "葆蝶家"], "luxury-fashion", "GLOBAL", "P1", "kering", ["bottegaveneta.com"]),
  e("chanel", "Chanel", ["香奈儿"], "luxury-fashion", "GLOBAL", "P0", undefined, ["chanel.com"]),
  e("hermes", "Hermès", ["Hermes", "爱马仕"], "luxury-fashion", "GLOBAL", "P0", undefined, ["hermes.com"]),
  e("richemont", "Richemont", ["历峰集团", "历峰"], "luxury-fashion", "GLOBAL", "P0", undefined, ["richemont.com"]),
  e("cartier", "Cartier", ["卡地亚"], "luxury-fashion", "GLOBAL", "P0", "richemont", ["cartier.com"]),
  e("van-cleef-arpels", "Van Cleef & Arpels", ["VCA", "梵克雅宝"], "luxury-fashion", "GLOBAL", "P1", "richemont", ["vancleefarpels.com"]),
  e("prada-group", "Prada Group", ["Prada Group", "普拉达集团"], "luxury-fashion", "GLOBAL", "P0", undefined, ["pradagroup.com"]),
  e("prada", "Prada", ["普拉达"], "luxury-fashion", "GLOBAL", "P0", "prada-group", ["prada.com"]),
  e("miu-miu", "Miu Miu", ["MIUMIU", "缪缪"], "luxury-fashion", "GLOBAL", "P0", "prada-group", ["miumiu.com"]),
  e("burberry", "Burberry", ["博柏利"], "luxury-fashion", "GLOBAL", "P1", undefined, ["burberry.com"]),
  e("moncler", "Moncler", ["盟可睐"], "luxury-fashion", "GLOBAL", "P1", undefined, ["moncler.com"]),

  // Fashion / sports / retail
  e("nike", "Nike", ["耐克", "Nike Inc"], "sports-fashion", "GLOBAL", "P0", undefined, ["nike.com"]),
  e("adidas", "adidas", ["Adidas", "阿迪达斯"], "sports-fashion", "GLOBAL", "P0", undefined, ["adidas.com"]),
  e("lululemon", "lululemon", ["Lululemon", "露露乐蒙"], "sports-fashion", "GLOBAL", "P0", undefined, ["lululemon.com"]),
  e("anta", "ANTA", ["安踏", "安踏体育"], "sports-fashion", "CN", "P0", undefined, ["anta.com"]),
  e("li-ning", "Li-Ning", ["李宁", "LI-NING"], "sports-fashion", "CN", "P0", undefined, ["lining.com"]),
  e("inditex", "Inditex", ["印地纺集团"], "commerce-retail", "GLOBAL", "P0", undefined, ["inditex.com"]),
  e("zara", "Zara", ["ZARA"], "commerce-retail", "GLOBAL", "P0", "inditex", ["zara.com"]),
  e("fast-retailing", "Fast Retailing", ["迅销集团"], "commerce-retail", "GLOBAL", "P1", undefined, ["fastretailing.com"]),
  e("uniqlo", "UNIQLO", ["Uniqlo", "优衣库"], "commerce-retail", "GLOBAL", "P0", "fast-retailing", ["uniqlo.com"]),
  e("shein", "SHEIN", ["Shein", "希音"], "commerce-retail", "GLOBAL", "P0", undefined, ["shein.com"]),

  // Beauty
  e("loreal", "L'Oréal", ["Loreal", "欧莱雅", "L'Oréal Group"], "beauty", "GLOBAL", "P0", undefined, ["loreal.com"]),
  e("estee-lauder", "Estée Lauder Companies", ["Estée Lauder", "Estee Lauder", "雅诗兰黛集团", "雅诗兰黛"], "beauty", "GLOBAL", "P0", undefined, ["elcompanies.com"]),
  e("shiseido", "Shiseido", ["资生堂"], "beauty", "GLOBAL", "P1", undefined, ["shiseido.com"]),
  e("proya", "PROYA", ["珀莱雅", "Proya Cosmetics"], "beauty", "CN", "P0", undefined, ["proya-group.com"]),

  // Technology / internet
  e("apple", "Apple", ["苹果", "Apple Inc"], "technology", "GLOBAL", "P0", undefined, ["apple.com"]),
  e("samsung", "Samsung", ["三星", "Samsung Electronics"], "technology", "GLOBAL", "P0", undefined, ["samsung.com"]),
  e("huawei", "Huawei", ["华为", "Huawei Technologies"], "technology", "CN", "P0", undefined, ["huawei.com"]),
  e("xiaomi", "Xiaomi", ["小米", "小米集团", "Xiaomi Corporation"], "technology", "CN", "P0", undefined, ["mi.com"]),
  e("oppo", "OPPO", ["Oppo", "欧珀"], "technology", "CN", "P1", undefined, ["oppo.com"]),
  e("vivo", "vivo", ["Vivo", "维沃"], "technology", "CN", "P1", undefined, ["vivo.com"]),
  e("bytedance", "ByteDance", ["字节跳动"], "technology", "CN", "P0", undefined, ["bytedance.com"]),
  e("tencent", "Tencent", ["腾讯", "腾讯控股"], "technology", "CN", "P0", undefined, ["tencent.com"]),
  e("alibaba", "Alibaba", ["阿里巴巴", "阿里集团", "Alibaba Group"], "technology", "CN", "P0", undefined, ["alibabagroup.com"]),
  e("jd-com", "JD.com", ["京东", "京东集团"], "commerce-retail", "CN", "P0", undefined, ["jd.com"]),

  // Automotive / EV
  e("tesla", "Tesla", ["特斯拉", "Tesla Inc"], "automotive", "GLOBAL", "P0", undefined, ["tesla.com"]),
  e("byd", "BYD", ["比亚迪", "BYD Auto"], "automotive", "CN", "P0", undefined, ["byd.com"]),
  e("mercedes-benz", "Mercedes-Benz", ["Mercedes", "奔驰", "梅赛德斯-奔驰"], "automotive", "GLOBAL", "P0", undefined, ["mercedes-benz.com"]),
  e("bmw", "BMW", ["宝马", "BMW Group"], "automotive", "GLOBAL", "P0", undefined, ["bmw.com"]),
  e("porsche", "Porsche", ["保时捷"], "automotive", "GLOBAL", "P0", undefined, ["porsche.com"]),
  e("audi", "Audi", ["奥迪"], "automotive", "GLOBAL", "P1", undefined, ["audi.com"]),
  e("nio", "NIO", ["蔚来", "蔚来汽车"], "automotive", "CN", "P0", undefined, ["nio.com"]),
  e("li-auto", "Li Auto", ["理想汽车", "理想"], "automotive", "CN", "P0", undefined, ["lixiang.com"]),
  e("xpeng", "XPeng", ["小鹏", "小鹏汽车"], "automotive", "CN", "P0", undefined, ["xpeng.com"]),
  e("geely", "Geely", ["吉利", "吉利汽车", "Geely Auto"], "automotive", "CN", "P0", undefined, ["geely.com"]),
  e("xiaomi-auto", "Xiaomi Auto", ["小米汽车", "Xiaomi EV", "小米SU7", "SU7"], "automotive", "CN", "P0", "xiaomi", ["mi.com"]),

  // Broad consumer brands useful for brand-image benchmarking
  e("coca-cola", "Coca-Cola", ["Coke", "可口可乐"], "consumer-food-beverage", "GLOBAL", "P1", undefined, ["coca-colacompany.com"]),
  e("starbucks", "Starbucks", ["星巴克"], "consumer-food-beverage", "GLOBAL", "P1", undefined, ["starbucks.com"]),
  e("mcdonalds", "McDonald's", ["McDonalds", "麦当劳"], "consumer-food-beverage", "GLOBAL", "P1", undefined, ["mcdonalds.com"]),
];

function norm(value: string): string {
  return value.toLowerCase().normalize("NFKC").replace(/[\s._'’&+\-—·]/g, "");
}

export function brandEntityCatalog(priority: "P0" | "P1" | "P2" = "P1"): BrandEntity[] {
  const order = { P0: 0, P1: 1, P2: 2 } as const;
  const ceiling = order[priority];
  return BRAND_ENTITY_CATALOG.filter((x) => order[x.priority] <= ceiling).map((x) => ({ ...x, aliases: [...x.aliases], officialDomains: x.officialDomains ? [...x.officialDomains] : undefined }));
}

export function resolveBrandEntity(input: string): BrandEntity | null {
  const q = norm(input);
  if (!q) return null;
  let best: { entity: BrandEntity; score: number } | null = null;
  for (const entity of BRAND_ENTITY_CATALOG) {
    const names = [entity.name, ...entity.aliases];
    for (const name of names) {
      const n = norm(name);
      const score = q === n ? 100 : q.includes(n) || n.includes(q) ? Math.min(q.length, n.length) : 0;
      if (score > 0 && (!best || score > best.score)) best = { entity, score };
    }
  }
  return best ? { ...best.entity, aliases: [...best.entity.aliases], officialDomains: best.entity.officialDomains ? [...best.entity.officialDomains] : undefined } : null;
}

export function entityQueryTerms(input: string): string[] {
  const entity = resolveBrandEntity(input);
  if (!entity) return [input.trim()].filter(Boolean);
  return [...new Set([entity.name, ...entity.aliases].map((x) => x.trim()).filter(Boolean))];
}
