import { formatDate } from "../utils/date.js";

export function ChatScreen({ claim, currentUser, isSending, item, messages, onMessageChange, onSend, text }) {
  const otherName = claim.itemOwnerId === currentUser.id ? claim.claimantName : item.userName;

  return (
    <section className="glass-panel chat-panel">
      <div className="panel-heading">
        <p className="panel-label">Private chat</p>
        <h2>{otherName}</h2>
        <p className="chat-item-label">About {item.title}</p>
      </div>

      <div className="message-list" aria-live="polite">
        {messages.length === 0 ? (
          <p className="empty-state">No messages yet.</p>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === currentUser.id;

            return (
              <article className={`chat-message ${isMine ? "mine" : "theirs"}`} key={message.id}>
                <p>{message.text}</p>
                <small>{formatDate(message.createdAt)}</small>
              </article>
            );
          })
        )}
      </div>

      <form className="chat-form" onSubmit={onSend}>
        <label>
          Message
          <textarea
            name="message"
            onChange={onMessageChange}
            placeholder="Type a message"
            rows="3"
            value={text}
          />
        </label>
        <button className="primary-button" disabled={isSending} type="submit">
          {isSending ? "Sending..." : "Send message"}
        </button>
      </form>
    </section>
  );
}
