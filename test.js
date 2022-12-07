"use strict";
exports.__esModule = true;
var index_1 = require("./index");
var fixture = require("./fixture.json");
function zip(a, b) {
    return a.map(function (e, i) {
        return [e, b[i]];
    });
}
describe("Quantile is correct", function () {
    it("matches rmetalog", function () {
        fixture.forEach(function (dist) {
            var a = dist.a;
            zip(dist.y, dist.x).map(function (_a) {
                var y = _a[0], x = _a[1];
                expect((0, index_1.quantile)(a, y)).toBeCloseTo(x, 5);
            });
        });
    });
});
describe("CDF is correct", function () {
    it("matches rmetalog", function () {
        fixture.forEach(function (dist) {
            var a = dist.a;
            zip(dist.p, dist.x).map(function (_a) {
                var p = _a[0], x = _a[1];
                expect((0, index_1.cdf)(a, x)).toBeCloseTo(p, 5);
            });
        });
    });
});
describe("PDF is correct", function () {
    it("matches rmetalog", function () {
        fixture.forEach(function (dist) {
            var a = dist.a;
            zip(dist.d, dist.x).map(function (_a) {
                var d = _a[0], x = _a[1];
                expect((0, index_1.pdf)(a, x)).toBeCloseTo(d, 4);
            });
        });
    });
});
describe("Fit x coordinate is correct", function () {
    it("matches rmetalog", function () {
        fixture.forEach(function (dist) {
            var points = zip(dist.cdf_y, dist.cdf_x).map(function (_a) {
                var y = _a[0], x = _a[1];
                return ({ x: x, y: y });
            });
            expect((0, index_1.fitMetalog)(points, dist.terms[0])).toEqual(dist.a);
        });
    });
    it("has similar quantiles", function () {
        fixture.forEach(function (dist) {
            var points = zip(dist.cdf_y, dist.cdf_x).map(function (_a) {
                var y = _a[0], x = _a[1];
                return ({ x: x, y: y });
            });
            var myFit = (0, index_1.fitMetalog)(points, dist.terms[0]);
            dist.x.forEach(function (x) { return expect((0, index_1.cdf)(myFit, x)).toEqual((0, index_1.cdf)(dist.a, x)); });
        });
    });
});
