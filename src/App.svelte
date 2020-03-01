<script>
  import { onMount } from "svelte";
  const FIELD_SIZE = 7;

  let pfield = Array.from({ length: FIELD_SIZE }).map(_ =>
    Array.from({ length: FIELD_SIZE }).map((_, i) => 0)
  );
  //toggle to start
  let isGameStarted = true;
  //
  let startCoords = { x: 0, y: 0 };
  let currentFigure = [];
  let isIterationStarted = false;
  let iterationTimer = null;

  const BLUE_RICKY = [[1, 0, 0], [1, 1, 1]];
  const ORANGE_RICKY = [[0, 0, 1], [1, 1, 1]];
  const CLEVELAND_Z = [[1, 1, 0], [0, 1, 1]];
  const RHODE_ISLAND = [[0, 1, 1], [1, 1, 0]];
  const HERO = [[1, 1, 1]];
  const TEEWEE = [[0, 1, 0], [1, 1, 1]];
  const SMASHBOY = [[1]];

  const FIGURES = [
    BLUE_RICKY,
    ORANGE_RICKY,
    CLEVELAND_Z,
    RHODE_ISLAND,
    HERO,
    TEEWEE,
    SMASHBOY
  ];

  onMount(_ => {
    document.addEventListener("keydown", ({ keyCode }) => {
      const keyHandlers = {
        32: _ => onRotate(),
        37: _ => move("left"),
        39: _ => move("right")
      };
      keyHandlers[keyCode] && keyHandlers[keyCode]();
    });
  });

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
    return FIGURES[getRandomIntBetween(0, FIGURES.length - 1)];
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
          ? row[ci - x] + ""
          : typeof c === "string"
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

  const getSnapshotOfField = _ => {
    return pfield.map(row => row.map(c => (typeof c === "string" ? +c : c)));
  };

  const reduceHeight = (figure, speed = 1000) => {
    iterationTimer = setInterval(_ => {
      startCoords = { ...startCoords, y: startCoords.y += 1 };
      clearTempCols();
      drawFigure({
        figure,
        ...startCoords
      });
    }, speed);
  };

  const dropNewPeiceOfField = figure => {
    isIterationStarted = true;
    startCoords = getRandomStartCoords(figure);
    drawFigure({ figure, ...startCoords });
    reduceHeight(figure, 1000);
  };

  const onRotate = _ => {
    const rotatedFigure = rotateMatrix(currentFigure);
    clearTempCols();
    clearInterval(iterationTimer);
    clearInterval(iterationTimer);

    drawFigure({ figure: rotatedFigure, ...startCoords });
    reduceHeight(rotatedFigure);

    currentFigure = rotatedFigure;
  };

  const isDeadEnd = coords => {
    const hasNotEmptyNextRow = (currentRow, nextFieldRow) => {
      return nextFieldRow.some(
        (c, ci) => c && typeof c !== "string" && currentRow[ci - coords.x]
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
    const newCoords = {
      ...startCoords,
      x: !startCoords.x ? 0 : startCoords.x - 1
    };
    drawFigure({ figure: currentFigure, ...newCoords });
    startCoords = newCoords;
  };

  const moveRight = _ => {
    const newCoords = {
      ...startCoords,
      x:
        startCoords.x >= pfield.length - currentFigure[0].length
          ? startCoords.x
          : startCoords.x + 1
    };
    drawFigure({ figure: currentFigure, ...newCoords });
    startCoords = newCoords;
  };

  const clearTempCols = _ => {
    pfield = pfield.map(r => {
      return r.map(c => (c && typeof c === "string" ? 0 : c));
    });
  };

  const move = direction => {
    clearTempCols();
    const dirs = {
      left: moveLeft,
      right: moveRight
    };
    if (!dirs[direction] || !isIterationStarted) return;
    dirs[direction]();
  };

  $: {
    if (isGameStarted && !isIterationStarted) {
      currentFigure = getRandomFigure();
      dropNewPeiceOfField(currentFigure);
    }
  }
  $: {
    if (isDeadEnd(startCoords)) {
      clearInterval(iterationTimer);
      pfield = getSnapshotOfField();
      isIterationStarted = false;
    }
  }
  $: {
    if (
      pfield[0].some(c => c && typeof c !== "string") &&
      !isIterationStarted
    ) {
      isGameStarted = false;
      console.log("GAME OVER");
    }
  }
  $: {
    if (!isIterationStarted) {
      const indexOfContainedRow = pfield.findIndex(r =>
        r.every(c => c && typeof c !== "string")
      );
      if (indexOfContainedRow !== -1) {
        pfield[indexOfContainedRow] = pfield[indexOfContainedRow].map(_ => 0);
      }
    }
  }
</script>

<style>
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
    width: 50px;
    height: 50px;
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
    {#each pfield as row, ri}
      <section class="row">
        {#each row as col, ci}
          <section class="col" class:active={col} />
        {/each}
      </section>
    {/each}
  </article>

  <button on:click={_ => move('left')}>left</button>
  <button on:click={onRotate}>rotate</button>
  <button on:click={_ => move('right')}>right</button>

</main>
