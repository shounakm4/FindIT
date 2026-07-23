export function ChatsScreen({ chats, onOpenChat }) {
  return (
    <section className="glass-panel chats-panel">
      <div className="panel-heading">
        <p className="panel-label">Messages</p>
        <h2>Your Chats</h2>
        <p className="chats-intro">Private chats open when a claim request is sent.</p>
      </div>

      <div className="chat-list">
        {chats.length === 0 ? (
          <p className="empty-state">No chats yet. Claim requests will appear here.</p>
        ) : (
          chats.map((chat) => (
            <button className="chat-list-item" key={chat.id} onClick={() => onOpenChat(chat)} type="button">
              <span className="chat-avatar">{chat.otherName.charAt(0).toUpperCase()}</span>
              <span>
                <strong>{chat.otherName}</strong>
                <small>About {chat.item.title}</small>
              </span>
              <b>Open</b>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
