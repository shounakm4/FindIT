import { relativeTime } from "../utils/date.js";

export function ChatsScreen({ chats, onOpenChat }) {
  return (
    <section className="glass-panel chats-panel">
      <div className="panel-heading">
        <p className="panel-label">Messages</p>
        <h2>Your Chats</h2>
      </div>

      <div className="chat-list">
        {chats.length === 0 ? (
          <p className="empty-state">No chats yet.</p>
        ) : (
          chats.map((chat) => (
            <button
              className={`chat-list-item ${chat.unread ? "unread" : ""}`}
              key={chat.id}
              onClick={() => onOpenChat(chat)}
              type="button"
            >
              <span className="chat-avatar">{chat.otherName.charAt(0).toUpperCase()}</span>
              <span className="chat-list-copy">
                <span className="chat-list-title">
                  <strong>{chat.otherName}</strong>
                  <small>{relativeTime(chat.lastMessageAt)}</small>
                </span>
                <small>About {chat.item.title}</small>
                <p>{chat.lastMessage || chat.claim.message || "Claim request sent"}</p>
              </span>
              {chat.unread && <span className="chat-unread-dot" aria-label="Unread messages" />}
            </button>
          ))
        )}
      </div>
    </section>
  );
}
