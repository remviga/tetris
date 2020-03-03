<script>
  // TODO: fix last draw before game over

  import { onMount, onDestroy } from "svelte";
  const FIELD_SIZE = 8;

  let pfield = Array.from({ length: FIELD_SIZE }).map(_ =>
    Array.from({ length: FIELD_SIZE }).map((_, i) => 0)
  );

  let isGameStarted = true;
  let isIterationStarted = false;
  let startCoords = { x: 0, y: 0 };
  let currentFigure = [];
  let iterationTimer = null;

  const FIGURES = {
    BLUE_RICKY: [[1, 0, 0], [1, 1, 1]],
    ORANGE_RICKY: [[0, 0, 1], [1, 1, 1]],
    CLEVELAND_Z: [[1, 1, 0], [0, 1, 1]],
    RHODE_ISLAND: [[0, 1, 1], [1, 1, 0]],
    HERO: [[1, 1, 1]],
    TEEWEE: [[0, 1, 0], [1, 1, 1]],
    SMASHBOY: [[1]]
  };

  onMount(_ => document.addEventListener("keydown", handleKeyPress));
  onDestroy(_ => document.removeEventListener("keydown", handleKeyPress));

  const handleKeyPress = ({ keyCode }) => {
    const keyHandlers = {
      32: _ => onRotate(),
      37: _ => move("left"),
      38: _ => onRotate(),
      39: _ => move("right"),
      40: _ => move("down")
    };
    keyHandlers[keyCode] && isGameStarted && keyHandlers[keyCode]();
  };

  const isTempCol = col => typeof col === "string";
  const reverse = array => [...array].reverse();
  const compose = (a, b) => x => a(b(x));
  const flipMatrix = matrix =>
    matrix[0].map((column, index) => matrix.map(row => row[index]));
  const rotateMatrix = compose(
    flipMatrix,
    reverse
  );

  const getRandomIntBetween = (min, max) => {
    // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  const getRandomFigure = _ => {
    return Object.values(FIGURES)[
      getRandomIntBetween(0, Object.values(FIGURES).length - 1)
    ];
  };

  const clearLine = i => {
    if (i < 0) return;
    pfield[i] = pfield[i].map(_ => 0);
  };

  const clearField = _ => pfield.map((_, i) => clearLine(i));

  const isEmptySection = (x, y) => {
    return !pfield[y][x];
  };

  const drawFigure = ({ figure, x = 0, y = 0 }) => {
    figure.forEach((row, i) => {
      const fieldRow = [...pfield[y + i]];
      pfield[y + i] = fieldRow.map((c, ci) => {
        const isRestOfSections = ci < x || ci >= x + row.length;
        const resultRow = isRestOfSections
          ? c
          : row[ci - x]
          ? "1"
          : isTempCol(c)
          ? row[ci - x]
          : c;
        return resultRow;
      });
    });
  };

  const getRandomStartCoords = figure => {
    if (!figure) return;
    const coords = {
      x: getRandomIntBetween(0, FIELD_SIZE - figure[0].length),
      y: 0
    };
    return coords;
  };

  // set fixed all completed cols
  const getSnapshotOfField = _ => {
    return pfield.map(row => row.map(c => (isTempCol(c) ? +c : c)));
  };

  const reduceHeight = (figure = currentFigure, speed = 1000) => {
    iterationTimer = setInterval(_ => move("down"), speed);
  };

  const dropNewPeiceOfField = figure => {
    isIterationStarted = true;
    startCoords = getRandomStartCoords(figure);
    currentFigure = figure;
    if (isDeadEnd(startCoords)) {
      drawFigure({
        figure: [currentFigure[currentFigure.length - 1]],
        ...startCoords
      });
      isGameStarted = false;
      return;
    }
    drawFigure({ figure: currentFigure, ...startCoords });
    reduceHeight(currentFigure, 1000);
  };

  const onStart = _ => {
    clearField();
    isGameStarted = true;
  };

  const onStop = _ => {
    isGameStarted = false;
    isIterationStarted = false;
    clearInterval(iterationTimer);
    currentFigure = [];
    startCoords = { x: 0, y: 0 };
  };

  const onRotate = _ => {
    const { x } = startCoords;
    const figureEdgeIndex = x + currentFigure.length;
    const pfieldEdgeIndex = pfield.length;
    if (figureEdgeIndex > pfieldEdgeIndex) {
      startCoords = {
        ...startCoords,
        x: x - (figureEdgeIndex - pfieldEdgeIndex)
      };
    }
    const rotatedFigure = rotateMatrix(currentFigure);
    clearTempCols();
    clearInterval(iterationTimer);
    reduceHeight(rotatedFigure);
    drawFigure({
      figure: rotatedFigure,
      ...startCoords
    });
    currentFigure = rotatedFigure;
  };

  /* check if there are no way to reduce height 
	between figure and bottom edge of field */
  const isDeadEnd = coords => {
    const hasNotEmptyNextRow = (currentRow, nextFieldRow) => {
      return nextFieldRow.some(
        (c, ci) => c && !isTempCol(c) && currentRow[ci - coords.x]
      );
    };
    const isBottomOfFiled = coords.y >= pfield.length - currentFigure.length;
    const isObstruction = currentFigure.some((figureRow, ri) => {
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
        const leftCol = pfield[y + ri][x - 1];
        return leftCol && !isTempCol(leftCol);
      });
      return !isLeftEdgeOfField && !isReservedCols;
    };
    const newCoords = {
      ...startCoords,
      x: moveIsAllowed(startCoords, currentFigure)
        ? startCoords.x - 1
        : startCoords.x
    };
    drawFigure({ figure: currentFigure, ...newCoords });
    startCoords = newCoords;
  };

  const moveRight = _ => {
    const moveIsAllowed = ({ x, y }, f) => {
      const isRightEdgeOfField = x >= pfield.length - f[0].length;
      const isReservedCols = f.some((r, ri) => {
        const rightCol = pfield[y + ri][x + r.length];
        return rightCol && !isTempCol(rightCol);
      });
      return !isRightEdgeOfField && !isReservedCols;
    };
    const newCoords = {
      ...startCoords,
      x: moveIsAllowed(startCoords, currentFigure)
        ? startCoords.x + 1
        : startCoords.x
    };
    drawFigure({ figure: currentFigure, ...newCoords });
    startCoords = newCoords;
  };

  const moveDown = _ => {
    const moveIsAllowed = ({ x, y }, f) => y < pfield.length - f.length;
    const newCoords = {
      ...startCoords,
      y: moveIsAllowed(startCoords, currentFigure)
        ? startCoords.y + 1
        : startCoords.y
    };
    drawFigure({ figure: currentFigure, ...newCoords });
    startCoords = newCoords;
  };

  const clearTempCols = _ => {
    pfield = pfield.map(r => {
      return r.map(c => (c && isTempCol(c) ? 0 : c));
    });
  };

  //"move figure" handler
  const move = direction => {
    clearTempCols();
    const dirs = {
      left: moveLeft,
      right: moveRight,
      down: moveDown
    };
    if (!dirs[direction] || !isIterationStarted) return;
    dirs[direction]();
  };

  $: {
    //starting new iteration
    if (isGameStarted && !isIterationStarted) {
      currentFigure = getRandomFigure();
      // currentFigure = FIGURES["BLUE_RICKY"];
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
    if (pfield[0].some(c => c) && !isIterationStarted) {
      isGameStarted = false;
      console.log("GAME OVER");
    }
  }
  $: {
    //replacing fully-contained rows
    if (!isIterationStarted) {
      pfield = pfield.map(r =>
        r.every(c => c && !isTempCol(c)) ? r.map(c => 0) : r
      );
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
</script>

<style>
  :root {
    font-size: 16px;
  }
  main {
    text-align: center;
    padding: 1em;
    max-width: 600px;
    margin: 0 auto;
  }
  .row {
    position: relative;
    display: inline-flex;
    margin-bottom: 2px;
  }
  .row:last-child {
    margin-bottom: 0;
  }
  .col {
    position: relative;
    width: 3.125rem;
    height: 3.125rem;
    margin-right: 2px;
    background: lightgray;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .col.active {
    background: red;
  }
  .col:last-child {
    margin-right: 0;
  }
</style>

<main>
  <article>
    {#each pfield as row}
      <section class="row">
        {#each row as col}
          <section class="col" class:active={col} />
        {/each}
      </section>
    {/each}
  </article>

  <button on:click={_ => move('left')}>left</button>
  <button on:click={onRotate}>rotate</button>
  <button on:click={_ => move('right')}>right</button>

  <div>
    <button on:click={onStop}>stop</button>
    <button on:click={onStart}>start</button>
  </div>

</main>
