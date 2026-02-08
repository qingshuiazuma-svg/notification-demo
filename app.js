const state = {
  date: new Date('1936-01-12T00:00:00'),
  politicalPower: 120,
  stability: 62,
  warSupport: 41,
  civilianFactories: 18,
  militaryFactories: 8,
  manpower: 520,
  currentFocusKey: null,
  focusProgress: 0,
  completedFocuses: new Set(),
  selectedDivisionId: null,
  divisions: {
    'north-1': { name: '第1歩兵師団', zone: 'north', type: 'infantry' },
    'capital-1': { name: '第2装甲師団', zone: 'capital', type: 'armor' },
    'west-1': { name: '第3山岳師団', zone: 'west', type: 'mountain' },
  },
};

const focusEffects = {
  industry: {
    label: '工業優先',
    days: 35,
    prerequisites: [],
    effect() {
      state.civilianFactories += 1;
      state.politicalPower -= 5;
      return '民需工場が1つ完成。政治力が5消費された。';
    },
  },
  military: {
    label: '軍備拡張',
    days: 35,
    prerequisites: ['industry'],
    effect() {
      state.militaryFactories += 1;
      state.warSupport += 2;
      return '軍需工場が1つ完成。戦争協力度が2%上昇。';
    },
  },
  diplomacy: {
    label: '外交攻勢',
    days: 28,
    prerequisites: [],
    effect() {
      state.politicalPower += 8;
      state.stability += 1;
      return '外交通信が成功。政治力+8、安定度+1%。';
    },
  },
  research: {
    label: '研究促進',
    days: 21,
    prerequisites: ['industry'],
    effect() {
      state.politicalPower -= 3;
      state.civilianFactories += 0;
      return '研究資金を投下。次月の研究速度が上昇。';
    },
  },
  stability: {
    label: '治安強化',
    days: 21,
    prerequisites: ['diplomacy'],
    effect() {
      state.stability += 3;
      state.politicalPower -= 4;
      return '国内の治安が改善。安定度+3%。';
    },
  },
  mobilization: {
    label: '動員準備',
    days: 28,
    prerequisites: ['military'],
    effect() {
      state.manpower += 40;
      state.warSupport += 1;
      return '予備役が動員準備に入った。人的資源+40K。';
    },
  },
};

const orderEffects = {
  plan: '作戦計画が更新され、前線の優先目標が設定された。',
  fortify: '防衛線が強化され、敵の突破確率が低下した。',
  air: '航空基地で訓練を開始。航空優勢が上向きだ。',
  navy: '艦隊演習を実施し、制海権が安定した。',
};

const decisionEffects = {
  propaganda: {
    cost: 35,
    effect() {
      state.warSupport += 4;
      state.stability += 1;
      return '宣伝省が拡張され、戦争協力度+4%、安定度+1%。';
    },
  },
  exports: {
    cost: 25,
    effect() {
      state.politicalPower += 5;
      return '貿易交渉が進展し、政治力+5。';
    },
  },
  training: {
    cost: 20,
    effect() {
      state.manpower += 15;
      state.warSupport += 1;
      return '陸軍訓練が強化され、人的資源+15K、戦争協力度+1%。';
    },
  },
};

const elements = {
  politicalPower: document.getElementById('political-power'),
  stability: document.getElementById('stability'),
  warSupport: document.getElementById('war-support'),
  civilianFactories: document.getElementById('civilian-factories'),
  militaryFactories: document.getElementById('military-factories'),
  manpower: document.getElementById('manpower'),
  date: document.getElementById('date'),
  log: document.getElementById('log'),
  advance: document.getElementById('advance'),
  focusGrid: document.getElementById('focus-grid'),
  currentFocus: document.getElementById('current-focus'),
  focusProgress: document.getElementById('focus-progress'),
  focusCompleted: document.getElementById('focus-completed'),
  cancelFocus: document.getElementById('cancel-focus'),
  divisionList: document.getElementById('division-list'),
  selectedDivision: document.getElementById('selected-division'),
  selectionHint: document.getElementById('selection-hint'),
  divisionPortrait: document.getElementById('division-portrait'),
  mapTiles: document.querySelectorAll('.tile'),
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
};

const divisionIcons = {
  infantry: { icon: '🪖', label: '歩兵' },
  armor: { icon: '🛡️', label: '装甲' },
  mountain: { icon: '🏔️', label: '山岳' },
};

const getDivisionIcon = (type) =>
  divisionIcons[type] ?? { icon: '⚑', label: '師団' };

const isFocusCompleted = (focusKey) =>
  state.completedFocuses.has(focusKey);

const isFocusUnlocked = (focusKey) => {
  const focus = focusEffects[focusKey];
  if (!focus) return false;
  return focus.prerequisites.every(isFocusCompleted);
};

const render = () => {
  elements.politicalPower.textContent = state.politicalPower;
  elements.stability.textContent = `${clamp(state.stability, 0, 100)}%`;
  elements.warSupport.textContent = `${clamp(state.warSupport, 0, 100)}%`;
  elements.civilianFactories.textContent = state.civilianFactories;
  elements.militaryFactories.textContent = state.militaryFactories;
  elements.manpower.textContent = `${state.manpower}K`;
  elements.date.textContent = formatDate(state.date);
  elements.currentFocus.textContent = state.currentFocusKey
    ? focusEffects[state.currentFocusKey].label
    : '未設定';
  const progressPercent = state.currentFocusKey
    ? (state.focusProgress / focusEffects[state.currentFocusKey].days) * 100
    : 0;
  elements.focusProgress.style.width = `${Math.min(progressPercent, 100)}%`;
  const completedCount = state.completedFocuses.size;
  const totalCount = Object.keys(focusEffects).length;
  elements.focusCompleted.textContent = `${completedCount}/${totalCount}`;

  elements.focusGrid.querySelectorAll('button').forEach((button) => {
    const focusKey = button.dataset.focus;
    const focus = focusEffects[focusKey];
    if (!focus) return;
    const isCompleted = isFocusCompleted(focusKey);
    const isLocked = !isFocusUnlocked(focusKey);
    const isInProgress = state.currentFocusKey === focusKey;
    button.classList.toggle('completed', isCompleted);
    button.classList.toggle('locked', isLocked);
    button.classList.toggle('in-progress', isInProgress);
    button.disabled = isLocked || isCompleted || Boolean(state.currentFocusKey);
    const status = isCompleted
      ? '完了'
      : isInProgress
        ? '進行中'
        : isLocked
          ? '未解禁'
          : '解禁済み';
    button.textContent = `${focus.label} (${focus.days}日) - ${status}`;
  });

  elements.mapTiles.forEach((tile) => {
    const zone = tile.dataset.zone;
    const hasDivision = Object.values(state.divisions).some(
      (division) => division.zone === zone,
    );
    tile.classList.toggle('selected', hasDivision);
  });

  const selectedDivision = state.selectedDivisionId
    ? state.divisions[state.selectedDivisionId]
    : null;
  if (selectedDivision) {
    const { icon, label } = getDivisionIcon(selectedDivision.type);
    elements.divisionPortrait.textContent = icon;
    elements.divisionPortrait.setAttribute(
      'aria-label',
      `${label}師団のアイコン`,
    );
  } else {
    elements.divisionPortrait.textContent = '？';
    elements.divisionPortrait.removeAttribute('aria-label');
  }
  elements.selectedDivision.textContent = selectedDivision
    ? selectedDivision.name
    : 'なし';
  elements.selectionHint.textContent = selectedDivision
    ? '移動先の地域をクリックしてください。'
    : '師団を選択してください。';
  elements.divisionList
    .querySelectorAll('li')
    .forEach((item) =>
      item.classList.toggle(
        'selected',
        item.dataset.division === state.selectedDivisionId,
      ),
    );
  elements.divisionList
    .querySelectorAll('li')
    .forEach((item) => {
      const division = state.divisions[item.dataset.division];
      if (!division) return;
      const { icon, label } = getDivisionIcon(division.type);
      item.innerHTML = `
        <span class="division-icon ${division.type}" aria-hidden="true">
          ${icon}
        </span>
        <span class="division-text">
          ${division.name}（${label}）— ${zoneLabel(division.zone)}
        </span>
      `;
    });
};

const addLog = (message) => {
  const item = document.createElement('li');
  item.textContent = message;
  elements.log.prepend(item);
  const items = elements.log.querySelectorAll('li');
  if (items.length > 6) {
    items[items.length - 1].remove();
  }
};

const zoneLabel = (zone) => {
  const labels = {
    north: '北方平原',
    'coast-north': '北沿岸',
    capital: '中央州',
    industry: '工業地帯',
    frontline: '前線',
    east: '東部戦線',
    west: '西部戦線',
    mountain: '山岳地帯',
    river: '大河川',
    south: '南方戦線',
    'south-coast': '南沿岸',
    desert: '荒野',
    supply: '補給線',
    'deep-south': '南部奥地',
  };
  return labels[zone] ?? '不明';
};

const advanceDate = () => {
  state.date.setDate(state.date.getDate() + 7);
  state.politicalPower += 6;
  state.stability -= 1;
  addLog('週次報告: 政治力+6、安定度-1%。');
  if (state.currentFocusKey) {
    state.focusProgress += 7;
    const focus = focusEffects[state.currentFocusKey];
    if (state.focusProgress >= focus.days) {
      const report = focus.effect();
      addLog(`国家方針「${focus.label}」が完了。${report}`);
      state.completedFocuses.add(state.currentFocusKey);
      state.currentFocusKey = null;
      state.focusProgress = 0;
    }
  }
  render();
};

const handleFocus = (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const focusKey = button.dataset.focus;
  const focus = focusEffects[focusKey];
  if (!focus) return;
  if (isFocusCompleted(focusKey)) {
    addLog(`国家方針「${focus.label}」は既に完了している。`);
    return;
  }
  if (!isFocusUnlocked(focusKey)) {
    addLog(`国家方針「${focus.label}」は前提を満たしていない。`);
    return;
  }
  if (state.currentFocusKey) {
    addLog(`別の方針が進行中だ。完了または中止してから変更できる。`);
    return;
  }
  state.currentFocusKey = focusKey;
  state.focusProgress = 0;
  addLog(`国家方針「${focus.label}」を開始。完了まで${focus.days}日。`);
  render();
};

const handleOrder = (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const message = orderEffects[button.dataset.order];
  if (!message) return;
  addLog(message);
};

const handleDecision = (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const decision = decisionEffects[button.dataset.decision];
  if (!decision) return;
  if (state.politicalPower < decision.cost) {
    addLog('政治力が不足している。');
    return;
  }
  state.politicalPower -= decision.cost;
  const report = decision.effect();
  addLog(report);
  render();
};

const cancelFocus = () => {
  if (!state.currentFocusKey) return;
  const focus = focusEffects[state.currentFocusKey];
  addLog(`国家方針「${focus.label}」を中止した。`);
  state.currentFocusKey = null;
  state.focusProgress = 0;
  render();
};

const handleDivisionSelect = (event) => {
  const item = event.target.closest('li');
  if (!item) return;
  const divisionId = item.dataset.division;
  if (!state.divisions[divisionId]) return;
  state.selectedDivisionId = divisionId;
  addLog(`${state.divisions[divisionId].name}を選択。`);
  render();
};

const handleMapClick = (event) => {
  const tile = event.target.closest('.tile');
  if (!tile) return;
  if (tile.classList.contains('water')) {
    addLog('海域には移動できない。');
    return;
  }
  if (!state.selectedDivisionId) {
    addLog('移動する師団を先に選択してください。');
    return;
  }
  const zone = tile.dataset.zone;
  const division = state.divisions[state.selectedDivisionId];
  if (!zone || !division) return;
  division.zone = zone;
  addLog(
    `${division.name}が${zoneLabel(zone)}へ移動を開始。`,
  );
  state.selectedDivisionId = null;
  render();
};

render();

elements.advance.addEventListener('click', advanceDate);
elements.focusGrid.addEventListener('click', handleFocus);
document.querySelector('.orders').addEventListener('click', handleOrder);
document.querySelector('.decisions').addEventListener('click', handleDecision);
elements.cancelFocus.addEventListener('click', cancelFocus);
elements.divisionList.addEventListener('click', handleDivisionSelect);
document.querySelector('.map-grid').addEventListener('click', handleMapClick);
