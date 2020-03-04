<script>
  import { onMount, onDestroy } from "svelte";
  import {
    isTempCol,
    rotateMatrix,
    getRandomIntBetween,
    getFieldBySize
  } from "./helpers.js";
  import FIGURES from "./figures.js";

  const FIELD_SIZE = 7;

  let pfield = getFieldBySize(FIELD_SIZE);

  let isGameStarted = false;
  let isGameOver = false;
  let isIterationStarted = false;
  let startCoords = { x: 0, y: 0 };
  let speed;
  let currentFigure = [];
  let iterationTimer = null;
  let isDrawingParts = false;
  let indexOfDrawingRow = 1;

  let speedRatio = 1;

  onMount(_ => document.addEventListener("keydown", handleKeyPress));
  onDestroy(_ => document.removeEventListener("keydown", handleKeyPress));

  const handleKeyPress = ({ keyCode }) => {
    const keyHandlers = {
      32: _ => onRotate(),
      37: _ => onMove("left"),
      38: _ => onRotate(),
      39: _ => onMove("right"),
      40: _ => onMove("down")
    };
    keyHandlers[keyCode] && isGameStarted && keyHandlers[keyCode]();
  };

  const getRandomFigure = _ => {
    return Object.values(FIGURES)[
      getRandomIntBetween(0, Object.values(FIGURES).length - 1)
    ];
  };

  const clearRow = i => {
    if (i < 0) return;
    pfield[i] = pfield[i].map(_ => 0);
  };

  const clearField = _ => pfield.map((_, i) => clearRow(i));

  const drawFigure = ({ figure, x = 0, y = 0 }) => {
    clearTempCols();
    figure.forEach((row, i) => {
      pfield[y + i] = pfield[y + i].map((fieldCol, ci) => {
        const isSideOffset = ci < x || ci >= x + row.length;
        const figureCol = row[ci - x];
        const resultRow = isSideOffset
          ? fieldCol
          : figureCol
          ? "1"
          : isTempCol(fieldCol)
          ? figureCol
          : fieldCol;
        return resultRow;
      });
    });
  };

  const getRandomStartCoords = figure => {
    if (!figure) return;
    return {
      x: getRandomIntBetween(0, FIELD_SIZE - figure[0].length),
      y: 0
    };
  };

  // set fixed all completed cols
  const getSnapshotOfField = _ => {
    return pfield.map(row => row.map(c => (isTempCol(c) ? +c : c)));
  };

  const reduceHeight = (figure = currentFigure) => {
    iterationTimer = setInterval(_ => onMove("down"), speed);
  };

  const dropNewPeiceOfField = figure => {
    let partsInterval = null;
    let countOfDrawingRows = 1;

    isIterationStarted = true;
    isDrawingParts = true;
    startCoords = getRandomStartCoords(figure);
    currentFigure = figure;

    const drawInParts = (count, deadEndCb) => {
      const partialFigure = figure.slice(Math.max(figure.length - count, 0));
      const isTopRowEmpty = pfield[0].every(c => !c);
      const drawPartial = _ =>
        drawFigure({
          figure: partialFigure,
          ...startCoords
        });

      if (isDeadEnd(startCoords, partialFigure)) {
        if (isTopRowEmpty) drawPartial();
        deadEndCb();
        setGameOver();
        return;
      }

      drawPartial();
    };

    partsInterval = setInterval(_ => {
      if (countOfDrawingRows <= currentFigure.length - 1) {
        drawInParts(countOfDrawingRows, _ => clearInterval(partsInterval));
      } else {
        isDrawingParts = false;
        clearInterval(partsInterval);
        drawFigure({ figure: currentFigure, ...startCoords });
        reduceHeight(currentFigure);
      }
      countOfDrawingRows += 1;
    }, speed);
  };

  const abortGame = _ => {
    clearInterval(iterationTimer);
    isGameStarted = false;
  };

  const setGameOver = _ => {
    abortGame();
    isGameOver = true;
  };

  const onStart = _ => {
    clearField();
    isGameStarted = true;
    isGameOver = false;
  };

  const onStop = _ => {
    abortGame();
    isIterationStarted = false;
    currentFigure = [];
    startCoords = { x: 0, y: 0 };
  };

  const onRotate = _ => {
    //?
    if (isDrawingParts) return;
    //
    const { x } = startCoords;
    const figureEdgeIndex = x + currentFigure.length;
    const pfieldEdgeIndex = pfield.length;
    if (figureEdgeIndex > pfieldEdgeIndex) {
      startCoords = {
        ...startCoords,
        x: x - (figureEdgeIndex - pfieldEdgeIndex)
      };
    }
    currentFigure = rotateMatrix(currentFigure);
    clearInterval(iterationTimer);
    reduceHeight(currentFigure);
    drawFigure({
      figure: currentFigure,
      ...startCoords
    });
  };

  /* check if there are no way to reduce height 
	between figure and bottom edge of field */
  const isDeadEnd = (coords, figure = currentFigure) => {
    const hasNotEmptyNextRow = (currentRow, nextFieldRow) =>
      !!nextFieldRow.find(
        (c, ci) => c && !isTempCol(c) && currentRow[ci - coords.x]
      );
    const isBottomOfFiled = coords.y >= pfield.length - figure.length;
    const isObstruction = figure.some((figureRow, ri) => {
      const nextFieldRow = pfield[coords.y + ri + 1];
      if (!nextFieldRow) return true;
      return hasNotEmptyNextRow(figureRow, nextFieldRow);
    });
    return isBottomOfFiled || isObstruction;
  };

  const moveLeft = _ => {
    const moveIsAllowed = ({ x, y }, f) => {
      const isLeftEdgeOfField = !x;
      const isReservedCols = f.some((r, ri) => {
        const indexOfContainedCol =
          r.indexOf(1) !== -1 ? r.indexOf(1) : r.length;
        const leftCol = pfield[y + ri][x + indexOfContainedCol - 1];
        return leftCol && !isTempCol(leftCol);
      });
      return !isLeftEdgeOfField && !isReservedCols;
    };
    startCoords = {
      ...startCoords,
      x: moveIsAllowed(startCoords, currentFigure)
        ? startCoords.x - 1
        : startCoords.x
    };
    drawFigure({ figure: currentFigure, ...startCoords });
  };

  const moveRight = _ => {
    const moveIsAllowed = ({ x, y }, f) => {
      const isRightEdgeOfField = x >= pfield.length - f[0].length;
      const isReservedCols = f.some((r, ri) => {
        const indexOfContainedCol =
          r.lastIndexOf(1) !== -1 ? r.lastIndexOf(1) : r.length;
        const rightCol = pfield[y + ri][x + indexOfContainedCol + 1];
        return rightCol && !isTempCol(rightCol);
      });
      return !isRightEdgeOfField && !isReservedCols;
    };
    startCoords = {
      ...startCoords,
      x: moveIsAllowed(startCoords, currentFigure)
        ? startCoords.x + 1
        : startCoords.x
    };
    drawFigure({ figure: currentFigure, ...startCoords });
  };

  const moveDown = _ => {
    const { y } = startCoords;
    const moveIsAllowed = ({ x, y }, f) => y < pfield.length - f.length;
    startCoords = {
      ...startCoords,
      y: moveIsAllowed(startCoords, currentFigure)
        ? startCoords.y + 1
        : startCoords.y
    };
    drawFigure({ figure: currentFigure, ...startCoords });
  };

  const clearTempCols = _ => {
    pfield = pfield.map(r => r.map(c => (c && isTempCol(c) ? 0 : c)));
  };

  //"move figure" handler
  const onMove = direction => {
    const dirs = {
      left: moveLeft,
      right: moveRight,
      down: moveDown
    };
    if (!dirs[direction] || !isIterationStarted) return;
    if (isDrawingParts && direction === "down") {
      indexOfDrawingRow += 1;
      return;
    }
    clearTempCols();
    dirs[direction]();
  };

  $: {
    //starting new iteration
    if (isGameStarted && !isIterationStarted) {
      currentFigure = getRandomFigure();
      dropNewPeiceOfField(currentFigure);
    }
  }
  $: {
    //completing current iteration
    if (isDeadEnd(startCoords)) {
      clearInterval(iterationTimer);
      pfield = getSnapshotOfField();
      isIterationStarted = false;
    }
  }
  $: {
    //checking if need to abort game
    if (pfield[0].some(c => c && !isTempCol(c)) && !isIterationStarted) {
      setGameOver();
    }
  }
  $: {
    //replacing fully-contained rows
    if (!isIterationStarted) {
      /* set every contained row empty */
      pfield = pfield.map(r =>
        r.every(c => c && !isTempCol(c)) ? r.map(c => 0) : r
      );
      /**/
      const newPField = [...pfield];
      pfield.forEach((r, ri) => {
        if (r.every(c => !c)) {
          newPField.splice(ri, 1);
          newPField.unshift(r);
        }
      });
      pfield = newPField;
    }
  }
  $: {
    speed = 1000 / speedRatio;
  }
</script>

<main>
  <article class="field container">
    {#each pfield as row}
      <section class="row">
        {#each row as col}
          <section class="col" class:active={col} />
        {/each}
      </section>
    {/each}
    {#if isGameOver}
      <div class="field-overlay">
        <h1>Game Over</h1>
      </div>
    {/if}
  </article>
  <div class="container">
    <div class="option">
      <button on:click={_ => onMove('left')}>{'<-'} left</button>
      <button on:click={onRotate}>rotate</button>
      <button on:click={_ => onMove('right')}>right {'->'}</button>
    </div>
    <div class="option speed-option">
      <label>
        <span>Speed</span>
        <input type="range" min="1" max="3" bind:value={speedRatio} />
        <span>{speedRatio}</span>
      </label>
    </div>
    <div class="option">
      <button on:click={isGameStarted ? onStop : onStart}>
        {isGameStarted ? 'stop' : 'play'}
      </button>
    </div>
  </div>

</main>
