# @quri/metalog
This package is a TS implementation of metalog. It is based on [rmetalog](https://github.com/isaacfab/rmetalog) but varies in a couple of ways.

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

```js
import { quantile, cdf, pdf, variance, mean, fitMetalog } from "@quri/metalog"

quantile([1, 2, 3], 0.5)
cdf([1, 2, 3], 0)
pdf([1, 2, 3], 0)\
```

The first argument is an array of the distributions `a` parameter. See [Metalog Distribution](https://en.wikipedia.org/wiki/Metalog_distribution) for details.
