export const isTempCol = col => typeof col === "string";
const reverse = array => [...array].reverse();
const compose = (a, b) => x => a(b(x));
const flipMatrix = matrix =>
  matrix[0].map((_, index) => matrix.map(row => row[index]));
export const rotateMatrix = compose(flipMatrix, reverse);
export const getRandomIntBetween = (min, max) => {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
};
export const getFieldBySize = size =>
  Array.from({ length: size }).map(_ =>
    Array.from({ length: size }).map((_, i) => 0)
  );
