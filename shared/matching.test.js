import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import {
  buildMatchAttributes,
  buildSearchKeywords,
  calculateMatchScore,
  findMatchSuggestions,
  findTopMatchForUser,
  getMatchReasons
} from "./matching.js";

const createdAt = "2026-06-23T08:00:00.000Z";
const sameColorGrid = Array.from({ length: 256 }).flatMap(() => [1, 1, 1]);
const sameImageSignature = {
  averageColor: { r: 40, g: 42, b: 38 },
  colorGrid: sameColorGrid
};
const differentImageSignature = {
  averageColor: { r: 230, g: 232, b: 235 },
  colorGrid: Array.from({ length: 256 }).flatMap(() => [7, 7, 7])
};
const darkWalletSignature = {
  averageColor: { r: 44, g: 42, b: 39 },
  colorGrid: Array.from({ length: 256 }).flatMap((_, index) => (index % 4 === 0 ? [7, 7, 7] : [1, 1, 1]))
};
const darkPowerbankSignature = {
  averageColor: { r: 40, g: 42, b: 38 },
  colorGrid: Array.from({ length: 256 }).flatMap((_, index) => (index % 5 === 0 ? [0, 0, 0] : [2, 2, 2]))
};

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
      description: "Black leather wallet with NUS student card and blue access card",
      imageLabels: [
        { text: "wallet", confidence: 0.96 },
        { text: "black leather", confidence: 0.9 },
        { text: "student card", confidence: 0.84 },
        { text: "blue access card", confidence: 0.8 }
      ]
    });
    const foundBillfold = report({
      id: "found-billfold",
      type: "found",
      description: "Dark billfold containing university ID and navy access pass",
      imageLabels: [
        { text: "billfold", confidence: 0.94 },
        { text: "black leather", confidence: 0.91 },
        { text: "identity card", confidence: 0.8 },
        { text: "blue pass", confidence: 0.78 }
      ]
    });
    const foundBottle = report({
      id: "found-bottle",
      type: "found",
      description: "Silver water bottle with stickers",
      imageLabels: [
        { text: "bottle", confidence: 0.95 },
        { text: "silver metal", confidence: 0.88 },
        { text: "stickers", confidence: 0.76 }
      ]
    });

    const score = calculateMatchScore(lostWallet, foundBillfold);
    const suggestions = findMatchSuggestions([lostWallet, foundBillfold, foundBottle], lostWallet);

    assert.ok(score >= 40, `expected a medium image-first match, got ${score}`);
    assert.deepEqual(
      getMatchReasons(lostWallet, foundBillfold),
      ["similar image labels", "same category: wallet", "matching color: black, blue"]
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

  it("keeps powerbanks and phones below the possible-match threshold", () => {
    const lostPowerbank = report({
      id: "lost-powerbank",
      type: "lost",
      title: "Black Powerbank",
      description: "20000mAh, with white wire",
      location: "COM 3",
      imageSignature: sameImageSignature
    });
    const foundPhone = report({
      id: "found-phone",
      type: "found",
      title: "Mobile",
      description: "White iPhone",
      location: "COM 2",
      imageSignature: differentImageSignature
    });

    assert.equal(buildMatchAttributes(lostPowerbank).category, "powerbank");
    assert.equal(buildMatchAttributes(foundPhone).category, "phone");
    assert.ok(calculateMatchScore(lostPowerbank, foundPhone) < 25);
    assert.deepEqual(findMatchSuggestions([lostPowerbank, foundPhone], lostPowerbank), []);
  });

  it("treats the same image as a high-confidence match even when Gemini labels are unavailable", () => {
    const lostPowerbank = report({
      id: "lost-powerbank",
      type: "lost",
      title: "Black Powerbank",
      description: "20000mAh, with white wire",
      location: "COM 3",
      imageSignature: sameImageSignature
    });
    const foundPowerbank = report({
      id: "found-powerbank",
      type: "found",
      title: "Power Bank Black",
      description: "Had a white cable",
      location: "Com 3",
      imageSignature: sameImageSignature
    });

    assert.ok(calculateMatchScore(lostPowerbank, foundPowerbank) >= 65);
    assert.deepEqual(findMatchSuggestions([lostPowerbank, foundPowerbank], lostPowerbank).map(({ item }) => item.id), [
      "found-powerbank"
    ]);
  });

  it("does not give the same-image score to a report with the wrong item category", () => {
    const lostPowerbank = report({
      id: "lost-powerbank",
      type: "lost",
      title: "Black Powerbank",
      description: "20000mAh, with white wire",
      location: "COM 3",
      imageSignature: sameImageSignature
    });
    const foundWallet = report({
      id: "found-wallet",
      type: "found",
      title: "Black wallet",
      description: "Had a white cable",
      location: "COM 3",
      imageSignature: sameImageSignature
    });
    const foundPowerbank = report({
      id: "found-powerbank",
      type: "found",
      title: "Power Bank Black",
      description: "Had a white cable",
      location: "COM 3",
      imageSignature: sameImageSignature
    });

    const wrongCategoryScore = calculateMatchScore(lostPowerbank, foundWallet);
    const correctCategoryScore = calculateMatchScore(lostPowerbank, foundPowerbank);

    assert.ok(wrongCategoryScore < 65, `expected wrong category below high confidence, got ${wrongCategoryScore}`);
    assert.ok(correctCategoryScore >= 65, `expected correct category high confidence, got ${correctCategoryScore}`);
    assert.ok(correctCategoryScore > wrongCategoryScore);
  });

  it("does not treat two different dark rectangular objects as the same image", () => {
    const lostPowerbank = report({
      id: "lost-powerbank",
      type: "lost",
      title: "Black Powerbank",
      description: "20000mAh, with white wire",
      location: "COM 3",
      imageSignature: darkPowerbankSignature
    });
    const foundWallet = report({
      id: "found-wallet",
      type: "found",
      title: "Black wallet",
      description: "Black wallet",
      location: "COM 3",
      imageSignature: darkWalletSignature
    });

    assert.ok(calculateMatchScore(lostPowerbank, foundWallet) < 65);
  });

  it("caps identical text when image labels clearly disagree", () => {
    const lostWallet = report({
      id: "lost-wallet",
      type: "lost",
      title: "Black wallet",
      description: "Black leather wallet with NUS student card",
      location: "Central Library",
      imageLabels: [
        { text: "wallet", confidence: 0.96 },
        { text: "black", confidence: 0.9 },
        { text: "leather", confidence: 0.86 }
      ]
    });
    const foundUmbrella = report({
      id: "found-umbrella",
      type: "found",
      title: "Black wallet",
      description: "Black leather wallet with NUS student card",
      location: "Central Library",
      imageLabels: [
        { text: "umbrella", confidence: 0.96 },
        { text: "red", confidence: 0.92 },
        { text: "fabric", confidence: 0.82 }
      ]
    });

    assert.ok(calculateMatchScore(lostWallet, foundUmbrella) < 25);
    assert.deepEqual(findMatchSuggestions([lostWallet, foundUmbrella], lostWallet), []);
  });

  it("does not mark text-only matches as high confidence when image labels are missing", () => {
    const lostWallet = report({
      id: "lost-wallet",
      type: "lost",
      title: "Black wallet",
      description: "Black leather wallet with NUS student card",
      location: "Central Library"
    });
    const foundWallet = report({
      id: "found-wallet",
      type: "found",
      title: "Black wallet",
      description: "Black leather wallet with NUS student card",
      location: "Central Library"
    });

    assert.ok(calculateMatchScore(lostWallet, foundWallet) < 65);
  });

  it("allows high confidence only when strong image labels agree", () => {
    const lostWallet = report({
      id: "lost-wallet",
      type: "lost",
      title: "Black wallet",
      description: "Black leather wallet with NUS student card",
      location: "Central Library",
      imageLabels: [
        { text: "wallet", confidence: 0.96 },
        { text: "black leather", confidence: 0.9 },
        { text: "student card", confidence: 0.84 }
      ]
    });
    const foundWallet = report({
      id: "found-wallet",
      type: "found",
      title: "Dark billfold",
      description: "Dark billfold with university ID",
      location: "Central Library",
      imageLabels: [
        { text: "billfold", confidence: 0.94 },
        { text: "black leather", confidence: 0.91 },
        { text: "identity card", confidence: 0.8 }
      ]
    });

    assert.ok(calculateMatchScore(lostWallet, foundWallet) >= 65);
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

  it("finds the strongest cross-type match for the signed-in user", () => {
    const user = { id: "user-1" };
    const myLostWallet = report({
      id: "my-lost-wallet",
      type: "lost",
      title: "Black wallet",
      description: "Black leather wallet with NUS student card",
      location: "Central Library",
      userId: "user-1",
      imageLabels: [
        { text: "wallet", confidence: 0.96 },
        { text: "black", confidence: 0.9 },
        { text: "leather", confidence: 0.85 }
      ]
    });
    const foundWallet = report({
      id: "found-wallet",
      type: "found",
      title: "Wallet found",
      description: "Black leather wallet, has a student card inside",
      location: "Central Library",
      userId: "user-2",
      imageLabels: [
        { text: "wallet", confidence: 0.95 },
        { text: "black", confidence: 0.88 },
        { text: "leather", confidence: 0.8 }
      ]
    });
    const unrelatedBottle = report({
      id: "found-bottle",
      type: "found",
      title: "Blue bottle",
      description: "Blue water bottle",
      location: "UTown",
      userId: "user-3"
    });

    const topMatch = findTopMatchForUser([myLostWallet, foundWallet, unrelatedBottle], user);

    assert.equal(topMatch.item.id, "found-wallet");
    assert.equal(topMatch.sourceItem.id, "my-lost-wallet");
  });

  it("returns no top match without a signed-in user", () => {
    assert.equal(findTopMatchForUser([], null), null);
  });
});
