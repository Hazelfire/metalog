import {
  matrix,
  multiply,
  inv,
  format,
  isArray,
  isComplex,
  transpose,
  number,
  MathNumericType,
} from "mathjs";
const sum = (x: number[]) => x.reduce((a, b) => a + b);

export function metalogBasisFunction(j: number, y: number): number {
  const logy = Math.log(y / (1 - y));
  if (j === 0) {
    return 1;
  } else if (j === 1) {
    return logy;
  } else if (j === 2) {
    return (y - 0.5) * logy;
  } else if (j === 3) {
    return y - 0.5;
  } else if (j % 2 === 0) {
    return (y - 0.5) ** (j / 2);
  } else {
    return (y - 0.5) ** ((j - 1) / 2) * logy;
  }
}
export function quantile(a: number[], y: number): number {
  return sum(a.map((a_i, i) => a_i * metalogBasisFunction(i, y)));
}

function quantileDiff(a: number[], y: number): number {
  const logy = Math.log(y / (1 - y));
  return sum(
    a.map((a_i, i) => {
      if (i === 0) {
        return 0;
      } else if (i === 1) {
        return a_i / (y * (1 - y));
      } else if (i === 2) {
        return a_i * ((y - 0.5) / (y * (1 - y)) + logy);
      } else if (i === 3) {
        return a_i;
      } else if (i % 2 === 0) {
        return a_i * (i / 2) * (y - 0.5) ** (i / 2 - 1);
      } else {
        return (
          a_i *
          ((y - 0.5) ** ((i - 1) / 2) / (y * (1 - y)) +
            ((i - 1) / 2) * (y - 0.5) ** ((i - 1) / 2 - 1) * logy)
        );
      }
    })
  );
}

export function cdf(a: number[], x: number): number {
  const alpha_step = 0.01;
  const err = 0.0000001;
  let temp_err = 0.1;
  let y_now = 0.5;
  let i = 1;
  while (temp_err > err) {
    const first_function = quantile(a, y_now) - x;
    const derv_function = quantileDiff(a, y_now);
    let y_next = y_now - alpha_step * (first_function / derv_function);
    temp_err = Math.abs(y_next - y_now);
    if (y_next > 1) {
      y_next = 0.99999;
    }
    if (y_next < 0) {
      y_next = 0.000001;
    }
    y_now = y_next;
    i++;
    if (i > 10000) {
      console.log(
        "Approximation taking too long, quantile value: ",
        x,
        " is to far from distribution median. Currently at",
        y_now
      );
      return NaN;
    }
  }
  return y_now;
}

export function pdf(a: number[], x: number): number {
  return 1 / quantileDiff(a, cdf(a, x));
}

export function fitMetalog(
  points: { x: number; y: number }[],
  terms: number
): number[] {
  const Y = matrix(
    points.map(({ y }) =>
      Array.from(Array(terms).keys()).map((i) => metalogBasisFunction(i, y))
    )
  );
  const X = matrix(points.map(({ x }) => [x]));
  const multTran = multiply(transpose(Y), Y);
  const invTran = inv(multTran);
  const invMultTran = multiply(invTran, transpose(Y));
  return multiply(invMultTran, X)
    .toArray()
    .map((x: MathNumericType[] | MathNumericType): number => {
      if (!isArray(x)) {
        if (isComplex(x)) {
          return 0;
        } else {
          return number(x);
        }
      } else {
        const y = x[0];
        if (isComplex(y)) {
          return 0;
        } else {
          return number(y);
        }
      }
    });
}
