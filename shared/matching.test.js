import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import {
  buildMatchAttributes,
  buildSearchKeywords,
  calculateMatchScore,
  filterAndSortItems,
  findAlertsForUser,
  findMatchSuggestions,
  findTopMatchForUser,
  getMatchConfidence,
  getMatchReasons
} from "./matching.js";

const createdAt = "2026-06-23T08:00:00.000Z";
const sameImageSignature = { averageColor: { r: 40, g: 42, b: 38 } };
const differentImageSignature = { averageColor: { r: 230, g: 232, b: 235 } };
const darkWalletSignature = { averageColor: { r: 90, g: 88, b: 84 } };
const darkPowerbankSignature = { averageColor: { r: 40, g: 42, b: 38 } };

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
      ["similar image labels", "same category: wallet", "matching color: black, blue", "shared detail: student card"]
    );
    assert.deepEqual(suggestions.map(({ item }) => item.id), ["found-billfold"]);
    assert.ok(calculateMatchScore(lostWallet, foundBottle) < 25);
  });

  it("scores matching powerbanks highly when vision labels use equivalent phrases", () => {
    const lostPowerbank = report({
      id: "lost-powerbank",
      type: "lost",
      title: "Powerbank",
      description: "Black powerbank with strap",
      location: "COM1",
      imageSignature: { averageColor: { r: 40, g: 40, b: 40 } },
      imageLabels: [
        { text: "power bank", confidence: 0.86 },
        { text: "black", confidence: 0.7 },
        { text: "electronics", confidence: 0.7 }
      ]
    });
    const foundPowerbank = report({
      id: "found-powerbank",
      type: "found",
      title: "Wireless Powerbank",
      description: "Black portable charger",
      location: "COM 1",
      imageSignature: { averageColor: { r: 42, g: 42, b: 42 } },
      imageLabels: [
        { text: "powerbank", confidence: 0.88 },
        { text: "black", confidence: 0.72 },
        { text: "portable charger", confidence: 0.7 }
      ]
    });

    const score = calculateMatchScore(lostPowerbank, foundPowerbank);

    assert.ok(score >= 75, `expected a high powerbank match, got ${score}`);
    assert.deepEqual(getMatchReasons(lostPowerbank, foundPowerbank), [
      "similar image labels",
      "same category: powerbank",
      "matching color: black",
      "similar description"
    ]);
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

  it("keeps matching text-only reports useful without marking them as high confidence", () => {
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

    const score = calculateMatchScore(lostWallet, foundWallet);

    assert.ok(score >= 55);
    assert.ok(score < 65);
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

  it("creates alert candidates only for the signed-in user's open lost reports", () => {
    const user = { id: "user-1" };
    const myOpenLostWallet = report({
      id: "my-open-lost-wallet",
      type: "lost",
      title: "Black wallet",
      description: "Black leather wallet with NUS student card",
      location: "Central Library",
      userId: "user-1",
      imageLabels: [
        { text: "wallet", confidence: 0.96 },
        { text: "black leather", confidence: 0.9 },
        { text: "student card", confidence: 0.84 }
      ]
    });
    const myResolvedLostWallet = report({
      id: "my-resolved-lost-wallet",
      type: "lost",
      title: "Black wallet",
      description: "Black leather wallet with NUS student card",
      location: "Central Library",
      status: "resolved",
      userId: "user-1",
      imageLabels: [
        { text: "wallet", confidence: 0.96 },
        { text: "black leather", confidence: 0.9 },
        { text: "student card", confidence: 0.84 }
      ]
    });
    const otherUserLostWallet = report({
      id: "other-user-lost-wallet",
      type: "lost",
      title: "Black wallet",
      description: "Black leather wallet with NUS student card",
      location: "Central Library",
      userId: "user-2",
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
      userId: "user-3",
      imageLabels: [
        { text: "billfold", confidence: 0.94 },
        { text: "black leather", confidence: 0.91 },
        { text: "identity card", confidence: 0.8 }
      ]
    });

    const alerts = findAlertsForUser(
      [myOpenLostWallet, myResolvedLostWallet, otherUserLostWallet, foundWallet],
      user
    );

    assert.deepEqual(
      alerts.map((alert) => [alert.sourceItem.id, alert.item.id]),
      [["my-open-lost-wallet", "found-wallet"]]
    );
  });

  it("filters reports by visible feed controls and sorts newest first", () => {
    const items = [
      report({
        id: "old-open-wallet",
        type: "lost",
        title: "Black wallet",
        description: "NUS card inside",
        location: "Central Library",
        createdAt: "2026-06-23T08:00:00.000Z",
        matchAttributes: { category: "wallet" }
      }),
      report({
        id: "new-resolved-wallet",
        type: "found",
        title: "Wallet",
        description: "Black wallet",
        location: "Central Library",
        status: "resolved",
        createdAt: "2026-06-24T08:00:00.000Z",
        matchAttributes: { category: "wallet" }
      }),
      report({
        id: "new-open-bottle",
        type: "found",
        title: "Bottle",
        description: "Blue bottle",
        location: "UTown",
        createdAt: "2026-06-25T08:00:00.000Z",
        matchAttributes: { category: "bottle" }
      })
    ];

    const filtered = filterAndSortItems(items, {
      query: "wallet",
      type: "all",
      status: "open",
      category: "wallet",
      location: "Central Library",
      sort: "newest"
    });

    assert.deepEqual(filtered.map((item) => item.id), ["old-open-wallet"]);
  });

  it("labels match confidence at documented thresholds", () => {
    assert.equal(getMatchConfidence(39), "Low");
    assert.equal(getMatchConfidence(40), "Medium");
    assert.equal(getMatchConfidence(65), "High");
  });
});
