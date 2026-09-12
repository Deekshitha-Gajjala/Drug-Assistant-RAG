import {
  useEffect,
  useRef,
  useState
} from "react";

import { createPortal } from "react-dom";

import {
  Plus,
  Paperclip,
  Image as ImageIcon,
  Mic,
  ArrowUp,
  X
} from "lucide-react";


function ChatInput({
  value,
  onChange,
  onSend,
  onVoice,
  onFileUpload,
  pendingImage,
  pendingImagePreview,
  onRemoveImage,
  loading
}) {

  // ============================================================
  // REFS
  // ============================================================

  const pdfInputRef = useRef(null);

  const imageInputRef = useRef(null);

  const textareaRef = useRef(null);

  const attachButtonRef = useRef(null);

  const menuRef = useRef(null);


  // ============================================================
  // STATE
  // ============================================================

  const [
    attachmentMenuOpen,
    setAttachmentMenuOpen
  ] = useState(false);

  const [
    menuPosition,
    setMenuPosition
  ] = useState({
    left: 20,
    bottom: 100
  });


  // ============================================================
  // UPDATE MENU POSITION
  // ============================================================

  const updateMenuPosition = () => {

    const button =
      attachButtonRef.current;

    if (!button) {
      return;
    }

    const rect =
      button.getBoundingClientRect();

    const menuWidth = 190;

    const viewportPadding = 12;

    let left = rect.left;

    if (
      left + menuWidth >
      window.innerWidth - viewportPadding
    ) {

      left =
        window.innerWidth -
        menuWidth -
        viewportPadding;

    }

    if (left < viewportPadding) {
      left = viewportPadding;
    }

    const bottom =
      window.innerHeight -
      rect.top +
      8;

    setMenuPosition({
      left,
      bottom
    });
  };


  // ============================================================
  // OPEN / CLOSE MENU
  // ============================================================

  const toggleAttachmentMenu = () => {

    if (loading) {
      return;
    }

    setAttachmentMenuOpen(
      (previous) => !previous
    );

  };


  // ============================================================
  // POSITION MENU WHEN OPEN
  // ============================================================

  useEffect(() => {

    if (!attachmentMenuOpen) {
      return;
    }

    updateMenuPosition();

    const handleResize = () => {
      updateMenuPosition();
    };

    const handleScroll = () => {
      updateMenuPosition();
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    window.addEventListener(
      "scroll",
      handleScroll,
      true
    );

    return () => {

      window.removeEventListener(
        "resize",
        handleResize
      );

      window.removeEventListener(
        "scroll",
        handleScroll,
        true
      );

    };

  }, [attachmentMenuOpen]);


  // ============================================================
  // CLOSE MENU ON OUTSIDE CLICK
  // ============================================================

  useEffect(() => {

    if (!attachmentMenuOpen) {
      return;
    }

    const handleOutsideClick = (event) => {

      const menu =
        menuRef.current;

      const button =
        attachButtonRef.current;

      if (
        menu &&
        menu.contains(event.target)
      ) {
        return;
      }

      if (
        button &&
        button.contains(event.target)
      ) {
        return;
      }

      setAttachmentMenuOpen(false);
    };


    const handleEscape = (event) => {

      if (event.key === "Escape") {
        setAttachmentMenuOpen(false);
      }

    };


    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );


    return () => {

      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );

    };

  }, [attachmentMenuOpen]);


  // ============================================================
  // CLOSE MENU WHILE LOADING
  // ============================================================

  useEffect(() => {

    if (loading) {
      setAttachmentMenuOpen(false);
    }

  }, [loading]);


  // ============================================================
  // KEYBOARD SEND
  // ============================================================

  const handleKeyDown = (event) => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      onSend();

    }

  };


  // ============================================================
  // PDF SELECTION
  // ============================================================

  const handlePdfChange = (event) => {

    const file =
      event.target.files?.[0];

    if (file) {

      onFileUpload(
        file,
        false
      );

    }

    event.target.value = "";

    setAttachmentMenuOpen(false);

  };


  // ============================================================
  // IMAGE SELECTION
  // ============================================================

  const handleImageChange = (event) => {

    const file =
      event.target.files?.[0];

    if (file) {

      onFileUpload(
        file,
        true
      );

      requestAnimationFrame(() => {

        textareaRef.current?.focus();

      });

    }

    event.target.value = "";

    setAttachmentMenuOpen(false);

  };


  // ============================================================
  // ATTACHMENT MENU
  // ============================================================

  const attachmentMenu = attachmentMenuOpen
    ? createPortal(

        <div
          ref={menuRef}
          className="drugassist-attachment-menu"
          style={{
            position: "fixed",
            left: `${menuPosition.left}px`,
            bottom: `${menuPosition.bottom}px`
          }}
        >

          <button
            type="button"
            onClick={() => {

              setAttachmentMenuOpen(false);

              setTimeout(() => {

                pdfInputRef.current?.click();

              }, 0);

            }}
          >

            <Paperclip
              size={18}
              strokeWidth={1.9}
            />

            <span>
              Attach PDF
            </span>

          </button>


          <button
            type="button"
            onClick={() => {

              setAttachmentMenuOpen(false);

              setTimeout(() => {

                imageInputRef.current?.click();

              }, 0);

            }}
          >

            <ImageIcon
              size={18}
              strokeWidth={1.9}
            />

            <span>
              Add image
            </span>

          </button>

        </div>,

        document.body

      )
    : null;


  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>

      <style>{`

        /* ======================================================
           COMPOSER
        ====================================================== */

        .composer-shell {
          position: absolute;
          left: 50%;
          bottom: 18px;
          transform: translateX(-50%);
          width: min(860px, calc(100% - 48px));
          z-index: 1000;
        }


        .composer-box {
          position: relative;
          background: #ffffff;
          border: 1px solid #d9d9d9;
          border-radius: 22px;
          box-shadow:
            0 8px 28px rgba(0,0,0,0.08);
          overflow: visible;
          padding: 10px 12px 9px;
        }


        /* ======================================================
           ATTACHMENT PREVIEW
        ====================================================== */

        .composer-attachment {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 7px 8px 11px 4px;
        }


        .composer-attachment-preview {
          width: 58px;
          height: 58px;
          flex: 0 0 58px;
          border-radius: 11px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f1f1;
          color: #666;
        }


        .composer-attachment-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }


        .composer-attachment-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }


        .composer-attachment-info strong {
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #202020;
        }


        .composer-attachment-info span {
          font-size: 13px;
          color: #7a7a7a;
        }


        .composer-remove {
          margin-left: auto;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: #666;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }


        .composer-remove:hover {
          background: #f1f1f1;
          color: #111;
        }


        /* ======================================================
           TEXTAREA
        ====================================================== */

        .composer-box textarea {
          width: 100%;
          min-height: 52px;
          max-height: 150px;
          resize: none;
          border: 0;
          outline: 0;
          background: transparent;
          padding: 8px 8px 4px;
          box-sizing: border-box;
          font: inherit;
          font-size: 17px;
          line-height: 1.45;
          color: #222;
        }


        .composer-box textarea::placeholder {
          color: #8b8b8b;
          opacity: 1;
        }


        /* ======================================================
           TOOLBAR
        ====================================================== */

        .composer-toolbar {
          height: 42px;
          display: flex;
          align-items: center;
          gap: 4px;
        }


        .composer-toolbar-spacer {
          flex: 1;
        }


        .composer-icon-button {
          width: 40px;
          height: 40px;
          padding: 0;
          border: 0;
          background: transparent;
          color: #222;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }


        .composer-icon-button:hover:not(:disabled) {
          background: #f2f2f2;
        }


        .composer-icon-button:disabled {
          cursor: default;
          opacity: 0.55;
        }


        /* ======================================================
           PLUS ICON
        ====================================================== */

        .composer-plus-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }


        .composer-plus-icon svg {
          display: block;
        }


        /* ======================================================
           SEND
        ====================================================== */

        .composer-send-button {
          width: 42px;
          height: 42px;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: #2f6fd6;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          margin-left: 3px;
        }


        .composer-send-button.inactive {
          background: #dfe2e8;
          color: #9aa0aa;
          cursor: default;
        }


        /* ======================================================
           ATTACHMENT MENU

           Rendered into document.body using a React portal.
           This prevents the menu from being clipped by the
           chat scrolling container or transformed composer.
        ====================================================== */

        .drugassist-attachment-menu {
          width: 190px;
          box-sizing: border-box;
          background: #ffffff;
          border: 1px solid #d8d8d8;
          border-radius: 14px;
          box-shadow:
            0 12px 32px rgba(0,0,0,0.15),
            0 2px 8px rgba(0,0,0,0.06);
          padding: 6px;
          z-index: 2147483647;
          animation: drugassistAttachmentMenuIn 0.12s ease-out;
        }


        @keyframes drugassistAttachmentMenuIn {

          from {
            opacity: 0;
            transform: translateY(5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }

        }


        .drugassist-attachment-menu button {
          width: 100%;
          min-height: 42px;
          box-sizing: border-box;
          border: 0;
          background: transparent;
          border-radius: 9px;
          padding: 10px 11px;
          display: flex;
          align-items: center;
          gap: 11px;
          text-align: left;
          color: #222;
          cursor: pointer;
          font-size: 14px;
          font-family: inherit;
        }


        .drugassist-attachment-menu button:hover {
          background: #f3f3f3;
        }


        .drugassist-attachment-menu button:active {
          background: #e9e9e9;
        }


        .drugassist-attachment-menu button svg {
          flex: 0 0 auto;
          color: #555;
        }


        .drugassist-attachment-menu button span {
          flex: 1;
        }


        /* ======================================================
           HINT
        ====================================================== */

        .composer-hint {
          text-align: center;
          font-size: 12px;
          color: #9aa0aa;
          margin-top: 10px;
        }


        /* ======================================================
           MOBILE
        ====================================================== */

        @media (max-width: 700px) {

          .composer-shell {
            width: calc(100% - 24px);
            bottom: 10px;
          }


          .composer-attachment-info span {
            display: none;
          }


          .drugassist-attachment-menu {
            width: 180px;
          }

        }

      `}</style>


      {/* ========================================================
          COMPOSER
      ======================================================== */}

      <div className="composer-shell">


        {/* ======================================================
            HIDDEN PDF INPUT
        ====================================================== */}

        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handlePdfChange}
          style={{
            display: "none"
          }}
        />


        {/* ======================================================
            HIDDEN IMAGE INPUT
        ====================================================== */}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          style={{
            display: "none"
          }}
        />


        {/* ======================================================
            COMPOSER BOX
        ====================================================== */}

        <div className="composer-box">


          {/* ====================================================
              PENDING IMAGE
          ==================================================== */}

          {pendingImage && (

            <div className="composer-attachment">

              <div className="composer-attachment-preview">

                {pendingImagePreview ? (

                  <img
                    src={pendingImagePreview}
                    alt="Selected image"
                  />

                ) : (

                  <ImageIcon size={22} />

                )}

              </div>


              <div className="composer-attachment-info">

                <strong>
                  {pendingImage.name}
                </strong>

                <span>
                  Type your question below, then press Send.
                </span>

              </div>


              <button
                type="button"
                className="composer-remove"
                onClick={onRemoveImage}
                disabled={loading}
                title="Remove image"
                aria-label="Remove image"
              >

                <X size={18} />

              </button>

            </div>

          )}


          {/* ====================================================
              TEXTAREA
          ==================================================== */}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) =>
              onChange(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Ask anything"
            disabled={loading}
            rows={1}
            aria-label="Ask anything"
          />


          {/* ====================================================
              TOOLBAR
          ==================================================== */}

          <div className="composer-toolbar">


            {/* ==================================================
                PLUS BUTTON
            ================================================== */}

            <button
              ref={attachButtonRef}
              type="button"
              className="composer-icon-button"
              onClick={toggleAttachmentMenu}
              disabled={loading}
              title="Attach PDF or image"
              aria-label="Attach PDF or image"
              aria-expanded={
                attachmentMenuOpen
              }
            >

              <span className="composer-plus-icon">

                <Plus
                  size={25}
                  strokeWidth={1.7}
                />

              </span>

            </button>


            <div className="composer-toolbar-spacer" />


            {/* ==================================================
                VOICE
            ================================================== */}

            <button
              type="button"
              className={
                `composer-icon-button voice-button ${
                  loading
                    ? "disabled"
                    : ""
                }`
              }
              onClick={onVoice}
              disabled={loading}
              title="Voice input"
              aria-label="Voice input"
            >

              <Mic
                size={22}
                strokeWidth={1.9}
              />

            </button>


            {/* ==================================================
                SEND
            ================================================== */}

            <button
              type="button"
              className={
                `composer-send-button ${
                  !value.trim() || loading
                    ? "inactive"
                    : ""
                }`
              }
              onClick={onSend}
              disabled={
                !value.trim() ||
                loading
              }
              title="Send"
              aria-label="Send"
            >

              <ArrowUp
                size={24}
                strokeWidth={2.2}
              />

            </button>

          </div>

        </div>


        {/* ======================================================
            HINT
        ====================================================== */}

        <div className="composer-hint">
          DrugAssist can search the web, read documents,
          analyze images and more.
        </div>

      </div>


      {/* ========================================================
          PORTAL ATTACHMENT MENU
      ======================================================== */}

      {attachmentMenu}

    </>
  );
}


export default ChatInput;