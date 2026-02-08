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
    'north-1': { name: '第1歩兵師団', zone: 'north' },
    'capital-1': { name: '第2装甲師団', zone: 'capital' },
    'mountain-1': { name: '第3山岳師団', zone: 'mountain' },
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
  mapTiles: document.querySelectorAll('.tile'),
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
};

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
      item.textContent = `${division.name} — ${zoneLabel(division.zone)}`;
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
    north: '北部戦線',
    central: '中部戦線',
    south: '南部戦線',
    mountain: '山岳地帯',
    capital: '首都圏',
    strait: '海峡',
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
document.querySelector('.map').addEventListener('click', handleMapClick);
