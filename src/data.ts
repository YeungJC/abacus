export type Lang = "en" | "hant" | "hans";
export type Tri = Record<Lang, string>;

export type Society = {
  id: string;
  char: string;
  /** CSS colour token, e.g. "--cinnabar" */
  color: string;
  /** colour used in the 3D street, where CSS tokens can't reach */
  hex: string;
  en: string;
  hant: string;
  hans: string;
  inst: string;
  d: Tri;
  tags: string[];
};

export const SOCS: Society[] = [
  {
    id: "hk", char: "港", color: "--cinnabar", hex: "#d23a2a", en: "Hong Kong Society", hant: "香港學會", hans: "香港学会", inst: "MMU",
    d: {
      en: "Food crawls, board games and movie nights, plus sponsor discounts around Chinatown.",
      hant: "美食團、桌遊和電影夜，仲有唐人街商戶折扣。",
      hans: "美食团、桌游和电影夜，还有唐人街商户折扣。",
    },
    tags: ["Food", "Games", "Movie nights"],
  },
  {
    id: "mabc", char: "算", color: "--jade", hex: "#3f9a76", en: "MMU ABACUS", hant: "都大算盤社", hans: "都大算盘社", inst: "MMU",
    d: {
      en: "A community for British Chinese and East and Southeast Asian students. Membership is £4.",
      hant: "英籍華人及東亞、東南亞學生的社群。會費 £4。",
      hans: "英籍华人及东亚、东南亚学生的社群。会费 £4。",
    },
    tags: ["BCESEA", "£4 membership"],
  },
  {
    id: "uabc", char: "盤", color: "--indigo", hex: "#4a6bc0", en: "UoM ABACUS", hant: "曼大算盤社", hans: "曼大算盘社", inst: "University of Manchester",
    d: {
      en: "The Oxford Road branch of a UK-wide network. Link to come.",
      hant: "全英網絡嘅牛津路分會。連結稍後公佈。",
      hans: "全英网络的牛津路分会。链接稍后公布。",
    },
    tags: ["UK network", "Link to come"],
  },
  {
    id: "echo", char: "韻", color: "--gold", hex: "#d6a23c", en: "Echoes of China", hant: "華韻社", hans: "华韵社", inst: "University to be confirmed",
    d: {
      en: "Culture and heritage. Leads the festival workshops and the Lunar New Year gala. Link to come.",
      hant: "文化與傳承。負責節慶工作坊同新春晚會。連結稍後公佈。",
      hans: "文化与传承。负责节庆工作坊和新春晚会。链接稍后公布。",
    },
    tags: ["Calligraphy", "Festivals", "Gala"],
  },
];
export const socById = (id: string) => SOCS.find((s) => s.id === id);
export const socName = (s: { en: string; hant: string; hans: string }, lang: Lang) => (lang === "en" ? s.en : s[lang]);

export type EventItem = { date: string; t: Tri; socs: string[]; where: string; price: number; full: number; flag?: boolean };

export const EVENTS: EventItem[] = [
  { date: "2026-10-21", t: { en: "Mahjong and milk tea night", hant: "麻雀奶茶夜", hans: "麻将奶茶夜" }, socs: ["hk"], where: "MMU Students' Union", price: 2, full: 4 },
  { date: "2026-10-24", t: { en: "Inter-uni freshers mixer", hant: "跨校迎新聚會", hans: "跨校迎新聚会" }, socs: ["hk", "mabc", "uabc", "echo"], where: "Chinatown", price: 3, full: 6, flag: true },
  { date: "2026-10-29", t: { en: "Dumpling-making workshop", hant: "包餃子工作坊", hans: "包饺子工作坊" }, socs: ["uabc"], where: "Oxford Road", price: 3, full: 5 },
  { date: "2026-11-07", t: { en: "Calligraphy and tea afternoon", hant: "書法品茶下午", hans: "书法品茶下午" }, socs: ["echo"], where: "Venue TBC", price: 0, full: 3 },
  { date: "2026-11-13", t: { en: "Bubble tea crawl", hant: "珍珠奶茶巡禮", hans: "珍珠奶茶巡礼" }, socs: ["mabc"], where: "Chinatown", price: 2, full: 4 },
  { date: "2026-11-21", t: { en: "Karaoke night", hant: "K歌之夜", hans: "K歌之夜" }, socs: ["hk"], where: "Chinatown", price: 5, full: 8 },
  { date: "2026-11-21", t: { en: "Bowling night", hant: "保齡球之夜", hans: "保龄球之夜" }, socs: ["uabc"], where: "Printworks", price: 4, full: 7 },
  { date: "2026-12-21", t: { en: "Winter solstice tangyuan", hant: "冬至湯圓", hans: "冬至汤圆" }, socs: ["mabc", "echo"], where: "Venue TBC", price: 1, full: 3 },
  { date: "2027-02-13", t: { en: "Lunar New Year Gala", hant: "新春晚會", hans: "新春晚会" }, socs: ["hk", "mabc", "uabc", "echo"], where: "Venue TBC", price: 15, full: 22, flag: true },
];

export type Exit = { L: string; zh: string; name: Tri; body: Tri; tip: Tri };

export const EXITS: Exit[] = [
  {
    L: "A", zh: "食", name: { en: "Chinatown eats", hant: "唐人街食肆", hans: "唐人街美食" },
    body: {
      en: "Chinatown sits around Faulkner Street, under the big paifang arch. Dim sum is busiest on weekend late mornings, so go before 11. Most places take cards, but bakeries often prefer cash.",
      hant: "唐人街喺 Faulkner Street 一帶，就喺大牌坊下面。週末早上飲茶最多人，十一點前去最好。大部分餐廳收卡，但餅店多數鍾意現金。",
      hans: "唐人街在 Faulkner Street 一带，就在大牌坊下面。周末上午吃早茶人最多，最好十一点前去。大部分餐厅可以刷卡，但面包店多半更喜欢现金。",
    },
    tip: { en: "Pass holders: watch for sponsor discounts here once deals are signed.", hant: "持證人：簽好贊助後，留意呢度嘅折扣。", hans: "持证人：赞助签好后，留意这里的折扣。" },
  },
  {
    L: "B", zh: "貨", name: { en: "Asian groceries", hant: "亞洲超市", hans: "亚洲超市" },
    body: {
      en: "Wing Yip on Oldham Road is the big one for rice, sauces and frozen dumplings. The small supermarkets in Chinatown are handy for top-ups between lectures.",
      hant: "Oldham Road 嘅榮業行最大，米、醬料、急凍餃子一應俱全。唐人街啲小超市啱晒堂與堂之間補貨。",
      hans: "Oldham Road 的荣业行最大，大米、酱料、速冻饺子一应俱全。唐人街的小超市适合课间补货。",
    },
    tip: { en: "Split a big shop with flatmates and take a taxi back.", hant: "同室友夾份大採購，再一齊搭的士返去。", hans: "和室友一起大采购，再拼车回去。" },
  },
  {
    L: "C", zh: "銀", name: { en: "Bank and phone", hant: "銀行與電話", hans: "银行与电话" },
    body: {
      en: "Open a UK bank account once you have your enrolment letter. App-only banks are usually the quickest. A SIM-only plan is cheaper than a phone contract.",
      hant: "收到註冊信之後就可以開英國銀行戶口，純手機銀行通常最快。淨 SIM 卡月費計劃比手機合約平。",
      hans: "拿到注册信后就可以开英国银行账户，纯手机银行通常最快。纯 SIM 卡套餐比手机合约便宜。",
    },
    tip: { en: "Keep your passport and eVisa share code ready.", hant: "準備好護照同 eVisa 分享碼。", hans: "准备好护照和 eVisa 分享码。" },
  },
  {
    L: "D", zh: "醫", name: { en: "Doctors and wellbeing", hant: "睇醫生與身心健康", hans: "看医生与身心健康" },
    body: {
      en: "Register with a GP near where you live in your first few weeks. Call NHS 111 for urgent advice that isn't an emergency, and 999 for emergencies. Both universities run free counselling.",
      hant: "頭幾個星期就要喺住所附近登記 GP。非緊急但急需建議就打 NHS 111，緊急情況打 999。兩間大學都有免費輔導服務。",
      hans: "开学头几周就要在住处附近登记 GP。非紧急但需要建议就打 NHS 111，紧急情况打 999。两所大学都提供免费心理咨询。",
    },
    tip: { en: "Registering early means you are not searching while ill.", hant: "早啲登記，唔使病咗先四圍搵。", hans: "早点登记，免得生病时才到处找。" },
  },
  {
    L: "E", zh: "行", name: { en: "Getting around", hant: "交通", hans: "交通" },
    body: {
      en: "Oxford Road is one of Europe's busiest bus corridors and links both universities with the city centre. Check Bee Network fares for student tickets before you buy weekly passes.",
      hant: "牛津路係歐洲最繁忙嘅巴士走廊之一，連接兩間大學同市中心。買週票之前，先睇吓 Bee Network 嘅學生票價。",
      hans: "牛津路是欧洲最繁忙的公交走廊之一，连接两所大学和市中心。买周票之前，先查一下 Bee Network 的学生票价。",
    },
    tip: { en: "Walking from MMU to UoM along Oxford Road takes about 15 minutes.", hant: "沿牛津路由都大行去曼大大約十五分鐘。", hans: "沿牛津路从都大步行到曼大大约十五分钟。" },
  },
  {
    L: "F", zh: "友", name: { en: "Finding your people", hant: "搵朋友", hans: "找朋友" },
    body: {
      en: "Join your home society through your students' union, then add the Joint Pass. You get member prices at every partner society's events, so trying a new crowd costs less.",
      hant: "經學生會加入你所屬嘅學會，再加購聯合通行證。去任何合作學會嘅活動都係會員價，識新朋友更抵。",
      hans: "通过学生会加入你所属的学会，再加购联合通行证。参加任何合作学会的活动都是会员价，认识新朋友更划算。",
    },
    tip: { en: "The inter-uni mixer on Saturday 24 October is the easiest first step.", hant: "十月二十四日（六）嘅跨校迎新聚會係最易嘅第一步。", hans: "十月二十四日（周六）的跨校迎新聚会是最容易的第一步。" },
  },
];

export const PHASES = [
  { zh: "起", en: "Pitch", when: "Oct–Dec 2026", from: "2026-10-01", to: "2026-12-31", items: ["Pitch the Hong Kong Society committee", "Meet the other committees", "Ask both students' unions", "Pick a name"] },
  { zh: "承", en: "Soft launch", when: "Jan–Feb 2027", from: "2027-01-01", to: "2027-02-28", items: ["Site and committee hub go live", "Lunar New Year Gala on 13 February"] },
  { zh: "轉", en: "Pass pilot", when: "Mar–Jun 2027", from: "2027-03-01", to: "2027-06-30", items: ["Joint Pass on sale", "First sponsor discounts", "Count sign-ups"] },
  { zh: "合", en: "Full launch", when: "Sep 2027", from: "2027-09-01", to: "2027-09-30", items: ["Pass sold at freshers", "Guide goes live", "More societies invited"] },
];

/** 6pm GMT on the gala night */
export const GALA_AT = Date.UTC(2027, 1, 13, 18, 0, 0);
