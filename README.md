# 💊 DrugAssist — Evidence-First Drug Information RAG Assistant

<p align="center">
  <strong>An AI-powered, evidence-grounded drug information assistant built with Retrieval-Augmented Generation (RAG)</strong>
</p>

<p align="center">
  React • FastAPI • Pinecone • FastEmbed • Groq • SQLite • JWT • PDF RAG • Image Analysis
</p>

---

# 📌 Table of Contents

1. [Project Overview](#-project-overview)
2. [Problem Statement](#-problem-statement)
3. [Motivation](#-motivation)
4. [Objectives](#-objectives)
5. [Proposed Solution](#-proposed-solution)
6. [Key Features](#-key-features)
7. [System Architecture](#-system-architecture)
8. [High-Level Architecture](#-high-level-architecture)
9. [Complete System Workflow](#-complete-system-workflow)
10. [PDF Upload Workflow](#-pdf-upload-workflow)
11. [RAG Architecture](#-rag-architecture)
12. [RAG Pipeline](#-rag-pipeline)
13. [Document Processing](#-document-processing)
14. [Text Extraction](#-text-extraction)
15. [Document Chunking](#-document-chunking)
16. [Embedding Generation](#-embedding-generation)
17. [Pinecone Vector Database](#-pinecone-vector-database)
18. [Document-Specific Retrieval](#-document-specific-retrieval)
19. [Query Processing](#-query-processing)
20. [Query Expansion](#-query-expansion)
21. [Evidence Retrieval](#-evidence-retrieval)
22. [LLM Answer Generation](#-llm-answer-generation)
23. [Source Citations](#-source-citations)
24. [Confidence and Grounding](#-confidence-and-grounding)
25. [Medical Safety](#-medical-safety)
26. [Clinical Decision Boundary](#-clinical-decision-boundary)
27. [Prompt Injection Protection](#-prompt-injection-protection)
28. [Trusted Document Verification](#-trusted-document-verification)
29. [SHA-256 Verification](#-sha-256-verification)
30. [Authentication](#-authentication)
31. [Authorization](#-authorization)
32. [Chat History](#-chat-history)
33. [Short-Term Conversation Context](#-short-term-conversation-context)
34. [Long-Term Memory](#-long-term-memory)
35. [PDF Library](#-pdf-library)
36. [PDF Viewer](#-pdf-viewer)
37. [Image Upload and Analysis](#-image-upload-and-analysis)
38. [Feedback System](#-feedback-system)
39. [Frontend Architecture](#-frontend-architecture)
40. [Backend Architecture](#-backend-architecture)
41. [Database Architecture](#-database-architecture)
42. [Vector Database Architecture](#-vector-database-architecture)
43. [LLM Architecture](#-llm-architecture)
44. [Technology Stack](#-technology-stack)
45. [Project Structure](#-project-structure)
46. [Backend Modules](#-backend-modules)
47. [Frontend Modules](#-frontend-modules)
48. [API Architecture](#-api-architecture)
49. [API Endpoints](#-api-endpoints)
50. [Environment Variables](#-environment-variables)
51. [Local Installation](#-local-installation)
52. [Backend Setup](#-backend-setup)
53. [Frontend Setup](#-frontend-setup)
54. [Running the Application](#-running-the-application)
55. [Cloud Deployment](#-cloud-deployment)
56. [Render Backend Deployment](#-render-backend-deployment)
57. [Render Frontend Deployment](#-render-frontend-deployment)
58. [CORS Configuration](#-cors-configuration)
59. [Security Architecture](#-security-architecture)
60. [Security Principles](#-security-principles)
61. [Testing Strategy](#-testing-strategy)
62. [Functional Testing](#-functional-testing)
63. [RAG Testing](#-rag-testing)
64. [Document Isolation Testing](#-document-isolation-testing)
65. [Prompt Injection Testing](#-prompt-injection-testing)
66. [Medical Safety Testing](#-medical-safety-testing)
67. [Image Testing](#-image-testing)
68. [Performance](#-performance)
69. [Troubleshooting](#-troubleshooting)
70. [Current Limitations](#-current-limitations)
71. [Future Enhancements](#-future-enhancements)
72. [Production Architecture](#-production-architecture)
73. [Use Cases](#-use-cases)
74. [Example Questions](#-example-questions)
75. [Why RAG](#-why-rag)
76. [Traditional Chatbot vs DrugAssist](#-traditional-chatbot-vs-drugassist)
77. [Project Challenges](#-project-challenges)
78. [Learning Outcomes](#-learning-outcomes)
79. [Project Deliverables](#-project-deliverables)
80. [Team Structure](#-team-structure)
81. [Evaluation Metrics](#-evaluation-metrics)
82. [Project Status](#-project-status)
83. [Disclaimer](#-disclaimer)
84. [Conclusion](#-conclusion)

---

# 💊 Project Overview

**DrugAssist** is an AI-powered drug information assistant that uses **Retrieval-Augmented Generation (RAG)** to answer questions using trusted medical documents.

Instead of relying only on the pretrained knowledge of a Large Language Model, DrugAssist first retrieves relevant information from an approved medical document and then uses the retrieved evidence to generate a response.

The project combines:

- Generative AI
- Large Language Models
- Retrieval-Augmented Generation
- Semantic Search
- Vector Embeddings
- Vector Databases
- PDF Processing
- Medical Document Retrieval
- Evidence Extraction
- Source Citations
- User Authentication
- Authorization
- Persistent Chat History
- Image Analysis
- Prompt Injection Protection
- Trusted Document Verification
- Cloud Deployment

The core principle of DrugAssist is:

> **Retrieve evidence first, then generate an answer.**

---

# ❗ Problem Statement

General-purpose AI systems can answer questions about medicines, but medical applications require a much higher level of reliability and control.

A conventional LLM may:

- generate unsupported information
- hallucinate facts
- provide information that is not present in a supplied document
- mix information from different medicines
- rely on outdated knowledge
- incorrectly interpret dosage questions
- provide unsafe personalized recommendations
- fail to identify the source of an answer

For example:

> Can I give my 12-year-old daughter 2 mg of this medicine?

This is not simply an information-retrieval question. It can become an individualized medical decision.

A safer system should retrieve what the approved medical document says about age, dosage, administration, or other relevant information without making the treatment decision on behalf of the user.

DrugAssist addresses these challenges using:

```text
Trusted Medical Documents
          ↓
Retrieval-Augmented Generation
          ↓
Document-Specific Retrieval
          ↓
Evidence
          ↓
Source Citations
          ↓
Medical Safety Rules
          ↓
Grounded Response
