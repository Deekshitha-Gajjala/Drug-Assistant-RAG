import { useMemo, useState } from "react";
import {
  Pill,
  Plus,
  Search,
  MessageSquare,
  Library as LibraryIcon,
  Trash2,
  LogOut,
  X,
  UserCircle,
  FileText,
} from "lucide-react";

function Sidebar({
  user,
  chats = [],
  activeChatId = null,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onLibrary,
  onLogout,
  mobileOpen = false,
  onClose,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  // ============================================================
  // SEARCH CHATS
  // ============================================================

  const filteredChats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return Array.isArray(chats) ? chats : [];
    }

    return (Array.isArray(chats) ? chats : []).filter(
      (chat) =>
        String(chat?.title || "New Chat")
          .toLowerCase()
          .includes(term)
    );
  }, [chats, searchTerm]);

  // ============================================================
  // DELETE CHAT
  // ============================================================

  const handleDelete = (event, chatId) => {
    event.stopPropagation();

    if (typeof onDeleteChat !== "function") {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this chat?"
    );

    if (confirmed) {
      onDeleteChat(chatId);
    }
  };

  // ============================================================
  // NEW CHAT
  // ============================================================

  const handleNewChat = () => {
    if (typeof onNewChat === "function") {
      onNewChat();
    }

    onClose?.();
  };

  // ============================================================
  // SELECT CHAT
  // ============================================================

  const handleSelectChat = (chatId) => {
    if (typeof onSelectChat === "function") {
      onSelectChat(chatId);
    }

    onClose?.();
  };

  // ============================================================
  // OPEN LIBRARY
  // ============================================================

  const handleLibrary = () => {
    if (typeof onLibrary === "function") {
      onLibrary();
    }

    onClose?.();
  };

  // ============================================================
  // USER INITIAL
  // ============================================================

  const userName = user?.name || "User";

  const userInitial = String(userName)
    .trim()
    .charAt(0)
    .toUpperCase() || "U";

  return (
    <>
      {/* ========================================================
          MOBILE OVERLAY
      ======================================================== */}

      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ========================================================
          SIDEBAR
      ======================================================== */}

      <aside
        className={`sidebar ${
          mobileOpen ? "sidebar-mobile-open" : ""
        }`}
      >
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">
              <Pill
                size={20}
                strokeWidth={2.2}
              />
            </div>

            <div className="brand-text">
              <div className="brand-name">
                DrugAssist
              </div>

              <div className="brand-subtitle">
                Evidence-first drug intelligence
              </div>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* ======================================================
            NEW CHAT
        ====================================================== */}

        <div className="sidebar-action-area">
          <button
            type="button"
            className="new-chat-button"
            onClick={handleNewChat}
          >
            <Plus
              size={19}
              strokeWidth={2.3}
            />

            <span>New chat</span>
          </button>
        </div>

        {/* ======================================================
            SEARCH
        ====================================================== */}

        <div className="sidebar-search">
          <Search size={17} />

          <input
            type="text"
            placeholder="Search chats"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            aria-label="Search chats"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                margin: 0,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* ======================================================
            NAVIGATION
        ====================================================== */}

        <div className="sidebar-navigation">
          {/* CHAT */}

          <button
            type="button"
            className="sidebar-nav-item"
            onClick={handleNewChat}
          >
            <MessageSquare size={18} />

            <span>Chat</span>
          </button>

          {/* LIBRARY */}

          <button
            type="button"
            className="sidebar-nav-item"
            onClick={handleLibrary}
          >
            <LibraryIcon size={18} />

            <span>Library</span>
          </button>
        </div>

        {/* ======================================================
            RECENT CHATS
        ====================================================== */}

        <div className="recent-section">
          <div className="section-heading">
            <span>Recent</span>

            {chats.length > 0 && (
              <span className="chat-count">
                {chats.length}
              </span>
            )}
          </div>

          <div className="chat-list">
            {filteredChats.length === 0 ? (
              <div className="empty-chats">
                <MessageSquare size={20} />

                <span>
                  {searchTerm
                    ? "No matching chats"
                    : "No conversations yet"}
                </span>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const chatId = chat?.id;

                const isActive =
                  String(chatId) ===
                  String(activeChatId);

                return (
                  <button
                    type="button"
                    key={chatId}
                    className={`chat-item ${
                      isActive
                        ? "chat-item-active"
                        : ""
                    }`}
                    onClick={() =>
                      handleSelectChat(chatId)
                    }
                  >
                    <MessageSquare
                      className="chat-item-icon"
                      size={17}
                    />

                    <span className="chat-title">
                      {chat?.title ||
                        "New Chat"}
                    </span>

                    {/* Delete */}
                    <span
                      className="chat-delete"
                      role="button"
                      tabIndex={0}
                      aria-label={`Delete ${
                        chat?.title ||
                        "chat"
                      }`}
                      onClick={(event) =>
                        handleDelete(
                          event,
                          chatId
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                            "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();

                          handleDelete(
                            event,
                            chatId
                          );
                        }
                      }}
                    >
                      <Trash2 size={15} />
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================
            LIBRARY QUICK ACCESS
        ====================================================== */}

        <div className="sidebar-library-card">
          <div className="library-card-icon">
            <FileText size={19} />
          </div>

          <div className="library-card-content">
            <div className="library-card-title">
              Your documents
            </div>

            <div className="library-card-text">
              Access your uploaded drug
              information
            </div>
          </div>

          <button
            type="button"
            className="library-card-button"
            onClick={handleLibrary}
            aria-label="Open Library"
            title="Open Library"
          >
            →
          </button>
        </div>

        {/* ======================================================
            USER PROFILE
        ====================================================== */}

        <div className="sidebar-user">
          <div className="user-avatar">
            <UserCircle size={25} />
          </div>

          <div className="user-info">
            <div className="user-name">
              {userName}
            </div>

            <div className="user-email">
              {user?.email || ""}
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={onLogout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <style>{`

/* STEP 4 — PROFESSIONAL SIDEBAR STYLING ONLY */
.sidebar {
  background: #fafafa;
  border-right: 1px solid #e7e7e9;
}

.sidebar-header {
  padding-bottom: 18px;
}

.sidebar-brand {
  letter-spacing: -0.35px;
}

.sidebar-nav {
  gap: 6px;
}

.sidebar-nav-item {
  min-height: 42px;
  border-radius: 11px;
  transition: background 0.16s ease, transform 0.16s ease;
}

.sidebar-nav-item:hover {
  background: #f0f0f2;
}

.sidebar-nav-item:active {
  transform: scale(0.985);
}

.recent-section {
  margin-top: 22px;
}

.section-heading {
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  color: #777a82;
}

.chat-list {
  gap: 4px;
}

.chat-item {
  min-height: 42px;
  border-radius: 10px;
  padding: 8px 10px;
  transition: background 0.16s ease, box-shadow 0.16s ease;
}

.chat-item:hover {
  background: #f1f1f3;
}

.chat-item-active {
  background: #ececee !important;
  box-shadow: inset 3px 0 0 #252525;
}

.chat-title {
  font-size: 13.5px;
  line-height: 1.35;
}

.chat-count {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  background: #ededee;
  color: #5f6168;
}

.sidebar-library-card {
  border: 1px solid #e4e4e6;
  border-radius: 14px;
  padding: 13px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(0, 0, 0, 0.035);
}

.library-card-button {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  transition: background 0.16s ease, transform 0.16s ease;
}

.library-card-button:hover {
  background: #f0f0f2;
  transform: translateX(2px);
}

.sidebar-user {
  border-top: 1px solid #e6e6e8;
  padding-top: 14px;
  margin-top: 14px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: #ededee;
}

.logout-button {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  transition: background 0.16s ease, transform 0.16s ease;
}

.logout-button:hover {
  background: #eeeeef;
}

.logout-button:active {
  transform: scale(0.96);
}

.app-shell.dark-mode .sidebar {
  background: #101010;
  border-right-color: #292929;
}

.app-shell.dark-mode .sidebar-nav-item:hover,
.app-shell.dark-mode .chat-item:hover,
.app-shell.dark-mode .library-card-button:hover,
.app-shell.dark-mode .logout-button:hover {
  background: #1d1d1d !important;
}

.app-shell.dark-mode .chat-item-active {
  background: #202020 !important;
  box-shadow: inset 3px 0 0 #f0f0f0;
}

.app-shell.dark-mode .chat-count {
  background: #292929 !important;
  color: #c9c9c9 !important;
}

.app-shell.dark-mode .sidebar-library-card {
  background: #171717 !important;
  border-color: #303030 !important;
  box-shadow: none;
}

.app-shell.dark-mode .sidebar-user {
  border-top-color: #2b2b2b;
}

.app-shell.dark-mode .user-avatar {
  background: #252525;
}
`}
      </style>
    </>
  );
}

export default Sidebar;