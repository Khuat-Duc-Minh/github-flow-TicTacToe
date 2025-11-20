/* script.js
   Game logic for TicTacToe (works with index.html from feature/ui).
   - Board is an array of 9 elements: null | 'X' | 'O'
   - Handles moves, win detection, draw, reset, simple AI, keyboard support
*/

(() => {
  // Elements
  const statusElem = document.getElementById('status');
  const boardElem  = document.getElementById('board');
  const resetBtn   = document.getElementById('resetBtn');
  const aiBtn      = document.getElementById('aiBtn');

  // Game state
  let board = Array(9).fill(null); // indices 0..8
  let xIsNext = true; // true => X to play
  let gameOver = false;
  let vsAI = false;

  // Winning combinations
  const WINNING_LINES = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];

  // --- Render function ---
  function render() {
    // update each cell
    const cells = boardElem.querySelectorAll('.cell');
    cells.forEach(cell => {
      const i = Number(cell.dataset.index);
      cell.textContent = board[i] || '';
      cell.classList.toggle('x', board[i] === 'X');
      cell.classList.toggle('o', board[i] === 'O');
      cell.disabled = !!board[i] || gameOver;
      // remove win highlight (set later if winner)
      cell.classList.remove('win');
    });

    // check winner or draw
    const winnerInfo = calculateWinner(board);
    if (winnerInfo) {
      const { winner, line } = winnerInfo;
      statusElem.textContent = `Winner: ${winner}`;
      // highlight the winning cells
      line.forEach(i => {
        const winCell = boardElem.querySelector(`.cell[data-index="${i}"]`);
        if (winCell) winCell.classList.add('win');
      });
      gameOver = true;
      // disable all cells explicitly
      boardElem.querySelectorAll('.cell').forEach(c => c.disabled = true);
      return;
    }

    // draw?
    if (board.every(Boolean)) {
      statusElem.textContent = "It's a draw!";
      gameOver = true;
      return;
    }

    // normal state
    statusElem.textContent = `Turn: ${xIsNext ? 'X' : 'O'}`;
  }

  // --- Event handler for cell click ---
  function handleCellClick(e) {
    if (gameOver) return;
    const i = Number(e.currentTarget.dataset.index);
    if (board[i]) return; // already taken
    board[i] = xIsNext ? 'X' : 'O';
    xIsNext = !xIsNext;
    render();

    // if vsAI is on and it's now O's turn (AI plays 'O'), trigger AI
    if (!gameOver && vsAI && !xIsNext) {
      // small delay for UX
      setTimeout(aiMove, 250);
    }
  }

  // --- Winner detection (returns {winner, line} or null) ---
  function calculateWinner(bd) {
    for (const line of WINNING_LINES) {
      const [a, b, c] = line;
      if (bd[a] && bd[a] === bd[b] && bd[a] === bd[c]) {
        return { winner: bd[a], line };
      }
    }
    return null;
  }

  // --- Reset game ---
  function resetGame() {
    board = Array(9).fill(null);
    xIsNext = true;
    gameOver = false;
    render();
  }

  // --- Simple AI for 'O' ---
  // Strategy:
  // 1) if AI can win in one move -> play it
  // 2) else if opponent can win next move -> block it
  // 3) else take center if free
  // 4) else take a corner
  // 5) else take first available
  function aiMove() {
    const emptyIndices = board
      .map((v, i) => (v === null ? i : null))
      .filter(i => i !== null);

    if (emptyIndices.length === 0) return;

    // helper to test a hypothetical move
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

    // 4) corners preference
    const corners = [0,2,6,8].filter(i => board[i] === null);
    if (corners.length > 0) {
      const choice = corners[Math.floor(Math.random() * corners.length)];
      board[choice] = 'O';
      xIsNext = true;
      render();
      return;
    }

    // 5) fallback: random empty
    const choice = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    board[choice] = 'O';
    xIsNext = true;
    render();
  }

  // --- Attach listeners to existing .cell elements ---
  function attachListeners() {
    boardElem.querySelectorAll('.cell').forEach(cell => {
      cell.removeEventListener('click', handleCellClick); // safe to call
      cell.addEventListener('click', handleCellClick);
    });
  }

  // --- Keyboard support (1-9 keys map to cells 0-8) ---
  function keyboardSupport(e) {
    if (gameOver) return;
    const k = e.key;
    if (/^[1-9]$/.test(k)) {
      const idx = Number(k) - 1;
      const cell = boardElem.querySelector(`.cell[data-index="${idx}"]`);
      if (cell && !board[idx]) {
        cell.click();
      }
    }
  }

  // --- Initialize ---
  function init() {
    attachListeners();
    resetBtn && resetBtn.addEventListener('click', resetGame);
    aiBtn && aiBtn.addEventListener('click', () => {
      vsAI = !vsAI;
      aiBtn.textContent = vsAI ? 'Playing vs AI' : 'Play vs AI';
      resetGame(); // restart when toggling AI to keep states clean
    });
    window.addEventListener('keydown', keyboardSupport);
    render();
  }

  // run init on DOMContentLoaded if script placed in head; but our index.html puts script at end
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
