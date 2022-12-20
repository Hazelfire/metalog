import { quantile, cdf, pdf } from "./index";
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
  it("is inverse of cdf", () => {
    fixture.forEach((dist) => {
      const a = dist.a;
      const start = quantile(a, 0.00001);
      const end = quantile(a, 0.99999);
      const step = (end - start) / 100;
      for (let i = start; i < end; i += step) {
        expect(quantile(a, cdf(a, i))).toBeCloseTo(i);
      }
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

/*
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
}); */
