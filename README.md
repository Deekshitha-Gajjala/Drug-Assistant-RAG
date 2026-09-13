# 💊 DRUGASSIST | Evidence-First Drug Information RAG Assistant

> **A full-stack AI-powered drug information assistant that combines Retrieval-Augmented Generation, trusted medical documents, semantic search, evidence-grounded responses, secure authentication, persistent chat history, and document-specific retrieval.**

DrugAssist is a production-oriented medical document intelligence platform designed to help users interact with trusted drug-information documents through natural-language conversations.

Instead of allowing a Large Language Model to answer medical questions purely from its pretrained knowledge, DrugAssist follows an **evidence-first Retrieval-Augmented Generation (RAG) architecture**.

The system retrieves relevant information from an approved medical document, constructs a controlled evidence context, and then uses an LLM to generate a readable response.

The core philosophy is:

> **Retrieve first. Ground the answer in evidence. Never guess.**

---

![Status](https://img.shields.io/badge/status-production--ready-success?style=for-the-badge)
![Architecture](https://img.shields.io/badge/architecture-evidence--first%20RAG-blue?style=for-the-badge)
![Deployment](https://img.shields.io/badge/deployment-Render-purple?style=for-the-badge)

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-Backend-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Pinecone](https://img.shields.io/badge/Pinecone-Vector%20DB-000000?style=for-the-badge)
![FastEmbed](https://img.shields.io/badge/FastEmbed-Embeddings-orange?style=for-the-badge)
![Groq](https://img.shields.io/badge/Groq-LLM-f55036?style=for-the-badge)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Authentication-black?style=for-the-badge)

---

# 🌐 Live Demo

## Frontend

https://drug-assistant-frontend.onrender.com

## Backend API

https://drug-assistant-backend.onrender.com

## API Documentation

https://drug-assistant-backend.onrender.com/docs

## OpenAPI Specification

https://drug-assistant-backend.onrender.com/openapi.json

> Replace the frontend URL above with the final Render Static Site URL if your deployed frontend uses a different Render-generated address.

---

# 📷 Screenshots

Add the final screenshots of the application here.

## 🔐 Login / Registration

```text
<img width="1915" height="875" alt="image" src="https://github.com/user-attachments/assets/e05086fb-47f7-4077-9117-3a078bb10be2" />

<img width="1919" height="877" alt="image" src="https://github.com/user-attachments/assets/641a63ef-4eb5-45ce-a00c-4a3275a2f26a" />

User Question
      ↓
Query Processing
      ↓
Semantic Retrieval
      ↓
Relevant Evidence
      ↓
Controlled Context
      ↓
Groq LLM
      ↓
Evidence-Grounded Answer

Uploaded PDF
     ↓
SHA-256 Hash
     ↓
Trusted Document Registry
     ↓
Fingerprint Match
     ↓
Approved for Medical RAG

Complete RAG Architecture
                         USER
                           │
                           ▼
                 ┌───────────────────┐
                 │   React + Vite    │
                 │    Frontend       │
                 └─────────┬─────────┘
                           │
                         HTTPS
                           │
                           ▼
                 ┌───────────────────┐
                 │      FastAPI      │
                 │      Backend      │
                 └─────────┬─────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌───────────┐ ┌────────────┐
        │  SQLite  │ │ Documents │ │ RAG Engine │
        └──────────┘ └───────────┘ └──────┬─────┘
                                           │
                                           ▼
                                  ┌────────────────┐
                                  │    FastEmbed   │
                                  └───────┬────────┘
                                          │
                                          ▼
                                  ┌────────────────┐
                                  │    Pinecone    │
                                  │ Vector Search  │
                                  └───────┬────────┘
                                          │
                                          ▼
                                  ┌────────────────┐
                                  │    Evidence    │
                                  └───────┬────────┘
                                          │
                                          ▼
                                  ┌────────────────┐
                                  │      Groq      │
                                  │      LLM       │
                                  └───────┬────────┘
                                          │
                                          ▼
                                  ┌────────────────┐
                                  │ Grounded Answer │
                                  └───────┬────────┘
                                          │
                                          ▼
                                     React UI

Complete Document-to-Answer Flow

                         MEDICAL PDF
                              │
                              ▼
                    ┌─────────────────┐
                    │   PDF Upload    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ File Validation  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Trusted Source  │
                    │   Verification  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   SHA-256 Hash  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Text Extraction │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Chunking    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    FastEmbed    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Pinecone     │
                    └────────┬────────┘
                             │
                             │
                       INDEX READY
                             │
                             │
                             ▼
                         USER QUERY
                             │
                             ▼
                    ┌─────────────────┐
                    │ Query Processing│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Query Expansion │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Query Embedding │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Pinecone Search │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Document Filter │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Relevant        │
                    │ Evidence        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Context Builder │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Groq LLM     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Grounded Answer │
                    └────────┬────────┘
                             │
                    ┌────────┴─────────┐
                    ▼                  ▼
               Sources            Chat History

Frontend Architecture

App
│
├── Sidebar
│   ├── New Chat
│   ├── Recent Chats
│   ├── Library
│   └── Account Controls
│
├── ChatWindow
│   ├── User Messages
│   ├── Assistant Messages
│   ├── Sources
│   ├── Evidence
│   └── Feedback Controls
│
├── ChatInput
│   ├── Text Input
│   ├── PDF Attachment
│   └── Image Attachment
│
└── FeatureCards
