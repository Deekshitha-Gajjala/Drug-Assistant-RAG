import {
  useEffect,
  useRef,
  useState
} from "react";

import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import AuthPage from "./components/AuthPage";
import Library from "./components/Library";

import {
  askAURA,
  getChatHistory,
  getDocuments,
  uploadPDF,
  getConversations,
  getConversation,
  deleteConversation,
  deleteAllConversations,
  deletePDF,
  askImage,
  voiceAsk
} from "./services/api";


const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";


function App() {

  // ============================================================
  // AUTHENTICATION
  // ============================================================

  const [isAuthenticated, setIsAuthenticated] =
    useState(
      Boolean(
        localStorage.getItem("aura_token")
      )
    );

  // Keep the logged-in user available to the Sidebar.
  // AuthPage stores this object in localStorage as "aura_user".
  const [user, setUser] = useState(() => {
    try {
      const storedUser =
        localStorage.getItem("aura_user");

      return storedUser
        ? JSON.parse(storedUser)
        : null;
    } catch (error) {
      console.error("USER PARSE ERROR:", error);
      return null;
    }
  });

  // Current application view.
  const [currentView, setCurrentView] =
    useState("chat");

  // ============================================================
  // THEME
  // ============================================================
  const [isDarkMode, setIsDarkMode] =
    useState(() => {
      return (
        localStorage.getItem("drugassist_theme") ===
        "dark"
      );
    });

  useEffect(() => {
    localStorage.setItem(
      "drugassist_theme",
      isDarkMode ? "dark" : "light"
    );

    document.body.style.backgroundColor =
      isDarkMode ? "#111111" : "#ffffff";
    document.body.style.color =
      isDarkMode ? "#f5f5f5" : "#171717";

    return () => {
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
    };
  }, [isDarkMode]);


  // ============================================================
  // CHAT
  // ============================================================

  const [messages, setMessages] =
    useState([]);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  // ============================================================
  // CONVERSATIONS
  // ============================================================

  const [conversations, setConversations] =
    useState([]);

  const [currentConversationId, setCurrentConversationId] =
    useState(null);

  const [loadingConversation, setLoadingConversation] =
    useState(false);


  // ============================================================
  // UPLOADED FILES
  // ============================================================

  const [uploadedFiles, setUploadedFiles] =
    useState([]);

  const [uploadedDocuments, setUploadedDocuments] =
    useState([]);

  const [selectedDocumentId, setSelectedDocumentId] =
    useState(() => {
      const stored = localStorage.getItem(
        "drugassist_selected_document_id"
      );

      return stored !== null
        ? Number(stored)
        : null;
    });

  const [selectedDocumentName, setSelectedDocumentName] =
    useState(() => {
      return (
        localStorage.getItem(
          "drugassist_selected_document_name"
        ) || ""
      );
    });


  // PDF upload is fast; this tracks the background indexing phase.
  const [pdfIndexing, setPdfIndexing] = useState(false);


  // ============================================================
  // PENDING IMAGE ATTACHMENT
  // ============================================================

  const [pendingImage, setPendingImage] =
    useState(null);

  const [pendingImagePreview, setPendingImagePreview] =
    useState("");


  // ============================================================
  // VOICE
  // ============================================================

  const [isRecording, setIsRecording] =
    useState(false);

  const [voiceStatus, setVoiceStatus] =
    useState("");

  const mediaRecorderRef =
    useRef(null);

  const audioChunksRef =
    useRef([]);

  const streamRef =
    useRef(null);


  // ============================================================
  // CHAT SCROLL
  // ============================================================

  const chatEndRef =
    useRef(null);

  const chatAreaRef =
    useRef(null);


  // ============================================================
  // AUTO-SCROLL CHAT
  // ============================================================

  useEffect(() => {
    /*
      The .chat-area element is the ONLY scrolling container.
      ChatWindow itself is forced to be content-sized below, so the
      browser does not have two competing scrollbars.
    */
    let frame1;
    let frame2;

    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        const chatArea = chatAreaRef.current;

        if (chatArea) {
          chatArea.scrollTo({
            top: chatArea.scrollHeight,
            behavior: "smooth"
          });
        }
      });
    });

    return () => {
      cancelAnimationFrame(frame1);
      if (frame2) {
        cancelAnimationFrame(frame2);
      }
    };
  }, [
    messages,
    loading,
    voiceStatus,
    currentConversationId
  ]);


  // ============================================================
  // LOAD DATA AFTER LOGIN
  // ============================================================

  useEffect(() => {

    if (!isAuthenticated) {
      return;
    }

    loadConversations();
    loadDocuments();

  }, [isAuthenticated]);


  // ============================================================
  // CLEANUP MICROPHONE
  // ============================================================

  useEffect(() => {

    return () => {

      if (mediaRecorderRef.current) {

        try {

          if (
            mediaRecorderRef.current.state !==
            "inactive"
          ) {
            mediaRecorderRef.current.stop();
          }

        } catch (error) {
          console.error(
            "Recorder cleanup error:",
            error
          );
        }

      }


      if (streamRef.current) {

        streamRef.current
          .getTracks()
          .forEach(
            (track) => track.stop()
          );

      }

    };

  }, []);


  // ============================================================
  // CLEANUP IMAGE PREVIEW
  // ============================================================

  useEffect(() => {
    return () => {
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview);
      }
    };
  }, [pendingImagePreview]);


  // ============================================================
  // LOAD CONVERSATIONS
  // ============================================================

  const loadConversations = async () => {

    try {

      const data =
  await getConversations();

const serverChats =
  Array.isArray(data)
    ? data
    : Array.isArray(data?.chats)
    ? data.chats
    : Array.isArray(data?.conversations)
    ? data.conversations
    : [];

setConversations(serverChats);

      localStorage.setItem(
        "drugassist_recent_chats",
        JSON.stringify(serverChats)
      );

    } catch (error) {

      console.error(
        "CONVERSATIONS ERROR:",
        error
      );

      try {
        const cached =
          JSON.parse(
            localStorage.getItem(
              "drugassist_recent_chats"
            ) || "[]"
          );

        if (Array.isArray(cached)) {
          setConversations(cached);
        }
      } catch {
        // Ignore an invalid local cache.
      }

      if (
        error.message?.includes(
          "session has expired"
        )
      ) {
        handleLogout();
      }

    }

  };


  // ============================================================
  // OPEN CONVERSATION
  // ============================================================

  const handleOpenConversation = async (
    conversationId
  ) => {

    if (
      !conversationId ||
      loadingConversation
    ) {
      return;
    }

    try {

      setLoadingConversation(true);
      setCurrentConversationId(
        conversationId
      );

      const data =
        await getConversation(
          conversationId
        );

      const conversationMessages =
        data.messages || [];

      const loadedMessages =
        conversationMessages
          .filter(
            (item) =>
              item &&
              item.role &&
              item.content !== undefined
          )
          .map((item) => ({
            id:
              item.id ||
              `message-${Date.now()}-${Math.random()}`,
            role: item.role,
            content: item.content,
            sources: item.sources || [],
            videos: item.videos || [],
            attachments: item.attachments || [],
            evidence: item.evidence || [],
            confidence: item.confidence,
            grounding_score: item.grounding_score,
            mode: item.mode,
            image_analysis: item.image_analysis
          }));

      setMessages(
        loadedMessages
      );

      setInput("");

      setPendingImage(null);
      setPendingImagePreview("");

    } catch (error) {

      console.error(
        "OPEN CONVERSATION ERROR:",
        error
      );

      if (
        error.message?.includes(
          "session has expired"
        )
      ) {
        handleLogout();
        return;
      }

      setMessages([
        {
          id:
            `conversation-error-${Date.now()}`,
          role:
            "assistant",
          content:
            error.message ||
            "Unable to open this conversation."
        }
      ]);

    } finally {

      setLoadingConversation(false);

    }

  };


  // ============================================================
  // LOAD DOCUMENTS
  // ============================================================

  const loadDocuments = async () => {

    try {

      const data =
        await getDocuments();

      const documents =
        data.documents || [];

      setUploadedDocuments(
        documents
      );

      setUploadedFiles(
        documents.map(
          (document) =>
            document.filename
        )
      );

      const storedSelectedId =
        localStorage.getItem(
          "drugassist_selected_document_id"
        );

      const preferredId =
        selectedDocumentId !== null
          ? selectedDocumentId
          : storedSelectedId !== null
          ? Number(storedSelectedId)
          : null;

      if (preferredId !== null) {
        const selected = documents.find(
          (document) =>
            Number(document.id) ===
            Number(preferredId)
        );

        if (selected) {
          setSelectedDocumentId(selected.id);
          setSelectedDocumentName(
            selected.filename
          );

          localStorage.setItem(
            "drugassist_selected_document_id",
            String(selected.id)
          );
          localStorage.setItem(
            "drugassist_selected_document_name",
            selected.filename || ""
          );
        } else {
          setSelectedDocumentId(null);
          setSelectedDocumentName("");
          localStorage.removeItem(
            "drugassist_selected_document_id"
          );
          localStorage.removeItem(
            "drugassist_selected_document_name"
          );
        }
      }

    } catch (error) {

      console.error(
        "DOCUMENT ERROR:",
        error
      );


      if (
        error.message?.includes(
          "session has expired"
        )
      ) {

        handleLogout();

      }

    }

  };


  // ============================================================
  // DELETE PDF
  // ============================================================

  const handleDeleteDocument = async (documentId) => {

    try {
      await deletePDF(documentId);

      if (Number(selectedDocumentId) === Number(documentId)) {
        setSelectedDocumentId(null);
        setSelectedDocumentName("");

        localStorage.removeItem(
          "drugassist_selected_document_id"
        );

        localStorage.removeItem(
          "drugassist_selected_document_name"
        );
      }

      await loadDocuments();

    } catch (error) {

      console.error("DELETE PDF ERROR:", error);

      if (error.message?.includes("session has expired")) {
        handleLogout();
      }

    }
  };


  // ============================================================
  // SELECT PDF
  // ============================================================

  const handleSelectDocument = (
    documentId
  ) => {
    const selected = uploadedDocuments.find(
      (document) =>
        Number(document.id) ===
        Number(documentId)
    );

    if (!selected) {
      return;
    }

    setSelectedDocumentId(
      selected.id
    );

    setSelectedDocumentName(
      selected.filename
    );

    localStorage.setItem(
      "drugassist_selected_document_id",
      String(selected.id)
    );

    localStorage.setItem(
      "drugassist_selected_document_name",
      selected.filename || ""
    );

    setInput("");
  };


  // ============================================================
  // LOGIN
  // ============================================================

  const handleLogin = () => {

    const token =
      localStorage.getItem(
        "aura_token"
      );


    if (!token) {

      console.error(
        "Login completed but token was not found."
      );

      return;

    }


    try {
      const storedUser =
        localStorage.getItem("aura_user");

      setUser(
        storedUser
          ? JSON.parse(storedUser)
          : null
      );
    } catch (error) {
      console.error("USER PARSE ERROR:", error);
      setUser(null);
    }

    setIsAuthenticated(true);
    setCurrentView("chat");
    setMessages([]);
    setInput("");

  };


  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {

    localStorage.removeItem(
      "aura_token"
    );

    localStorage.removeItem(
      "aura_user"
    );


    setIsAuthenticated(false);
    setUser(null);
    setCurrentView("chat");
    setMessages([]);
    setInput("");
    setUploadedFiles([]);
    setUploadedDocuments([]);
    setSelectedDocumentId(null);
    setSelectedDocumentName("");
    setPendingImage(null);
    setPendingImagePreview("");


    // Stop microphone if active

    if (mediaRecorderRef.current) {

      try {

        if (
          mediaRecorderRef.current.state !==
          "inactive"
        ) {
          mediaRecorderRef.current.stop();
        }

      } catch (error) {
        console.error(
          "Recorder logout error:",
          error
        );
      }

    }


    if (streamRef.current) {

      streamRef.current
        .getTracks()
        .forEach(
          (track) => track.stop()
        );

      streamRef.current = null;

    }


    setIsRecording(false);
    setVoiceStatus("");

  };


  // ============================================================
  // NEW CHAT
  // ============================================================

  const handleNewChat = () => {

    setCurrentConversationId(null);
    setMessages([]);
    setInput("");
    setPendingImage(null);
    setPendingImagePreview("");
    setCurrentView("chat");

  };


  // ============================================================
  // LIBRARY
  // ============================================================

  const handleOpenLibrary = () => {
    setCurrentView("library");
  };

  const handleOpenChat = () => {
    setCurrentView("chat");
  };


  // ============================================================
  // DELETE CURRENT CHAT
  // ============================================================

  const handleDeleteChat = async (chatId) => {

  if (!chatId) {
    return;
  }

  try {
    await deleteConversation(chatId);

    setConversations(
      (previous) =>
        previous.filter(
          (conversation) =>
            String(conversation.id) !==
            String(chatId)
        )
    );

    if (
      String(currentConversationId) ===
      String(chatId)
    ) {
      handleNewChat();
    }

  } catch (error) {

    console.error(
      "DELETE CONVERSATION ERROR:",
      error
    );

    if (
      error.message?.includes(
        "session has expired"
      )
    ) {
      handleLogout();
    }
  }
};



  // ============================================================
  // DELETE ALL CONVERSATIONS
  // ============================================================

  const handleDeleteAllConversations = async () => {

    try {

      await deleteAllConversations();

      setConversations([]);
      handleNewChat();

    } catch (error) {

      console.error(
        "DELETE ALL CONVERSATIONS ERROR:",
        error
      );

      if (
        error.message?.includes(
          "session has expired"
        )
      ) {
        handleLogout();
      }

    }

  };


  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const handleSend = async () => {

    const text = input.trim();

    if (!text || loading) {
      return;
    }

    if (pdfIndexing) {
      setMessages((previous) => [
        ...previous,
        {
          id: `pdf-indexing-${Date.now()}`,
          role: "assistant",
          content: "Your PDF is still being indexed. Please wait until indexing is complete, then send your question."
        }
      ]);
      return;
    }

    const token =
      localStorage.getItem("aura_token");

    if (!token) {
      handleLogout();
      return;
    }

    const imageToSend = pendingImage;
    const documentToSend = selectedDocumentId;
    const documentNameToSend = selectedDocumentName;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      attachments:
        documentToSend !== null &&
        documentToSend !== undefined &&
        documentNameToSend
          ? [
              {
                document_id: documentToSend,
                filename: documentNameToSend,
                status: "PDF"
              }
            ]
          : []
    };

    setMessages((previous) => [
      ...previous,
      userMessage
    ]);

    setInput("");
    setPendingImage(null);
    setPendingImagePreview("");

    // The selected PDF becomes part of the sent user message.
    // Clear it from the composer immediately after sending.
    setSelectedDocumentId(null);
    setSelectedDocumentName("");

    localStorage.removeItem(
      "drugassist_selected_document_id"
    );

    localStorage.removeItem(
      "drugassist_selected_document_name"
    );

    setLoading(true);

    try {

      if (imageToSend) {

        const data =
          await askImage(
            text,
            imageToSend.file,
            currentConversationId
          );

        const newChatId =
  data.chat_id || data.conversation_id;

if (newChatId) {
  setCurrentConversationId(newChatId);

  setConversations((previous) => {
    const exists = previous.some(
      (chat) =>
        String(chat.id) === String(newChatId)
    );

    if (exists) {
      return previous;
    }

    return [
      {
        id: newChatId,
        title: text.slice(0, 60) || "New chat",
      },
      ...previous,
    ];
  });
}

await loadConversations();

        if (newChatId) {
          setConversations((previous) => {
            const exists = previous.some(
              (chat) =>
                String(chat.id) === String(newChatId)
            );

            if (exists) {
              return previous;
            }

            return [
              {
                id: newChatId,
                title: text.slice(0, 60) || "New chat",
              },
              ...previous,
            ];
          });
        }

        setMessages((previous) => [
          ...previous,
          {
            id:
              `assistant-${Date.now()}`,
            role:
              "assistant",
            content:
              data.answer ||
              "DrugAssist could not generate an image analysis."
          }
        ]);

      } else {

        const data =
          await askAURA(
            text,
            currentConversationId,
            documentToSend
          );

        const newChatId =
  data.chat_id || data.conversation_id;

if (newChatId) {
  setCurrentConversationId(newChatId);

  setConversations((previous) => {
    const exists = previous.some(
      (chat) =>
        String(chat.id) === String(newChatId)
    );

    if (exists) {
      return previous;
    }

    return [
      {
        id: newChatId,
        title: text.slice(0, 60) || "New chat",
      },
      ...previous,
    ];
  });
}

await loadConversations();

        if (newChatId) {
          setConversations((previous) => {
            const exists = previous.some(
              (chat) =>
                String(chat.id) === String(newChatId)
            );

            if (exists) {
              return previous;
            }

            return [
              {
                id: newChatId,
                title: text.slice(0, 60) || "New chat",
              },
              ...previous,
            ];
          });
        }

        setMessages((previous) => [
          ...previous,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content:
              data.answer ||
              "DrugAssist did not return an answer.",
            sources: Array.isArray(data.sources)
              ? data.sources
              : [],
            videos: Array.isArray(data.videos)
              ? data.videos
              : [],
            evidence: Array.isArray(data.evidence)
              ? data.evidence
              : [],
          }
        ]);

      }

    } catch (error) {

      console.error("DRUGASSIST ERROR:", error);

      if (
        error.message?.includes("session has expired")
      ) {
        handleLogout();
        return;
      }

      setMessages((previous) => [
        ...previous,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            error.message ||
            "Sorry, something went wrong."
        }
      ]);

    } finally {
      setLoading(false);
    }

  };


  // ============================================================
  // FILE UPLOAD
  // ============================================================

  const handleFileUpload = async (
    file,
    isImage = false
  ) => {

    if (!file) {
      return;
    }


    // ==========================================================
    // IMAGE - OCR + VISION
    // ==========================================================

    if (isImage) {

      const token =
        localStorage.getItem("aura_token");

      if (!token) {
        handleLogout();
        return;
      }

      if (!file.type.startsWith("image/")) {
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        setMessages((previous) => [
          ...previous,
          {
            id: `image-error-${Date.now()}`,
            role: "assistant",
            content: "Please select an image smaller than 15 MB."
          }
        ]);
        return;
      }

      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview);
      }

      const previewUrl = URL.createObjectURL(file);

      setPendingImage({
        file,
        name: file.name
      });
      setPendingImagePreview(previewUrl);

      return;

    }


    // ==========================================================

    // ==========================================================

    if (
      file.type !==
      "application/pdf"
    ) {

      setMessages(
        (previous) => [
          ...previous,

          {

            id:
              `pdf-error-${Date.now()}`,

            role:
              "assistant",

            content:
              "Please select a PDF file."

          }

        ]
      );


      return;

    }


    // ==========================================================
    // AUTH CHECK
    // ==========================================================

    const token =
      localStorage.getItem(
        "aura_token"
      );


    if (!token) {

      handleLogout();

      return;

    }


    // ==========================================================
    // SHOW UPLOADING
    // ==========================================================

    setMessages(
      (previous) => [
        ...previous,

        {

          id:
            `upload-${Date.now()}`,

          role:
            "user",

          content:
            `Uploading ${file.name}...`

        }

      ]
    );


    setLoading(true);


    try {

      const data =
        await uploadPDF(file);


      console.log(
        "PDF RESPONSE:",
        data
      );


      if (
        data.document_id !== undefined &&
        data.document_id !== null
      ) {
        setSelectedDocumentId(
          data.document_id
        );

        setSelectedDocumentName(
          data.filename || file.name
        );

        localStorage.setItem(
          "drugassist_selected_document_id",
          String(data.document_id)
        );

        localStorage.setItem(
          "drugassist_selected_document_name",
          data.filename || file.name
        );
      }

      await loadDocuments();

      const uploadedDocumentId = data.document_id;

      if (uploadedDocumentId !== undefined && uploadedDocumentId !== null) {
        setPdfIndexing(true);

        setMessages((previous) => [
          ...previous,
          {
            id: `pdf-indexing-${Date.now()}`,
            role: "assistant",
            content: `${file.name} uploaded successfully. Preparing the document for questions...`
          }
        ]);

        let ready = false;

        for (let attempt = 0; attempt < 120; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));

          const statusResponse = await fetch(
            `${API_BASE_URL}/documents/${uploadedDocumentId}/index-status`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );

          if (!statusResponse.ok) {
            throw new Error("Unable to check PDF indexing status.");
          }

          const status = await statusResponse.json();
          console.log("PDF INDEX STATUS:", status);

          if (status.status === "ready") {
            ready = true;
            break;
          }

          if (status.status === "failed") {
            throw new Error("PDF indexing failed. Please upload the document again.");
          }
        }

        if (!ready) {
          throw new Error("PDF indexing is taking longer than expected. Please wait and try again.");
        }

        setMessages((previous) => [
          ...previous,
          {
            id: `pdf-ready-${Date.now()}`,
            role: "assistant",
            content: `${file.name} is ready and selected. You can now ask questions.`
          }
        ]);
      }


    } catch (error) {

      console.error(
        "PDF ERROR:",
        error
      );


      if (
        error.message?.includes(
          "session has expired"
        )
      ) {

        handleLogout();

        return;

      }


      setMessages(
        (previous) => [
          ...previous,

          {

            id:
              `pdf-error-${Date.now()}`,

            role:
              "assistant",

            content:
              `PDF upload failed.\n\n${error.message}`

          }

        ]
      );


    } finally {

      setPdfIndexing(false);
      setLoading(false);

    }

  };


  // ============================================================
  // REMOVE PENDING IMAGE
  // ============================================================

  const removePendingImage = () => {
    if (pendingImagePreview) {
      URL.revokeObjectURL(pendingImagePreview);
    }

    setPendingImage(null);
    setPendingImagePreview("");
  };


  // ============================================================
  // VOICE - GET AUTH TOKEN
  // ============================================================

  const getVoiceToken = () => {

    const token =
      localStorage.getItem(
        "aura_token"
      );


    if (!token) {

      handleLogout();

      throw new Error(
        "Your session has expired. Please log in again."
      );

    }


    return token;

  };


  // ============================================================
  // VOICE - TEXT TO SPEECH
  // ============================================================

  const speakAnswer = async (
    answer
  ) => {

    if (!answer) {
      return;
    }


    const token =
      getVoiceToken();


    try {

      setVoiceStatus(
        "Generating voice response..."
      );


      const response =
        await fetch(
          `${API_BASE_URL}/speak`,
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`

            },

            body:
              JSON.stringify({
                text: answer
              })

          }
        );


      if (!response.ok) {

        const errorText =
          await response.text();

        throw new Error(
          errorText ||
          `Voice response failed (${response.status})`
        );

      }


      const contentType =
        response.headers.get(
          "content-type"
        );


      if (
        !contentType ||
        !contentType.includes(
          "audio"
        )
      ) {

        throw new Error(
          "DrugAssist returned an invalid audio response."
        );

      }


      const audioBlob =
        await response.blob();


      if (
        !audioBlob ||
        audioBlob.size === 0
      ) {

        throw new Error(
          "DrugAssist returned an empty audio response."
        );

      }


      const audioUrl =
        URL.createObjectURL(
          audioBlob
        );


      const audio =
        new Audio(audioUrl);


      audio.onended = () => {

        URL.revokeObjectURL(
          audioUrl
        );

        setVoiceStatus("");

      };


      audio.onerror = () => {

        URL.revokeObjectURL(
          audioUrl
        );

        setVoiceStatus("");

        console.error(
          "Audio playback failed."
        );

      };


      await audio.play();


      setVoiceStatus(
        "Playing DrugAssist's response..."
      );


    } catch (error) {

      console.error(
        "TEXT TO SPEECH ERROR:",
        error
      );


      setVoiceStatus(
        `Voice playback failed: ${error.message}`
      );

    }

  };


  // ============================================================
  // VOICE - SEND RECORDED AUDIO TO BACKEND
  // ============================================================

  const processVoiceRecording = async (
    audioBlob
  ) => {

    if (
      !audioBlob ||
      audioBlob.size === 0
    ) {

      throw new Error(
        "No audio was recorded."
      );

    }


    const token =
      getVoiceToken();


    setLoading(true);


    setVoiceStatus(
      "Understanding your voice..."
    );


    try {

      const data =
        await voiceAsk(
          audioBlob,
          currentConversationId
        );

      if (data.conversation_id) {
        setCurrentConversationId(
          data.conversation_id
        );
      }

      await loadConversations();


      const transcript =
        data.transcript?.trim();


      const answer =
        data.answer?.trim();


      if (!transcript) {

        throw new Error(
          "DrugAssist could not understand the recording."
        );

      }


      // ----------------------------------------------------------
      // ADD TRANSCRIPT TO CHAT
      // ----------------------------------------------------------

      setMessages(
        (previous) => [

          ...previous,

          {

            id:
              `voice-user-${Date.now()}`,

            role:
              "user",

            content:
              transcript

          },

          {

            id:
              `voice-assistant-${Date.now() + 1}`,

            role:
              "assistant",

            content:
              answer ||
              "DrugAssist did not return an answer."

          }

        ]
      );


      setVoiceStatus(
        "Voice response ready."
      );


      // ----------------------------------------------------------
      // SPEAK ANSWER
      // ----------------------------------------------------------

      if (answer) {

        await speakAnswer(
          answer
        );

      }


    } finally {

      setLoading(false);

    }

  };


  // ============================================================
  // VOICE - START RECORDING
  // ============================================================

  const startRecording = async () => {

    if (
      isRecording ||
      loading
    ) {
      return;
    }


    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {

      setVoiceStatus(
        "Your browser does not support microphone recording."
      );

      return;

    }


    try {

      getVoiceToken();


      setVoiceStatus(
        "Requesting microphone access..."
      );


      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            audio: true
          });


      streamRef.current =
        stream;


      audioChunksRef.current =
        [];


      let mimeType =
        "audio/webm";


      if (
        MediaRecorder.isTypeSupported(
          "audio/webm;codecs=opus"
        )
      ) {

        mimeType =
          "audio/webm;codecs=opus";

      } else if (
        MediaRecorder.isTypeSupported(
          "audio/webm"
        )
      ) {

        mimeType =
          "audio/webm";

      } else if (
        MediaRecorder.isTypeSupported(
          "audio/ogg;codecs=opus"
        )
      ) {

        mimeType =
          "audio/ogg;codecs=opus";

      } else {

        mimeType =
          "";

      }


      const recorder =
        mimeType
          ? new MediaRecorder(
              stream,
              {
                mimeType
              }
            )
          : new MediaRecorder(
              stream
            );


      mediaRecorderRef.current =
        recorder;


      recorder.ondataavailable =
        (event) => {

          if (
            event.data &&
            event.data.size > 0
          ) {

            audioChunksRef.current.push(
              event.data
            );

          }

        };


      recorder.onerror =
        (event) => {

          console.error(
            "MEDIA RECORDER ERROR:",
            event
          );

          setVoiceStatus(
            "Microphone recording failed."
          );

        };


      recorder.onstop =
        async () => {

          try {

            const actualMimeType =
              recorder.mimeType ||
              mimeType ||
              "audio/webm";


            const audioBlob =
              new Blob(
                audioChunksRef.current,
                {
                  type:
                    actualMimeType
                }
              );


            audioChunksRef.current =
              [];


            if (streamRef.current) {

              streamRef.current
                .getTracks()
                .forEach(
                  (track) =>
                    track.stop()
                );

              streamRef.current =
                null;

            }


            mediaRecorderRef.current =
              null;


            await processVoiceRecording(
              audioBlob
            );


          } catch (error) {

            console.error(
              "VOICE PROCESSING ERROR:",
              error
            );


            setVoiceStatus(
              `Voice input failed: ${error.message}`
            );


            setLoading(false);

          }

        };


      recorder.start();


      setIsRecording(true);

      setVoiceStatus(
        "Listening... click Voice again to stop."
      );


    } catch (error) {

      console.error(
        "MICROPHONE ERROR:",
        error
      );


      if (
        error.name ===
        "NotAllowedError"
      ) {

        setVoiceStatus(
          "Microphone permission was denied. Please allow microphone access in your browser."
        );

      } else if (
        error.name ===
        "NotFoundError"
      ) {

        setVoiceStatus(
          "No microphone was found."
        );

      } else {

        setVoiceStatus(
          `Unable to start microphone: ${error.message}`
        );

      }

    }

  };


  // ============================================================
  // VOICE - STOP RECORDING
  // ============================================================

  const stopRecording = () => {

    const recorder =
      mediaRecorderRef.current;


    if (!recorder) {
      return;
    }


    if (
      recorder.state ===
      "recording"
    ) {

      setIsRecording(false);

      setVoiceStatus(
        "Processing your voice..."
      );


      recorder.stop();

    }

  };


  // ============================================================
  // VOICE BUTTON
  // ============================================================

  const handleVoice = () => {

    if (loading) {
      return;
    }


    if (isRecording) {

      stopRecording();

    } else {

      startRecording();

    }

  };


  // ============================================================
  // LOGIN PAGE
  // ============================================================

  if (!isAuthenticated) {

    return (
      <AuthPage
        onLogin={
          handleLogin
        }
      />
    );

  }


  // ============================================================
  // MAIN APPLICATION
  // ============================================================

  return (

    <div className={`app-shell ${isDarkMode ? "dark-mode" : ""}`}>

      <style>{`
        .chat-area p {
          margin-top: 0;
          margin-bottom: 12px;
        }

        .chat-area ul,
        .chat-area ol {
          margin-top: 8px;
          margin-bottom: 14px;
          padding-left: 24px;
        }

        .chat-area li {
          margin-bottom: 6px;
        }

        .chat-area h1,
        .chat-area h2,
        .chat-area h3,
        .chat-area h4 {
          margin-top: 18px;
          margin-bottom: 8px;
          line-height: 1.3;
        }

        .chat-area h1:first-child,
        .chat-area h2:first-child,
        .chat-area h3:first-child,
        .chat-area h4:first-child {
          margin-top: 0;
        }

        .chat-area > * {
          max-width: 100%;
        }

        .aura-selected-document {
          position: absolute;
          left: 50%;
          bottom: 156px;
          transform: translateX(-50%);
          width: min(1050px, calc(100% - 120px));
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 12px;
          border: 1px solid #dedee2;
          border-radius: 10px;
          background: #f7f7f8;
          color: #555963;
          font-size: 13px;
          z-index: 5;
        }

        .aura-selected-document-dot {
          color: #171717;
          font-size: 8px;
          flex: 0 0 auto;
        }

        .aura-selected-document-text {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .aura-selected-document-text strong {
          color: #202123;
          font-weight: 600;
        }

        .aura-clear-document {
          margin-left: auto;
          flex: 0 0 auto;
          width: 24px;
          height: 24px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: #777b84;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
        }

        .aura-clear-document:hover {
          background: #e9e9eb;
          color: #202123;
        }

        /*
          CHAT SCROLL FIX
          ----------------------------------------------------------
          .chat-area is the only scrollable element. ChatWindow's
          original height/overflow rules are overridden here so the
          message list grows naturally and the outer chat area can
          always scroll to the newest message.
        */
        .chat-area .chat-window {
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          display: block !important;
        }

        .chat-area .chat-window .messages {
          width: 100% !important;
          max-width: 980px !important;
          min-height: 0 !important;
          height: auto !important;
          margin: 0 auto !important;
          padding: 28px 24px 40px !important;
          box-sizing: border-box !important;
          overflow: visible !important;
        }

        /*
          CLEAN NEW-CHAT SCREEN
          ----------------------------------------------------------
          No Web Search / YouTube / PDF / SQL / Image cards.
          The capabilities remain available through the composer
          and backend; they are simply not displayed as cards.
        */
        .drugassist-empty-state {
          width: 100%;
          min-height: 100%;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px 120px;
        }

        .drugassist-empty-content {
          width: min(720px, 100%);
          text-align: center;
          margin-top: -80px;
        }

        .drugassist-empty-title {
          margin: 0 0 10px;
          font-size: clamp(30px, 4vw, 42px);
          line-height: 1.15;
          font-weight: 700;
          letter-spacing: -0.8px;
          color: #171717;
        }

        .drugassist-empty-subtitle {
          margin: 0;
          font-size: 16px;
          line-height: 1.6;
          color: #777b84;
        }


        /* Final fixes for remaining light elements in dark mode */
        .app-shell.dark-mode .chat-count {
          background: #2a2a2a !important;
          color: #ffffff !important;
          border: 1px solid #444444 !important;
        }

        .app-shell.dark-mode .chat-item-icon {
          background: #252525 !important;
          color: #eeeeee !important;
          stroke: #eeeeee !important;
          border: 1px solid #444444 !important;
          border-radius: 5px !important;
        }

        .app-shell.dark-mode .chat-item {
          background: #171717 !important;
          color: #eeeeee !important;
        }

        .app-shell.dark-mode .chat-item-active {
          background: #292929 !important;
          color: #ffffff !important;
        }

        .app-shell.dark-mode .chat-title {
          color: #eeeeee !important;
        }

        .app-shell.dark-mode .chat-item-active .chat-title {
          color: #ffffff !important;
        }

        .app-shell.dark-mode .chat-delete {
          color: #aaaaaa !important;
        }

        .app-shell.dark-mode .chat-delete svg {
          stroke: #aaaaaa !important;
        }

        .app-shell.dark-mode .sidebar-user {
          background: #181818 !important;
          color: #eeeeee !important;
          border-color: #303030 !important;
        }

        .app-shell.dark-mode .user-avatar,
        .app-shell.dark-mode .user-info,
        .app-shell.dark-mode .user-name,
        .app-shell.dark-mode .user-email {
          color: #eeeeee !important;
        }

        .app-shell.dark-mode .logout-button {
          background: #252525 !important;
          color: #eeeeee !important;
          border-color: #3b3b3b !important;
        }

        .app-shell.dark-mode .logout-button svg {
          stroke: #eeeeee !important;
        }

        @media (max-width: 900px) {
          .chat-area {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
        }

        /* ======================================================
           DRUGASSIST DARK MODE
           Applied from App.jsx without changing the existing UI.
        ====================================================== */

        .app-shell.dark-mode {
          background: #111111 !important;
          color: #f5f5f5 !important;
          color-scheme: dark;
        }

        .app-shell.dark-mode .main-shell,
        .app-shell.dark-mode .topbar,
        .app-shell.dark-mode .chat-area,
        .app-shell.dark-mode .welcome-screen {
          background: #111111 !important;
          color: #f5f5f5 !important;
        }

        .app-shell.dark-mode .theme-button {
          background: #242424 !important;
          color: #f5f5f5 !important;
          border-color: #3a3a3a !important;
        }

        .app-shell.dark-mode .drugassist-empty-title,
        .app-shell.dark-mode .welcome-screen h2 {
          color: #f5f5f5 !important;
        }

        .app-shell.dark-mode .drugassist-empty-subtitle,
        .app-shell.dark-mode .welcome-screen p {
          color: #a9a9a9 !important;
        }

        /* Sidebar */
        .app-shell.dark-mode .sidebar,
        .app-shell.dark-mode .sidebar-header,
        .app-shell.dark-mode .sidebar-action-area,
        .app-shell.dark-mode .sidebar-content,
        .app-shell.dark-mode .sidebar-footer {
          background: #181818 !important;
          color: #f5f5f5 !important;
          border-color: #303030 !important;
        }

        .app-shell.dark-mode .brand-name,
        .app-shell.dark-mode .brand-subtitle,
        .app-shell.dark-mode .sidebar,
        .app-shell.dark-mode .sidebar label {
          color: #f5f5f5 !important;
        }

        .app-shell.dark-mode .brand-subtitle {
          color: #9d9d9d !important;
        }

        .app-shell.dark-mode .new-chat-button,
        .app-shell.dark-mode .sidebar-close,
        .app-shell.dark-mode .library-button,
        .app-shell.dark-mode .logout-button {
          background: #222222 !important;
          color: #f5f5f5 !important;
          border-color: #363636 !important;
        }

        .app-shell.dark-mode .search-input,
        .app-shell.dark-mode input,
        .app-shell.dark-mode textarea {
          background: #1e1e1e !important;
          color: #f5f5f5 !important;
          border-color: #383838 !important;
        }

        .app-shell.dark-mode input::placeholder,
        .app-shell.dark-mode textarea::placeholder {
          color: #8e8e8e !important;
        }

        .app-shell.dark-mode .chat-item,
        .app-shell.dark-mode .conversation-item {
          color: #e8e8e8 !important;
          border-color: #303030 !important;
        }

        .app-shell.dark-mode .chat-item:hover,
        .app-shell.dark-mode .conversation-item:hover {
          background: #242424 !important;
        }

        /* Recent count badge */
        .app-shell.dark-mode .chat-count {
          background: #2a2a2a !important;
          color: #f5f5f5 !important;
          border: 1px solid #3d3d3d !important;
        }

        /* Recent chat icon */
        .app-shell.dark-mode .chat-item-icon {
          background: #2a2a2a !important;
          color: #eeeeee !important;
          stroke: #eeeeee !important;
          border-color: #4a4a4a !important;
        }

        .app-shell.dark-mode .chat-item-icon svg {
          color: #eeeeee !important;
          stroke: #eeeeee !important;
        }

        .app-shell.dark-mode .chat-item .chat-title {
          color: #eeeeee !important;
        }

        .app-shell.dark-mode .chat-item .chat-delete {
          color: #bdbdbd !important;
        }

        .app-shell.dark-mode .chat-item .chat-delete svg {
          color: #bdbdbd !important;
          stroke: #bdbdbd !important;
        }

        /* Navigation icons and text */
        .app-shell.dark-mode .sidebar-navigation,
        .app-shell.dark-mode .sidebar-navigation button,
        .app-shell.dark-mode .sidebar-navigation svg {
          color: #eeeeee !important;
          stroke: #eeeeee !important;
        }

        /* Chat messages */
        .app-shell.dark-mode .message-body,
        .app-shell.dark-mode .message-role,
        .app-shell.dark-mode .answer-content,
        .app-shell.dark-mode .answer-content p,
        .app-shell.dark-mode .answer-content li,
        .app-shell.dark-mode .answer-content h2,
        .app-shell.dark-mode .answer-content h3,
        .app-shell.dark-mode .answer-content h4 {
          color: #eeeeee !important;
        }

        .app-shell.dark-mode .message-row-user {
          color: #ffffff !important;
        }

        .app-shell.dark-mode .message-avatar {
          background: #242424 !important;
          color: #f5f5f5 !important;
          border-color: #383838 !important;
        }

        .app-shell.dark-mode .processed-attachment,
        .app-shell.dark-mode .aura-selected-document {
          background: #1d1d1d !important;
          color: #eeeeee !important;
          border-color: #363636 !important;
        }

        /* Composer */
        .app-shell.dark-mode .composer-box {
          background: #1c1c1c !important;
          border-color: #383838 !important;
          box-shadow: 0 8px 28px rgba(0,0,0,0.35) !important;
        }

        .app-shell.dark-mode .composer-attachment-preview {
          background: #292929 !important;
          color: #dddddd !important;
        }

        .app-shell.dark-mode .composer-attachment-info strong {
          color: #eeeeee !important;
        }

        .app-shell.dark-mode .composer-attachment-info span {
          color: #9d9d9d !important;
        }

        .app-shell.dark-mode .composer-icon-button,
        .app-shell.dark-mode .composer-send-button,
        .app-shell.dark-mode .composer-remove {
          color: #eeeeee !important;
        }

        /* Remaining light surfaces */
        .app-shell.dark-mode .sidebar-user {
          background: #181818 !important;
          color: #f5f5f5 !important;
          border-color: #303030 !important;
        }

        .app-shell.dark-mode .sidebar-user *,
        .app-shell.dark-mode .user-info,
        .app-shell.dark-mode .user-name,
        .app-shell.dark-mode .user-email,
        .app-shell.dark-mode .user-avatar {
          color: #f0f0f0 !important;
        }

        .app-shell.dark-mode .user-email {
          color: #9d9d9d !important;
        }

        .app-shell.dark-mode .user-avatar {
          background: #242424 !important;
          border-color: #383838 !important;
        }

        .app-shell.dark-mode .logout-button {
          background: #242424 !important;
          color: #f5f5f5 !important;
          border-color: #3a3a3a !important;
        }

        .app-shell.dark-mode .sidebar-library-card {
          background: #181818 !important;
          color: #f0f0f0 !important;
          border-color: #363636 !important;
        }

        .app-shell.dark-mode .sidebar-library-card * {
          color: #f0f0f0 !important;
        }

        .app-shell.dark-mode .library-card-text {
          color: #a8a8a8 !important;
        }

        .app-shell.dark-mode .library-card-button {
          background: transparent !important;
          color: #f0f0f0 !important;
        }

        .app-shell.dark-mode .composer-send-button {
          background: #2b2b2b !important;
          color: #f0f0f0 !important;
          border-color: #404040 !important;
        }

        .app-shell.dark-mode button {
          color: inherit;
        }

        /* Remaining sidebar surfaces/elements */
        .app-shell.dark-mode .recent-section,
        .app-shell.dark-mode .section-heading,
        .app-shell.dark-mode .chat-list,
        .app-shell.dark-mode .empty-chats {
          color: #eeeeee !important;
        }

        .app-shell.dark-mode .section-heading span {
          color: #eeeeee !important;
        }

        .app-shell.dark-mode .empty-chats svg {
          color: #bdbdbd !important;
          stroke: #bdbdbd !important;
        }

        /* Library */
        .app-shell.dark-mode [class*="library"],
        .app-shell.dark-mode [class*="document-card"],
        .app-shell.dark-mode [class*="document-item"] {
          color: #eeeeee !important;
          border-color: #363636 !important;
        }

        .app-shell.dark-mode [class*="library"] {
          background-color: #111111 !important;
        }

        .app-shell.dark-mode [class*="document-card"],
        .app-shell.dark-mode [class*="document-item"] {
          background-color: #1c1c1c !important;
        }
      `}</style>


      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <Sidebar
        user={user}
        chats={conversations}
        activeChatId={currentConversationId}
        onNewChat={handleNewChat}
        onSelectChat={handleOpenConversation}
        onDeleteChat={handleDeleteChat}
        onLibrary={handleOpenLibrary}
        onLogout={handleLogout}

        /* Keep these props for compatibility with the existing
           document-selection implementation. */
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleOpenConversation}
        uploadedFiles={uploadedFiles}
        uploadedDocuments={uploadedDocuments}
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={handleSelectDocument}
        onDeleteDocument={handleDeleteDocument}
        onDeleteAllChats={handleDeleteAllConversations}
      />


      {/* ======================================================
          MAIN AREA
      ====================================================== */}

      <section
        className="main-shell"
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100vh",
          overflow: "hidden",
          position: "relative"
        }}
      >


        {/* ====================================================
            TOP BAR
        ==================================================== */}

        <header className="topbar">

          <div className="topbar-spacer" />

          <div className="topbar-actions">

            <button
              type="button"
              className="theme-button"
              title={
                isDarkMode
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              aria-label={
                isDarkMode
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              onClick={() =>
                setIsDarkMode(
                  (previous) => !previous
                )
              }
            >
              {isDarkMode ? "☀" : "◐"}
            </button>

          </div>

        </header>


        {/* ====================================================
            CONTENT
        ==================================================== */}

        {currentView === "library" ? (
          <Library
            apiUrl={API_BASE_URL}
            token={localStorage.getItem("aura_token")}
            onBack={handleOpenChat}
          />
        ) : (
          <div
            ref={chatAreaRef}
            className="chat-area"
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              paddingBottom: "240px",
              scrollBehavior: "smooth"
            }}
          >

            {messages.length === 0 && (
              <div className="welcome-screen">
                <div className="welcome-logo">
                  <span
                    style={{
                      fontSize: "27px",
                      lineHeight: 1
                    }}
                  >
                    💊
                  </span>
                </div>

                <h2>
                  How can I help you?
                </h2>

                <p>
                  Ask about medicines, dosage, side effects, precautions,
                  interactions, and information from your uploaded documents.
                </p>
              </div>
            )}

            {messages.length > 0 && (
              <ChatWindow
                messages={messages}
                loading={loading}
                selectedDocumentId={selectedDocumentId}
                selectedDocumentName={selectedDocumentName}
              />
            )}

            <div
              ref={chatEndRef}
              aria-hidden="true"
              style={{
                height: "1px",
                width: "100%"
              }}
            />

          </div>
        )}


        {/* ====================================================
            VOICE STATUS
        ==================================================== */}

        {currentView === "chat" && voiceStatus && (

          <div
            className={
              isRecording
                ? "voice-status recording"
                : "voice-status"
            }
          >

            <span>

              {isRecording
                ? "●"
                : "◉"}

            </span>

            {voiceStatus}

          </div>

        )}


        {/* ====================================================
            SELECTED PDF
        ==================================================== */}

        {/* ====================================================
            CHAT INPUT
        ==================================================== */}

        {currentView === "chat" && (
          <ChatInput

            value={
            input
          }

          onChange={
            setInput
          }

          onSend={
            handleSend
          }

          onVoice={
            handleVoice
          }

          onFileUpload={
            handleFileUpload
          }

          pendingImage={
            pendingImage
          }

          pendingImagePreview={
            pendingImagePreview
          }

          onRemoveImage={
            removePendingImage
          }

          selectedDocumentName={
            selectedDocumentId !== null
              ? selectedDocumentName
              : ""
          }

          onClearSelectedDocument={() => {
            setSelectedDocumentId(null);
            setSelectedDocumentName("");

            localStorage.removeItem(
              "drugassist_selected_document_id"
            );

            localStorage.removeItem(
              "drugassist_selected_document_name"
            );
          }}

            loading={
              loading
            }

          />
        )}


      </section>

    </div>

  );

}


export default App;