import { useEffect, useMemo, useState } from "react";
import { AccountPanel } from "./components/AccountPanel.jsx";
import { AppHeader } from "./components/AppHeader.jsx";
import { AuthCard } from "./components/AuthCard.jsx";
import { BottomTabs } from "./components/BottomTabs.jsx";
import { FeedControls } from "./components/FeedControls.jsx";
import { Icon } from "./components/Icon.jsx";
import { ItemCard } from "./components/ItemCard.jsx";
import { ItemDetail } from "./components/ItemDetail.jsx";
import { MatchScreen } from "./components/MatchScreen.jsx";
import { ReportForm } from "./components/ReportForm.jsx";
import { ReportSheet } from "./components/ReportSheet.jsx";
import { defaultFeedFilters, emptyAuthForm, emptyClaimForm, emptyItemForm } from "./constants/forms.js";
import {
  createClaim,
  createItemReport,
  fetchClaims,
  fetchItems,
  loginUser,
  logoutUser,
  registerUser,
  resendVerificationEmail,
  resolveItem,
  subscribeToAuth
} from "./services/firebaseClient.js";
import { createImageSignature, readFileAsDataUrl } from "./utils/imageFiles.js";
import {
  buildMatchAttributes,
  buildSearchKeywords,
  calculateMatchScore,
  filterAndSortItems,
  findMatchSuggestions,
  findTopMatchForUser,
  getMatchReasons
} from "./utils/matching.js";

function App() {
  const [authMode, setAuthMode] = useState("register");
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [claimForm, setClaimForm] = useState(emptyClaimForm);
  const [currentUser, setCurrentUser] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedClaims, setSelectedClaims] = useState([]);
  const [message, setMessage] = useState("");
  const [isAuthSaving, setIsAuthSaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClaimSaving, setIsClaimSaving] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [feedFilters, setFeedFilters] = useState(defaultFeedFilters);
  const [screen, setScreen] = useState("feed");
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [activeMatch, setActiveMatch] = useState(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) || null,
    [items, selectedItemId]
  );

  const filteredItems = useMemo(() => filterAndSortItems(items, feedFilters), [feedFilters, items]);
  const matchSuggestions = useMemo(() => findMatchSuggestions(items, selectedItem), [items, selectedItem]);
  const topMatch = useMemo(() => findTopMatchForUser(items, currentUser), [currentUser, items]);
  const highConfidenceMatches = useMemo(() => {
    if (selectedItem?.type !== "lost") {
      return [];
    }

    return items
      .filter((item) => item.id !== selectedItem.id && item.type === "found" && (item.status || "open") === "open")
      .map((candidate) => ({
        item: candidate,
        score: calculateMatchScore(selectedItem, candidate),
        reasons: getMatchReasons(selectedItem, candidate)
      }))
      .filter((match) => match.score > 65)
      .sort((a, b) => b.score - a.score);
  }, [items, selectedItem]);

  // Keep auth listening in one place so Firebase decides whether the app opens at login or inside the main flow.
  useEffect(() => {
    const unsubscribe = subscribeToAuth(
      (user) => {
        setCurrentUser(user);
        setAuthReady(true);

        if (user) {
          loadItems();
        }
      },
      (errorMessage) => {
        setMessage(errorMessage);
        setAuthReady(true);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!selectedItem) {
      setSelectedClaims([]);
      return;
    }

    loadClaims(selectedItem.id);
  }, [selectedItem]);

  async function loadItems() {
    try {
      const firebaseItems = await fetchItems();
      setItems(firebaseItems);
    } catch (error) {
      setMessage(error.message || "Unable to load item reports.");
    }
  }

  async function loadClaims(itemId) {
    try {
      const claims = await fetchClaims(itemId);
      setSelectedClaims(claims);
    } catch (error) {
      setMessage(error.message || "Unable to load claims.");
    }
  }

  function updateAuthForm(event) {
    setAuthForm({
      ...authForm,
      [event.target.name]: event.target.value
    });
  }

  function updateItemForm(event) {
    setItemForm({
      ...itemForm,
      [event.target.name]: event.target.value
    });
  }

  function updateClaimForm(event) {
    setClaimForm({
      ...claimForm,
      [event.target.name]: event.target.value
    });
  }

  function updateFeedFilters(event) {
    setFeedFilters({
      ...feedFilters,
      [event.target.name]: event.target.value
    });
  }

  function selectCategory(category) {
    setFeedFilters({ ...feedFilters, category });
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setMessage("");

    try {
      setIsAuthSaving(true);
      const user =
        authMode === "register"
          ? await registerUser(authForm)
          : await loginUser({
              email: authForm.email,
              password: authForm.password
            });

      if (user.verificationSent) {
        setAuthMode("login");
        setAuthForm(emptyAuthForm);
        setMessage(`Verification email sent to ${user.email}. Please verify your NUS email before logging in.`);
        return;
      }

      setCurrentUser(user);
      setAuthForm(emptyAuthForm);
      await loadItems();
    } catch (error) {
      setMessage(error.message || "Unable to continue.");
    } finally {
      setIsAuthSaving(false);
    }
  }

  async function handleResendVerification() {
    setMessage("");

    try {
      setIsAuthSaving(true);
      const result = await resendVerificationEmail({
        email: authForm.email,
        password: authForm.password
      });

      if (result.alreadyVerified) {
        setMessage("This email is already verified. You can log in now.");
        return;
      }

      setMessage(`Verification email sent to ${result.email}. Check your inbox before logging in.`);
    } catch (error) {
      setMessage(error.message || "Unable to resend verification email.");
    } finally {
      setIsAuthSaving(false);
    }
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setItemForm({ ...itemForm, imageDataUrl: "", imageFile: null, imageSignature: null });
      return;
    }

    const imageDataUrl = await readFileAsDataUrl(file);
    const imageSignature = await createImageSignature(imageDataUrl);
    setItemForm({ ...itemForm, imageDataUrl, imageFile: file, imageSignature });
  }

  async function handleItemSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!currentUser) {
      setMessage("Please register or log in before posting an item.");
      return;
    }

    try {
      setIsSaving(true);
      const itemSignatureKey = imageSignatureKey(itemForm.imageSignature);
      const matchingImageLabels = items.find(
        (item) =>
          itemSignatureKey &&
          imageSignatureKey(item.imageSignature) === itemSignatureKey &&
          item.imageLabels?.length
      )?.imageLabels;

      // Store searchable words with the report so the matching feature does not depend only on the visible text.
      const item = await createItemReport({
        currentUser,
        imageFile: itemForm.imageFile,
        report: {
          ...itemForm,
          searchKeywords: buildSearchKeywords(itemForm),
          matchAttributes: buildMatchAttributes(itemForm),
          imageLabels: matchingImageLabels || []
        }
      });

      setItems([item, ...items]);
      setItemForm(emptyItemForm);
      setSelectedItemId(item.id);
      setScreen("detail");
      setMessage(`${item.type === "lost" ? "Lost" : "Found"} item report saved.`);
    } catch (error) {
      setMessage(error.message || "Unable to save item.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClaimSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!selectedItem || !currentUser) {
      return;
    }

    try {
      setIsClaimSaving(true);
      const claim = await createClaim({
        item: selectedItem,
        currentUser,
        claim: claimForm
      });

      setSelectedClaims([claim, ...selectedClaims]);
      setClaimForm(emptyClaimForm);
      setMessage("Claim request sent.");
    } catch (error) {
      setMessage(error.message || "Unable to send claim.");
    } finally {
      setIsClaimSaving(false);
    }
  }

  async function handleResolveItem() {
    if (!selectedItem || !currentUser) {
      return;
    }

    try {
      setIsResolving(true);
      const updatedItem = await resolveItem({ item: selectedItem, currentUser });
      setItems(items.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
      setMessage("Report marked as resolved.");
    } catch (error) {
      setMessage(error.message || "Unable to resolve report.");
    } finally {
      setIsResolving(false);
    }
  }

  async function handleSignOut() {
    try {
      await logoutUser();
      setCurrentUser(null);
      setItems([]);
      setSelectedItemId("");
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Unable to sign out.");
    }
  }

  function openItem(itemId) {
    setSelectedItemId(itemId);
    setScreen("detail");
  }

  function openMatchScreen() {
    if (!topMatch) {
      return;
    }

    setActiveMatch(topMatch);
    setScreen("match");
  }

  function startReport(type) {
    setItemForm({ ...emptyItemForm, type });
    setReportSheetOpen(false);
    setMessage("");
    setScreen("report");
  }

  if (!authReady) {
    return (
      <main className="app-shell">
        <div className="mobile-frame auth-frame">
          <header className="auth-hero">
            <img className="brand-logo" src="/logo.svg" alt="FindIT" />
            <p>Checking your session...</p>
          </header>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {!currentUser ? (
        <div className="mobile-frame auth-frame">
          <header className="auth-hero">
            <img className="brand-logo" src="/logo.svg" alt="FindIT" />
            <p>Lost or found something on campus? Start here.</p>
          </header>

          <AuthCard
            authForm={authForm}
            authMode={authMode}
            isSubmitting={isAuthSaving}
            message={message}
            onAuthModeChange={setAuthMode}
            onAuthSubmit={handleAuthSubmit}
            onFormChange={updateAuthForm}
            onResendVerification={handleResendVerification}
          />
        </div>
      ) : (
        <div className="mobile-frame app-frame">
          {(screen === "feed" || screen === "account") && (
            <AppHeader currentUser={currentUser} onOpenAccount={() => setScreen("account")} />
          )}

          {(screen === "report" || screen === "detail") && (
            <header className="screen-header">
              <button className="back-button" onClick={() => setScreen("feed")} type="button">
                <Icon name="back" size={20} />
                Back
              </button>
            </header>
          )}

          <div className="screen" key={screen}>
            {screen === "feed" && (
              <>
                <section className="hero-card">
                  <p>Report an item, review possible matches, and use claims to close the loop when an item is recovered.</p>
                </section>

                {topMatch && (
                  <button className="match-hero" onClick={openMatchScreen} type="button">
                    <span className="match-hero-label">Possible match</span>
                    <strong>A {topMatch.item.title} may match your report</strong>
                    <small>{topMatch.score}% similar to your “{topMatch.sourceItem.title}”</small>
                    <span className="match-hero-cta">Review match →</span>
                  </button>
                )}

                <section className="glass-panel feed-panel">
                  <FeedControls filters={feedFilters} onChange={updateFeedFilters} onSelectCategory={selectCategory} />
                  <div className="item-list">
                    {filteredItems.length === 0 ? (
                      <div className="empty-state feed-empty">
                        <p>No reports match your search yet.</p>
                        <button className="secondary-button" onClick={() => setReportSheetOpen(true)} type="button">
                          Report an item
                        </button>
                      </div>
                    ) : (
                      filteredItems.map((item) => (
                        <ItemCard
                          item={item}
                          key={item.id}
                          matchScore={selectedItem && item.id !== selectedItem.id ? calculateMatchScore(selectedItem, item) : null}
                          onSelect={() => openItem(item.id)}
                        />
                      ))
                    )}
                  </div>
                </section>
              </>
            )}

            {screen === "report" && (
              <>
                <ReportForm
                  isSaving={isSaving}
                  itemForm={itemForm}
                  onChange={updateItemForm}
                  onImageChange={handleImageChange}
                  onSubmit={handleItemSubmit}
                />
                {message && <p className="message">{message}</p>}
              </>
            )}

            {screen === "detail" && (
              <ItemDetail
                claimForm={claimForm}
                claims={selectedClaims}
                currentUser={currentUser}
                highConfidenceMatches={highConfidenceMatches}
                isClaimSaving={isClaimSaving}
                isResolving={isResolving}
                item={selectedItem}
                matches={matchSuggestions}
                message={message}
                onClaimChange={updateClaimForm}
                onClaimSubmit={handleClaimSubmit}
                onResolve={handleResolveItem}
                onSelectItem={openItem}
              />
            )}

            {screen === "match" && activeMatch && (
              <MatchScreen
                match={activeMatch}
                onClaim={() => openItem(activeMatch.item.id)}
                onDismiss={() => setScreen("feed")}
              />
            )}

            {screen === "account" && <AccountPanel currentUser={currentUser} onSignOut={handleSignOut} />}
          </div>

          <BottomTabs active={screen} onReport={() => setReportSheetOpen(true)} onTab={setScreen} />

          {reportSheetOpen && <ReportSheet onChoose={startReport} onClose={() => setReportSheetOpen(false)} />}
        </div>
      )}
    </main>
  );
}

function imageSignatureKey(signature) {
  if (!signature) {
    return "";
  }

  if (signature.perceptualHash) {
    return signature.perceptualHash;
  }

  if (Array.isArray(signature.colorGrid)) {
    return signature.colorGrid.map((pixel) => (Array.isArray(pixel) ? pixel.join("-") : String(pixel))).join(".");
  }

  if (signature.averageColor) {
    const { r, g, b } = signature.averageColor;
    return `${r}-${g}-${b}`;
  }

  return "";
}

export default App;
