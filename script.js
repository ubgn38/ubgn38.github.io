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

  // ---------- 최고 기록 ----------
  function loadBest() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveBest(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* 저장 불가 환경 무시 */ }
  }

  // 시간 우선, 같으면 이동 횟수로 비교
  function checkBest() {
    const best = loadBest();
    const cur = best[size];
    const better = !cur || seconds < cur.time || (seconds === cur.time && moves < cur.moves);
    if (better) {
      best[size] = { time: seconds, moves };
      saveBest(best);
    }
    return better;
  }

  function showBest() {
    const best = loadBest();
    bestList.innerHTML = '';
    [3, 4, 5].forEach(n => {
      const li = document.createElement('li');
      const rec = best[n];
      li.innerHTML = `<span>${n} x ${n}</span><span>${
        rec ? `${formatTime(rec.time)} / ${rec.moves}번` : '-'
      }</span>`;
      bestList.appendChild(li);
    });
    bestDialog.showModal();
  }

  // ---------- 게임 시작 / 종료 ----------
  function finish() {
    solved = true;
    stopTimer();
    render();
    const isNew = checkBest();
    messageEl.textContent = `완성! ${formatTime(seconds)}, ${moves}번 이동` + (isNew ? ' · 최고 기록' : '');
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
    if (bestDialog.open) return;
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
  document.getElementById('showBest').addEventListener('click', showBest);
  document.getElementById('closeBest').addEventListener('click', () => bestDialog.close());
  document.getElementById('resetBest').addEventListener('click', () => {
    if (confirm('최고 기록을 모두 지울까요?')) {
      saveBest({});
      showBest();
    }
  });

  newGame();
})();
