<template>
  <div class="map-root">
    <div class="map-header">
      <div class="map-title">
        <div class="map-title-main">斋明学园 · 校园地图</div>
        <div class="map-title-sub">Map APP - 简易俯视图</div>
      </div>
      <div class="map-legend">
        <span class="map-legend-item map-pill-teach">教学区</span>
        <span class="map-legend-item map-pill-life">生活区</span>
        <span class="map-legend-item map-pill-sport">运动区</span>
        <span class="map-legend-item map-pill-outdoor">户外/边缘</span>
      </div>
    </div>

    <div class="map-layout">
      <div class="map-canvas">
        <div class="map-canvas-bg">
          <div class="map-grid map-grid-h"></div>
          <div class="map-grid map-grid-v"></div>
        </div>

        <button
          v-for="loc in locations"
          :key="loc.id"
          type="button"
          class="map-marker"
          :class="[`map-marker--${loc.category}`, { 'map-marker--active': loc.id === selectedId }]"
          :style="{
            left: `${loc.x}%`,
            top: `${loc.y}%`,
          }"
          @click="select(loc.id)"
        >
          <span class="map-marker-dot"></span>
          <span class="map-marker-label">
            {{ loc.label }}
          </span>
        </button>
      </div>

      <aside class="map-panel" aria-label="地点详情">
        <header class="map-panel-header">
          <div class="map-panel-tag" :class="`map-panel-tag--${selected.category}`">
            {{ categoryName(selected.category) }}
          </div>
          <div class="map-panel-name">
            {{ selected.name }}
          </div>
          <div class="map-panel-location">
            {{ selected.locationHint }}
          </div>
        </header>

        <p class="map-panel-desc">
          {{ selected.summary }}
        </p>

        <ul v-if="selected.highlights?.length" class="map-panel-list">
          <li v-for="(h, idx) in selected.highlights" :key="idx">
            {{ h }}
          </li>
        </ul>

        <p class="map-panel-footnote">这是一个示意图，用来帮助玩家在脑中建立「斋明学园」的空间感，不是精确地图。</p>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

type Category = 'teach' | 'life' | 'sport' | 'outdoor';

type MapLocation = {
  id: string;
  name: string;
  label: string;
  category: Category;
  x: number;
  y: number;
  locationHint: string;
  summary: string;
  highlights?: string[];
};

const locations: MapLocation[] = [
  {
    id: 'main-building',
    name: '校舍本馆',
    label: '本馆',
    category: 'teach',
    x: 42,
    y: 38,
    locationHint: '教学区 · 校园中央偏前方',
    summary:
      '学园的主教学楼与行政中枢，一到五层分别是一年级到三年级教室、教职员室，以及校长室、理事长室等。大部分白天课程都会在这里进行。',
    highlights: [
      '屋顶平台与园艺部温室位于屋顶，是放学后约会与秘密谈话的热门地点。',
      '三楼靠近楼梯的区域是学生会室，经常会有风纪检查或学生会会议。',
      '一楼升降口与中央大厅，是早晚与放学人流最密集的地方。',
    ],
  },
  {
    id: 'lab-building',
    name: '综合实验楼',
    label: '实验楼',
    category: 'teach',
    x: 60,
    y: 32,
    locationHint: '教学区 · 本馆右侧',
    summary: '理科实验室、图书室、自习室、美术室、音乐室等都集中在这栋现代化建筑内，是文化社团与成绩优等生常驻的区域。',
    highlights: [
      '三楼的综合图书室与独立自习室气氛安静，适合偷听、偶遇和制造“偶然邂逅”。',
      '二楼的理科实验室和视听室，经常会因为课程安排出现「只有少数人留下」的时间段。',
    ],
  },
  {
    id: 'canteen',
    name: '餐饮与医疗综合馆',
    label: '食堂·保健',
    category: 'life',
    x: 28,
    y: 48,
    locationHint: '生活区 · 本馆左下方的独立建筑',
    summary: '一楼是宽敞的学生食堂与露天咖啡区，二楼则是教职工餐厅与保健中心。中午与放学后都十分热闹。',
    highlights: [
      '食堂的落地窗面向中庭，可以从远处观察来往学生的动向。',
      '校医室与保健中心位于楼上，是发生“意外”后最自然的去处。',
    ],
  },
  {
    id: 'gym',
    name: '体育馆主馆',
    label: '体育馆',
    category: 'sport',
    x: 70,
    y: 52,
    locationHint: '运动区 · 靠近运动场一侧',
    summary: '用于全校集会、球技大会和各类室内运动赛事的大型体育馆。一楼是主场地与器材室，二楼为观众看台与通道。',
    highlights: [
      '更衣室与淋浴间位于侧翼深处，动线相对隐蔽。',
      '球技大会、体育祭等大型活动时，这里会成为全校视线的中心。',
    ],
  },
  {
    id: 'club-building',
    name: '社团大楼（部室栋）',
    label: '社团栋',
    category: 'sport',
    x: 76,
    y: 40,
    locationHint: '运动区 · 体育馆旁',
    summary: '集中安置各种文化社团、运动部的部室。放学后直到傍晚都是人来人往的时间段，社团招新周更是异常喧闹。',
    highlights: [
      '二楼多为文化社团，房门常常半掩着，是“被路过的人看到一眼”的尴尬场景制造机。',
      '一楼连接运动场，方便运动部在练习与休息间往返。',
    ],
  },
  {
    id: 'dorm-girls',
    name: '女生宿舍',
    label: '女生宿',
    category: 'life',
    x: 20,
    y: 26,
    locationHint: '宿舍区 · 校园左上角',
    summary: '高规格的女生专用宿舍，管理严格但内装接近高级公寓。多数千金与有钱人家的女儿都会选择入住这里。',
    highlights: ['宿舍区与教学楼之间有规定的通学路线，早晚都会出现固定的“人流时间”。'],
  },
  {
    id: 'dorm-boys',
    name: '男生宿舍',
    label: '男生宿',
    category: 'life',
    x: 24,
    y: 18,
    locationHint: '宿舍区 · 靠近校园边缘',
    summary: '由于男生人数极少，男生宿舍规模不大，气氛也与女生宿舍完全不同，更像是被遗忘在角落的小据点。',
    highlights: ['从这里前往教学楼的途中，能明显感受到自己被淹没在女生人海之中的视线差异。'],
  },
  {
    id: 'gate',
    name: '正门与林荫大道',
    label: '正门',
    category: 'outdoor',
    x: 50,
    y: 70,
    locationHint: '户外 · 校园前端',
    summary: '带有巨大锻铁校门与石碑的正式出入口，往里是一条笔直的林荫大道，尽头连向欧式中庭与校舍本馆。',
    highlights: [
      '每天的登校与放学都会在这里形成“流量高峰”，是观察全校人群氛围的最佳地点。',
      '地下停车场入口隐蔽在一侧，供教职工与大小姐们的专车使用。',
    ],
  },
  {
    id: 'field',
    name: '运动场区域',
    label: '运动场',
    category: 'sport',
    x: 80,
    y: 64,
    locationHint: '运动区 · 校园右下角',
    summary: '大操场、跑道、网球场、弓道场与马术练习场等运动设施集中在此，是体育课与各类比赛的主要舞台。',
    highlights: [
      '球技大会、体育祭、社团联合训练都会在这里发生，氛围从远处就能感受到热度。',
      '视野开阔，黄昏时分的天空与灯光会给人一种“故事即将发生”的预感。',
    ],
  },
  {
    id: 'back-mountain',
    name: '后山与旧校舍',
    label: '后山',
    category: 'outdoor',
    x: 10,
    y: 60,
    locationHint: '户外 · 校园后方边缘',
    summary: '校园后侧的幽静区域，有小树林与被封锁的旧校舍。传闻中经常与“试胆大会”或都市怪谈联系在一起。',
    highlights: [
      '白天几乎没什么人刻意经过，夜间更是容易让人产生“只属于我们两人的空间”错觉。',
      '旧校舍虽然被官方标注为危险区域，但总会有人偷偷摸进去。',
    ],
  },
];

const selectedId = ref<MapLocation['id']>(locations[0]?.id ?? 'main-building');

const selected = computed(() => {
  return locations.find(l => l.id === selectedId.value) ?? locations[0];
});

function select(id: MapLocation['id']) {
  selectedId.value = id;
}

function categoryName(c: Category): string {
  switch (c) {
    case 'teach':
      return '教学区';
    case 'life':
      return '生活区';
    case 'sport':
      return '运动区';
    case 'outdoor':
      return '户外/边缘';
    default:
      return '';
  }
}
</script>

<style lang="scss" scoped>
.map-root {
  width: 100%;
  padding: 12px;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  color: #e5e7eb;
  box-sizing: border-box;
}

.map-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 8px;
}

.map-title-main {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.map-title-sub {
  font-size: 12px;
  opacity: 0.7;
}

.map-legend {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 11px;
}

.map-legend-item {
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: rgba(15, 23, 42, 0.75);
  white-space: nowrap;
}

.map-pill-teach {
  border-color: rgba(129, 140, 248, 0.8);
}

.map-pill-life {
  border-color: rgba(244, 114, 182, 0.8);
}

.map-pill-sport {
  border-color: rgba(52, 211, 153, 0.8);
}

.map-pill-outdoor {
  border-color: rgba(248, 250, 252, 0.6);
}

.map-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 10px;
  align-items: stretch;
}

.map-canvas {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 14px;
  overflow: hidden;
  background: radial-gradient(circle at 20% 0%, #1d263b, #020617);
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.9),
    0 18px 50px rgba(15, 23, 42, 0.65);
}

.map-canvas-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.map-grid {
  position: absolute;
  inset: 0;
  opacity: 0.18;
  background-size: 20px 20px;
}

.map-grid-h {
  background-image: linear-gradient(to bottom, rgba(148, 163, 184, 0.35) 1px, transparent 1px);
}

.map-grid-v {
  background-image: linear-gradient(to right, rgba(148, 163, 184, 0.35) 1px, transparent 1px);
}

.map-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 0;
  background: rgba(15, 23, 42, 0.88);
  color: #e5e7eb;
  font-size: 11px;
  cursor: pointer;
  box-shadow: 0 0 0 1px rgba(30, 64, 175, 0);
  transition:
    transform 120ms ease-out,
    box-shadow 120ms ease-out,
    background 120ms ease-out,
    color 120ms ease-out;
}

.map-marker-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  box-shadow: 0 0 10px rgba(251, 113, 133, 0);
}

.map-marker-label {
  white-space: nowrap;
}

.map-marker--teach .map-marker-dot {
  background: #818cf8;
}

.map-marker--life .map-marker-dot {
  background: #f472b6;
}

.map-marker--sport .map-marker-dot {
  background: #34d399;
}

.map-marker--outdoor .map-marker-dot {
  background: #e5e7eb;
}

.map-marker--active {
  background: rgba(15, 23, 42, 0.98);
  transform: translate(-50%, -50%) scale(1.02);
  box-shadow:
    0 0 0 1px rgba(129, 140, 248, 0.8),
    0 8px 20px rgba(15, 23, 42, 0.9);
}

.map-marker--active .map-marker-dot {
  box-shadow: 0 0 10px rgba(129, 140, 248, 0.9);
}

.map-marker:hover:not(.map-marker--active) {
  transform: translate(-50%, -50%) scale(1.03);
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.9);
}

.map-panel {
  border-radius: 14px;
  padding: 10px;
  background: radial-gradient(circle at 0% 0%, rgba(30, 64, 175, 0.4), rgba(15, 23, 42, 0.98));
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.95);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-panel-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.map-panel-tag {
  align-self: flex-start;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.7);
  background: rgba(15, 23, 42, 0.7);
}

.map-panel-tag--teach {
  border-color: rgba(129, 140, 248, 0.9);
}

.map-panel-tag--life {
  border-color: rgba(244, 114, 182, 0.9);
}

.map-panel-tag--sport {
  border-color: rgba(52, 211, 153, 0.9);
}

.map-panel-tag--outdoor {
  border-color: rgba(248, 250, 252, 0.9);
}

.map-panel-name {
  font-size: 15px;
  font-weight: 600;
}

.map-panel-location {
  font-size: 12px;
  opacity: 0.8;
}

.map-panel-desc {
  margin: 0;
  line-height: 1.6;
  color: #e5e7eb;
}

.map-panel-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #cbd5f5;
}

.map-panel-footnote {
  margin: 0;
  margin-top: 6px;
  font-size: 11px;
  opacity: 0.7;
}

@media (max-width: 640px) {
  .map-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .map-legend {
    width: 100%;
    margin-left: 0;
  }

  .map-canvas {
    aspect-ratio: 4 / 3;
  }
}
</style>
