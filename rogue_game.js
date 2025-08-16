class Game {
  constructor() {
    this.width = 40; // ширина карты в клетках
    this.height = 24; // высота карты в клетках
    this.map = []; // двумерный массив, описывающий карту
    this.player = null; // объект игрока
    this.enemies = []; // массив врагов
    this.items = []; // массив предметов
    this.fieldEl = document.querySelector('.field');
    this.tileSize = 20; // размер одной клетки в пикселях
  }

  init() {
    // Последовательность генерации игрового мира
    this.generateMap(); // создаём карту, полностью заполненную стенами
    this.placeRooms(); // создаём случайные комнаты
    this.placeCorridors(); // добавляем коридоры
    this.ensureConnectivity(); // проверяем доступность клеток
    this.placeItems(); // раскладываем предметы
    this.placePlayer(); // размещаем игрока
    this.placeEnemies(); // размещаем врагов
    this.render(); // рисуем карту
    this.bindKeys(); // обрабатываем ввод с клавиатуры
    setInterval(() => this.enemyTurn(), 800); // таймер для ходов врагов
  }

  // Создаём карту, полностью состоящую из стен
  generateMap() {
    for (let y = 0; y < this.height; y++) {
      this.map[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.map[y][x] = { type: 'W' }; // 'W' = стена
      }
    }
  }

  // Генерация случайных комнат (от 5 до 10)
  placeRooms() {
    let roomCount = 5 + Math.floor(Math.random() * 6); // случайное число комнат от 5 до 10
    this.rooms = [];
    let attempts = 0; // число попыток создать комнату

    for (let i = 0; i < roomCount; i++) {
      let placed = false;
      while (!placed && attempts < 1000) {
        // чтобы комнаты гарантированно появились
        attempts++;
        let rw = 3 + Math.floor(Math.random() * 6); // ширина комнаты от 3 до 8
        let rh = 3 + Math.floor(Math.random() * 6); // высота комнаты от 3 до 8
        let rx = Math.floor(Math.random() * (this.width - rw - 1)); // позиция X
        let ry = Math.floor(Math.random() * (this.height - rh - 1)); // позиция Y

        // Проверка пересечения с существующими комнатами
        let overlap = this.rooms.some(
          (r) => rx < r.x + r.w + 1 && rx + rw + 1 > r.x && ry < r.y + r.h + 1 && ry + rh + 1 > r.y,
        );
        if (overlap) continue;

        // Если пересечений нет — создаём комнату
        let room = { x: rx, y: ry, w: rw, h: rh };
        this.rooms.push(room);
        placed = true;

        // Отмечаем клетки комнаты как проходимые
        for (let y = ry; y < ry + rh; y++) {
          for (let x = rx; x < rx + rw; x++) {
            this.map[y][x].type = '-'; // '-' = пол (проходимая клетка)
          }
        }
      }
    }
  }

  // Создание случайных коридоров
  placeCorridors() {
    let horizontalCount = 3 + Math.floor(Math.random() * 3); // 3-5 горизонтальных
    let verticalCount = 3 + Math.floor(Math.random() * 3); // 3-5 вертикальных

    // Горизонтальные коридоры (строки)
    let usedRows = new Set();
    for (let i = 0; i < horizontalCount; i++) {
      let y;
      do {
        y = Math.floor(Math.random() * this.height);
      } while (usedRows.has(y) || usedRows.has(y - 1) || usedRows.has(y + 1)); // чтобы не было двойных дорог
      usedRows.add(y);
      for (let x = 0; x < this.width; x++) {
        this.map[y][x].type = '-'; // превращаем в пол
      }
    }

    // Вертикальные коридоры (столбцы)
    let usedCols = new Set();
    for (let i = 0; i < verticalCount; i++) {
      let x;
      do {
        x = Math.floor(Math.random() * this.width);
      } while (usedCols.has(x) || usedCols.has(x - 1) || usedCols.has(x + 1));
      usedCols.add(x);
      for (let y = 0; y < this.height; y++) {
        this.map[y][x].type = '-';
      }
    }
  }

  // Проверяем доступность всех комнат и коридоров с помощью BFS
  ensureConnectivity() {
    let visited = Array.from({ length: this.height }, () => Array(this.width).fill(false));
    let queue = [];

    // Находим первую доступную клетку (пол)
    outer: for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.map[y][x].type === '-') {
          queue.push({ x, y });
          visited[y][x] = true;
          break outer;
        }
      }
    }

    // BFS обход для пометки всех достижимых клеток
    while (queue.length) {
      let { x, y } = queue.shift();
      let dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      for (let [dx, dy] of dirs) {
        let nx = x + dx,
          ny = y + dy;
        if (this.map[ny] && this.map[ny][nx] && !visited[ny][nx] && this.map[ny][nx].type === '-') {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
    }

    // Все недостижимые клетки превращаем обратно в стены
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.map[y][x].type === '-' && !visited[y][x]) {
          this.map[y][x].type = 'W';
        }
      }
    }
  }

  // Размещение предметов: аптечки и мечи
  placeItems() {
    for (let i = 0; i < 10; i++) this.placeRandomItem('HP'); // аптечки
    for (let i = 0; i < 2; i++) this.placeRandomItem('SW'); // мечи
  }

  // Случайное размещение одного предмета
  placeRandomItem(type) {
    let pos = this.getRandomFreeCell();
    this.map[pos.y][pos.x].type = type;
  }

  // Размещение игрока на случайной свободной клетке
  placePlayer() {
    let pos = this.getRandomFreeCell();
    this.player = { x: pos.x, y: pos.y, hp: 100, maxHp: 100, attack: 10 };
    this.map[pos.y][pos.x].type = 'P';
  }

  // Размещение врагов (10 штук)
  placeEnemies() {
    for (let i = 0; i < 10; i++) {
      let pos = this.getRandomFreeCell();
      let enemy = { x: pos.x, y: pos.y, hp: 100, maxHp: 100, attack: 10 };
      this.enemies.push(enemy);
      this.map[pos.y][pos.x].type = 'E';
    }
  }

  // Получение случайной свободной клетки
  getRandomFreeCell() {
    while (true) {
      let x = Math.floor(Math.random() * this.width);
      let y = Math.floor(Math.random() * this.height);
      if (this.map[y][x].type === '-') return { x, y };
    }
  }

  // Обработка ввода с клавиатуры: WASD = движение, Space = атака
  bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        this.movePlayer(e.code);
      } else if (e.code === 'Space') {
        this.attack();
      }
    });
  }

  // Движение игрока
  movePlayer(code) {
    let dx = 0,
      dy = 0;
    if (code === 'KeyW') dy = -1;
    if (code === 'KeyS') dy = 1;
    if (code === 'KeyA') dx = -1;
    if (code === 'KeyD') dx = 1;
    let nx = this.player.x + dx;
    let ny = this.player.y + dy;

    // Проверка границ карты и препятствий
    if (!this.map[ny] || !this.map[ny][nx]) return;
    if (this.map[ny][nx].type === 'W') return;
    if (this.map[ny][nx].type === 'E') return;

    // Старую клетку освобождаем
    this.map[this.player.y][this.player.x].type = '-';
    this.player.x = nx;
    this.player.y = ny;

    let cell = this.map[ny][nx];
    if (cell.type === 'HP') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30); // лечение аптечкой
    }
    if (cell.type === 'SW') {
      this.player.attack += 10; // каждый новый меч даёт +10 к атаке
    }

    this.map[ny][nx].type = 'P';
    this.render();
  }

  // Атака игрока по врагам, находящимся рядом
  attack() {
    let dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (let d of dirs) {
      let ex = this.player.x + d[0];
      let ey = this.player.y + d[1];
      let enemy = this.enemies.find((e) => e.x === ex && e.y === ey);
      if (enemy) {
        enemy.hp -= this.player.attack;
        if (enemy.hp <= 0) {
          this.map[enemy.y][enemy.x].type = '-';
          this.enemies = this.enemies.filter((e) => e !== enemy);
        }
      }
    }
    this.render();
  }

  // Ход врагов
  enemyTurn() {
    for (let enemy of this.enemies) {
      let dx = this.player.x - enemy.x;
      let dy = this.player.y - enemy.y;

      // Если враг рядом — атакует игрока
      if (Math.abs(dx) + Math.abs(dy) === 1) {
        this.player.hp -= enemy.attack;
        continue;
      }

      // Иначе двигается в сторону игрока (немного случайно)
      let dir = Math.random() < 0.5 ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
      let nx = enemy.x + dir[0];
      let ny = enemy.y + dir[1];
      if (this.map[ny] && this.map[ny][nx] && this.map[ny][nx].type === '-') {
        this.map[enemy.y][enemy.x].type = '-';
        enemy.x = nx;
        enemy.y = ny;
        this.map[ny][nx].type = 'E';
      }
    }
    this.render();
  }

  // Отрисовка карты и объектов
  render() {
    this.fieldEl.innerHTML = '';
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let tile = document.createElement('div');
        tile.classList.add('tile');
        let type = this.map[y][x].type;
        if (type === '-') {
          tile.classList.add('tile-');
        } else {
          tile.classList.add('tile' + type);
        }
        tile.style.left = x * this.tileSize + 'px';
        tile.style.top = y * this.tileSize + 'px';

        // Если клетка игрока — рисуем зелёную полоску здоровья
        if (type === 'P') {
          let hpbar = document.createElement('div');
          hpbar.className = 'health';
          hpbar.style.width = (this.player.hp / this.player.maxHp) * 100 + '%';
          tile.appendChild(hpbar);
        }
        // Если клетка врага — рисуем красную полоску здоровья
        if (type === 'E') {
          let enemy = this.enemies.find((e) => e.x === x && e.y === y);
          if (enemy) {
            let hpbar = document.createElement('div');
            hpbar.className = 'health';
            hpbar.style.width = (enemy.hp / enemy.maxHp) * 100 + '%';
            tile.appendChild(hpbar);
          }
        }
        this.fieldEl.appendChild(tile);
      }
    }
  }
}

let game = new Game();
game.init();
