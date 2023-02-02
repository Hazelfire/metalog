import {
  matrix,
  multiply,
  concat,
  inv,
  isArray,
  isComplex,
  transpose,
  number,
  MathNumericType,
} from "mathjs";
import solver from "javascript-lp-solver";
const sum = (x: number[]) => x.reduce((a, b) => a + b);

export function metalogBasisFunction(j: number, y: number): number {
  const logy = Math.log(y / (1 - y));
  const yMinusHalf = y - 0.5;
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

export function metalogBasisDiff(i: number, y: number): number {
  const logy = Math.log(y / (1 - y));
  const logyDeriv = 1 / (y * (1 - y));
  if (i === 0) {
    return 0;
  } else if (i === 1) {
    return logyDeriv;
  } else if (i === 2) {
    return (y - 0.5) * logyDeriv + logy;
  } else if (i === 3) {
    return 1;
  } else if (i % 2 === 0) {
    return (i / 2) * (y - 0.5) ** (i / 2 - 1);
  } else {
    return (
      (y - 0.5) ** ((i - 1) / 2) * logyDeriv +
      ((i - 1) / 2) * (y - 0.5) ** ((i - 3) / 2) * logy
    );
  }
}

export function quantile(a: number[], q: number): number {
  return sum(a.map((a_i, i) => a_i * metalogBasisFunction(i, q)));
}

export function quantileDiff(a: number[], y: number): number {
  return sum(a.map((a_i, i) => a_i * metalogBasisDiff(i, y)));
}

// This is the derivitive of the above function, calculated by hand
// the rest by hand.
export function quantileDoubleDiff(a: number[], y: number): number {
  const logy = Math.log(y / (1 - y));
  const logyDeriv = 1 / (y * (1 - y));
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
        return (a_i * i * (i - 2) * (y - 0.5) ** (i / 2 - 2)) / 4;
      } else {
        return (
          a_i *
            ((y - 0.5) ** ((i - 1) / 2) * logyDeriv2 +
              (i - 1) * (y - 0.5) ** ((i - 3) / 2) * logyDeriv) +
          ((i - 1) * (i - 3) * (y - 0.5) ** ((i - 5) / 2) * logy) / 4
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
export function cdf(a: number[], x: number, err: number = 0): number {
  const alpha_step = 1;
  let y_now = 0.5;
  let i = 1;
  let max = 1;
  let min = 0;
  let temp_err = 0.5;
  while (err < temp_err) {
    const first_function = quantile(a, y_now) - x;
    if (first_function > 0) {
      max = y_now;
    } else if (first_function < 0) {
      min = y_now;
    } else {
      return y_now;
    }
    const derv_function = quantileDiff(a, y_now);
    let y_next = y_now - alpha_step * (first_function / derv_function);
    if (y_next >= max || y_next <= min) {
      y_next = (min + max) / 2;
      // Our most common break condition is when the finder can't find the difference between the highest
      // and smallest
      if (y_next === min || y_next === max) {
        if (Math.abs(quantile(a, max) - x) < Math.abs(quantile(a, min) - x)) {
          return max;
        } else {
          return min;
        }
      }
    }
    temp_err = Math.abs(y_next - y_now);
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
): number[] | undefined {
  const Y = matrix(
    points.map(({ y }) =>
      Array.from(Array(terms).keys()).map((i) => metalogBasisFunction(i, y))
    )
  );
  const X = matrix(points.map(({ x }) => [x]));
  const multTran = multiply(transpose(Y), Y);
  const invTran = inv(multTran);
  const invMultTran = multiply(invTran, transpose(Y));
  const a = multiply(invMultTran, X)
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
  // Sometimes, for more extreme cases, metalog can't fit the points to the CDF. Other packages such as rmetalog
  // Or pymetalog try to get a "best guess" through Linear Programming. I decide not to go down that route and hand
  // the error back to the user
  if (validate(a) === MetalogValidationStatus.Success) {
    return a;
  } else {
    return undefined;
  }
}

// Sometimes, the above function will fail to find a solution. In this case,
// metalog cannot fit the distribution that you have given. This function
// attempts to find a close-as-we-can fit. Note that depending on the distribution
// being as "close as we can" can still be very far from what you may be aiming
// for! I use a WebAssembly port of glpk to do this
export function fitMetalogLP(
  points: { x: number; y: number }[],
  terms: number,
  diff_error = 0.001
): number[] | undefined {
  /* A matrix with the terms for all the differential points inside:
   * row count = number of points
   * column count = 2 * number of terms
   * Every second column is the same as the one before but negative.
   * Still don't know why. stop asking!
   */

  const A_eq: any = equalityConstraintMatrix(points, terms);
  const A_ub: any = upperBoundConstraintMatrix(points.length, terms);

  // This fascinates me, still don't get it!
  const objective = Array(2 * points.length)
    .fill(1)
    .concat(Array(2 * terms).fill(0));

  // I'm using a library called "javascript-lp-solve". It's tauted as "linear programming
  // for the rest of us". However, it's a tad annoying to work with as
  const names = objective.map((_, i) => {
    if (i / 2 < points.length) {
      if (i % 2 === 0) {
        return "y" + i / 2;
      } else {
        return "y" + (i - 1) / 2 + "_neg";
      }
    } else {
      const j = i - points.length * 2;
      if (i % 2 === 0) {
        return "a" + j / 2;
      } else {
        return "a" + (j - 1) / 2 + "_neg";
      }
    }
  });

  type constraint = {
    name: string;
    vars: { name: string; coef: number }[];
    bnds: { type: number; ub: number; lb: number };
  };

  const x = points.map(({ x }) => x);
  // This is a strange way to put a linear programming problem
  const model = {
    optimize: "c",
    opType: "min",
    constraints: Object.fromEntries(
      x
        .map((z, i) => ["A_eq" + i, { equal: z }])
        .concat(
          A_ub.toArray().map((_, i) => ["A_ub" + i, { max: -1 * diff_error }])
        )
    ),
    variables: Object.fromEntries(
      names.map((name, i) => [
        name,
        Object.fromEntries(
          [["c", objective[i]]]
            .concat(A_eq.toArray().map((row, j) => ["A_eq" + j, row[i]]))
            .concat(A_ub.toArray().map((row, j) => ["A_ub" + j, -1 * row[i]]))
        ),
      ])
    ),
  };

  const result = solver.Solve(model);

  let arr = [];
  for (let i = 0; i < terms; i++) {
    arr.push((result["a" + i] ?? 0) - (result["a" + i + "_neg"] ?? 0));
  }
  return arr;
}

export function equalityConstraintMatrix(
  points: { x: number; y: number }[],
  terms: number
) {
  // Construct error matrix
  // This looks like
  /* row count = number of points
   * column count = 2 * number of points
   * [ 1 -1 0  0 0  0 ]
   * [ 0  0 1 -1 0  0 ]
   * [ 0  0 0  0 1 -1 ]
   *
   * I have no idea what this is for, but it's part of the A_eq matrix
   */
  const err_mat = matrix(
    points.map((_, j) =>
      Array.from(Array(points.length * 2)).map((_, i) => {
        if (i / 2 === j) {
          return 1;
        } else if ((i - 1) / 2 === j) {
          return -1;
        } else {
          return 0;
        }
      })
    )
  );

  /* Construct Y matrix.
   * row count = number of points
   * column count = 2 * number of terms
   * Columns are positive and then negative interlaced
   *
   * I have no idea what this is for, but it's part of the A_eq matrix
   */
  const Y = matrix(
    points.map(({ y }) =>
      Array.from(Array(terms * 2).keys()).map((i) => {
        if (i % 2 === 0) {
          return metalogBasisFunction(i / 2, y);
        } else {
          return -1 * metalogBasisFunction((i - 1) / 2, y);
        }
      })
    )
  );
  const A_eq: any = concat(err_mat, Y);
  return A_eq;
}

export function upperBoundConstraintMatrix(points: number, terms: number) {
  const diffMat = metalogDiffMatrix(terms, 1000);

  /* A matrix of all 0s
   * row count = number of points in diff matrix
   * columns count = 2 * number of points
   *
   * Why? again. No idea. Part of A_ub
   */
  const zeroes = matrix(
    Array.from(Array(diffMat.size()[0])).map(() =>
      Array.from(Array(points * 2).keys()).map(() => 0)
    )
  );
  const A_ub: any = concat(zeroes, diffMat);
  return A_ub;
}

// Returns all the terms for the derivitive of metalog for different values
// of y, without coefficients
function metalogDiffMatrix(terms: number, steps: number) {
  const step_size = 1 / steps;
  const ys = Array.from(Array(steps - 1).keys()).map(
    (i) => (i + 1) * step_size
  );
  return matrix(
    ys.map((y) =>
      Array.from(Array(terms * 2).keys()).map((i) => {
        if (i % 2 === 0) {
          return metalogBasisDiff(i / 2, y);
        } else if (i % 2 === 1) {
          return -1 * metalogBasisDiff((i - 1) / 2, y);
        }
      })
    )
  );
}

export function mean(a: number[]) {
  return a[0] - a[2] / 2;
}

export function variance(a: number[]) {
  return (
    (Math.PI * Math.PI * a[1] * a[1]) / 3 +
    (a[2] * a[2]) / 12 +
    (Math.PI * Math.PI * a[2] * a[2]) / 36
  );
}

export enum MetalogValidationStatus {
  Success,
  NotEnoughParamaters,
  NegativeDerivative,
}

// Not all combinations of a are valid, but perhaps even more annoyingly, the decision procedure
// to determine whether any combination of a is valid or not is not trivial. We basically need to make
// sure that the derivitave of the quantile function is always positive for all values of y given a set
// of a. I've basically litered this with shortcut functions to speed up some cases, but if it fails
// to work out whether it is valid from that, then it just has to go through all the value of y for the derivitave
// and check whether it's positive or not.
export function validate(a: number[]): MetalogValidationStatus {
  // must have at least 2 items in metalog array
  if (a.length < 2) {
    return MetalogValidationStatus.NotEnoughParamaters;
  } else if (a.length === 2) {
    // This is the only easy one, a_2 must be larger than 0
    return a[1] > 0
      ? MetalogValidationStatus.Success
      : MetalogValidationStatus.NegativeDerivative;
  } else if (a.length > 2) {
    // We can now check whether the variance is negative, which it can't be:
    if (variance(a) < 0) {
      return MetalogValidationStatus.NegativeDerivative;
    }
    if (a.length === 3) {
      // This one is much more painful, I calculated a lower and upper bound by calculator
      // Upper Bound (if it's higher than this, it has to be correct)
      if (a[3] > 0 && a[1] - a[3] / 2 > 0.223871596) {
        return MetalogValidationStatus.Success;
      } else if (a[3] < 0 && a[1] + a[3] / 2 > 0.223871596) {
        return MetalogValidationStatus.Success;
      } else if (a[3] > 0 && a[1] + a[3] / 2 < -0.223871596) {
        return MetalogValidationStatus.NegativeDerivative;
      } else if (a[3] < 0 && a[1] - a[3] / 2 < -0.223871596) {
        return MetalogValidationStatus.NegativeDerivative;
      }
      // This doesn't cover all cases, but it hopefully covers most of them
    }
  }
  // We still don't know whether it's correct, just check for most y:
  for (let i = 0; i < 99; i++) {
    if (quantileDiff(a, i / 100 + 1 / 200) < 0) {
      return MetalogValidationStatus.NegativeDerivative;
    }
  }
  return MetalogValidationStatus.Success;
}
