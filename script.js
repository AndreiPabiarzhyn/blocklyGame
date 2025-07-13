import { tasks } from './tasks.js';

window.addEventListener("load", function () {
  const gridSize = 4;
  const cellSize = 120;
  let heroPos = { x: 0, y: 0 };
  let startPos = { x: 0, y: 0 };
  let crystals = [];
  let commands = [];
  let currentTask = 0;
  let usedLoops = false;
  let isAnimating = false;
  let shouldResetOnClose = false;

  const images = {
    hero: new Image(),
    crystal: new Image(),
    bg: new Image(),
    reward: new Image(),
    bigReward: new Image(),
    fail: new Image()
  };

  const sounds = {
    win: new Audio("assets/win.mp3"),
    fail: new Audio("assets/fail.mp3")
  };

  images.hero.src = "assets/hero.png";
  images.crystal.src = "assets/crystal.png";
  images.bg.src = "assets/bg-tile.jpg";
  images.reward.src = "assets/reward.png";
  images.bigReward.src = "assets/big-reward.png";
  images.fail.src = "assets/ups.png"; // картинка для удара об стену

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        ctx.drawImage(images.bg, x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    crystals.forEach((crystal) => {
      ctx.drawImage(images.crystal, crystal.x * cellSize, crystal.y * cellSize, cellSize, cellSize);
    });

    const heroSize = cellSize * 0.8;
    ctx.drawImage(
      images.hero,
      heroPos.x * cellSize + (cellSize - heroSize) / 2,
      heroPos.y * cellSize + (cellSize - heroSize) / 2,
      heroSize,
      heroSize
    );
  }

  async function animateMove(start, end) {
    isAnimating = true;
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      heroPos.x = start.x + (end.x - start.x) * (i / steps);
      heroPos.y = start.y + (end.y - start.y) * (i / steps);
      drawCanvas();
      await new Promise(res => setTimeout(res, 40));
    }
    heroPos = { ...end };
    drawCanvas();
    isAnimating = false;
  }

  function showModal(success, final = false, message = null, imageOverride = null) {
    const modal = document.getElementById("resultModal");
    const title = document.getElementById("resultTitle");
    const msg = document.getElementById("resultMessage");
    const content = document.querySelector(".modal-content");

    const oldImg = content.querySelector("img");
    if (oldImg) oldImg.remove();

    const img = document.createElement("img");
    img.src = imageOverride || (final ? images.bigReward.src : (success ? images.reward.src : images.fail.src));
    img.style.maxWidth = "200px";
    img.style.marginTop = "10px";

    if (success) {
      sounds.win.play();
      title.innerText = "Успех!";
      msg.innerText = final ? "Поздравляем! Все задания выполнены!" : "Задача выполнена!";
    } else {
      sounds.fail.play();
      title.innerText = "Ой...";
      msg.innerText = message || "Не все кристаллы собраны. Попробуйте ещё раз.";
    }

    content.appendChild(img);
    shouldResetOnClose = !success; // перезапускать, если это провал
    modal.style.display = "block";
  }

  function checkForLoops(code) {
    usedLoops = code.includes("for") || code.includes("repeat");
  }

  async function runCommands() {
  heroPos = { ...startPos };
  crystals = tasks[currentTask].crystals.map((c) => ({ x: c.x, y: c.y }));
  drawCanvas();

  for (let cmd of commands) {
    if (cmd.action === "collect") {
      crystals = crystals.filter(c => !(Math.round(c.x) === Math.round(heroPos.x) && Math.round(c.y) === Math.round(heroPos.y)));
      drawCanvas();
      await new Promise(res => setTimeout(res, 300));
    } else {
      let newX = Math.round(heroPos.x);
      let newY = Math.round(heroPos.y);

      if (cmd.action === "moveRight") newX++;
      if (cmd.action === "moveLeft") newX--;
      if (cmd.action === "moveUp") newY--;
      if (cmd.action === "moveDown") newY++;

      if (newX < 0 || newY < 0 || newX >= gridSize || newY >= gridSize) {
        canvas.classList.add("shake");
        setTimeout(() => canvas.classList.remove("shake"), 500);
        showModal(false, false, "Ты ударился о стену!", "assets/ups.png");
        heroPos = { ...startPos };
        crystals = tasks[currentTask].crystals.map((c) => ({ x: c.x, y: c.y }));
        drawCanvas();
        return;
      }

      await animateMove(heroPos, { x: newX, y: newY });
    }
  }

  if (tasks[currentTask].requireLoop && !usedLoops) {
    alert("Подсказка: попробуй использовать цикл!");
    heroPos = { ...startPos };
    crystals = tasks[currentTask].crystals.map((c) => ({ x: c.x, y: c.y }));
    drawCanvas();
    return;
  }

  const success = crystals.length === 0;
  showModal(success, currentTask === tasks.length - 1 && success);

  if (success && currentTask < tasks.length - 1) {
    setTimeout(() => loadTask(currentTask + 1), 1000);
  }
}


  function updateTaskUI() {
    document.getElementById("taskTitle").innerText = `${tasks[currentTask].title}: ${tasks[currentTask].desc}`;
    document.getElementById("taskDesc").innerText = tasks[currentTask].desc;
  }

  function loadTask(index) {
    currentTask = index;
    heroPos = { x: 0, y: 0 };
    startPos = { x: 0, y: 0 };
    crystals = tasks[index].crystals.map((c) => ({ x: c.x, y: c.y }));
    updateTaskUI();
    drawCanvas();
    commands = [];
    usedLoops = false;
    workspace.clear();
    const starterBlock = workspace.newBlock("when_run");
    starterBlock.initSvg();
    starterBlock.render();
    starterBlock.setMovable(false);
    starterBlock.setNextStatement(false);
  }

  function moveRight() { commands.push({ action: "moveRight" }); }
  function moveLeft() { commands.push({ action: "moveLeft" }); }
  function moveUp() { commands.push({ action: "moveUp" }); }
  function moveDown() { commands.push({ action: "moveDown" }); }
  function collect() { commands.push({ action: "collect" }); }

  window.moveRight = moveRight;
  window.moveLeft = moveLeft;
  window.moveUp = moveUp;
  window.moveDown = moveDown;
  window.collect = collect;

  Blockly.Blocks['when_run'] = {
    init: function () {
      this.appendDummyInput().appendField("Когда запущено");
      this.appendStatementInput("DO");
      this.setColour(120);
      this.setDeletable(false);
    }
  };
  Blockly.JavaScript['when_run'] = function (block) {
    const code = Blockly.JavaScript.statementToCode(block, 'DO');
    checkForLoops(code);
    return code;
  };

  const blockDefs = [
    ["move_right", "Вправо", "moveRight();"],
    ["move_left", "Влево", "moveLeft();"],
    ["move_up", "Вверх", "moveUp();"],
    ["move_down", "Вниз", "moveDown();"],
    ["collect", "Собрать", "collect();"]
  ];

  blockDefs.forEach(([type, label, code]) => {
    Blockly.Blocks[type] = {
      init: function () {
        this.appendDummyInput().appendField(label);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
      }
    };
    Blockly.JavaScript[type] = () => code + "\n";
  });

  Blockly.Blocks['controls_repeat_ext'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("повторить")
        .appendField(new Blockly.FieldDropdown(
          Array.from({ length: 10 }, (_, i) => [String(i + 1), String(i + 1)])
        ), "TIMES")
        .appendField("раз");
      this.appendStatementInput("DO").appendField("делать");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
    }
  };
  Blockly.JavaScript['controls_repeat_ext'] = function (block) {
    const repeats = Number(block.getFieldValue("TIMES"));
    const branch = Blockly.JavaScript.statementToCode(block, 'DO');
    return `for (let i = 0; i < ${repeats}; i++) {\n${branch}}\n`;
  };

  const workspace = Blockly.inject("blocklyDiv", {
    toolbox: document.getElementById("toolbox")
  });

  document.getElementById("runProgram").addEventListener("click", () => {
    if (isAnimating) return;
    commands = [];
    const code = Blockly.JavaScript.workspaceToCode(workspace);
    try {
      eval(code);
    } catch (e) {
      console.error(e);
    }
    runCommands();
  });

  document.getElementById("resetTask").addEventListener("click", () => loadTask(currentTask));
  document.getElementById("prevTask").addEventListener("click", () => {
    if (currentTask > 0) loadTask(currentTask - 1);
  });
  document.getElementById("nextTask").addEventListener("click", () => {
    if (currentTask < tasks.length - 1) loadTask(currentTask + 1);
  });

  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("resultModal").style.display = "none";
    if (shouldResetOnClose) {
    heroPos = { ...startPos };
    crystals = tasks[currentTask].crystals.map(c => ({ x: c.x, y: c.y }));
    drawCanvas();
  }

  shouldResetOnClose = false; // сбросить флаг
  });

  document.getElementById("startModal").style.display = "flex";
  document.getElementById("startGameBtn").addEventListener("click", () => {
    document.getElementById("startModal").style.display = "none";
    loadTask(0);
  });
});
