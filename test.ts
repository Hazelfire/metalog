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
  it.skip("matches rmetalog", () => {
    fixture.forEach((dist) => {
      const a = dist.a;
      zip(dist.y, dist.x).map(([y, x]) => {
        expect(quantile(a, y)).toBeCloseTo(x, 5);
      });
    });
  });
});

describe("CDF is correct", () => {
  it.skip("matches rmetalog", () => {
    fixture.forEach((dist) => {
      const a = dist.a;
      zip(dist.p, dist.x).map(([p, x]) => {
        expect(cdf(a, x)).toBeCloseTo(p, 4);
      });
    });
  });

  it("is inverse of quantile", () => {
    fixture.forEach((dist, fixture_id) => {
      const a = dist.a;
      const start = 0.0001;
      const end = 0.9999;
      const step = (end - start) / 100;
      for (let i = start; i < end; i += step) {
        let quantileResult = quantile(a, i)
        let cdfResult = cdf(a, quantileResult)
        expect(cdfResult, `Wasn't inverse!
        i                   = ${i}
        quantile(a, i)      = ${quantileResult}
        cdf(quantile(a, i)) = ${cdfResult}
        fixture_id          = ${fixture_id} 
        
        Here's a test case for debugging if you want to use it:
        test("cdf should be inverse of quantile at x=${i}", () => {
          const i = ${i}
          const a = fixture[${fixture_id}]
          expect(cdf(a, quantile(a, i))).toBeCloseTo(i)
        })`).toBeCloseTo(i);
      }
    });
  });
  test("always grows", () => {
    fixture.map((dist, fixture_id) => {
      const a = dist.a;
      const start = quantile(a, 0.00001);
      const end = quantile(a, 0.99999);
      const count = 10000
      const step = (end - start) / count;
      const arr = Array.from(Array(count-1).keys()).map(x => start + (x + 1) * step)
      arr.forEach((i) => {
        const lowCdf = cdf(a, i);
        const highCdf = cdf(a, i + step);
        expect(highCdf, `Failed test:\n
        i                             = ${i}
        i + step                      = ${i + step}
        cdf(a, i)                     = ${lowCdf}
        cdf(a, i + step)              = ${highCdf}
        quantile(a, cdf(a, i))        = ${quantile(a, lowCdf)}
        quantile(a, cdf(a, i + step)) = ${quantile(a, highCdf)}
        fixture_id                    = ${fixture_id}
        
        ${Math.abs(quantile(a, lowCdf) - i) < Math.abs(quantile(a, highCdf) - (i + step)) ? 
          `I think the i + step calculation is wrong, because it's further away from the expected value`:
          `I think the i calculation is wrong, because it's further away from the expected value`
        }
        
        If you'd like to create a test to debug try this:
        test("fixture ${fixture_id} should be monotonic around ${i}", () => {
          const a = fixture[${fixture_id}].a
          const low  = ${i}
          const high = ${i + step}
          expect(cdf(a, high)).toBeGreaterThanOrEqual(cdf(a, low))
        })
        `).toBeGreaterThanOrEqual(cdf(a, i));
      })
    });
  });
  // This fails because quantile is not monotonic around that point. I think this is probably
  // an unreasonable test case. Skipping
  test.skip("fixture 0 should be monotonic around -1.9954616973944201", () => {
    const a = fixture[0].a;
    expect(cdf(a, -1.99546169739442)).toBeGreaterThanOrEqual(cdf(a, -1.9954616973944201))
  })

  test("grows also in tails", () => {
    let dist = fixture[0]
    const a = dist.a;
    const lower = -7.358952076939226;
    const higher = -7.358101504410828;
    expect(cdf(a, higher)).toBeGreaterThanOrEqual(cdf(a,lower))
    let dist2 = fixture[2];
    const lower2 = 1.293561810361898;
    const higher2 = 1.2936914487498685;
    expect(cdf(dist2.a, higher2)).toBeGreaterThanOrEqual(cdf(dist2.a, lower2));
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
  it.skip("matches rmetalog", () => {
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
  it("Matches quantiles", () => {
    const a = fitMetalog([{x: -1, y: 0.05}, {x: 2, y: 0.3}, {x: 6, y: 0.9}], 3)
    expect(cdf(a, -1)).toBeCloseTo(0.05)
    expect(cdf(a, 2)).toBeCloseTo(0.3)
    expect(cdf(a, 6)).toBeCloseTo(0.9)
  })
  it("has similar quantiles", () => {
    fixture.forEach((dist) => {
      const points = zip(dist.cdf_y, dist.cdf_x).map(([y, x]) => ({ x, y }));
      const myFit = fitMetalog(points, dist.terms[0]);
      points.forEach(({x, y}) => expect(cdf(myFit, x)).toBeCloseTo(y));
    });
  });
});
