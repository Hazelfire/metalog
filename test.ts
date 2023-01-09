import { fitMetalog, quantile, cdf, pdf, metalogBasisFunction } from "./index";
import * as fixture from "./fixture.json";
import { Session } from "inspector";
import * as fs from "fs";

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
        expect(cdf(a, x)).toBeCloseTo(p, 4);
      });
    });
  });

  it("is inverse of quantile", () => {
    fixture.forEach((dist) => {
      const a = dist.a;
      const start = 0.0001;
      const end = 0.9999;
      const step = (end - start) / 100;
      for (let i = start; i < end; i += step) {
        expect(cdf(a, quantile(a, i))).toBeCloseTo(i, 2);
      }
    });
  });
  // This isn't always the case over all domains. Replacing, start and end with -10 and 10 respectively
  // Fails this test. This is because -10 and 10 are in the tails of some of these distributions.
  test("only grows", () => {
    fixture.forEach((dist) => {
      const a = dist.a;
      const start = quantile(a, 0.001);
      const end = quantile(a, 0.999);
      const step = (end - start) / 100;
      for (let i = start; i < end; i += step) {
        expect(cdf(a, i + step)).toBeGreaterThanOrEqual(cdf(a, i));
      }
    });
  });

  // This test is annoyingly not that accurate
  test("conforms to PDF", () => {
    fixture.forEach((dist) => {
      const a = dist.a;
      const start = quantile(a, 0.001);
      const end = quantile(a, 0.999);
      const step = (end - start) / 10000;
      const diff = 100
      for (let i = start; i < end; i += step) {
        expect(cdf(a, i) + step * pdf(a, i) / diff).toBeCloseTo(cdf(a, i + step / diff), 1)
      }
    });
  });
});

describe("PDF is correct", () => {
  it("matches rmetalog", () => {
    fixture.forEach((dist) => {
      const a = dist.a;
      zip(dist.d, dist.x).map(([d, x]) => {
        expect(pdf(a, x)).toBeCloseTo(d, 3);
      });
    });
  });
  it("pdf is always positive", () => {
    fixture.forEach((dist) => {
      const a = dist.a;
      const start = quantile(a, 0.001);
      const end = quantile(a, 0.999);
      const step = (end - start) / 10000;
      const diff = 100;
      for(let i = start; i < end; i += step){
        expect(pdf(a, i)).toBeGreaterThanOrEqual(0);
      }
    })
  })

  it("resolves quickly", () => {
    new Promise((resolve, reject) => {
      const session = new Session();
      session.connect();

      session.post("Profiler.enable", () => {
        session.post("Profiler.start", () => {
          fixture.forEach((dist) => {
            const a = dist.a;
            const start = quantile(a, 0.00001);
            const end = quantile(a, 0.99999);
            const step = (end - start) / 100;
            for (let i = start; i < end; i += step) {
              pdf(a, i);
            }
          });
          session.post("Profiler.stop", (err, { profile }) => {
            fs.writeFileSync(
              "./metalog_pdf.cpuprofile",
              JSON.stringify(profile)
            );
            resolve(undefined);
          });
        });
      });
    });
  }, 1000);
});

describe("Fit x coordinate is correct", () => {
  it("is better than rmetalog", () => {
    fixture.forEach((dist) => {
      const points = zip(dist.cdf_y, dist.cdf_x).map(([y, x]) => ({ x, y }));
      const myFit = fitMetalog(points, dist.terms[0]);
      const myFitScore = points.map(({x, y}) => (quantile(myFit, y) - x) ** 2).reduce((a, b) => a + b);
      const rMetalogFitScore = points.map(({x, y}) => (quantile(dist.a, y) - x) ** 2).reduce((a, b) => a + b);
      expect(myFitScore).toBeLessThan(rMetalogFitScore);
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
