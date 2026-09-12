import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function Message({ message }) {
  const isUser = message?.role === "user";

  const sources = Array.isArray(message?.sources)
    ? message.sources
    : [];

  const videos = Array.isArray(message?.videos)
    ? message.videos
    : [];

  const answer =
    message?.content ||
    message?.answer ||
    "";

  return (
    <div
      className={`message-row ${
        isUser
          ? "message-row-user"
          : "message-row-assistant"
      }`}
    >
      {/* Avatar */}
      <div
        className={`message-avatar ${
          isUser
            ? "message-avatar-user"
            : "message-avatar-assistant"
        }`}
      >
        {isUser ? "You" : "DA"}
      </div>

      <div className="message-content">

        {/* Author */}
        <div className="message-author">
          {isUser ? "You" : "DrugAssist"}
        </div>

        {/* USER MESSAGE */}
        {isUser ? (
          <div className="user-message-text">
            {answer}
          </div>
        ) : (

          /* ASSISTANT MESSAGE */
          <>
            <div className="assistant-answer">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ children, ...props }) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {children}
                    </a>
                  ),

                  img: ({ src, alt }) => (
                    <img
                      src={src}
                      alt={alt || ""}
                      loading="lazy"
                    />
                  )
                }}
              >
                {answer}
              </ReactMarkdown>
            </div>

            {/* ================================================= */}
            {/* EVIDENCE */}
            {/* ================================================= */}

            {sources.length > 0 && (
              <section className="sources-section">

                <div className="sources-heading">
                  <span className="section-symbol">
                    ▣
                  </span>

                  <span>
                    Evidence
                  </span>
                </div>

                <div className="sources-list">

                  {sources.map(
                    (source, index) => (
                      <div
                        className="source-card"
                        key={
                          `${source.document_id || "doc"}-${source.page}-${index}`
                        }
                      >

                        <div className="source-number">
                          {index + 1}
                        </div>

                        <div className="source-details">

                          <div className="source-title">
                            {source.source ||
                              "Drug Information"}
                          </div>

                          <div className="source-meta">

                            <span>
                              Source {index + 1}
                            </span>

                            <span className="source-dot">
                              •
                            </span>

                            <span>
                              Page {source.page}
                            </span>

                            {source.drug && (
                              <>
                                <span className="source-dot">
                                  •
                                </span>

                                <span>
                                  {source.drug}
                                </span>
                              </>
                            )}

                          </div>

                        </div>

                      </div>
                    )
                  )}

                </div>
              </section>
            )}

            {/* ================================================= */}
            {/* YOUTUBE VIDEOS */}
            {/* ================================================= */}

            {videos.length > 0 && (
              <section className="videos-section">

                <div className="videos-heading">

                  <span className="section-symbol">
                    ▶
                  </span>

                  <span>
                    Recommended videos
                  </span>

                </div>

                <div className="videos-list">

                  {videos.map(
                    (video, index) => (

                      <a
                        className="video-card"
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        key={
                          video.video_id ||
                          video.url ||
                          index
                        }
                      >

                        {/* Thumbnail */}
                        {video.thumbnail && (
                          <img
                            className="video-thumbnail"
                            src={video.thumbnail}
                            alt={
                              video.title ||
                              "YouTube video"
                            }
                            loading="lazy"
                          />
                        )}

                        <div className="video-info">

                          <div className="video-title">
                            {video.title ||
                              "Educational video"}
                          </div>

                          <div className="video-channel">
                            {video.channel ||
                              "YouTube"}
                          </div>

                        </div>

                        <span className="video-arrow">
                          ↗
                        </span>

                      </a>

                    )
                  )}

                </div>

              </section>
            )}

          </>
        )}

      </div>
    </div>
  );
}

export default Message;