/* 八字排盘 / 农历 计算引擎 — 纯本地计算，无需联网 */
(function (root) {
  'use strict';
  var GAN = '甲乙丙丁戊己庚辛壬癸'.split('');
  var ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('');
  var SHENGXIAO = '鼠牛虎兔龙蛇马羊猴鸡狗猪'.split('');
  var WX_NAME = ['木', '火', '土', '金', '水'];
  var WX_COLOR = ['mu', 'huo', 'tu', 'jin', 'shui'];
  var GAN_WX = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var ZHI_WX = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  // 节气名，从春分(0°)起每15°
  var JIEQI = ['春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露',
    '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰'];
  var CANGGAN = { 子: '癸', 丑: '己癸辛', 寅: '甲丙戊', 卯: '乙', 辰: '戊乙癸', 巳: '丙戊庚', 午: '丁己', 未: '己丁乙', 申: '庚壬戊', 酉: '辛', 戌: '戊辛丁', 亥: '壬甲' };
  var NAYIN = ['海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金', '杨柳木',
    '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木', '壁上土', '金箔金',
    '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];
  var LUNAR_MONTH = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
  var LUNAR_DAY = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
  var CN_DIGIT = '〇一二三四五六七八九';
  var SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var SHICHEN_HOUR = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
  var SHICHEN_RANGE = ['23-01', '01-03', '03-05', '05-07', '07-09', '09-11', '11-13', '13-15', '15-17', '17-19', '19-21', '21-23'];

  function mod(a, n) { return ((a % n) + n) % n; }
  function gzIndex(g, z) { for (var i = 0; i < 60; i++) if (i % 10 === g && i % 12 === z) return i; return -1; }
  function gzName(i) { return GAN[i % 10] + ZHI[i % 12]; }

  /* ---------- 天文：太阳视黄经 (Meeus) ---------- */
  var RAD = Math.PI / 180;
  function sunLon(ms) {
    var jd = ms / 86400000 + 2440587.5 + 69 / 86400; // ≈TT
    var T = (jd - 2451545) / 36525;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * RAD;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
      (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
    var om = (125.04 - 1934.136 * T) * RAD;
    var Ls = (280.4665 + 36000.7698 * T) * RAD, Lm = (218.3165 + 481267.8813 * T) * RAD;
    var dpsi = (-17.20 * Math.sin(om) - 1.32 * Math.sin(2 * Ls) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * om)) / 3600;
    return mod(L0 + C - 0.00569 + dpsi, 360);
  }
  var H8 = 8 * 3600000;
  function bjMs(y, m, d, h, mi) { return Date.UTC(y, m - 1, d, h || 0, mi || 0) - H8; }

  // 某日(北京时间)是否交节气，返回 {name, time}
  function jieqiOfDay(y, m, d) {
    var a = bjMs(y, m, d), b = a + 86400000;
    var l1 = sunLon(a), l2 = sunLon(b);
    if (l2 < l1) l2 += 360;
    var k1 = Math.floor(l1 / 15), k2 = Math.floor(l2 / 15);
    if (k2 === k1) return null;
    var target = k2 * 15, lo = a, hi = b;
    for (var i = 0; i < 40; i++) {
      var mid = (lo + hi) / 2, l = sunLon(mid);
      if (l < l1 - 180) l += 360;
      if (l < target) lo = mid; else hi = mid;
    }
    var t = new Date(hi + H8);
    return { name: JIEQI[k2 % 24], time: pad(t.getUTCHours()) + ':' + pad(t.getUTCMinutes()) };
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- 农历 (1900-2100 数据表) ---------- */
  var LUNAR_INFO = [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
  0x0d520];
  function leapMonth(y){return LUNAR_INFO[y-1900]&0xf;}
  function leapDays(y){return leapMonth(y)?((LUNAR_INFO[y-1900]&0x10000)?30:29):0;}
  function monthDays(y,m){return (LUNAR_INFO[y-1900]&(0x10000>>m))?30:29;}
  function yearDays(y){var s=348;for(var i=0x8000;i>0x8;i>>=1)s+=(LUNAR_INFO[y-1900]&i)?1:0;return s+leapDays(y);}
  function solarToLunar(y,m,d){
    var off=Math.round((Date.UTC(y,m-1,d)-Date.UTC(1900,0,31))/86400000), ly=1900, t;
    while(ly<2101&&off>=(t=yearDays(ly))){off-=t;ly++;}
    var lp=leapMonth(ly), leap=false, lm=1;
    for(lm=1;lm<=12;lm++){
      t=monthDays(ly,lm); if(off<t)break; off-=t;
      if(lp===lm){t=leapDays(ly); if(off<t){leap=true;break;} off-=t;}
    }
    return {year:ly,month:lm,day:off+1,leap:leap};
  }
  function lunar(y, m, d) {
    var r = solarToLunar(y, m, d), ly = r.year, lm = r.month, ld = r.day, leap = r.leap;
    return {
      year: ly, month: lm, day: ld, leap: leap,
      yearGz: gzName(mod(ly - 4, 60)), shengxiao: SHENGXIAO[mod(ly - 4, 12)],
      yearCn: String(ly).split('').map(function (c) { return CN_DIGIT[+c]; }).join(''),
      monthCn: (leap ? '闰' : '') + LUNAR_MONTH[lm - 1], dayCn: LUNAR_DAY[ld - 1],
      monthDays: leap ? leapDays(ly) : monthDays(ly, lm)
    };
  }

  var FEST = { '1-1': '春节', '1-15': '元宵', '2-2': '龙抬头', '5-5': '端午', '7-7': '七夕', '7-15': '中元', '8-15': '中秋', '9-9': '重阳', '12-8': '腊八', '12-23': '小年' };
  var SOLAR_FEST = { '1-1': '元旦', '5-1': '劳动节', '10-1': '国庆' };

  function jdn(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / 86400000) + 2440588; }
  function dayGzIndex(y, m, d) { return mod(jdn(y, m, d) - 11, 60); }

  /* ---------- 四柱 ---------- */
  function pillars(y, m, d, h, mi) {
    var ms = bjMs(y, m, d, h, mi);
    var lon = sunLon(ms);
    var Y = y;
    if (m <= 2 && lon >= 270 && lon < 315) Y = y - 1;
    var yi = mod(Y - 4, 60);
    var mIdx = Math.floor(mod(lon - 315, 360) / 30); // 0=寅
    var mg = mod((yi % 5) * 2 + 2 + mIdx, 10), mz = (mIdx + 2) % 12;
    var di = dayGzIndex(y, m, d);
    var hz = Math.floor((h + 1) / 2) % 12;
    var hg = mod((di % 10 % 5) * 2 + hz, 10);
    return [yi, gzIndex(mg, mz), di, gzIndex(hg, hz)];
  }

  function shishen(dg, g) {
    var rel = mod(GAN_WX[g] - GAN_WX[dg], 5), same = (g % 2) === (dg % 2);
    return (same ? ['比', '食', '才', '杀', '枭'] : ['劫', '伤', '财', '官', '印'])[rel];
  }

  function kongwang(i) { var s = i - (i % 10), z = s % 12; return ZHI[(z + 10) % 12] + ZHI[(z + 11) % 12]; }

  /* ---------- 神煞 ---------- */
  function idxs(s) { return s.split('').map(function (c) { return ZHI.indexOf(c); }); }
  var T_TIANYI = ['丑未', '子申', '亥酉', '亥酉', '丑未', '子申', '寅午', '寅午', '卯巳', '卯巳'];
  var T_TAIJI = ['子午', '子午', '卯酉', '卯酉', '辰戌丑未', '辰戌丑未', '寅亥', '寅亥', '巳申', '巳申'];
  var T_WENCHANG = ['巳午', '巳午', '申', '酉', '申', '酉', '亥', '子', '寅', '卯'];
  var T_GUOYIN = '戌亥丑寅丑寅辰巳未申';
  var T_TIANCHU = '巳午子巳午申寅午酉亥';
  var T_LU = '寅卯巳午巳午申酉亥子';
  var T_YANGREN = '卯寅午巳午巳酉申子亥';
  var T_JINYU = '辰巳未申未申戌亥丑寅';
  var T_XUETANG = ['己亥', '', '丙寅', '丁酉', '戊寅', '', '辛巳', '', '甲申', '乙卯'];
  var T_CIGUAN = ['庚寅', '辛卯', '乙巳', '戊午', '丁巳', '庚午', '壬申', '癸酉', '癸亥', '壬戌'];
  // 三合局: 申子辰=0, 寅午戌=1, 巳酉丑=2, 亥卯未=3
  function sanhe(z) { return [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3][z]; }
  var T_YIMA = '寅申亥巳', T_TAOHUA = '酉卯午子', T_HUAGAI = '辰戌丑未', T_JIANG = '子午酉卯',
    T_JIESHA = '巳亥寅申', T_ZAISHA = '午子卯酉', T_WANGSHEN = '亥巳申寅';
  var T_TIANDE = { 卯: '申', 午: '亥', 酉: '寅' };
  var SHIE = ['甲辰', '乙巳', '壬申', '丙申', '丁亥', '庚辰', '戊戌', '癸亥', '辛巳', '己丑'];
  var YINYANG_CC = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'];
  var KUIGANG = ['庚辰', '庚戌', '壬辰', '戊戌'];
  var JINSHEN = ['乙丑', '己巳', '癸酉'];
  var GULUAN = ['乙巳', '丁巳', '辛亥', '戊申', '壬寅', '壬子', '丙午', '戊午'];

  function shensha(P, male) {
    var G = P.map(function (i) { return i % 10; }), Z = P.map(function (i) { return i % 12; });
    var N = P.map(gzName);
    var yg = G[0], dg = G[2], yz = Z[0], dz = Z[2], mz = Z[1];
    var out = [[], [], [], []];
    function add(k, n) { if (out[k].indexOf(n) < 0) out[k].push(n); }
    for (var k = 0; k < 4; k++) {
      var z = Z[k], zc = ZHI[z], g = G[k];
      if (T_TIANYI[yg].indexOf(zc) >= 0 || T_TIANYI[dg].indexOf(zc) >= 0) add(k, '天乙贵人');
      if (T_TAIJI[yg].indexOf(zc) >= 0 || T_TAIJI[dg].indexOf(zc) >= 0) add(k, '太极贵人');
      if (T_TIANDE[ZHI[mz]] === zc) add(k, '天德贵人');
      if (T_WENCHANG[yg].indexOf(zc) >= 0 || T_WENCHANG[dg].indexOf(zc) >= 0) add(k, '文昌贵人');
      if (T_GUOYIN[yg] === zc || T_GUOYIN[dg] === zc) add(k, '国印贵人');
      if (T_TIANCHU[yg] === zc || T_TIANCHU[dg] === zc) add(k, '天厨贵人');
      if (T_XUETANG[dg] === N[k]) add(k, '学堂');
      if (T_CIGUAN[dg] === N[k]) add(k, '词馆');
      if (T_LU[dg] === zc) add(k, '禄神');
      if (T_YANGREN[dg] === zc) add(k, '羊刃');
      if (T_JINYU[dg] === zc) add(k, '金舆');
      // 以年支、日支查（不查本柱）
      [0, 2].forEach(function (b) {
        if (b === k) return;
        var r = Z[b], s = sanhe(r);
        if (T_YIMA[s] === zc) add(k, '驿马');
        if (T_TAOHUA[s] === zc) add(k, '桃花');
        if (T_HUAGAI[s] === zc) add(k, '华盖');
        if (T_JIANG[s] === zc) add(k, '将星');
        if (T_JIESHA[s] === zc) add(k, '劫煞');
        if (T_WANGSHEN[s] === zc) add(k, '亡神');
        if (z === (r + 2) % 12) add(k, '丧门');
        if (z === (r + 10) % 12) add(k, '吊客');
        if (z === (r + 9) % 12) add(k, '披麻');
        if ((r === 10 && z === 11) || (r === 11 && z === 10) || (r === 4 && z === 5) || (r === 5 && z === 4)) add(k, '天罗地网');
      });
      if (k !== 0) {
        if (T_ZAISHA[sanhe(yz)] === zc) add(k, '灾煞');
        var chong = (yz + 6) % 12;
        if (z === (chong + 1) % 12 || z === (chong + 11) % 12) add(k, '元辰');
        var g3 = Math.floor(((yz + 1) % 12) / 3); // 亥子丑=0 寅卯辰=1 ...
        if (z === [2, 5, 8, 11][g3]) add(k, '孤辰');
        if (z === [10, 1, 4, 7][g3]) add(k, '寡宿');
        var hl = mod(3 - yz, 12);
        if (z === hl) add(k, '红鸾');
        if (z === (hl + 6) % 12) add(k, '天喜');
      }
      if (z === mod(mz - 1, 12)) add(k, '天医');
    }
    var dn = N[2];
    if (SHIE.indexOf(dn) >= 0) add(2, '十恶大败');
    if (YINYANG_CC.indexOf(dn) >= 0) add(2, '阴阳差错');
    if (KUIGANG.indexOf(dn) >= 0) add(2, '魁罡贵人');
    if (GULUAN.indexOf(dn) >= 0) add(2, '女孤鸾煞');
    [2, 3].forEach(function (k) { if (JINSHEN.indexOf(N[k]) >= 0) add(k, '金神'); });
    return out;
  }

  /* ---------- 格局 ---------- */
  function geju(P) {
    var G = P.map(function (i) { return GAN[i % 10]; }).join('');
    var N = P.map(gzName), r = [];
    if (['丁酉', '丁亥', '癸巳', '癸卯', '庚寅', '庚午'].indexOf(N[2]) >= 0) r.push('日贵格');
    function has(s) { return s.split('').every(function (c) { return G.indexOf(c) >= 0; }); }
    if (has('乙丙丁')) r.push('天上三奇');
    if (has('甲戊庚')) r.push('地上三奇');
    if (has('壬癸辛')) r.push('人间三奇');
    return r;
  }

  /* ---------- 合冲刑害 ---------- */
  var GAN_HE = { 甲己: '合土', 乙庚: '合金', 丙辛: '合水', 丁壬: '合木', 戊癸: '合火' };
  var GAN_CHONG = { 甲庚: 1, 乙辛: 1, 丙壬: 1, 丁癸: 1 };
  function ganHeChong(P) {
    var G = P.map(function (i) { return GAN[i % 10]; }), r = [];
    function push(s) { if (r.indexOf(s) < 0) r.push(s); }
    for (var i = 0; i < P.length; i++) for (var j = i + 1; j < P.length; j++) {
      var a = G[i], b = G[j], k1 = a + b, k2 = b + a;
      if (GAN_HE[k1]) push(k1 + GAN_HE[k1]); else if (GAN_HE[k2]) push(k2 + GAN_HE[k2]);
      if (GAN_CHONG[k1]) push(k1 + '冲'); else if (GAN_CHONG[k2]) push(k2 + '冲');
    }
    return r;
  }
  // 某一天干 g 与一组天干的合/冲。names 为各柱名称（年/月/日/时）
  function ganRelWith(g, gans, names, label) {
    var r = [];
    gans.forEach(function (x, k) {
      var k1 = g + x, k2 = x + g, t = null;
      if (GAN_HE[k1]) t = k1 + GAN_HE[k1]; else if (GAN_HE[k2]) t = k2 + GAN_HE[k2];
      else if (GAN_CHONG[k1]) t = k1 + '冲'; else if (GAN_CHONG[k2]) t = k2 + '冲';
      if (t) r.push(t + '（' + label + '·' + names[k] + '）');
    });
    return r;
  }
  var ZHI_PAIR = [
    ['子丑', '合土'], ['寅亥', '合木'], ['卯戌', '合火'], ['辰酉', '合金'], ['巳申', '合水'], ['午未', '合火或土'],
    ['子午', '冲'], ['丑未', '冲'], ['寅申', '冲'], ['卯酉', '冲'], ['辰戌', '冲'], ['巳亥', '冲'],
    ['子未', '害'], ['丑午', '害'], ['寅巳', '害'], ['卯辰', '害'], ['申亥', '害'], ['酉戌', '害'],
    ['子酉', '破'], ['卯午', '破'], ['辰丑', '破'], ['未戌', '破'], ['寅亥', '破'], ['巳申', '破'],
    ['申子', '半合水'], ['子辰', '半合水'], ['申辰', '拱合水'],
    ['亥卯', '半合木'], ['卯未', '半合木'], ['亥未', '拱合木'],
    ['寅午', '半合火'], ['午戌', '半合火'], ['寅戌', '拱合火'],
    ['巳酉', '半合金'], ['酉丑', '半合金'], ['巳丑', '拱合金'],
    ['亥午', '暗合木'], ['卯申', '暗合金'], ['巳酉', '暗合水'], ['子巳', '暗合火'], ['寅午', '暗合土'],
    ['子卯', '无礼之刑']
  ];
  var ZHI_TRI = [['申子辰', '合水'], ['亥卯未', '合木'], ['寅午戌', '合火'], ['巳酉丑', '合金'],
    ['寅卯辰', '汇木'], ['巳午未', '汇火'], ['申酉戌', '汇金'], ['亥子丑', '汇水'],
    ['寅巳申', '无恩之刑'], ['丑未戌', '恃势之刑']];
  var ZIXING = '辰午酉亥';
  function zhiHeChong(P) {
    var Z = P.map(function (i) { return ZHI[i % 12]; }), r = [];
    function push(s) { if (r.indexOf(s) < 0) r.push(s); }
    for (var i = 0; i < P.length; i++) for (var j = i + 1; j < P.length; j++) {
      var a = Z[i], b = Z[j];
      if (a === b) { if (ZIXING.indexOf(a) >= 0) push(a + a + '自刑'); continue; }
      ZHI_PAIR.forEach(function (p) {
        if (p[0] === a + b || p[0] === b + a) push(p[0] + p[1]);
      });
    }
    ZHI_TRI.forEach(function (t) {
      if (t[0].split('').every(function (c) { return Z.indexOf(c) >= 0; })) push(t[0] + t[1]);
    });
    return r;
  }

  /* ---------- 称骨 ---------- */
  var CG_YEAR = [12, 9, 6, 7, 12, 5, 9, 8, 7, 8, 15, 9, 16, 8, 8, 19, 12, 6, 8, 7, 5, 15, 6, 16, 15, 7, 9, 12, 10, 7,
    15, 6, 5, 14, 14, 9, 7, 7, 9, 12, 8, 7, 13, 5, 14, 5, 9, 17, 5, 7, 12, 8, 8, 6, 19, 6, 8, 16, 10, 6];
  var CG_MONTH = [6, 7, 18, 9, 5, 16, 9, 15, 18, 8, 9, 5];
  var CG_DAY = [5, 10, 8, 15, 16, 15, 8, 16, 8, 16, 9, 17, 8, 17, 10, 8, 9, 18, 5, 15, 10, 9, 8, 9, 15, 18, 7, 8, 16, 6];
  var CG_HOUR = [16, 6, 7, 10, 9, 16, 10, 8, 8, 9, 6, 6];
  // 称骨：按八字年柱、节气月（寅月为正月）、农历日、时辰
  function chenggu(P, L) {
    var w = CG_YEAR[P[0]] + CG_MONTH[mod(P[1] % 12 - 2, 12)] + CG_DAY[L.day - 1] + CG_HOUR[P[3] % 12];
    var liang = Math.floor(w / 10), qian = w % 10;
    var text = liang + '两' + (qian ? qian + '钱' : '');
    var v = (root.CHENGGU_TEXT || {})[w] || ['', ''];
    return { weight: w, text: text, male: v[0], female: v[1] };
  }

  /* ---------- 天干司令（书中「天干在一年中的实际分布日数」，每节按30日计） ---------- */
  var JIE = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
  // 每月(寅起)：[[天干, 日数], ...]
  var SILING = [
    [['丙', 6], ['甲', 24]], [['甲', 6], ['乙', 24]], [['乙', 9], ['癸', 3], ['戊', 18]],
    [['庚', 6], ['丙', 24]], [['丙', 6], ['丁', 24]], [['丁', 9], ['乙', 3], ['己', 18]],
    [['壬', 6], ['庚', 24]], [['庚', 6], ['辛', 24]], [['辛', 9], ['丁', 3], ['戊', 18]],
    [['甲', 6], ['壬', 24]], [['壬', 6], ['癸', 24]], [['癸', 9], ['辛', 3], ['己', 18]]
  ];
  function siling(y, m, d, h, mi) {
    var ms = bjMs(y, m, d, h, mi);
    var mIdx = Math.floor(mod(sunLon(ms) - 315, 360) / 30), start = 315 + mIdx * 30;
    var lo = ms - 33 * 86400000, hi = ms;
    for (var i = 0; i < 50; i++) {
      var mid = (lo + hi) / 2;
      if (mod(sunLon(mid) - start + 180, 360) - 180 < 0) lo = mid; else hi = mid;
    }
    var elapsed = (ms - hi) / 86400000, acc = 0, seg = SILING[mIdx], g = seg[seg.length - 1][0];
    for (var k = 0; k < seg.length; k++) { acc += seg[k][1]; if (elapsed < acc) { g = seg[k][0]; break; } }
    var t = new Date(hi + H8);
    return {
      jie: JIE[mIdx], jieTime: t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()) + ' ' + pad(t.getUTCHours()) + ':' + pad(t.getUTCMinutes()),
      day: Math.floor(elapsed) + 1, gan: wxItem(g, true),
      plan: seg.map(function (s) { return s[0] + WX_NAME[GAN_WX[GAN.indexOf(s[0])]] + s[1] + '日'; }).join(' → ')
    };
  }

  /* ---------- 汇总 ---------- */
  function wxItem(ch, isGan) {
    var idx = isGan ? GAN.indexOf(ch) : ZHI.indexOf(ch);
    var wx = isGan ? GAN_WX[idx] : ZHI_WX[idx];
    return { text: ch, wuxing: wx, wx: WX_NAME[wx], color: WX_COLOR[wx], yinyang: idx % 2 === 0 ? 1 : 0 };
  }
  function eightChar(y, m, d, h, mi, male) {
    if (male === undefined) male = true;
    var P = pillars(y, m, d, h, mi || 0), dg = P[2] % 10;
    var tiangan = P.map(function (p, k) {
      var it = wxItem(GAN[p % 10], true); it.shishen = k === 2 ? (male ? '元男' : '元女') : shishen(dg, p % 10); return it;
    });
    var dizhi = P.map(function (p) {
      var it = wxItem(ZHI[p % 12], false);
      it.canggan = CANGGAN[it.text].split('').map(function (c) { var x = wxItem(c, true); x.shishen = shishen(dg, GAN.indexOf(c)); return x; });
      return it;
    });
    var L = lunar(y, m, d), hz = P[3] % 12;
    return {
      pillars: P.map(gzName), tiangan: tiangan, dizhi: dizhi,
      kongwang: P.map(kongwang), nayin: P.map(function (i) { return NAYIN[Math.floor(i / 2)]; }),
      shensha: shensha(P, male), geju: geju(P), tianganhechong: ganHeChong(P), dizhihechong: zhiHeChong(P),
      tianganhechong3: ganHeChong(P.slice(0, 3)), dizhihechong3: zhiHeChong(P.slice(0, 3)),  // 不含时柱
      chenggu: chenggu(P, L), lunar: L
    };
  }

  function dayInfo(y, m, d) {
    var L = lunar(y, m, d), jq = jieqiOfDay(y, m, d), fest = null;
    if (!L.leap) fest = FEST[L.month + '-' + L.day] || null;
    if (!fest) { var t = new Date(Date.UTC(y, m - 1, d + 1)); var n = lunar(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); if (n.month === 1 && n.day === 1 && !n.leap) fest = '除夕'; }
    return { y: y, m: m, d: d, lunar: L, jieqi: jq, festival: fest, solarFest: SOLAR_FEST[m + '-' + d] || null, rgz: gzName(dayGzIndex(y, m, d)) };
  }

  var api = {
    GAN: GAN, ZHI: ZHI, SHICHEN: SHICHEN, SHICHEN_HOUR: SHICHEN_HOUR, SHICHEN_RANGE: SHICHEN_RANGE,
    eightChar: eightChar, siling: siling, ganRelWith: ganRelWith, dayInfo: dayInfo, lunar: lunar, pillars: pillars, gzName: gzName, jieqiOfDay: jieqiOfDay, sunLon: sunLon
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Bazi = api;
})(typeof window !== 'undefined' ? window : globalThis);
