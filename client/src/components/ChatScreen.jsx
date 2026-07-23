import { formatDate } from "../utils/date.js";

export function ChatScreen({ claim, currentUser, isSending, item, messages, onMessageChange, onSend, text }) {
  const otherName = claim.itemOwnerId === currentUser.id ? claim.claimantName : item.userName;

  return (
    <section className="glass-panel chat-panel">
      <div className="panel-heading">
        <p className="panel-label">Secure chat</p>
        <h2>{otherName}</h2>
        <p className="chat-item-label">About {item.title}</p>
      </div>

        <p className="chat-security-note">Only the reporter and claimant can access this conversation.</p>

      <div className="message-list" aria-live="polite">
        {messages.length === 0 ? (
          <p className="empty-state">Start the conversation to arrange a safe handover.</p>
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
            placeholder="Arrange a time and public place to meet."
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
