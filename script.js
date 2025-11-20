/* script.js - game logic + animations + WebAudio sound polish
   - Works with index.html (cells with data-index and controls)
   - No external audio files; uses WebAudio oscillator + simple sequences
*/

(() => {
  // Elements
  const statusElem = document.getElementById('status');
  const boardElem  = document.getElementById('board');
  const resetBtn   = document.getElementById('resetBtn');
  const aiBtn      = document.getElementById('aiBtn');
  const soundBtn   = document.getElementById('soundBtn');

  // Game state
  let board = Array(9).fill(null); // indices 0..8
  let xIsNext = true; // true => X to play
  let gameOver = false;
  let vsAI = false;
  let soundOn = true;

  // Winning combinations
  const WINNING_LINES = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];

  // --- AUDIO (WebAudio helper) ---
  // Simple helper to play short tones without external files
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function ensureAudioCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new AudioCtx();
      } catch (e) {
        audioCtx = null;
      }
    }
    return !!audioCtx;
  }

  // play a single tone
  function playTone(freq = 440, duration = 0.12, type = 'sine', gain = 0.08) {
    if (!soundOn || !ensureAudioCtx()) return;
    const ctx = audioCtx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.01);
    o.start(now);
    g.gain.linearRampToValueAtTime(0.0001, now + duration);
    o.stop(now + duration + 0.02);
  }

  // play short place sound (X/O)
  function playPlaceSound() {
    // quick two-tone click
    playTone(880, 0.06, 'square', 0.06);
    setTimeout(() => playTone(1200, 0.06, 'sawtooth', 0.04), 70);
  }

  // play win melody (sequence)
  function playWinSound() {
    if (!soundOn || !ensureAudioCtx()) return;
    const melody = [880, 1046, 1318]; // A5, C6, E6
    melody.forEach((f, idx) => {
      setTimeout(() => playTone(f, 0.14, 'triangle', 0.09), idx * 180);
    });
  }

  // play reset chime
  function playResetSound() {
    // arpeggio downward
    const seq = [1200, 980, 760];
    seq.forEach((f, i) => setTimeout(() => playTone(f, 0.10, 'sine', 0.06), i * 90));
  }

  // --- Render function ---
  function render() {
    const cells = boardElem.querySelectorAll('.cell');
    cells.forEach(cell => {
      const i = Number(cell.dataset.index);
      const prev = cell.textContent || '';
      const now = board[i] || '';
      cell.textContent = now;
      cell.classList.toggle('x', now === 'X');
      cell.classList.toggle('o', now === 'O');
      cell.disabled = !!now || gameOver;
      cell.classList.remove('win');

      // if newly placed (prev empty & now filled) add pop + sound
      if (!prev && now) {
        cell.classList.add('pop');
        // remove pop after animation ends (safety timeout)
        setTimeout(() => cell.classList.remove('pop'), 400);
        playPlaceSound();
      }
    });

    const winnerInfo = calculateWinner(board);
    if (winnerInfo) {
      const { winner, line } = winnerInfo;
      statusElem.textContent = `Winner: ${winner}`;
      statusElem.classList.add('winner');
      statusElem.setAttribute('aria-live', 'assertive');
      line.forEach(i => {
        const winCell = boardElem.querySelector(`.cell[data-index="${i}"]`);
        if (winCell) {
          winCell.classList.add('win');
          winCell.setAttribute('aria-label', `Winning cell ${i+1}, ${winner} wins`);
        }
      });
      gameOver = true;
      boardElem.querySelectorAll('.cell').forEach(c => c.disabled = true);
      // sound for win
      playWinSound();
      return;
    }

    if (board.every(Boolean)) {
      statusElem.textContent = "It's a draw!";
      statusElem.classList.remove('winner');
      statusElem.setAttribute('aria-live', 'assertive');
      gameOver = true;
      return;
    }

    statusElem.classList.remove('winner');
    statusElem.textContent = `Turn: ${xIsNext ? 'X' : 'O'}`;
    statusElem.setAttribute('aria-live', 'polite');
  }

  // --- Event handler for cell click ---
  function handleCellClick(e) {
    if (gameOver) return;
    const i = Number(e.currentTarget.dataset.index);
    if (board[i]) return;
    board[i] = xIsNext ? 'X' : 'O';
    xIsNext = !xIsNext;
    render();

    if (!gameOver && vsAI && !xIsNext) {
      scheduleAI();
    }
  }

  // --- Winner detection ---
  function calculateWinner(bd) {
    for (const line of WINNING_LINES) {
      const [a, b, c] = line;
      if (bd[a] && bd[a] === bd[b] && bd[a] === bd[c]) {
        return { winner: bd[a], line };
      }
    }
    return null;
  }

  // --- Reset with per-cell flash + reset sound ---
  function resetGame() {
    // retrigger flash reliably
    boardElem.classList.remove('flash');
    void boardElem.offsetWidth;
    boardElem.classList.add('flash');

    const FLASH_DURATION_MS = 600; // must match CSS
    playResetSound();

    setTimeout(() => {
      board = Array(9).fill(null);
      xIsNext = true;
      gameOver = false;

      boardElem.querySelectorAll('.cell').forEach((c, i) => {
        c.textContent = '';
        c.disabled = false;
        c.classList.remove('x', 'o', 'win', 'pop');
        c.setAttribute('aria-label', `Ô ${i+1}`);
      });

      boardElem.classList.remove('flash');

      if (statusElem) {
        statusElem.textContent = `Turn: ${xIsNext ? 'X' : 'O'}`;
        statusElem.setAttribute('aria-live', 'polite');
        statusElem.classList.remove('winner');
      }

      render();
    }, FLASH_DURATION_MS + 20);
  }

  // --- Simple AI (same as before) ---
  function aiMove() {
    const emptyIndices = board
      .map((v, i) => (v === null ? i : null))
      .filter(i => i !== null);

    if (emptyIndices.length === 0) return;

    const testWin = (index, player) => {
      const copy = [...board];
      copy[index] = player;
      return !!calculateWinner(copy);
    };

    // 1) try to win
    for (const idx of emptyIndices) {
      if (testWin(idx, 'O')) {
        board[idx] = 'O';
        xIsNext = true;
        render();
        return;
      }
    }
    // 2) block X
    for (const idx of emptyIndices) {
      if (testWin(idx, 'X')) {
        board[idx] = 'O';
        xIsNext = true;
        render();
        return;
      }
    }
    // 3) center
    if (board[4] === null) {
      board[4] = 'O';
      xIsNext = true;
      render();
      return;
    }
    // 4) corners
    const corners = [0,2,6,8].filter(i => board[i] === null);
    if (corners.length > 0) {
      const choice = corners[Math.floor(Math.random() * corners.length)];
      board[choice] = 'O';
      xIsNext = true;
      render();
      return;
    }
    // 5) fallback
    const choice = emptyIndices[Math.floor(Math.random()*emptyIndices.length)];
    board[choice] = 'O';
    xIsNext = true;
    render();
  }

  function scheduleAI() {
    if (typeof window._aiTimeout !== 'undefined') clearTimeout(window._aiTimeout);
    window._aiTimeout = setTimeout(aiMove, 240);
  }

  // --- Attach listeners ---
  function attachListeners() {
    boardElem.querySelectorAll('.cell').forEach(cell => {
      cell.removeEventListener('click', handleCellClick);
      cell.addEventListener('click', handleCellClick);
    });

    resetBtn && resetBtn.addEventListener('click', resetGame);

    aiBtn && aiBtn.addEventListener('click', () => {
      vsAI = !vsAI;
      aiBtn.textContent = vsAI ? 'Playing vs AI' : 'Play vs AI';
      // restart round when toggling AI for clarity
      resetGame();
    });

    soundBtn && soundBtn.addEventListener('click', () => {
      soundOn = !soundOn;
      soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      soundBtn.textContent = soundOn ? 'Sound: On' : 'Sound: Off';
      // initialize audio context only when turned on
      if (soundOn) ensureAudioCtx();
    });
  }

  // keyboard support: 1..9 map to 0..8
  function keyboardSupport(e) {
    if (gameOver) return;
    const k = e.key;
    if (/^[1-9]$/.test(k)) {
      const idx = Number(k) - 1;
      const cell = boardElem.querySelector(`.cell[data-index="${idx}"]`);
      if (cell && !board[idx]) cell.click();
    }
  }

  function init() {
    attachListeners();
    // initialize soundOn state from button if exists
    if (soundBtn) {
      const pressed = soundBtn.getAttribute('aria-pressed');
      soundOn = pressed !== 'false';
      soundBtn.textContent = soundOn ? 'Sound: On' : 'Sound: Off';
    }
    window.addEventListener('keydown', keyboardSupport);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
