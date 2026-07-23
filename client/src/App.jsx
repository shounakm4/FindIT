import { useEffect, useMemo, useRef, useState } from "react";
import { AccountPanel } from "./components/AccountPanel.jsx";
import { AlertsScreen } from "./components/AlertsScreen.jsx";
import { AppHeader } from "./components/AppHeader.jsx";
import { AuthCard } from "./components/AuthCard.jsx";
import { BottomTabs } from "./components/BottomTabs.jsx";
import { ChatScreen } from "./components/ChatScreen.jsx";
import { ChatsScreen } from "./components/ChatsScreen.jsx";
import { FeedControls } from "./components/FeedControls.jsx";
import { Icon } from "./components/Icon.jsx";
import { ItemCard } from "./components/ItemCard.jsx";
import { ItemDetail } from "./components/ItemDetail.jsx";
import { MatchReviewPanel } from "./components/MatchReview.jsx";
import { ReportForm } from "./components/ReportForm.jsx";
import { ReportSheet } from "./components/ReportSheet.jsx";
import { VerifyScreen } from "./components/VerifyScreen.jsx";
import { defaultFeedFilters, emptyAuthForm, emptyClaimForm, emptyItemForm } from "./constants/forms.js";
import {
  createClaim,
  createItemReport,
  dismissUserAlert,
  fetchClaims,
  fetchItems,
  fetchUserChats,
  fetchUserClaimSummary,
  loginUser,
  logoutUser,
  registerUser,
  resendVerificationEmail,
  resolveItem,
  sendChatMessage,
  subscribeToChatMessages,
  subscribeToUserAlerts,
  subscribeToAuth,
  updateClaimStatus
} from "./services/firebaseClient.js";
import { createImageSignature, readFileAsDataUrl } from "./utils/imageFiles.js";
import {
  buildMatchAttributes,
  buildSearchKeywords,
  calculateMatchScore,
  filterAndSortItems,
  findAlertsForUser,
  findMatchSuggestions,
  findTopMatchForUser,
  HIGH_CONFIDENCE_MATCH_THRESHOLD,
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
  const [updatingClaimId, setUpdatingClaimId] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [claimSummary, setClaimSummary] = useState({
    total: 0,
    sent: 0,
    reviewing: 0,
    accepted: 0,
    rejected: 0
  });
  const [feedFilters, setFeedFilters] = useState(defaultFeedFilters);
  const [screen, setScreen] = useState("feed");
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [activeMatchReview, setActiveMatchReview] = useState(null);
  const [activeChatClaim, setActiveChatClaim] = useState(null);
  const [userChats, setUserChats] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const [claimAlerts, setClaimAlerts] = useState([]);
  const [dismissedMatchKeys, setDismissedMatchKeys] = useState(readDismissedMatchKeys);
  const isRegisteringRef = useRef(false);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) || null,
    [items, selectedItemId]
  );

  const filteredItems = useMemo(
    () => filterAndSortItems(items, { ...feedFilters, type: "all", category: "all" }),
    [feedFilters, items]
  );
  const foundFeedItems = useMemo(() => filteredItems.filter((item) => item.type === "found"), [filteredItems]);
  const matchSuggestions = useMemo(() => findMatchSuggestions(items, selectedItem), [items, selectedItem]);
  const topMatch = useMemo(() => {
    const match = buildMatchReview(findTopMatchForUser(items, currentUser), "feed");

    return match && match.matchedLostItem.userId === currentUser?.id && !dismissedMatchKeys.includes(match.id) ? match : null;
  }, [currentUser, dismissedMatchKeys, items]);
  const matchAlerts = useMemo(
    () =>
      findAlertsForUser(items, currentUser)
        .map((match) => buildMatchReview(match, "alerts"))
        .filter(Boolean)
        .filter((match) => match.matchedLostItem.userId === currentUser?.id)
        .filter((match) => !dismissedMatchKeys.includes(match.id)),
    [currentUser, dismissedMatchKeys, items]
  );
  const alerts = useMemo(() => [...claimAlerts, ...matchAlerts], [claimAlerts, matchAlerts]);
  const userLostItems = useMemo(
    () => items.filter((item) => item.userId === currentUser?.id && item.type === "lost"),
    [items, currentUser]
  );
  const userFoundItems = useMemo(
    () => items.filter((item) => item.userId === currentUser?.id && item.type === "found"),
    [items, currentUser]
  );
  const verifyMatches = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    const myLostItems = items.filter(
      (item) => item.userId === currentUser.id && item.type === "lost" && (item.status || "open") === "open"
    );
    const matches = [];

    for (const lostItem of myLostItems) {
      const candidates = items.filter((item) => item.type === "found" && (item.status || "open") === "open");

      for (const foundItem of candidates) {
        const score = calculateMatchScore(lostItem, foundItem);
        const match = buildMatchReview(
          {
            foundItem,
            matchedLostItem: lostItem,
            reasons: getMatchReasons(lostItem, foundItem),
            score
          },
          "verify"
        );

        if (match && score >= HIGH_CONFIDENCE_MATCH_THRESHOLD && !dismissedMatchKeys.includes(match.id)) {
          matches.push(match);
        }
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }, [items, currentUser, dismissedMatchKeys]);
  const accountMatchReviews = useMemo(
    () => verifyMatches.map((match) => ({ ...match, origin: "account" })),
    [verifyMatches]
  );
  const highConfidenceMatches = useMemo(() => {
    if (selectedItem?.type !== "lost") {
      return [];
    }

    return items
      .filter((item) => item.id !== selectedItem.id && item.type === "found" && (item.status || "open") === "open")
      .map((candidate) => ({
        foundItem: candidate,
        matchedLostItem: selectedItem,
        score: calculateMatchScore(selectedItem, candidate),
        reasons: getMatchReasons(selectedItem, candidate)
      }))
      .map((match) => buildMatchReview(match, "detail"))
      .filter(Boolean)
      .filter((match) => match.score >= HIGH_CONFIDENCE_MATCH_THRESHOLD && !dismissedMatchKeys.includes(match.id))
      .sort((a, b) => b.score - a.score);
  }, [dismissedMatchKeys, items, selectedItem]);

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
      },
      {
        shouldIgnoreUnverifiedUser: () => isRegisteringRef.current
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!selectedItem || !currentUser) {
      setSelectedClaims([]);
      return;
    }

    loadClaims(selectedItem);
  }, [selectedItem, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setClaimSummary({
        total: 0,
        sent: 0,
        reviewing: 0,
        accepted: 0,
        rejected: 0
      });
      setUserChats([]);
      return;
    }

    loadClaimSummary();
    loadUserChats();
  }, [items, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setClaimAlerts([]);
      return () => {};
    }

    return subscribeToUserAlerts({
      currentUser,
      onAlerts: setClaimAlerts,
      onError: setMessage
    });
  }, [currentUser]);

  useEffect(() => {
    if (!activeChatClaim || !selectedItem || !currentUser) {
      setChatMessages([]);
      return () => {};
    }

    return subscribeToChatMessages({
      claim: activeChatClaim,
      currentUser,
      item: selectedItem,
      onError: setMessage,
      onMessages: setChatMessages
    });
  }, [activeChatClaim, currentUser, selectedItem]);

  useEffect(() => {
    writeDismissedMatchKeys(dismissedMatchKeys);
  }, [dismissedMatchKeys]);

  async function loadItems() {
    try {
      const firebaseItems = await fetchItems();
      setItems(firebaseItems);
    } catch (error) {
      setMessage(error.message || "Unable to load item reports.");
    }
  }

  async function loadClaims(item) {
    try {
      const claims = await fetchClaims({ currentUser, item });
      setSelectedClaims(claims);
    } catch (error) {
      setMessage(error.message || "Unable to load claims.");
    }
  }

  async function loadClaimSummary() {
    try {
      const summary = await fetchUserClaimSummary({ currentUser, items });
      setClaimSummary(summary);
    } catch (error) {
      setMessage(error.message || "Unable to load claim summary.");
    }
  }

  async function loadUserChats() {
    try {
      const chats = await fetchUserChats({ currentUser, items });
      setUserChats(chats);
    } catch (error) {
      setMessage(error.message || "Unable to load chats.");
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

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setMessage("");
    const isRegistering = authMode === "register";

    try {
      setIsAuthSaving(true);
      isRegisteringRef.current = isRegistering;
      const user =
        isRegistering
          ? await registerUser(authForm)
          : await loginUser({
              email: authForm.email,
              password: authForm.password
            });

      if (user.verificationSent) {
        setAuthMode("login");
        setAuthForm(emptyAuthForm);
        setMessage(
          `Verification email sent to ${user.email}. Please check your inbox and junk mail, verify your NUS email, then return here and log in manually.`
        );
        return;
      }

      setCurrentUser(user);
      setAuthForm(emptyAuthForm);
      await loadItems();
    } catch (error) {
      setMessage(error.message || "Unable to continue.");
    } finally {
      isRegisteringRef.current = false;
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

      setMessage(
        `Verification email sent to ${result.email}. Please check your inbox and junk mail, verify your NUS email, then return here and log in manually.`
      );
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

      // console.log("new report saved", item);
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

  async function handleClaimStatusChange(claim, status) {
    if (!selectedItem || !currentUser) {
      return;
    }

    try {
      setUpdatingClaimId(claim.id);
      const updatedClaim = await updateClaimStatus({
        claim,
        currentUser,
        item: selectedItem,
        status
      });

      setSelectedClaims(
        updatedClaim
          ? selectedClaims.map((existingClaim) => (existingClaim.id === claim.id ? updatedClaim : existingClaim))
          : selectedClaims.filter((existingClaim) => existingClaim.id !== claim.id)
      );
      await loadClaimSummary();
      await loadUserChats();
      setMessage(status === "rejected" ? "Claim rejected and removed." : `Claim marked as ${status}.`);
    } catch (error) {
      setMessage(error.message || "Unable to update claim status.");
    } finally {
      setUpdatingClaimId("");
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

  async function handleChatSubmit(event) {
    event.preventDefault();

    if (!activeChatClaim || !selectedItem || !currentUser) {
      return;
    }

    try {
      setIsChatSending(true);
      await sendChatMessage({
        claim: activeChatClaim,
        currentUser,
        item: selectedItem,
        text: chatText
      });
      setChatText("");
    } catch (error) {
      setMessage(error.message || "Unable to send secure message.");
    } finally {
      setIsChatSending(false);
    }
  }

  async function handleSignOut() {
    try {
      await logoutUser();
      setCurrentUser(null);
      setItems([]);
      setClaimAlerts([]);
      setActiveMatchReview(null);
      setActiveChatClaim(null);
      setSelectedItemId("");
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Unable to sign out.");
    }
  }

  function openItem(itemId, matchContext = null) {
    setActiveMatchReview(matchContext);
    setSelectedItemId(itemId);
    setScreen("detail");
  }

  function openChat(chat) {
    const claim = chat.claim || chat;

    if (chat.item) {
      setSelectedItemId(chat.item.id);
    }

    setActiveChatClaim(claim);
    setChatText("");
    setMessage("");
    setScreen("chat");
  }

  function openMatchScreen() {
    if (!topMatch) {
      return;
    }

    setActiveMatchReview(topMatch);
    setScreen("match");
  }

  function openMatchScreenFromList(match) {
    setActiveMatchReview(match);
    setScreen("match");
  }

  function startReport(type) {
    setItemForm({ ...emptyItemForm, type });
    setReportSheetOpen(false);
    setMessage("");
    setScreen("report");
  }

  function dismissMatch(match) {
    if (!match?.id) {
      return;
    }

    setDismissedMatchKeys((previousKeys) => (previousKeys.includes(match.id) ? previousKeys : [...previousKeys, match.id]));
  }

  async function dismissAlert(alert) {
    if (alert.type !== "claim") {
      dismissMatch(alert);
      return;
    }

    try {
      await dismissUserAlert({ alert, currentUser });
      setClaimAlerts((previousAlerts) => previousAlerts.filter((existingAlert) => existingAlert.id !== alert.id));
    } catch (error) {
      setMessage(error.message || "Unable to dismiss alert.");
    }
  }

  function dismissAndReturn(match) {
    dismissMatch(match);
    setScreen(matchOriginScreen(match));
  }

  function goBack() {
    if (screen === "chat") {
      setScreen("detail");
      return;
    }

    if (screen === "detail" && activeMatchReview) {
      setScreen("match");
      return;
    }

    if (screen === "match" && activeMatchReview) {
      setScreen(matchOriginScreen(activeMatchReview));
      return;
    }

    setScreen("feed");
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
          {(screen === "feed" || screen === "account" || screen === "alerts" || screen === "verify" || screen === "chats") && (
            <AppHeader
              chatCount={userChats.length}
              currentUser={currentUser}
              isChatActive={screen === "chats"}
              onOpenAccount={() => setScreen("account")}
              onOpenChat={() => setScreen("chats")}
            />
          )}

          {(screen === "report" || screen === "detail" || screen === "match" || screen === "chat") && (
            <header className="screen-header">
              <button className="back-button" onClick={goBack} type="button">
                <Icon name="back" size={20} />
                Back
              </button>
            </header>
          )}

          <div className="screen" key={screen}>
            {screen === "feed" && (
              <>
                {topMatch && (
                  <button className="match-hero" onClick={openMatchScreen} type="button">
                    <span className="match-hero-label">Possible match</span>
                    <strong>{topMatch.foundItem.title} may match your report</strong>
                    <small>{topMatch.score}% similar to your "{topMatch.matchedLostItem.title}"</small>
                    <span className="match-hero-cta">Review match</span>
                  </button>
                )}

                <section className="glass-panel feed-panel">
                  <FeedControls filters={feedFilters} onChange={updateFeedFilters} />
                  <div className="item-list">
                    {foundFeedItems.length === 0 ? (
                      <div className="empty-state feed-empty">
                        <p>No reports match your search yet.</p>
                        <button className="secondary-button" onClick={() => setReportSheetOpen(true)} type="button">
                          Report an item
                        </button>
                      </div>
                    ) : (
                      foundFeedItems.map((item) => (
                        <ItemCard
                          item={item}
                          key={item.id}
                          matchScore={bestMatchScore(item, userLostItems)}
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
                updatingClaimId={updatingClaimId}
                isResolving={isResolving}
                item={selectedItem}
                matches={matchSuggestions}
                message={message}
                matchContext={
                  activeMatchReview?.foundItem.id === selectedItem?.id ||
                  activeMatchReview?.matchedLostItem.id === selectedItem?.id
                    ? activeMatchReview
                    : null
                }
                onClaimChange={updateClaimForm}
                onClaimSubmit={handleClaimSubmit}
                onClaimStatusChange={handleClaimStatusChange}
                onDismissMatch={dismissMatch}
                onOpenChat={openChat}
                onResolve={handleResolveItem}
                onSelectMatch={(match) => openItem(match.foundItem.id, match)}
              />
            )}

            {screen === "match" && activeMatchReview && (
              <MatchReviewPanel
                match={activeMatchReview}
                onClaim={(match) => openItem(match.foundItem.id, match)}
                onDismiss={dismissAndReturn}
                onViewDetails={openItem}
              />
            )}

            {screen === "chat" && selectedItem && activeChatClaim && (
              <ChatScreen
                claim={activeChatClaim}
                currentUser={currentUser}
                isSending={isChatSending}
                item={selectedItem}
                messages={chatMessages}
                onMessageChange={(event) => setChatText(event.target.value)}
                onSend={handleChatSubmit}
                text={chatText}
              />
            )}

            {screen === "alerts" && (
              <AlertsScreen
                alerts={alerts}
                onDismissAlert={dismissAlert}
                onOpenClaim={openItem}
                onReviewMatch={openMatchScreenFromList}
              />
            )}

            {screen === "chats" && <ChatsScreen chats={userChats} onOpenChat={openChat} />}

            {screen === "verify" && (
              <VerifyScreen
                verifyMatches={verifyMatches}
                onReview={openMatchScreenFromList}
                onDismiss={dismissMatch}
              />
            )}

            {screen === "account" && (
              <AccountPanel
                currentUser={currentUser}
                claimSummary={claimSummary}
                matchReviews={accountMatchReviews}
                onDismissMatch={dismissMatch}
                onOpenItem={openItem}
                onReviewMatch={openMatchScreenFromList}
                onSignOut={handleSignOut}
                userFoundItems={userFoundItems}
                userLostItems={userLostItems}
              />
            )}
          </div>

          <BottomTabs
            active={activeBottomTab(screen, activeMatchReview)}
            alertCount={alerts.length}
            verifyCount={verifyMatches.length}
            onReport={() => setReportSheetOpen(true)}
            onTab={setScreen}
          />

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

function buildMatchReview(match, origin) {
  if (!match) {
    return null;
  }

  const foundItem =
    match.foundItem || (match.item?.type === "found" ? match.item : match.sourceItem?.type === "found" ? match.sourceItem : null);
  const matchedLostItem =
    match.matchedLostItem || (match.item?.type === "lost" ? match.item : match.sourceItem?.type === "lost" ? match.sourceItem : null);

  if (!foundItem || !matchedLostItem) {
    return null;
  }

  return {
    foundItem,
    id: matchKey(matchedLostItem.id, foundItem.id),
    matchedLostItem,
    origin,
    reasons: match.reasons || [],
    score: match.score || 0
  };
}

function matchKey(lostItemId, foundItemId) {
  return `${lostItemId}:${foundItemId}`;
}

function bestMatchScore(foundItem, lostItems) {
  const scores = lostItems
    .filter((item) => (item.status || "open") === "open")
    .map((item) => calculateMatchScore(item, foundItem));

  return scores.length ? Math.max(...scores) : null;
}

function matchOriginScreen(match) {
  return ["account", "alerts", "verify"].includes(match?.origin) ? match.origin : "feed";
}

function activeBottomTab(screen, activeMatchReview) {
  if (screen === "chat") {
    return "chats";
  }

  if ((screen === "match" || screen === "detail") && ["account", "alerts", "verify"].includes(activeMatchReview?.origin)) {
    return activeMatchReview.origin;
  }

  return screen;
}

function readDismissedMatchKeys() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedKeys = JSON.parse(window.localStorage.getItem("findit.dismissedMatches") || "[]");

    return Array.isArray(storedKeys) ? storedKeys.filter((key) => typeof key === "string") : [];
  } catch {
    return [];
  }
}

function writeDismissedMatchKeys(keys) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem("findit.dismissedMatches", JSON.stringify(keys));
  } catch {
    // Ignore storage failures so match review still works in restricted browsers.
  }
}

export default App;
