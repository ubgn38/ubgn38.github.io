(() => {
  const GAP = 1.5; // 타일 간격 (%)
  const STORAGE_KEY = 'slidePuzzleBest';

  const boardEl = document.getElementById('board');
  const movesEl = document.getElementById('moves');
  const timeEl = document.getElementById('time');
  const messageEl = document.getElementById('message');
  const sizeEl = document.getElementById('size');
  const bestDialog = document.getElementById('bestDialog');
  const bestList = document.getElementById('bestList');

  let size = 4;
  let tiles = [];          // tiles[위치] = 숫자 (0 = 빈칸)
  let tileEls = {};        // 숫자 -> DOM 요소
  let moves = 0;
  let seconds = 0;
  let timer = null;
  let solved = false;

  // ---------- 보드 생성 ----------
  function buildBoard() {
    boardEl.innerHTML = '';
    tileEls = {};
    const tileSize = (100 - GAP * (size + 1)) / size;
    const fontSize = Math.max(16, 120 / size);

    for (let n = 1; n < size * size; n++) {
      const el = document.createElement('div');
      el.className = 'tile';
      el.textContent = n;
      el.style.width = tileSize + '%';
      el.style.height = tileSize + '%';
      el.style.fontSize = `clamp(14px, ${fontSize / 10}vw, ${fontSize}px)`;
      el.addEventListener('click', () => moveTile(tiles.indexOf(n)));
      boardEl.appendChild(el);
      tileEls[n] = el;
    }
  }

  function render() {
    const tileSize = (100 - GAP * (size + 1)) / size;
    tiles.forEach((n, pos) => {
      if (!n) return;
      const r = Math.floor(pos / size);
      const c = pos % size;
      const el = tileEls[n];
      el.style.left = GAP + c * (tileSize + GAP) + '%';
      el.style.top = GAP + r * (tileSize + GAP) + '%';
      el.classList.toggle('correct', n === pos + 1);
    });
    boardEl.classList.toggle('solved', solved);
  }

  // ---------- 게임 로직 ----------
  function neighbors(pos) {
    const r = Math.floor(pos / size);
    const c = pos % size;
    const list = [];
    if (r > 0) list.push(pos - size);
    if (r < size - 1) list.push(pos + size);
    if (c > 0) list.push(pos - 1);
    if (c < size - 1) list.push(pos + 1);
    return list;
  }

  // 빈칸을 무작위로 움직여 섞음 → 항상 풀 수 있는 배치
  function shuffle() {
    tiles = Array.from({ length: size * size - 1 }, (_, i) => i + 1).concat(0);
    let empty = tiles.length - 1;
    let prev = -1;
    const steps = size * size * 30;

    for (let i = 0; i < steps; i++) {
      const options = neighbors(empty).filter(p => p !== prev);
      const next = options[Math.floor(Math.random() * options.length)];
      tiles[empty] = tiles[next];
      tiles[next] = 0;
      prev = empty;
      empty = next;
    }

    // 우연히 완성 상태면 다시 섞기
    if (isSolved()) return shuffle();
  }

  function isSolved() {
    for (let i = 0; i < tiles.length - 1; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return true;
  }

  function moveTile(pos) {
    if (solved || pos < 0) return;
    const empty = tiles.indexOf(0);
    if (!neighbors(empty).includes(pos)) return;

    tiles[empty] = tiles[pos];
    tiles[pos] = 0;
    moves++;
    startTimer();
    updateStats();
    render();

    if (isSolved()) finish();
  }

  // 방향 = 빈칸 기준으로 타일이 움직이는 방향
  function moveByDirection(dir) {
    const empty = tiles.indexOf(0);
    const r = Math.floor(empty / size);
    const c = empty % size;
    let target = -1;
    if (dir === 'up' && r < size - 1) target = empty + size;
    if (dir === 'down' && r > 0) target = empty - size;
    if (dir === 'left' && c < size - 1) target = empty + 1;
    if (dir === 'right' && c > 0) target = empty - 1;
    moveTile(target);
  }

  // ---------- 타이머 / 통계 ----------
  function startTimer() {
    if (timer) return;
    timer = setInterval(() => {
      seconds++;
      updateStats();
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  function formatTime(s) {
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function updateStats() {
    movesEl.textContent = moves;
    timeEl.textContent = formatTime(seconds);
  }

  // ---------- 랭킹 (난이도별 TOP 3) ----------
  // 저장 형식: { "3": [{name, time, moves, date}, ...], "4": [...], "5": [...] }
  const RANK_KEY = 'slidePuzzleRanking';
  const NAME_KEY = 'slidePuzzleLastName';
  const MAX_RANK = 3;
  const nameDialog = document.getElementById('nameDialog');
  const nameInput = document.getElementById('playerName');
  const nameError = document.getElementById('nameError');
  let viewSize = 4;        // 랭킹 창에서 보고 있는 난이도
  let lastEntryId = null;  // 방금 등록한 기록 강조용

  function loadRanking() {
    try {
      const data = JSON.parse(localStorage.getItem(RANK_KEY));
      if (data) return data;
      // 이전 버전(최고 기록 1개) 데이터 이전
      const old = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (old) {
        const migrated = {};
        Object.keys(old).forEach(k => {
          migrated[k] = [{ name: '이전 기록', time: old[k].time, moves: old[k].moves, date: '', id: 'old' + k }];
        });
        saveRanking(migrated);
        localStorage.removeItem(STORAGE_KEY);
        return migrated;
      }
    } catch { /* 손상된 데이터 무시 */ }
    return {};
  }

  function saveRanking(data) {
    try {
      localStorage.setItem(RANK_KEY, JSON.stringify(data));
    } catch { /* 저장 불가 환경 무시 */ }
  }

  // 시간 우선, 같으면 이동 횟수 적은 순
  const compare = (a, b) => a.time - b.time || a.moves - b.moves;

  // 이번 기록이 몇 위인지 (TOP 3 밖이면 0)
  function rankOf(time, mv) {
    const list = loadRanking()[size] || [];
    const pos = list.filter(r => compare(r, { time, moves: mv }) <= 0).length + 1;
    return pos <= MAX_RANK ? pos : 0;
  }

  function addRanking(name) {
    const data = loadRanking();
    const list = data[size] || [];
    const entry = {
      name,
      time: seconds,
      moves,
      date: new Date().toISOString().slice(0, 10),
      id: Date.now().toString(36),
    };
    list.push(entry);
    list.sort(compare);
    data[size] = list.slice(0, MAX_RANK);
    saveRanking(data);
    lastEntryId = entry.id;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderRanking() {
    document.querySelectorAll('#rankTabs button').forEach(b => {
      b.classList.toggle('active', Number(b.dataset.size) === viewSize);
    });
    const list = loadRanking()[viewSize] || [];
    bestList.innerHTML = '';
    if (!list.length) {
      bestList.innerHTML = '<li class="empty">아직 기록이 없어요</li>';
      return;
    }
    list.forEach((r, i) => {
      const li = document.createElement('li');
      if (r.id === lastEntryId) li.classList.add('mine');
      li.innerHTML = `
        <span class="medal r${i + 1}">${i + 1}</span>
        <span class="rank-name">${escapeHtml(r.name)}</span>
        <span class="rank-score">${formatTime(r.time)} · ${r.moves}번<small>${r.date || ''}</small></span>`;
      bestList.appendChild(li);
    });
  }

  function showBest(sizeToShow = size) {
    viewSize = sizeToShow;
    renderRanking();
    if (!bestDialog.open) bestDialog.showModal();
  }

  function askName(rank) {
    document.getElementById('rankTitle').textContent = `${rank}위 기록!`;
    document.getElementById('rankInfo').textContent =
      `${size} x ${size} · ${formatTime(seconds)} · ${moves}번 이동`;
    nameError.textContent = '';
    try { nameInput.value = localStorage.getItem(NAME_KEY) || ''; } catch { nameInput.value = ''; }
    nameDialog.showModal();
    nameInput.focus();
    nameInput.select();
  }

  document.getElementById('nameForm').addEventListener('submit', e => {
    const name = nameInput.value.trim();
    if (!name) {
      e.preventDefault();
      nameError.textContent = '이름을 입력해 주세요';
      nameInput.focus();
      return;
    }
    try { localStorage.setItem(NAME_KEY, name); } catch { /* 무시 */ }
    addRanking(name);
    messageEl.textContent += ' · 랭킹 등록 완료';
    setTimeout(() => showBest(size), 0);   // 이름 창이 닫힌 뒤 랭킹 표시
  });
  nameInput.addEventListener('input', () => { nameError.textContent = ''; });
  document.getElementById('skipName').addEventListener('click', () => nameDialog.close());

  document.querySelectorAll('#rankTabs button').forEach(b => {
    b.addEventListener('click', () => { viewSize = Number(b.dataset.size); renderRanking(); });
  });

  // ---------- 게임 시작 / 종료 ----------
  function finish() {
    solved = true;
    stopTimer();
    render();
    messageEl.textContent = `완성! ${formatTime(seconds)}, ${moves}번 이동`;
    const rank = rankOf(seconds, moves);
    if (rank) setTimeout(() => askName(rank), 400);   // 마지막 타일 애니메이션 후
  }

  function newGame() {
    size = Number(sizeEl.value);
    stopTimer();
    moves = 0;
    seconds = 0;
    solved = false;
    messageEl.textContent = '';
    buildBoard();
    shuffle();
    updateStats();
    render();
  }

  // ---------- 입력 ----------
  document.addEventListener('keydown', e => {
    if (bestDialog.open || nameDialog.open) return;
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (map[e.key]) {
      e.preventDefault();
      moveByDirection(map[e.key]);
    }
  });

  let touchStart = null;
  boardEl.addEventListener('touchstart', e => {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  boardEl.addEventListener('touchend', e => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return; // 짧은 터치는 click으로 처리
    e.preventDefault();
    if (Math.abs(dx) > Math.abs(dy)) moveByDirection(dx > 0 ? 'right' : 'left');
    else moveByDirection(dy > 0 ? 'down' : 'up');
  });

  document.getElementById('newGame').addEventListener('click', newGame);
  sizeEl.addEventListener('change', newGame);
  document.getElementById('showBest').addEventListener('click', () => showBest(size));
  document.getElementById('closeBest').addEventListener('click', () => bestDialog.close());
  document.getElementById('resetBest').addEventListener('click', () => {
    if (confirm(`${viewSize} x ${viewSize} 랭킹을 지울까요?`)) {
      const data = loadRanking();
      delete data[viewSize];
      saveRanking(data);
      renderRanking();
    }
  });

  newGame();
})();
