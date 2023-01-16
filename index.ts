import {
  matrix,
  multiply,
  inv,
  isArray,
  isComplex,
  transpose,
  number,
  MathNumericType,
} from "mathjs";
import {nextDown, nextUp} from "ulp"
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
export function quantile(a: number[], q: number): number {
  return sum(a.map((a_i, i) => a_i * metalogBasisFunction(i, q)));
}

export function quantileDiff(a: number[], y: number): number {
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

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-1 * x));
}

function logisticInv(x: number): number {
  return -1 * Math.log(1 / x - 1)
}

function logisticDeriv(x: number): number {
  return Math.exp(-1 * x) / Math.pow(1 + Math.exp(-1 * x), 2);
}



// This is a combination of Newton's method and binary search.
// It's basically a binary search, except we choose the "midpoint"
// through newton's method.
// In this case we are using the assumption that the quantile function
// is monotonic (which it is)
export function cdf(a: number[], x: number): number {
  const alpha_step = 1;
  let temp_err = 0.1;
  let y_now = 0.5;
  let i = 1;
  let max = 1;
  let min = 0;
  while (temp_err > Number.EPSILON) {
    if(min === max){
      return min;
    }
    const first_function = quantile(a, y_now) - x;
    if(first_function > 0){
      max = y_now;
    }
    else {
      min = y_now;
    }
    const derv_function = quantileDiff(a, y_now);
    let y_next = y_now - alpha_step * (first_function / derv_function);
    temp_err = Math.abs(y_next - y_now);
    y_now = y_next;
    if(y_now > max || y_now < min) {
      y_now = (min + max) / 2;
    }
    i++;
    if (i > 1000) {
      return y_now;
    }
  }

  // Iterate through possible floats until we get an answer that's as close as possible
  let diff = quantile(a, y_now) - x;
  while(diff > 0){
    const y_next = nextDown(y_now)
    diff = quantile(a, y_next) - x;
    if(diff > 0){
      y_now = y_next;
    }
  }
  while(diff < 0){
    const y_next = nextUp(y_now)
    diff = quantile(a, y_next) - x;
    if(diff < 0){
      y_now = y_next;
    }
  }
  return y_now;
}

export function pdf(a: number[], x: number): number {
  return Math.max(1 / quantileDiff(a, cdf(a, x)), 0);
}

export function fitMetalog(
  points: { x: number; y: number }[],
  terms: number
): number[] {
  const Y = matrix(
    points.map(({y}) => 
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
