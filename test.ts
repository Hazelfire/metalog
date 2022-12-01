import { fitMetalog, quantile, cdf, pdf } from "./index";
import * as fixture from "./fixture.json";
function zip<T>(a: T[], b: T[]): [T, T][] {
  return a.map(function (e, i) {
    return [e, b[i]];
  });
}

describe("Quantile is correct", () => {
  it("matches rmetalog", () => {
    fixture.forEach((dist) => {
      const a = dist.a;
      zip(dist.y, dist.x).map(([y, x]) => {
        expect(quantile(a, y)).toBeCloseTo(x, 5);
      });
    });
  });
});

describe("CDF is correct", () => {
  it("matches rmetalog", () => {
    fixture.forEach((dist) => {
      const a = dist.a;
      zip(dist.p, dist.x).map(([p, x]) => {
        expect(cdf(a, x)).toBeCloseTo(p, 5);
      });
    });
  });
});

describe("PDF is correct", () => {
  it("matches rmetalog", () => {
    fixture.forEach((dist) => {
      const a = dist.a;
      zip(dist.d, dist.x).map(([d, x]) => {
        expect(pdf(a, x)).toBeCloseTo(d, 4);
      });
    });
  });
});

describe("Fit x coordinate is correct", () => {
  it("matches rmetalog", () => {
    fixture.forEach((dist) => {
      let points = zip(dist.cdf_y, dist.cdf_x).map(([y, x]) => ({ x, y }));
      expect(fitMetalog(points, dist.terms[0])).toEqual(dist.a);
    });
  });
  it("has similar quantiles", () => {
    fixture.forEach((dist) => {
      let points = zip(dist.cdf_y, dist.cdf_x).map(([y, x]) => ({ x, y }));
      let myFit = fitMetalog(points, dist.terms[0]);
      dist.x.forEach((x) => expect(cdf(myFit, x)).toEqual(cdf(dist.a, x)));
    });
  });
});
