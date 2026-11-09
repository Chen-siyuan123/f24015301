/* 关卡数据 —— 世界坐标 1600 x 900，地面顶部在 y = 780 */

const WORLD = { width: 1600, height: 900, groundY: 780 };

const MATERIALS = {
  wood:  { hp: 110, density: 0.0022, friction: 0.55, fill: '#c98a52', dark: '#8d5a2b', light: '#e8b075' },
  glass: { hp: 55,  density: 0.0012, friction: 0.35, fill: '#bfeaf6', dark: '#7fc6dc', light: '#e9fbff' },
  stone: { hp: 300, density: 0.0042, friction: 0.75, fill: '#a4aeb8', dark: '#6d7883', light: '#c8d1d9' }
};

/* 短写：材质 / 中心 x,y / 宽高 */
function blk(m, x, y, w, h) { return { m, x, y, w, h }; }

const LEVELS = [
  {
    id: 1,
    name: '翠绿山谷',
    sub: '第 1 关',
    birds: ['red', 'red', 'yellow'],
    par: 3200,
    pigs: [{ x: 1180, y: 754 }, { x: 1180, y: 576 }],
    blocks: [
      blk('wood', 1080, 705, 34, 150),
      blk('wood', 1280, 705, 34, 150),
      blk('wood', 1180, 616, 240, 28)
    ]
  },
  {
    id: 2,
    name: '石头城堡',
    sub: '第 2 关',
    birds: ['red', 'yellow', 'blue', 'red'],
    par: 5200,
    pigs: [{ x: 1120, y: 754 }, { x: 1240, y: 754 }, { x: 1180, y: 428 }],
    blocks: [
      blk('stone', 1060, 700, 40, 160),
      blk('stone', 1300, 700, 40, 160),
      blk('wood', 1180, 606, 280, 30),
      blk('glass', 1110, 535, 34, 110),
      blk('glass', 1250, 535, 34, 110),
      blk('wood', 1180, 467, 190, 26)
    ]
  },
  {
    id: 3,
    name: '玻璃塔',
    sub: '第 3 关',
    birds: ['yellow', 'blue', 'black', 'red'],
    par: 6400,
    pigs: [{ x: 1140, y: 754 }, { x: 1260, y: 754 }, { x: 1200, y: 576 }, { x: 1200, y: 440 }],
    blocks: [
      blk('wood', 1080, 705, 34, 150),
      blk('wood', 1200, 705, 34, 150),
      blk('wood', 1320, 705, 34, 150),
      blk('wood', 1200, 616, 330, 28),
      blk('glass', 1120, 547, 34, 110),
      blk('glass', 1280, 547, 34, 110),
      blk('stone', 1200, 479, 230, 26)
    ]
  },
  {
    id: 4,
    name: '终极堡垒',
    sub: '第 4 关',
    birds: ['red', 'yellow', 'blue', 'black', 'black'],
    par: 8600,
    pigs: [{ x: 1150, y: 754 }, { x: 1250, y: 754 }, { x: 1200, y: 544 }, { x: 1200, y: 396 }],
    blocks: [
      blk('stone', 1080, 690, 44, 180),
      blk('stone', 1320, 690, 44, 180),
      blk('wood', 1200, 585, 320, 30),
      blk('glass', 1120, 510, 34, 120),
      blk('glass', 1280, 510, 34, 120),
      blk('stone', 1200, 436, 240, 28),
      blk('wood', 1110, 732, 26, 70),
      blk('wood', 1290, 732, 26, 70)
    ]
  }
];

const BIRD_INFO = {
  red:    { name: '红鸟', ability: '硬撞', color: '#e63946', dark: '#a81f2d', radius: 24, density: 0.02 },
  yellow: { name: '黄鸟', ability: '加速冲刺', color: '#ffc93c', dark: '#d8a013', radius: 22, density: 0.018 },
  blue:   { name: '蓝鸟', ability: '一分为三', color: '#4cc0e8', dark: '#2585ad', radius: 19, density: 0.016 },
  black:  { name: '黑鸟', ability: '爆炸', color: '#383c45', dark: '#1e2128', radius: 26, density: 0.026 }
};

const PHYSICS = {
  gravity: 1.2,
  gravityAccel: 0.4,          // 预览抛物线用的每步加速度
  launchFactor: 0.135,        // 拉伸 1px -> 出手速度
  maxStretch: 152
};

const SLING = { x: 232, y: 600, maxStretch: PHYSICS.maxStretch };
