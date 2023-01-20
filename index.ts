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
  const yMinusHalf = (y - 0.5)
  if (j === 0) {
    return 1;
  } else if (j === 1) {
    return logy;
  } else if (j === 2) {
    return yMinusHalf * logy;
  } else if (j === 3) {
    return yMinusHalf;
  } else if (j % 2 === 0) {
    return yMinusHalf ** (j / 2);
  } else {
    return yMinusHalf ** ((j - 1) / 2) * logy;
  }
}

export function quantile(a: number[], q: number): number {
  return sum(a.map((a_i, i) => a_i * metalogBasisFunction(i, q)));
}

export function quantileDiff(a: number[], y: number): number {
  const logy = Math.log(y / (1 - y));
  const logyDeriv = 1 / (y * (1 - y))
  return sum(
    a.map((a_i, i) => {
      if (i === 0) {
        return 0;
      } else if (i === 1) {
        return a_i * logyDeriv;
      } else if (i === 2) {
        return a_i * ((y - 0.5) * logyDeriv + logy);
      } else if (i === 3) {
        return a_i;
      } else if (i % 2 === 0) {
        return a_i * (i / 2) * (y - 0.5) ** (i / 2 - 1);
      } else {
        return (
          a_i *
          ((y - 0.5) ** ((i - 1) / 2) * logyDeriv +
            ((i - 1) / 2) * (y - 0.5) ** ((i - 3) / 2) * logy)
        );
      }
    })
  );
}

// This is the derivitive of the above function, calculated by hand
// the rest by hand.
export function quantileDoubleDiff(a: number[], y: number): number {
  const logy = Math.log(y / (1 - y));
  const logyDeriv = 1 / (y * (1 - y))
  const logyDeriv2 = (2 * y - 1) / (y * y * (y - 1) * (y - 1));
  return sum(
    a.map((a_i, i) => {
      if (i === 0) {
        return 0;
      } else if (i === 1) {
        return a_i * logyDeriv2;
      } else if (i === 2) {
        return a_i * ((y - 0.5) * logyDeriv2 + 2 * logyDeriv);
      } else if (i === 3) {
        return 0;
      } else if (i % 2 === 0) {
        return a_i * i * (i - 2) * (y - 0.5) ** (i / 2 - 2) / 4;
      } else {
        return (
          a_i *
            ((y - 0.5) ** ((i - 1) / 2) * logyDeriv2 +
            (i - 1) * (y - 0.5) ** ((i - 3) / 2) * logyDeriv) +
            (i - 1) * (i - 3) * (y - 0.5) ** ((i - 5) / 2) * logy / 4
          );
      }
    })
  );
}

// This is a combination of Halley's method and binary search.
// It's basically a binary search, except we choose the "midpoint"
// through newton's method.
// In this case we are using the assumption that the quantile function
// is monotonic (which it is)
// Supports an error parameter (default is correct to 12 decimal places)
// If it can't meet the precision (due to floating point precision problems)
// it will return the best it can
export function cdf(a: number[], x: number, err: number=0): number {
  const alpha_step = 1;
  let y_now = 0.5;
  let i = 1;
  let max = 1;
  let min = 0;
  let temp_err = 0.5;
  while (err < temp_err) {
    const first_function = quantile(a, y_now) - x;
    if(first_function > 0){
      max = y_now;
    }
    else if (first_function < 0) {
      min = y_now;
    }
    else {
      return y_now;
    }
    const derv_function = quantileDiff(a, y_now);
    let y_next = y_now - alpha_step * (first_function/derv_function)
    if(y_next >= max || y_next <= min) {
      y_next = (min + max) / 2;
      // Our most common break condition is when the finder can't find the difference between the highest
      // and smallest
      if(y_next === min || y_next === max){
        if(Math.abs(quantile(a, max) - x) < Math.abs(quantile(a, min) - x)){
          return max;
        }
        else {
          return min;
        }
      }
    }
    temp_err = Math.abs(y_next - y_now)
    y_now = y_next;
    i++;
    if (i > 100) {
      return y_now;
    }
  }
  // Iterate through possible floats until we get an answer that's as close as possible
  /*
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
  }*/
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
