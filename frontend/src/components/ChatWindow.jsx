import React from "react";
import Message from "./Message";

function ChatWindow({ messages = [], loading = false }) {
  return (
    <div className="chat-window">
      <div className="messages">
        {messages.length === 0 ? (
          <div className="chat-window-empty">
            <div className="chat-window-empty-icon">
              💊
            </div>

            <h3>DrugAssist</h3>

            <p>
              Ask a question about the loaded drug information.
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <Message
              key={
                message.id ||
                message.message_id ||
                `${message.role || "message"}-${index}`
              }
              message={message}
            />
          ))
        )}

        {loading && (
          <div className="message-row assistant-message-row">
            <div className="message-avatar assistant-avatar">
              DA
            </div>

            <div className="message-content">
              <div className="message-author">
                DrugAssist
              </div>

              <div className="assistant-answer typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /*
         * IMPORTANT:
         * ChatWindow itself must NOT be a scroll container.
         *
         * App.jsx owns scrolling through .chat-area.
         */

        .chat-window {
          width: 100%;
          min-height: 100%;
          overflow: visible;
          display: block;
        }

        .chat-window .messages {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          padding: 24px 24px 40px;
          box-sizing: border-box;
        }

        .chat-window-empty {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 20px;
        }

        .chat-window-empty-icon {
          width: 58px;
          height: 58px;
          border-radius: 18px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #f3f4f6;

          font-size: 27px;

          margin-bottom: 16px;
        }

        .chat-window-empty h3 {
          margin: 0;

          font-size: 20px;
          font-weight: 650;

          color: var(
            --text-primary,
            #1f2937
          );
        }

        .chat-window-empty p {
          margin: 8px 0 0;

          max-width: 420px;

          font-size: 14px;
          line-height: 1.5;

          color: var(
            --text-secondary,
            #6b7280
          );
        }

        /*
         * Typing indicator
         */

        .typing-indicator {
          display: inline-flex;
          align-items: center;

          gap: 5px;

          min-height: 20px;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: currentColor;

          opacity: 0.45;

          animation:
            drugassistTyping
            1.2s
            infinite
            ease-in-out;
        }

        .typing-indicator span:nth-child(1) {
          animation-delay: 0s;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes drugassistTyping {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.35;
          }

          30% {
            transform: translateY(-4px);
            opacity: 0.9;
          }
        }

        @media (max-width: 640px) {
          .chat-window .messages {
            padding:
              18px
              14px
              32px;
          }

          .chat-window-empty {
            min-height: 240px;
          }
        }
      `}</style>
    </div>
  );
}

export default ChatWindow;