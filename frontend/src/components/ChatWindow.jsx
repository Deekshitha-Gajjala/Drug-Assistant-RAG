import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  User,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
} from "lucide-react";

function formatSource(source, index) {
  if (!source || typeof source !== "object") {
    return {
      label: `Source ${index + 1}`,
      page: null,
      text: "",
      url: "",
    };
  }

  const sourceName =
    source.source ||
    source.filename ||
    source.document_name ||
    source.title ||
    "Document";

  const page =
    source.page ??
    source.page_number ??
    source.pageNumber ??
    null;

  const url =
    source.url ||
    source.link ||
    source.source_url ||
    "";

  return {
    label: sourceName,
    page,
    text: source.text || source.excerpt || "",
    url,
  };
}

function SourceList({
  sources,
  selectedDocumentId = null,
  selectedDocumentName = "",
  fallbackDocumentId = null,
  onOpenSource,
}) {
  const [open, setOpen] = useState(false);

  const normalized = useMemo(
    () =>
      Array.isArray(sources)
        ? sources.map(formatSource)
        : [],
    [sources]
  );

  if (!normalized.length) {
    return null;
  }

  return (
    <div className="chat-sources">
      <button
        type="button"
        className="sources-toggle"
        onClick={() => setOpen((value) => !value)}
      >
        <FileText size={15} />
        <span>
          {normalized.length}{" "}
          {normalized.length === 1
            ? "source"
            : "sources"}
        </span>

        {open ? (
          <ChevronUp size={15} />
        ) : (
          <ChevronDown size={15} />
        )}
      </button>

      {open && (
        <div className="sources-list">
          {normalized.map((source, index) => (
            <div
              className="source-card"
              key={`${source.label}-${source.page}-${index}`}
            >
              <div className="source-number">
                {index + 1}
              </div>

              <div className="source-body">
                <div className="source-title">
                  {source.label}
                </div>

                <div className="source-meta">
                  {source.page !== null &&
                  source.page !== undefined
                    ? `Page ${source.page}`
                    : "Document source"}
                </div>

                {source.text && (
                  <div className="source-excerpt">
                    {source.text}
                  </div>
                )}

                {(selectedDocumentId ||
                  fallbackDocumentId ||
                  localStorage.getItem(
                    "drugassist_selected_document_id"
                  )) ? (
                  <button
                    type="button"
                    className="source-link"
                    onClick={() => {
                      const storedId =
                        localStorage.getItem(
                          "drugassist_selected_document_id"
                        );

                      const documentId =
                        selectedDocumentId ??
                        fallbackDocumentId ??
                        (storedId !== null
                          ? Number(storedId)
                          : null);

                      onOpenSource?.(
                        documentId,
                        source.page,
                        source.label ||
                          selectedDocumentName ||
                          "Source document"
                      );
                    }}
                  >
                    Open PDF
                    <ExternalLink size={13} />
                  </button>
                ) : source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="source-link"
                  >
                    Open source
                    <ExternalLink size={13} />
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PDFViewer({
  open,
  loading,
  error,
  pdfUrl,
  filename,
  page,
  onClose,
}) {
  if (!open) return null;

  return (
    <div
      className="pdf-viewer-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "rgba(0,0,0,0.65)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="PDF source viewer"
    >
      <div
        style={{
          width: "min(1200px, 94vw)",
          height: "min(900px, 92vh)",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            height: "64px",
            minHeight: "64px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 18px",
            borderBottom: "1px solid #e5e7eb",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <FileText
              size={26}
              strokeWidth={2}
              style={{ flexShrink: 0, display: "block" }}
            />

            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "16px",
                fontWeight: 600,
              }}
            >
              {filename || "Source document"}
            </span>

            {page && (
              <span
                style={{
                  flexShrink: 0,
                  padding: "6px 9px",
                  borderRadius: "6px",
                  background: "#f3f4f6",
                  color: "#4b5563",
                  fontSize: "14px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Page {page}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close PDF viewer"
            style={{
              width: "36px",
              height: "36px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              border: "none",
              borderRadius: "7px",
              background: "#f3f4f6",
              color: "#333",
              fontSize: "24px",
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            background: "#525659",
          }}
        >
          {loading && (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              Opening PDF…
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                padding: "24px",
                color: "#b91c1c",
                background: "#fff",
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && pdfUrl && (
            <iframe
              title={filename || "PDF source"}
              src={page ? `${pdfUrl}#page=${page}` : pdfUrl}
              style={{
                width: "100%",
                height: "100%",
                minHeight: "700px",
                border: "none",
                display: "block",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function renderInline(
  text,
  keyPrefix,
  sources = [],
  onOpenSource,
  selectedDocumentId = null,
  selectedDocumentName = "",
  fallbackDocumentId = null
) {
  const parts = String(text).split(
    /(\*\*[^*]+\*\*|`[^`]+`|\[?Source\s+\d+(?:\s*,\s*Page\s+\d+)?\]?)/g
  );

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-bold-${index}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={`${keyPrefix}-code-${index}`}>
          {part.slice(1, -1)}
        </code>
      );
    }

    const sourceMatch = part.match(
      /^\[?Source\s+(\d+)(?:\s*,\s*Page\s+(\d+))?\]?$/
    );

    if (sourceMatch) {
      const sourceIndex = Number(sourceMatch[1]);
      const citationPage = sourceMatch[2]
        ? Number(sourceMatch[2])
        : null;

      const source = Array.isArray(sources)
        ? sources[sourceIndex - 1]
        : null;

      const storedDocumentId =
        localStorage.getItem(
          "drugassist_selected_document_id"
        );

      const documentId =
        source?.database_document_id ??
        source?.databaseDocumentId ??
        source?.document_database_id ??
        selectedDocumentId ??
        fallbackDocumentId ??
        (storedDocumentId !== null
          ? Number(storedDocumentId)
          : null);

      const page =
        citationPage ??
        source?.page ??
        source?.page_number ??
        source?.pageNumber ??
        null;

      const filename =
        source?.filename ||
        source?.source ||
        source?.document_name ||
        selectedDocumentName ||
        "Source document";

      // IMPORTANT:
      // Every citation is a real button. If the selected PDF is known,
      // clicking the button opens that PDF on the exact cited page.
      return (
        <button
          key={`${keyPrefix}-source-${index}`}
          type="button"
          disabled={!documentId}
          onClick={() => {
            if (documentId) {
              onOpenSource?.(documentId, page, filename);
            }
          }}
          title={
            documentId
              ? `Open ${filename}${page ? ` — page ${page}` : ""}`
              : "PDF source unavailable"
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 10px",
            margin: "0 4px",
            border: "1px solid #c7d2fe",
            borderRadius: "7px",
            background: documentId ? "#eef2ff" : "#f3f4f6",
            color: documentId ? "#3730a3" : "#6b7280",
            fontSize: "13px",
            fontWeight: 600,
            lineHeight: 1.2,
            cursor: documentId ? "pointer" : "not-allowed",
            verticalAlign: "middle",
            whiteSpace: "nowrap",
          }}
        >
          Source {sourceIndex}
          {page ? `, Page ${page}` : ""}
        </button>
      );
    }

    return part;
  });
}

function MarkdownContent({
  content,
  sources,
  onOpenSource,
  selectedDocumentId,
  selectedDocumentName,
  fallbackDocumentId
}) {
  const text = String(content || "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const elements = [];
  let listItems = [];

  const render = (value, key) =>
    renderInline(
      value,
      key,
      sources,
      onOpenSource,
      selectedDocumentId,
      selectedDocumentName,
      fallbackDocumentId
    );

  const flushList = () => {
    if (!listItems.length) return;

    elements.push(
      <ul key={`list-${elements.length}`} className="answer-list">
        {listItems.map((item, index) => (
          <li key={`item-${index}`}>
            {render(item, `list-${elements.length}-${index}`)}
          </li>
        ))}
      </ul>
    );

    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
    const numbered = trimmed.match(/^\d+\.\s+(.*)$/);

    if (bullet) {
      listItems.push(bullet[1]);
      return;
    }

    if (numbered) {
      listItems.push(numbered[1]);
      return;
    }

    flushList();

    if (/^###\s+/.test(trimmed)) {
      elements.push(
        <h4 key={`h4-${index}`}>
          {render(trimmed.replace(/^###\s+/, ""), `h4-${index}`)}
        </h4>
      );
      return;
    }

    if (/^##\s+/.test(trimmed)) {
      elements.push(
        <h3 key={`h3-${index}`}>
          {render(trimmed.replace(/^##\s+/, ""), `h3-${index}`)}
        </h3>
      );
      return;
    }

    if (/^#\s+/.test(trimmed)) {
      elements.push(
        <h2 key={`h2-${index}`}>
          {render(trimmed.replace(/^#\s+/, ""), `h2-${index}`)}
        </h2>
      );
      return;
    }

    elements.push(
      <p key={`p-${index}`}>
        {render(trimmed, `p-${index}`)}
      </p>
    );
  });

  flushList();

  return <div className="answer-content">{elements}</div>;
}


function AssistantActions({ message }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const key = `drugassist_feedback_${message.id || "message"}`;
    const saved = localStorage.getItem(key);

    if (saved === "like" || saved === "dislike") {
      setFeedback(saved);
    }
  }, [message.id]);

  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(
        String(message.content || "")
      );
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1400);
    } catch (error) {
      console.error("COPY ERROR:", error);
    }
  };

  const setReaction = (value) => {
    const next = feedback === value ? null : value;
    const key = `drugassist_feedback_${message.id || "message"}`;

    setFeedback(next);

    if (next) {
      localStorage.setItem(key, next);
    } else {
      localStorage.removeItem(key);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        marginTop: "10px",
      }}
    >
      <button
        type="button"
        onClick={copyAnswer}
        title="Copy"
        aria-label="Copy"
        style={{
          border: 0,
          background: "transparent",
          padding: "6px",
          borderRadius: "7px",
          cursor: "pointer",
          color: copied ? "#2563eb" : "#777",
          display: "inline-flex",
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>

      <button
        type="button"
        onClick={() => setReaction("like")}
        title="Like"
        aria-label="Like"
        style={{
          border: 0,
          background: "transparent",
          padding: "6px",
          borderRadius: "7px",
          cursor: "pointer",
          color: feedback === "like" ? "#2563eb" : "#777",
          display: "inline-flex",
        }}
      >
        <ThumbsUp size={16} />
      </button>

      <button
        type="button"
        onClick={() => setReaction("dislike")}
        title="Dislike"
        aria-label="Dislike"
        style={{
          border: 0,
          background: "transparent",
          padding: "6px",
          borderRadius: "7px",
          cursor: "pointer",
          color: feedback === "dislike" ? "#dc2626" : "#777",
          display: "inline-flex",
        }}
      >
        <ThumbsDown size={16} />
      </button>

      <button
        type="button"
        disabled
        title="Regenerate"
        aria-label="Regenerate"
        style={{
          border: 0,
          background: "transparent",
          padding: "6px",
          borderRadius: "7px",
          cursor: "default",
          color: "#aaa",
          display: "inline-flex",
        }}
      >
        <RotateCcw size={16} />
      </button>
    </div>
  );
}

function ChatWindow({
  messages = [],
  loading = false,
  selectedDocumentId = null,
  selectedDocumentName = "",
}) {
  const [pdfViewer, setPdfViewer] = useState({
    open: false,
    loading: false,
    error: "",
    url: "",
    filename: "",
    page: null,
  });

  // Resolve a document ID even when a later RAG response does not
  // include one in its individual source objects. We use the selected
  // PDF first, then the persisted selection, then any document ID
  // already present in this conversation's sources/attachments.
  const fallbackDocumentId = useMemo(() => {
    const candidates = [];

    const addCandidate = (value) => {
      if (value !== undefined && value !== null && value !== "") {
        const numeric = Number(value);
        if (Number.isFinite(numeric) && numeric > 0) {
          candidates.push(numeric);
        }
      }
    };

    addCandidate(selectedDocumentId);

    const storedDocumentId = localStorage.getItem(
      "drugassist_selected_document_id"
    );
    addCandidate(storedDocumentId);

    for (const message of messages) {
      if (Array.isArray(message?.sources)) {
        for (const source of message.sources) {
          addCandidate(source?.database_document_id);
          addCandidate(source?.databaseDocumentId);
          addCandidate(source?.document_database_id);
          addCandidate(source?.document_id);
        }
      }

      if (Array.isArray(message?.attachments)) {
        for (const attachment of message.attachments) {
          addCandidate(attachment?.document_id);
          addCandidate(attachment?.database_document_id);
        }
      }
    }

    return candidates[0] ?? null;
  }, [messages, selectedDocumentId]);

  const openSourcePDF = async (documentId, page, filename) => {
    const storedDocumentId =
      localStorage.getItem("drugassist_selected_document_id");

    const resolvedDocumentId =
      documentId ??
      selectedDocumentId ??
      fallbackDocumentId ??
      (storedDocumentId !== null
        ? Number(storedDocumentId)
        : null);

    if (!resolvedDocumentId) return;

    try {
      setPdfViewer({
        open: true,
        loading: true,
        error: "",
        url: "",
        filename: filename || selectedDocumentName || "Source document",
        page: page || null,
      });

      const token =
        localStorage.getItem("aura_token") ||
        localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const apiUrl =
        import.meta.env.VITE_API_URL ||
        "http://localhost:8000";

      const response = await fetch(
        `${apiUrl}/documents/${resolvedDocumentId}/pdf`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let detail = `Unable to open PDF (status ${response.status})`;

        try {
          const data = await response.json();
          detail =
            data?.detail ||
            data?.message ||
            data?.error ||
            detail;
        } catch {
          // Keep default error.
        }

        throw new Error(detail);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setPdfViewer({
        open: true,
        loading: false,
        error: "",
        url,
        filename: filename || selectedDocumentName || "Source document",
        page: page || null,
      });
    } catch (error) {
      setPdfViewer((previous) => ({
        ...previous,
        open: true,
        loading: false,
        error:
          error?.message ||
          "Unable to open the PDF.",
      }));
    }
  };

  const closePDFViewer = () => {
    setPdfViewer((previous) => {
      if (previous.url) {
        URL.revokeObjectURL(previous.url);
      }

      return {
        open: false,
        loading: false,
        error: "",
        url: "",
        filename: "",
        page: null,
      };
    });
  };

  return (
    <div className="chat-window">
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const isSystem = message.role === "system";
        const isError = Boolean(message.error);

        return (
          <article
            key={
              message.id ||
              `${message.role}-${index}`
            }
            className={[
              "message-row",
              isUser ? "message-row-user" : "",
              isSystem ? "message-row-system" : "",
              isError ? "message-row-error" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="message-avatar">
              {isUser ? (
                <User size={16} />
              ) : isSystem ? (
                <AlertCircle size={16} />
              ) : (
                <Bot size={16} />
              )}
            </div>

            <div className="message-body">
              <div className="message-role">
                {isUser ? "You" : "DrugAssist"}
              </div>

              <MarkdownContent
                content={message.content}
                sources={message.sources || []}
                onOpenSource={openSourcePDF}
                selectedDocumentId={selectedDocumentId}
                selectedDocumentName={selectedDocumentName}
                fallbackDocumentId={fallbackDocumentId}
              />

              {!isUser && !isSystem && !isError && (
                <AssistantActions message={message} />
              )}

              {Array.isArray(message.attachments) &&
                message.attachments.length > 0 && (
                  <div className="processed-attachments">
                    {message.attachments.map(
                      (attachment, attachmentIndex) => (
                        <div
                          key={
                            attachment.document_id ||
                            `${attachment.filename}-${attachmentIndex}`
                          }
                          className="processed-attachment"
                        >
                          <FileText size={14} />
                          <span>
                            {attachment.filename || "Attachment"}
                          </span>
                          {attachment.status && (
                            <small>{attachment.status}</small>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          </article>
        );
      })}

      {loading && (
        <div className="message-row">
          <div className="message-avatar">
            <Bot size={16} />
          </div>
          <div className="message-body">
            <div className="message-role">DrugAssist</div>
            <div className="typing-indicator">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      <PDFViewer
        open={pdfViewer.open}
        loading={pdfViewer.loading}
        error={pdfViewer.error}
        pdfUrl={pdfViewer.url}
        filename={pdfViewer.filename}
        page={pdfViewer.page}
        onClose={closePDFViewer}
      />
    </div>
  );
}

export default ChatWindow;
