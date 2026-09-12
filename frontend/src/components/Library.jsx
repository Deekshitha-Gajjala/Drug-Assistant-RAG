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

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${apiUrl}/documents`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load documents."
        );
      }

      setDocuments(data.documents || []);
    } catch (err) {
      console.error("Library error:", err);
      setError(
        err.message || "Unable to load your documents."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleDelete = async (documentId) => {
    const confirmed = window.confirm(
      "Delete this document from your Library?"
    );

    if (!confirmed) {
      return;
    }

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
        throw new Error(
          data.detail || "Failed to delete document."
        );
      }

      setDocuments((previous) =>
        previous.filter(
          (document) =>
            String(document.id) !==
            String(documentId)
        )
      );
    } catch (err) {
      console.error("Delete document error:", err);

      window.alert(
        err.message || "Unable to delete document."
      );
    }
  };

  const filteredDocuments = documents.filter(
    (document) => {
      const term = searchTerm
        .trim()
        .toLowerCase();

      if (!term) {
        return true;
      }

      return (
        (document.filename || "")
          .toLowerCase()
          .includes(term) ||
        (document.drug_name || "")
          .toLowerCase()
          .includes(term) ||
        (document.source || "")
          .toLowerCase()
          .includes(term)
      );
    }
  );

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Unknown date";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleDateString(
      undefined,
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  return (
    <div className="library-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

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

            <p>
              Your uploaded drug information
            </p>
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
            className={
              loading
                ? "library-refresh-spinning"
                : ""
            }
          />
        </button>

      </header>

      {/* =====================================================
          SEARCH
      ====================================================== */}

      <div className="library-search-wrapper">

        <Search size={18} />

        <input
          type="text"
          placeholder="Search your documents..."
          value={searchTerm}
          onChange={(event) =>
            setSearchTerm(event.target.value)
          }
        />

      </div>

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <main className="library-content">

        {loading ? (
          <div className="library-state">

            <RefreshCw
              size={28}
              className="library-refresh-spinning"
            />

            <p>
              Loading your documents...
            </p>

          </div>
        ) : error ? (
          <div className="library-state library-error">

            <FileText size={30} />

            <p>{error}</p>

            <button
              onClick={loadDocuments}
              className="library-retry-button"
            >
              Try again
            </button>

          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="library-empty">

            <div className="library-empty-icon">
              <LibraryIcon size={35} />
            </div>

            <h2>
              {searchTerm
                ? "No documents found"
                : "Your Library is empty"}
            </h2>

            <p>
              {searchTerm
                ? "Try a different search term."
                : "Upload a PDF through the + button in the chat composer to add drug information here."}
            </p>

            {!searchTerm && (
              <button
                className="library-back-to-chat"
                onClick={onBack}
              >
                Go to chat
              </button>
            )}

          </div>
        ) : (
          <>
            <div className="library-results-header">
              <span>
                {filteredDocuments.length}{" "}
                {filteredDocuments.length === 1
                  ? "document"
                  : "documents"}
              </span>
            </div>

            <div className="document-grid">

              {filteredDocuments.map(
                (document) => (
                  <article
                    className="document-card"
                    key={document.id}
                  >

                    <div className="document-card-top">

                      <div className="document-icon">
                        <FileText size={25} />
                      </div>

                      <button
                        className="document-delete"
                        onClick={() =>
                          handleDelete(
                            document.id
                          )
                        }
                        title="Delete document"
                        aria-label="Delete document"
                      >
                        <Trash2 size={17} />
                      </button>

                    </div>

                    <div className="document-name">
                      {document.filename ||
                        "Untitled document"}
                    </div>

                    {document.drug_name && (
                      <div className="document-drug">
                        {document.drug_name}
                      </div>
                    )}

                    {document.source && (
                      <div className="document-source">
                        {document.source}
                      </div>
                    )}

                    <div className="document-meta">

                      {document.pages !==
                        undefined && (
                        <span>
                          {document.pages}{" "}
                          {document.pages === 1
                            ? "page"
                            : "pages"}
                        </span>
                      )}

                      {document.chunks !==
                        undefined && (
                        <span>
                          {document.chunks} chunks
                        </span>
                      )}

                    </div>

                    <div className="document-date">
                      Added{" "}
                      {formatDate(
                        document.created_at
                      )}
                    </div>

                  </article>
                )
              )}

            </div>
          </>
        )}

      </main>

    </div>
  );
}

export default Library;