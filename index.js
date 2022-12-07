"use strict";
exports.__esModule = true;
exports.fitMetalog = exports.pdf = exports.cdf = exports.quantile = exports.metalogBasisFunction = void 0;
var mathjs_1 = require("mathjs");
var sum = function (x) { return x.reduce(function (a, b) { return a + b; }); };
function metalogBasisFunction(j, y) {
    var logy = Math.log(y / (1 - y));
    if (j === 0) {
        return 1;
    }
    else if (j === 1) {
        return logy;
    }
    else if (j === 2) {
        return (y - 0.5) * logy;
    }
    else if (j === 3) {
        return y - 0.5;
    }
    else if (j % 2 === 0) {
        return Math.pow((y - 0.5), (j / 2));
    }
    else {
        return Math.pow((y - 0.5), ((j - 1) / 2)) * logy;
    }
}
exports.metalogBasisFunction = metalogBasisFunction;
function quantile(a, y) {
    return sum(a.map(function (a_i, i) { return a_i * metalogBasisFunction(i, y); }));
}
exports.quantile = quantile;
function quantileDiff(a, y) {
    var logy = Math.log(y / (1 - y));
    return sum(a.map(function (a_i, i) {
        if (i === 0) {
            return 0;
        }
        else if (i === 1) {
            return a_i / (y * (1 - y));
        }
        else if (i === 2) {
            return a_i * ((y - 0.5) / (y * (1 - y)) + logy);
        }
        else if (i === 3) {
            return a_i;
        }
        else if (i % 2 === 0) {
            return a_i * (i / 2) * Math.pow((y - 0.5), (i / 2 - 1));
        }
        else {
            return (a_i *
                (Math.pow((y - 0.5), ((i - 1) / 2)) / (y * (1 - y)) +
                    ((i - 1) / 2) * Math.pow((y - 0.5), ((i - 1) / 2 - 1)) * logy));
        }
    }));
}
function cdf(a, x) {
    var alpha_step = 0.01;
    var err = 0.0000001;
    var temp_err = 0.1;
    var y_now = 0.5;
    var i = 1;
    while (temp_err > err) {
        var first_function = quantile(a, y_now) - x;
        var derv_function = quantileDiff(a, y_now);
        var y_next = y_now - alpha_step * (first_function / derv_function);
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
            console.log("Approximation taking too long, quantile value: ", x, " is to far from distribution median. Currently at", y_now);
            return NaN;
        }
    }
    return y_now;
}
exports.cdf = cdf;
function pdf(a, x) {
    return 1 / quantileDiff(a, cdf(a, x));
}
exports.pdf = pdf;
function fitMetalog(points, terms) {
    var Y = (0, mathjs_1.matrix)(points.map(function (_a) {
        var y = _a.y;
        return Array.from(Array(terms).keys()).map(function (i) { return metalogBasisFunction(i, y); });
    }));
    var X = (0, mathjs_1.matrix)(points.map(function (_a) {
        var x = _a.x;
        return [x];
    }));
    var multTran = (0, mathjs_1.multiply)((0, mathjs_1.transpose)(Y), Y);
    var invTran = (0, mathjs_1.inv)(multTran);
    var invMultTran = (0, mathjs_1.multiply)(invTran, (0, mathjs_1.transpose)(Y));
    return (0, mathjs_1.multiply)(invMultTran, X)
        .toArray()
        .map(function (x) {
        if (!(0, mathjs_1.isArray)(x)) {
            if ((0, mathjs_1.isComplex)(x)) {
                return 0;
            }
            else {
                return (0, mathjs_1.number)(x);
            }
        }
        else {
            var y = x[0];
            if ((0, mathjs_1.isComplex)(y)) {
                return 0;
            }
            else {
                return (0, mathjs_1.number)(y);
            }
        }
    });
}
exports.fitMetalog = fitMetalog;
