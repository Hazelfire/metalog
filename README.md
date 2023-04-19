# @quri/metalog
This package is a JS implementation of metalog. It is based on [rmetalog](https://github.com/isaacfab/rmetalog) but varies in a couple of ways.

1. rmetalog doesn't seem to strictly obey the cdf being the inverse of the quantile function. As far as I can tell, around the tails it doesn't hold this
inverse perfectly. This implementation is built to hold that inverse better.
2. rmetalog is slower. They use newton's method but to prevent non-convergence, they take smaller steps towards the solution. This makes the code do more
iterations to converge.

Utilising the fact that we are doing newton's method on a monotonic function (a quantile function), I use a mixture of binary search and newton's 
method to converge on a solution quickly. My implementation is both faster and more accurate.

There are some problems with this implementation, most notably:
1. Because we approximate the cdf with newton's method, the function is not strictly monotonic. A solution to this would be really difficult. I would need
to work out how to iterate to the next highest float, and make sure the other functions floating point arithmetic is as accurate as possible.


## Usage
# Documentation

This code provides functions to work with the metalog distribution.
## Functions
### quantile(a: number[], q: number): number

Calculates the quantile value for the metalog distribution with the given coefficients `a` and quantile `q`.
### quantileDiff(a: number[], y: number): number

Calculates the second derivative of the quantile function for the given coefficients `a` and quantile value `y`.
### cdf(a: number[], x: number, err: number = 0): number

Calculates the cumulative distribution function (CDF) for the given coefficients `a`, value `x`, and error tolerance `err`.
### pdf(a: number[], x: number): number

Calculates the probability density function (PDF) for the given coefficients `a` and value `x`.
### fitMetalog(points: { x: number; y: number }[], terms: number): number[] | undefined

Fits a metalog distribution to the given data points with the specified number of terms using OLS. Returns the coefficients of the fitted distribution or undefined if the fitting fails.
### fitMetalogLP(points: { x: number; y: number }[], terms: number, diffError = 0.001, pointCount = 1000): number[] | undefined

Attempts to fit a metalog distribution to the given data points using linear programming. This function is used when `fitMetalog` fails to find a solution. Returns the coefficients of the fitted distribution or undefined if the fitting fails.

### mean(a: number[])

The `mean` function calculates the mean of a metalog distribution given its coefficients `a`.

### variance(a: number[])

The `variance` function calculates the variance of a metalog distribution given its coefficients `a`.

### validate(a: number[], samples: number = 100): MetalogValidationStatus

The `validate` function checks if a set of coefficients `a` is valid for a metalog distribution. It returns the validation status as a `MetalogValidationStatus` enum value. The optional `samples` parameter defines the number of samples to use for the validation process.

## Example Usage

```javascript

import { fitMetalog, cdf, pdf } from "your-module";

// Sample data points
const points = [
  { x: 1, y: 0.1 },
  { x: 2, y: 0.2 },
  { x: 3, y: 0.3 },
  { x: 4, y: 0.4 },
  { x: 5, y: 0.5 },
  { x: 6, y: 0.6 },
  { x: 7, y: 0.7 },
  { x: 8, y: 0.8 },
  { x: 9, y: 0.9 },
];

// Fit a metalog distribution with 4 terms
const coefficients = fitMetalog(points, 4);

if (coefficients) {
  // Calculate CDF and PDF for a given value
  const value = 5;
  const cdfValue = cdf(coefficients, value);
  const pdfValue = pdf(coefficients, value);

  console.log("CDF:", cdfValue);
  console.log("PDF:", pdfValue);
} else {
  console.log("Failed to fit metalog distribution");
}
### Using the `cdf` and `pdf` functions

Once the coefficients of the metalog distribution are obtained using the `fitMetalog` function, we can use the `cdf` and `pdf` functions to calculate the cumulative distribution function (CDF) and the probability density function (PDF), respectively, for a given value.

```javascript

if (coefficients) {
  // Calculate CDF and PDF for a given value
  const value = 5;
  const cdfValue = cdf(coefficients, value);
  const pdfValue = pdf(coefficients, value);

  console.log("CDF:", cdfValue);
  console.log("PDF:", pdfValue);
} else {
  console.log("Failed to fit metalog distribution");
}
```



In the code snippet above, we first check if the `coefficients` are valid. If they are, we proceed to calculate the CDF and PDF for a given `value` (5 in this case) using the `cdf` and `pdf` functions, respectively. The calculated CDF and PDF values are then logged to the console. If the coefficients are not valid (i.e., the metalog distribution could not be fitted to the data points), an error message is logged to the console.

Keep in mind that the accuracy of the metalog distribution and the resulting CDF and PDF values depend on the quality of the input data points and the number of terms used to fit the distribution.

### Charting the metalog distribution using `quantile` and `quantileDiff`

To chart the metalog distribution using the `quantile` and `quantileDiff` functions, you can follow these steps:

1.  Ensure the set of coefficients `a` is valid using the `validate` function.
2.  Create a set of equally spaced points in the range (0, 1) to represent the cumulative probabilities.
3.  For each point, calculate the corresponding quantile value using the `quantile` function.
4.  Calculate the derivative of the quantile function using the `quantileDiff` function for each point.
5.  Plot the quantile values against the cumulative probabilities and the derivatives against the cumulative probabilities to visualize the CDF and PDF of the metalog distribution, respectively.
```javascript
import { quantile, quantileDiff, validate, MetalogValidationStatus } from './metalog';
const a = [/* your coefficients */];
const samples = 100;
const validationResult = validate(a, samples);

if (validationResult === MetalogValidationStatus.Success) {
  const cumulativeProbabilities = Array.from({ length: samples }, (_, i) => i / (samples + 1) + 1 / (2 * samples));
  const quantileValues = cumulativeProbabilities.map((p) => quantile(a, p));
  const derivatives = cumulativeProbabilities.map((p) =>  1 / quantileDiff(a, p));

  const cdfData = cumulativeProbabilities.map((p, i) => ({ p, value: quantileValues[i] }));
  const pdfData = cumulativeProbabilities.map((p, i) => ({ p, value: derivatives[i] }));
} else {
  console.log('Invalid coefficients');
}
```
