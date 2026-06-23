import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import {
  buildMatchAttributes,
  buildSearchKeywords,
  calculateMatchScore,
  findMatchSuggestions,
  getMatchReasons
} from "./matching.js";

const createdAt = "2026-06-23T08:00:00.000Z";

function report(overrides) {
  return {
    id: randomUUID(),
    type: "lost",
    title: "",
    description: "",
    location: "",
    status: "open",
    createdAt,
    ...overrides
  };
}

describe("smarter matching", () => {
  it("extracts normalized attributes from report text", () => {
    const attributes = buildMatchAttributes(
      report({
        title: "Dark billfold",
        description: "Contains university ID and navy access pass",
        location: "Central Library"
      })
    );

    assert.equal(attributes.category, "wallet");
    assert.deepEqual(attributes.colors, ["black", "blue"]);
    assert.deepEqual(attributes.identifiers, ["student card", "access card"]);
  });

  it("normalizes search keywords for common synonyms", () => {
    assert.deepEqual(
      buildSearchKeywords({
        title: "Dark billfold",
        description: "University ID inside",
        location: ""
      }),
      ["black", "wallet", "nus", "card"]
    );
  });

  it("suggests semantic description matches that do not share exact item words", () => {
    const lostWallet = report({
      id: "lost-wallet",
      type: "lost",
      description: "Black leather wallet with NUS student card and blue access card"
    });
    const foundBillfold = report({
      id: "found-billfold",
      type: "found",
      description: "Dark billfold containing university ID and navy access pass"
    });
    const foundBottle = report({
      id: "found-bottle",
      type: "found",
      description: "Silver water bottle with stickers"
    });

    const score = calculateMatchScore(lostWallet, foundBillfold);
    const suggestions = findMatchSuggestions([lostWallet, foundBillfold, foundBottle], lostWallet);

    assert.ok(score >= 40, `expected a medium semantic match, got ${score}`);
    assert.deepEqual(
      getMatchReasons(lostWallet, foundBillfold),
      ["same category: wallet", "matching color: black, blue", "shared detail: student card"]
    );
    assert.deepEqual(suggestions.map(({ item }) => item.id), ["found-billfold"]);
    assert.ok(calculateMatchScore(lostWallet, foundBottle) < 25);
  });

  it("keeps category mismatches from becoming strong matches", () => {
    const lostWallet = report({
      id: "lost-wallet",
      type: "lost",
      description: "Black leather wallet with NUS student card"
    });
    const foundPhone = report({
      id: "found-phone",
      type: "found",
      description: "Black phone case holding a student card"
    });

    assert.ok(calculateMatchScore(lostWallet, foundPhone) < 40);
  });

  it("does not score or explain same-type reports as matches", () => {
    const lostWallet = report({
      id: "lost-wallet",
      type: "lost",
      description: "Black leather wallet with NUS student card"
    });
    const anotherLostWallet = report({
      id: "lost-wallet-two",
      type: "lost",
      description: "Dark billfold with university ID"
    });

    assert.equal(calculateMatchScore(lostWallet, anotherLostWallet), 0);
    assert.deepEqual(getMatchReasons(lostWallet, anotherLostWallet), []);
  });
});
