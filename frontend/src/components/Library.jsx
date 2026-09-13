import { useEffect, useState } from "react";
import {
  Library as LibraryIcon,
  FileText,
  Trash2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

function Library({ apiUrl, token, onBack }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pdfViewer, setPdfViewer] = useState({
    open: false,
    loading: false,
    error: "",
    url: "",
    filename: "",
  });

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${apiUrl}/documents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to load documents.");
      }

      setDocuments(Array.isArray(data.documents) ? data.documents : []);
    } catch (err) {
      console.error("Library error:", err);
      setError(err.message || "Unable to load your documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    return () => {
      if (pdfViewer.url) {
        URL.revokeObjectURL(pdfViewer.url);
      }
    };
  }, [pdfViewer.url]);

  const handleOpenPDF = async (document) => {
    if (!document?.id) return;

    if (pdfViewer.url) {
      URL.revokeObjectURL(pdfViewer.url);
    }

    setPdfViewer({
      open: true,
      loading: true,
      error: "",
      url: "",
      filename: document.filename || "document.pdf",
    });

    try {
      const response = await fetch(
        `${apiUrl}/documents/${document.id}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let message = "Unable to open this PDF.";
        try {
          const data = await response.json();
          message = data.detail || message;
        } catch {
          // Ignore non-JSON errors.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setPdfViewer({
        open: true,
        loading: false,
        error: "",
        url,
        filename: document.filename || "document.pdf",
      });
    } catch (err) {
      console.error("Open PDF error:", err);

      setPdfViewer({
        open: true,
        loading: false,
        error: err.message || "Unable to open this PDF.",
        url: "",
        filename: document.filename || "document.pdf",
      });
    }
  };

  const closePDF = () => {
    if (pdfViewer.url) {
      URL.revokeObjectURL(pdfViewer.url);
    }

    setPdfViewer({
      open: false,
      loading: false,
      error: "",
      url: "",
      filename: "",
    });
  };

  const handleDelete = async (documentId) => {
    const confirmed = window.confirm(
      "Delete this document from your Library?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${apiUrl}/documents/${documentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to delete document.");
      }

      setDocuments((previous) =>
        previous.filter(
          (document) => String(document.id) !== String(documentId)
        )
      );
    } catch (err) {
      console.error("Delete document error:", err);
      window.alert(err.message || "Unable to delete document.");
    }
  };

  const filteredDocuments = documents.filter((document) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;

    return (
      (document.filename || "").toLowerCase().includes(term) ||
      (document.drug || "").toLowerCase().includes(term) ||
      (document.drug_name || "").toLowerCase().includes(term) ||
      (document.source || "").toLowerCase().includes(term)
    );
  });

  const formatDate = (dateValue) => {
    if (!dateValue) return "Unknown date";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Unknown date";

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="library-page">
      <header className="library-header">
        <div className="library-header-left">
          <button
            className="library-back-button"
            onClick={onBack}
            title="Back to chat"
            aria-label="Back to chat"
          >
            <X size={19} />
          </button>

          <div className="library-header-icon">
            <LibraryIcon size={22} />
          </div>

          <div>
            <h1>Library</h1>
            <p>Your uploaded drug information</p>
          </div>
        </div>

        <button
          className="library-refresh-button"
          onClick={loadDocuments}
          disabled={loading}
          title="Refresh"
          aria-label="Refresh Library"
        >
          <RefreshCw
            size={18}
            className={loading ? "library-refresh-spinning" : ""}
          />
        </button>
      </header>

      <div className="library-search-wrapper">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search your documents..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <main className="library-content">
        {loading ? (
          <div className="library-state">
            <RefreshCw size={28} className="library-refresh-spinning" />
            <p>Loading your documents...</p>
          </div>
        ) : error ? (
          <div className="library-state library-error">
            <FileText size={30} />
            <p>{error}</p>
            <button onClick={loadDocuments} className="library-retry-button">
              Try again
            </button>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="library-empty">
            <div className="library-empty-icon">
              <LibraryIcon size={35} />
            </div>
            <h2>{searchTerm ? "No documents found" : "Your Library is empty"}</h2>
            <p>
              {searchTerm
                ? "Try a different search term."
                : "Upload a PDF through the + button in the chat composer to add drug information here."}
            </p>
            {!searchTerm && (
              <button className="library-back-to-chat" onClick={onBack}>
                Go to chat
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="library-results-header">
              <span>
                {filteredDocuments.length} {
                  filteredDocuments.length === 1 ? "document" : "documents"
                }
              </span>
            </div>

            <div className="document-grid">
              {filteredDocuments.map((document) => (
                <article className="document-card" key={document.id}>
                  <button
                    type="button"
                    className="document-open-area"
                    onClick={() => handleOpenPDF(document)}
                    title={`Open ${document.filename || "PDF"}`}
                    aria-label={`Open ${document.filename || "PDF"}`}
                  >
                    <div className="document-card-top">
                      <div className="document-icon">
                        <FileText size={25} />
                      </div>
                    </div>

                    <div className="document-name">
                      {document.filename || "Untitled document"}
                    </div>

                    {(document.drug || document.drug_name) && (
                      <div className="document-drug">
                        {document.drug || document.drug_name}
                      </div>
                    )}

                    {document.source && (
                      <div className="document-source">
                        {document.source}
                      </div>
                    )}

                    <div className="document-meta">
                      {document.pages !== undefined && (
                        <span>
                          {document.pages} {document.pages === 1 ? "page" : "pages"}
                        </span>
                      )}
                      {document.chunks !== undefined && (
                        <span>{document.chunks} chunks</span>
                      )}
                    </div>

                    <div className="document-date">
                      Added {formatDate(document.created_at || document.uploaded_at)}
                    </div>
                  </button>

                  <button
                    type="button"
                    className="document-delete"
                    onClick={() => handleDelete(document.id)}
                    title="Delete document"
                    aria-label="Delete document"
                  >
                    <Trash2 size={17} />
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </main>

      {pdfViewer.open && (
        <div className="pdf-viewer-overlay" onClick={closePDF}>
          <div
            className="pdf-viewer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pdf-viewer-header">
              <div className="pdf-viewer-title">
                {pdfViewer.filename || "PDF document"}
              </div>
              <button
                type="button"
                className="pdf-viewer-close"
                onClick={closePDF}
                title="Close PDF"
                aria-label="Close PDF"
              >
                <X size={21} />
              </button>
            </div>

            <div className="pdf-viewer-body">
              {pdfViewer.loading ? (
                <div className="pdf-viewer-state">
                  <RefreshCw size={28} className="library-refresh-spinning" />
                  <p>Opening PDF...</p>
                </div>
              ) : pdfViewer.error ? (
                <div className="pdf-viewer-state library-error">
                  <FileText size={30} />
                  <p>{pdfViewer.error}</p>
                </div>
              ) : (
                <iframe
                  src={pdfViewer.url}
                  title={pdfViewer.filename || "PDF document"}
                  className="pdf-viewer-frame"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .document-card {
          position: relative;
        }

        .document-open-area {
          display: block;
          width: 100%;
          border: 0;
          padding: 0;
          margin: 0;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
        }

        .document-open-area:focus-visible {
          outline: 2px solid #999;
          outline-offset: 3px;
          border-radius: 12px;
        }

        .document-delete {
          position: absolute;
          top: 25px;
          right: 25px;
          z-index: 2;
        }

        .pdf-viewer-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(0, 0, 0, 0.55);
        }

        .pdf-viewer-modal {
          width: min(1200px, 96vw);
          height: min(900px, 94vh);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 20px 70px rgba(0, 0, 0, 0.28);
        }

        .pdf-viewer-header {
          min-height: 58px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 14px 0 20px;
          border-bottom: 1px solid #e5e5e5;
        }

        .pdf-viewer-title {
          min-width: 0;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
          font-weight: 600;
        }

        .pdf-viewer-close {
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pdf-viewer-close:hover {
          background: #f0f0f0;
        }

        .pdf-viewer-body {
          flex: 1;
          min-height: 0;
          background: #f1f1f1;
        }

        .pdf-viewer-frame {
          width: 100%;
          height: 100%;
          border: 0;
          display: block;
        }

        .pdf-viewer-state {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #666;
        }

        /* STEP 6 — PROFESSIONAL LIBRARY STYLING */
        .library-page {
          background: #fafafa;
          min-height: 100%;
        }

        .library-header {
          padding: 24px 30px 18px;
          border-bottom: 1px solid #e9e9eb;
          background: rgba(255,255,255,0.92);
        }

        .library-header h1 {
          font-size: 24px;
          letter-spacing: -0.4px;
        }

        .library-header p {
          margin-top: 3px;
          color: #7b7e86;
          font-size: 13px;
        }

        .library-search-wrapper {
          max-width: 720px;
          margin: 22px auto 6px;
          border: 1px solid #dedee2;
          border-radius: 13px;
          background: #fff;
          box-shadow: 0 5px 18px rgba(0,0,0,0.045);
          transition: border-color .16s ease, box-shadow .16s ease;
        }

        .library-search-wrapper:focus-within {
          border-color: #b8b8bc;
          box-shadow: 0 7px 22px rgba(0,0,0,0.07);
        }

        .library-content {
          padding: 20px 30px 42px;
        }

        .library-results-header {
          max-width: 1180px;
          margin: 0 auto 14px;
          color: #777b84;
          font-size: 13px;
          font-weight: 500;
        }

        .document-grid {
          max-width: 1180px;
          margin: 0 auto;
          gap: 18px;
        }

        .document-card {
          border: 1px solid #e3e3e6;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 5px 18px rgba(0,0,0,0.045);
          transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
          overflow: hidden;
        }

        .document-card:hover {
          transform: translateY(-2px);
          border-color: #d2d2d5;
          box-shadow: 0 12px 28px rgba(0,0,0,0.08);
        }

        .document-open-area {
          padding: 20px !important;
          min-height: 205px;
        }

        .document-card-top {
          margin-bottom: 15px;
        }

        .document-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f1f2;
          color: #242424;
        }

        .document-name {
          padding-right: 32px;
          font-size: 15px;
          font-weight: 650;
          line-height: 1.4;
          color: #202124;
        }

        .document-drug {
          margin-top: 7px;
          font-size: 13px;
          font-weight: 600;
          color: #555961;
        }

        .document-source {
          margin-top: 5px;
          font-size: 12px;
          color: #858890;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .document-meta {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #eeeeef;
          color: #777b84;
          font-size: 11px;
        }

        .document-date {
          margin-top: 7px;
          color: #999ba1;
          font-size: 11px;
        }

        .document-delete {
          top: 14px !important;
          right: 14px !important;
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: transparent;
          color: #85878d;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background .16s ease, color .16s ease;
        }

        .document-delete:hover {
          background: #f1f1f2;
          color: #222;
        }

        .library-empty,
        .library-state {
          max-width: 620px;
          margin: 70px auto;
          padding: 46px 30px;
          border: 1px solid #e7e7e9;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 8px 24px rgba(0,0,0,0.04);
        }

        .library-empty-icon {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: #f1f1f2;
        }

        .pdf-viewer-modal {
          border-radius: 18px !important;
          box-shadow: 0 24px 80px rgba(0,0,0,0.32) !important;
        }

        .pdf-viewer-header {
          background: #fff;
        }

        .pdf-viewer-close:hover {
          background: #eeeeef !important;
        }

        @media (max-width: 700px) {
          .library-header { padding: 18px 18px 14px; }
          .library-content { padding: 16px 18px 30px; }
          .library-search-wrapper { margin: 16px 18px 4px; }
          .document-grid { grid-template-columns: 1fr !important; }
          .library-empty, .library-state { margin: 40px auto; padding: 34px 20px; }
        }

        .app-shell.dark-mode .library-page {
          background: #111;
          color: #eee;
        }

        .app-shell.dark-mode .library-header,
        .app-shell.dark-mode .library-search-wrapper,
        .app-shell.dark-mode .document-card,
        .app-shell.dark-mode .library-empty,
        .app-shell.dark-mode .library-state,
        .app-shell.dark-mode .pdf-viewer-header {
          background: #181818 !important;
          border-color: #303030 !important;
          color: #eee;
        }

        .app-shell.dark-mode .library-header p,
        .app-shell.dark-mode .library-results-header,
        .app-shell.dark-mode .document-source,
        .app-shell.dark-mode .document-date {
          color: #8f8f8f !important;
        }

        .app-shell.dark-mode .library-search-wrapper {
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        }

        .app-shell.dark-mode .library-search-wrapper input {
          color: #eee !important;
        }

        .app-shell.dark-mode .document-card:hover {
          border-color: #454545 !important;
          box-shadow: 0 12px 30px rgba(0,0,0,0.3);
        }

        .app-shell.dark-mode .document-icon,
        .app-shell.dark-mode .library-empty-icon {
          background: #252525 !important;
          color: #eee !important;
        }

        .app-shell.dark-mode .document-name,
        .app-shell.dark-mode .document-drug {
          color: #eee !important;
        }

        .app-shell.dark-mode .document-meta {
          border-color: #303030 !important;
          color: #999 !important;
        }

        .app-shell.dark-mode .document-delete {
          color: #999 !important;
        }

        .app-shell.dark-mode .document-delete:hover,
        .app-shell.dark-mode .pdf-viewer-close:hover {
          background: #292929 !important;
          color: #fff !important;
        }

        .app-shell.dark-mode .pdf-viewer-modal {
          background: #181818 !important;
        }

        .app-shell.dark-mode .pdf-viewer-body {
          background: #101010 !important;
        }
      `}</style>
    </div>
  );
}

export default Library;
