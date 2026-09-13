# 💊 DrugAssist — Evidence-First Drug Intelligence

> A secure, evidence-grounded Retrieval-Augmented Generation (RAG) assistant for answering drug-information questions from trusted medical documents.

DrugAssist is a full-stack AI-powered drug information assistant that combines **Retrieval-Augmented Generation (RAG)**, **Large Language Models (LLMs)**, **semantic vector search**, **trusted-document verification**, **authentication**, and **document-specific retrieval** to provide reliable, evidence-grounded drug information.

The system is designed to answer questions using trusted prescribing information while minimizing hallucinations, preventing unsupported medical claims, and maintaining a clear boundary between drug information and individualized medical advice.

---

## 🌐 Live Application

### Frontend
https://drug-assistant-frontend.onrender.com

### Backend API
https://drug-assistant-backend.onrender.com

### API Documentation
https://drug-assistant-backend.onrender.com/docs

> The frontend communicates with the FastAPI backend through REST APIs. The backend manages authentication, documents, chat history, RAG retrieval, AI generation, and database operations.

---

# 📋 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Objectives](#-objectives)
- [Solution](#-solution)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Application Workflow](#-application-workflow)
- [RAG Architecture](#-rag-architecture)
- [PDF Processing Pipeline](#-pdf-processing-pipeline)
- [Trusted Document Verification](#-trusted-document-verification)
- [Security Architecture](#-security-architecture)
- [Medical Safety](#-medical-safety)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Backend Architecture](#-backend-architecture)
- [Frontend Architecture](#-frontend-architecture)
- [Database Architecture](#-database-architecture)
- [Vector Database](#-vector-database)
- [LLM Architecture](#-llm-architecture)
- [Authentication](#-authentication)
- [PDF and Document Management](#-pdf-and-document-management)
- [Image Analysis](#-image-analysis)
- [API Endpoints](#-api-endpoints)
- [Environment Variables](#-environment-variables)
- [Local Installation](#-local-installation)
- [Running the Application](#-running-the-application)
- [Cloud Deployment](#-cloud-deployment)
- [Testing](#-testing)
- [Example Questions](#-example-questions)
- [Security Testing](#-security-testing)
- [Limitations](#-limitations)
- [Future Enhancements](#-future-enhancements)
- [Team Contributions](#-team-contributions)
- [Conclusion](#-conclusion)

---

# 🧠 Overview

DrugAssist is an **evidence-first Drug Information RAG Assistant**.

The application allows authenticated users to upload trusted medical documents and interact with them through a conversational AI interface.

Instead of relying entirely on the language model's internal knowledge, DrugAssist follows a Retrieval-Augmented Generation architecture:

```text
User Question
      ↓
Question Processing
      ↓
Semantic Retrieval
      ↓
Relevant Medical Evidence
      ↓
LLM
      ↓
Grounded Answer
      ↓
Sources / Citations
