# ============================================================
# DRUGASSIST BACKEND
# ============================================================
#
# FastAPI backend for:
#   - Authentication
#   - Chat history
#   - PDF Library
#   - PDF upload and indexing
#   - Image upload and analysis
#   - Document-specific RAG
#
# IMPORTANT:
#   - No long-term user memory
#   - No YouTube integration
#   - Uploaded documents are evidence/data, not instructions
#   - Chat history is preserved per user
# ============================================================

import os
import shutil
import hashlib
import uuid
import traceback
import json
import re

from fastapi import (
    FastAPI,
    BackgroundTasks,
    HTTPException,
    UploadFile,
    File,
    Depends,
    Form,
)

from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from rag import (
    answer_question,
    analyze_uploaded_image,
)

from pinecone_db import (
    index_pdf,
    process_pdf,
    create_document_id,
    delete_document as delete_pinecone_document,
    upload_chunks,
)

from database.database import (
    init_database,
    create_user,
    get_user_by_email,
    create_chat,
    get_user_chats,
    get_chat,
    get_document,
    delete_chat,
    update_chat_title,
    touch_chat,
    add_message,
    get_messages,
    create_document,
    get_user_documents,
    delete_document,
)

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="DrugAssist API",
    description="Evidence-first Drug Information RAG Chatbot",
    version="5.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://drug-assistant-frontend.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "uploads",
)

PDF_FOLDER = os.path.join(
    UPLOAD_FOLDER,
    "pdfs",
)

IMAGE_FOLDER = os.path.join(
    UPLOAD_FOLDER,
    "images",
)

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True,
)

os.makedirs(
    PDF_FOLDER,
    exist_ok=True,
)

os.makedirs(
    IMAGE_FOLDER,
    exist_ok=True,
)


# ============================================================
# PDF INDEXING STATUS
# ============================================================
PDF_INDEX_STATUS = {}


# ============================================================
# ALLOWED IMAGE TYPES
# ============================================================

ALLOWED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".gif",
    ".tif",
    ".tiff",
    ".jfif",
}


# ============================================================
# TRUSTED MEDICAL SOURCE REGISTRY
# ============================================================
#
# DrugAssist does NOT trust an uploaded PDF merely because:
#   - the filename looks official,
#   - it contains medical terminology, or
#   - it claims to be a prescribing-information document.
#
# A PDF must match an approved document fingerprint before it
# can enter the medical RAG index.
#
# This first registry entry is the exact RINVOQ PDF currently
# supplied for this project. Its contents match the official
# RINVOQ prescribing information published by AbbVie and the
# official FDA labeling ecosystem.
#
# To add another approved drug document later, add its exact
# SHA-256 fingerprint here after independently verifying the
# source. Do NOT add arbitrary user-uploaded hashes.
#
TRUSTED_PDF_REGISTRY = {
    "rinvoq_pi.pdf": {
        "sha256": "9f0524388a03e816a19d05845b3a4dce5d6e8b8ba54755480bc1d8ddf2f9d300",
        "drug_terms": (
            "rinvoq",
            "upadacitinib",
        ),
        "source": "Official RINVOQ Prescribing Information (AbbVie/FDA labeling)",
        "official_url": "https://www.rxabbvie.com/pdf/rinvoq_pi.pdf",
    },
}


def _sha256_file(file_path):
    """Return the SHA-256 fingerprint of a PDF."""
    digest = hashlib.sha256()

    with open(file_path, "rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(block)

    return digest.hexdigest()


def verify_trusted_pdf(
    file_path,
    original_filename,
    processed=None,
):
    """
    Strict source-of-truth gate for medical PDFs.

    A PDF is trusted only when its exact SHA-256 fingerprint is
    present in TRUSTED_PDF_REGISTRY and its extracted drug
    identity is consistent with that registry entry.

    This deliberately rejects unknown/fake/self-authored PDFs
    instead of silently indexing them into the medical RAG.
    """
    file_hash = _sha256_file(file_path)
    filename_key = os.path.basename(original_filename).lower()

    matched_profile = None
    matched_profile_name = None

    for profile_name, profile in TRUSTED_PDF_REGISTRY.items():
        if file_hash == profile.get("sha256", "").lower():
            matched_profile = profile
            matched_profile_name = profile_name
            break

    if matched_profile is None:
        raise ValueError(
            "PDF rejected: this document is not in DrugAssist's "
            "approved medical-source registry. Only independently "
            "verified medical documents can be used as evidence."
        )

    if processed and matched_profile.get("drug_terms"):
        extracted_text = " ".join(
            str(
                processed.get(key, "")
            )
            for key in ("drug", "source")
        ).lower()

        if not any(
            term.lower() in extracted_text
            for term in matched_profile["drug_terms"]
        ):
            raise ValueError(
                "PDF rejected: the document identity does not match "
                "the approved source record."
            )

    print()
    print("TRUSTED SOURCE VERIFICATION: PASSED")
    print("REGISTERED DOCUMENT:", matched_profile_name)
    print("SOURCE:", matched_profile["source"])
    print("SHA256:", file_hash)

    return {
        "trusted": True,
        "source": matched_profile["source"],
        "official_url": matched_profile["official_url"],
        "sha256": file_hash,
        "registry_name": matched_profile_name,
    }


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def startup_event():

    init_database()

    print()
    print("=" * 70)
    print("DRUGASSIST API")
    print("=" * 70)
    print("Database initialized.")
    print("Authentication enabled.")
    print("RAG engine loaded.")
    print("PDF upload enabled.")
    print("Image analysis enabled.")
    print("Long-term memory disabled.")
    print("YouTube integration disabled.")
    print("=" * 70)


# ============================================================
# REQUEST MODELS
# ============================================================

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChatCreateRequest(BaseModel):
    title: str = "New chat"


class ChatRenameRequest(BaseModel):
    title: str


class AskRequest(BaseModel):
    question: str


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "message": "DrugAssist API is running",
        "version": "5.0.0",
    }


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "name": "DrugAssist",
        "description": (
            "Evidence-first drug information "
            "assistant with document-grounded RAG"
        ),
        "status": "running",
        "version": "5.0.0",
    }


# ============================================================
# REGISTER
# ============================================================

@app.post("/register")
def register(
    request: RegisterRequest,
):

    name = request.name.strip()

    email = (
        str(request.email)
        .strip()
        .lower()
    )

    password = request.password

    if not name:

        raise HTTPException(
            status_code=400,
            detail="Name cannot be empty.",
        )

    if len(name) < 2:

        raise HTTPException(
            status_code=400,
            detail="Name must contain at least 2 characters.",
        )

    if len(password) < 6:

        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 6 characters.",
        )

    existing_user = get_user_by_email(
        email
    )

    if existing_user:

        raise HTTPException(
            status_code=409,
            detail=(
                "An account with this "
                "email already exists."
            ),
        )

    password_hash = hash_password(
        password
    )

    user_id = create_user(
        name=name,
        email=email,
        password_hash=password_hash,
    )

    return {
        "success": True,
        "message": "Registration successful.",
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
        },
    }


# ============================================================
# LOGIN
# ============================================================

@app.post("/login")
def login(
    request: LoginRequest,
):

    email = (
        str(request.email)
        .strip()
        .lower()
    )

    password = request.password

    user = get_user_by_email(
        email
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    valid_password = verify_password(
        password,
        user["password_hash"],
    )

    if not valid_password:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    token = create_access_token(
        user["id"]
    )

    return {
        "success": True,
        "message": "Login successful.",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
        },
    }


# ============================================================
# CURRENT USER
# ============================================================

@app.get("/me")
def me(
    user=Depends(get_current_user),
):

    return {
        "success": True,
        "user": user,
    }


# ============================================================
# LOGOUT
# ============================================================

@app.post("/logout")
def logout(
    user=Depends(get_current_user),
):

    return {
        "success": True,
        "message": "Logged out successfully.",
    }


# ============================================================
# GET USER CHATS
# ============================================================

@app.get("/chats")
def get_chats(
    user=Depends(get_current_user),
):

    user_chats = get_user_chats(
        user["id"]
    )

    return {
        "success": True,
        "chats": user_chats,
    }


# ============================================================
# CREATE NEW CHAT
# ============================================================

@app.post("/chats")
def create_new_chat(
    request: ChatCreateRequest,
    user=Depends(get_current_user),
):

    title = (
        request.title.strip()
        or "New chat"
    )

    chat_id = create_chat(
        user["id"],
        title,
    )

    return {
        "success": True,
        "chat_id": chat_id,
        "title": title,
    }


# ============================================================
# RENAME CHAT
# ============================================================

@app.patch("/chats/{chat_id}")
def rename_chat(
    chat_id: int,
    request: ChatRenameRequest,
    user=Depends(get_current_user),
):

    title = request.title.strip()

    if not title:

        raise HTTPException(
            status_code=400,
            detail="Chat title cannot be empty.",
        )

    chat = get_chat(
        chat_id,
        user["id"],
    )

    if not chat:

        raise HTTPException(
            status_code=404,
            detail="Chat not found.",
        )

    try:

        update_chat_title(
            chat_id,
            user["id"],
            title,
        )

    except TypeError:

        try:

            update_chat_title(
                chat_id,
                title,
            )

        except Exception as error:

            raise HTTPException(
                status_code=500,
                detail=str(error),
            )

    return {
        "success": True,
        "chat_id": chat_id,
        "title": title,
    }


# ============================================================
# GET SINGLE CHAT
# ============================================================

@app.get("/chats/{chat_id}")
def get_single_chat(
    chat_id: int,
    user=Depends(get_current_user),
):

    chat = get_chat(
        chat_id,
        user["id"],
    )

    if not chat:

        raise HTTPException(
            status_code=404,
            detail="Chat not found.",
        )

    messages = get_messages(
        chat_id
    )

    formatted_messages = []

    for message in messages:

        # ----------------------------------------------------
        # SOURCES
        # ----------------------------------------------------

        try:

            sources = json.loads(
                message.get(
                    "sources_json",
                    "[]",
                )
            )

        except Exception:

            sources = []

        # ----------------------------------------------------
        # ATTACHMENTS
        # ----------------------------------------------------

        try:

            attachments = json.loads(
                message.get(
                    "attachments_json",
                    "[]",
                )
            )

        except Exception:

            attachments = []

        # ----------------------------------------------------
        # EVIDENCE
        # ----------------------------------------------------

        try:

            evidence = json.loads(
                message.get(
                    "evidence_json",
                    "[]",
                )
            )

        except Exception:

            evidence = []

        # ----------------------------------------------------
        # IMPORTANT
        # ----------------------------------------------------
        # YouTube/video results are intentionally ignored.
        # Existing old videos_json database data will not
        # be returned to the frontend.
        # ----------------------------------------------------

        formatted_messages.append(
            {
                "id": message["id"],
                "role": message["role"],
                "content": message["content"],
                "sources": sources,
                "videos": [],
                "attachments": attachments,
                "evidence": evidence,
                "confidence": message.get(
                    "confidence"
                ),
                "grounding_score": message.get(
                    "grounding_score"
                ),
                "mode": message.get(
                    "mode"
                ),
                "image_analysis": message.get(
                    "image_analysis"
                ),
                "created_at": message["created_at"],
            }
        )

    return {
        "success": True,
        "chat": chat,
        "messages": formatted_messages,
    }


# ============================================================
# DELETE CHAT
# ============================================================

@app.delete("/chats/{chat_id}")
def remove_chat(
    chat_id: int,
    user=Depends(get_current_user),
):

    deleted = delete_chat(
        chat_id,
        user["id"],
    )

    if not deleted:

        raise HTTPException(
            status_code=404,
            detail="Chat not found.",
        )

    return {
        "success": True,
        "message": "Chat deleted successfully.",
    }


# ============================================================
# LIBRARY — GET DOCUMENTS
# ============================================================

@app.get("/documents")
def documents(
    user=Depends(get_current_user),
):

    user_documents = get_user_documents(
        user["id"]
    )

    return {
        "success": True,
        "documents": user_documents,
    }


# ============================================================
# LIBRARY — DELETE DOCUMENT
# ============================================================

@app.delete("/documents/{document_id}")
def remove_document(
    document_id: int,
    user=Depends(get_current_user),
):

    deleted = delete_document(
        document_id,
        user["id"],
    )

    if not deleted:

        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    return {
        "success": True,
        "message": "Document removed from library.",
    }


# ============================================================
# BASIC ASK ENDPOINT
# ============================================================
#
# This endpoint does NOT use persistent memory.
#
# For normal application use, the frontend should use /chat
# because /chat supports:
#   - chat history
#   - selected PDF
#   - attachments
#   - document-specific RAG
#
# ============================================================

@app.post("/ask")
def ask(
    request: AskRequest,
    user=Depends(get_current_user),
):

    question = request.question.strip()

    if not question:

        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty.",
        )

    try:

        result = answer_question(
            question,
            conversation_history=[],
            memories=[],
            user_id=user["id"],
            chat_id=None,
            document_id=None,
        )

        if not isinstance(
            result,
            dict,
        ):

            result = {}

        return {
            "success": result.get(
                "success",
                True,
            ),
            "question": question,
            "answer": result.get(
                "answer",
                "",
            ),
            "sources": result.get(
                "sources",
                [],
            ),
            "videos": [],
            "confidence": result.get(
                "confidence",
                {
                    "label": "not_applicable",
                    "score": 0.0,
                    "grounding_score": 0.0,
                },
            ),
            "grounding_score": result.get(
                "grounding_score",
                0.0,
            ),
            "evidence": result.get(
                "evidence",
                [],
            ),
            "image_analysis": result.get(
                "image_analysis",
                "",
            ),
        }

    except Exception as error:

        print()
        print("=" * 70)
        print("ASK ERROR")
        print("=" * 70)
        print(repr(error))
        traceback.print_exc()
        print("=" * 70)

        raise HTTPException(
            status_code=500,
            detail="Unable to process the question.",
        )


# ============================================================
# SAVE PDF DOCUMENT
# ============================================================

def save_pdf_document(
    user_id,
    filename,
    file_path,
    stored_filename,
    upload_result,
):

    upload_result = (
        upload_result
        if isinstance(upload_result, dict)
        else {}
    )

    drug = upload_result.get(
        "drug"
    )

    source = upload_result.get(
        "source"
    )

    document_key = upload_result.get(
        "document_id"
    )

    pages = upload_result.get(
        "pages"
    )

    chunks = upload_result.get(
        "chunks"
    )

    # --------------------------------------------------------
    # Current database schema
    # --------------------------------------------------------

    try:

        return create_document(
            user_id=user_id,
            filename=filename,
            stored_filename=stored_filename,
            file_path=file_path,
            file_type="pdf",
            drug=drug,
            source=source,
            document_id=document_key,
            pages=pages,
            chunks=chunks,
        )

    except TypeError:

        pass

    # --------------------------------------------------------
    # Compatibility with older database schema
    # --------------------------------------------------------

    try:

        return create_document(
            user_id=user_id,
            filename=filename,
            drug=drug,
            source=source,
            document_id=document_key,
            pages=pages,
            chunks=chunks,
        )

    except TypeError:

        pass

    # --------------------------------------------------------
    # Minimal compatibility
    # --------------------------------------------------------

    return create_document(
        user_id,
        filename,
        stored_filename,
        file_path,
    )


# ============================================================
# SAVE IMAGE DOCUMENT
# ============================================================

def save_image_document(
    user_id,
    filename,
    file_path,
    stored_filename,
):

    try:

        return create_document(
            user_id=user_id,
            filename=filename,
            stored_filename=stored_filename,
            file_path=file_path,
            file_type="image",
            drug=None,
            source="Uploaded Image",
            document_id=str(
                uuid.uuid4()
            ),
            pages=1,
            chunks=0,
        )

    except TypeError:

        pass

    try:

        return create_document(
            user_id=user_id,
            filename=filename,
            drug=None,
            source="Uploaded Image",
            document_id=str(
                uuid.uuid4()
            ),
            pages=1,
            chunks=0,
        )

    except TypeError:

        pass

    return create_document(
        user_id,
        filename,
        stored_filename,
        file_path,
    )


# ============================================================
# PDF SAFETY VALIDATION
# ============================================================

def validate_pdf_content(
    file_path: str,
):
    """
    Basic ingestion safety check.

    A PDF is treated as DATA/EVIDENCE.
    Text inside the PDF must never be treated as an
    instruction to the AI.

    This function rejects documents containing obvious
    prompt-injection instructions before indexing.

    NOTE:
    This does not prove that a document is medically
    authoritative. Users should upload trusted sources
    such as official prescribing information, FDA labels,
    or other verified medical documents.
    """

    try:

        from pypdf import PdfReader

        reader = PdfReader(
            file_path
        )

        if not reader.pages:

            raise ValueError(
                "The PDF contains no readable pages."
            )

        extracted_text = []

        for page in reader.pages:

            try:

                text = page.extract_text()

                if text:

                    extracted_text.append(
                        text
                    )

            except Exception:

                continue

        full_text = "\n".join(
            extracted_text
        )

        cleaned_text = (
            full_text
            .strip()
        )

        if not cleaned_text:

            raise ValueError(
                "The PDF contains no readable text. "
                "Please upload a text-based medical PDF."
            )

        # ----------------------------------------------------
        # Obvious prompt-injection patterns
        # ----------------------------------------------------

        suspicious_patterns = [
            r"ignore\s+(all\s+)?previous\s+instructions",
            r"ignore\s+(all\s+)?prior\s+instructions",
            r"disregard\s+(all\s+)?previous\s+instructions",
            r"disregard\s+(all\s+)?prior\s+instructions",
            r"forget\s+(all\s+)?previous\s+instructions",
            r"system\s+prompt",
            r"reveal\s+(your\s+)?system\s+prompt",
            r"show\s+(your\s+)?system\s+prompt",
            r"print\s+(your\s+)?system\s+prompt",
            r"reveal\s+your\s+instructions",
            r"show\s+your\s+instructions",
            r"developer\s+message",
            r"api\s*key",
            r"secret\s+key",
            r"access\s+token",
            r"jailbreak",
            r"you\s+are\s+now\s+",
            r"act\s+as\s+if\s+",
        ]

        for pattern in suspicious_patterns:

            if re.search(
                pattern,
                cleaned_text,
                re.IGNORECASE,
            ):

                raise ValueError(
                    "This PDF contains suspicious "
                    "instruction-like content and cannot "
                    "be used as a DrugAssist evidence source."
                )

        return {
            "valid": True,
            "pages": len(reader.pages),
            "characters": len(cleaned_text),
        }

    except ValueError:

        raise

    except Exception as error:

        raise ValueError(
            "Unable to validate the PDF: "
            + str(error)
        )


# ============================================================
# BACKGROUND PDF INDEXING
# ============================================================

def _finish_pdf_indexing(
    file_path: str,
    database_document_id: int,
    document_id: str,
    drug: str,
    source: str,
    chunks: list,
):
    """Finish Pinecone indexing and update readiness status."""
    PDF_INDEX_STATUS[str(database_document_id)] = {
        "status": "indexing",
        "message": "Generating embeddings and indexing document...",
    }

    try:
        print()
        print("=" * 70)
        print("BACKGROUND PDF INDEXING")
        print("=" * 70)

        delete_pinecone_document(document_id)

        vector_count = upload_chunks(
            chunks=chunks,
            document_id=document_id,
            drug=drug,
            source=source,
        )

        PDF_INDEX_STATUS[str(database_document_id)] = {
            "status": "ready",
            "message": "Document indexing complete.",
            "vector_count": vector_count,
        }

        print(f"Background indexing complete: {vector_count} vectors.")
        print("=" * 70)

    except Exception as error:
        PDF_INDEX_STATUS[str(database_document_id)] = {
            "status": "failed",
            "message": "Document indexing failed.",
        }
        print()
        print("BACKGROUND PDF INDEXING ERROR:")
        print(repr(error))
        traceback.print_exc()
        print("=" * 70)


# ============================================================
# PDF INDEXING STATUS
# ============================================================

@app.get("/documents/{document_id}/index-status")
def get_pdf_index_status(
    document_id: int,
    current_user=Depends(get_current_user),
):
    document = get_document(document_id, current_user["id"])
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    status = PDF_INDEX_STATUS.get(
        str(document_id),
        {
            "status": "unknown",
            "message": "Indexing status is not available in this server session.",
        },
    )

    return {"success": True, "document_id": document_id, **status}


# ============================================================
# PDF UPLOAD
# ============================================================

@app.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    user=Depends(get_current_user),
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected.",
        )

    original_filename = os.path.basename(file.filename)

    if not original_filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed.",
        )

    stored_filename = str(uuid.uuid4()) + "_" + original_filename
    file_path = os.path.join(PDF_FOLDER, stored_filename)

    try:
        # ----------------------------------------------------
        # SAVE PDF
        # ----------------------------------------------------
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print()
        print("=" * 70)
        print("PDF UPLOAD")
        print("=" * 70)
        print("USER:", user["email"])
        print("FILENAME:", original_filename)

        # ----------------------------------------------------
        # SAFETY VALIDATION
        # ----------------------------------------------------
        validation = validate_pdf_content(file_path)

        print("PDF VALIDATION: PASSED")
        print("READABLE PAGES:", validation["pages"])

        # ----------------------------------------------------
        # EXTRACT + CHUNK ONCE
        # ----------------------------------------------------
        # We process the PDF here only far enough to obtain its
        # metadata/chunks. The expensive embedding + Pinecone
        # upload is moved to a background task.
        processed = process_pdf(file_path)

        if not isinstance(processed, dict):
            processed = {}

        chunks = processed.get("chunks") or []
        pages = processed.get("pages") or []
        drug = processed.get("drug") or "Unknown"
        source = processed.get("source") or original_filename

        # ----------------------------------------------------
        # TRUSTED MEDICAL SOURCE GATE
        # ----------------------------------------------------
        #
        # Prompt-injection scanning alone is not enough.
        # A user can create a perfectly readable but fabricated
        # medical PDF. Such a file must never enter Pinecone.
        trusted_source = verify_trusted_pdf(
            file_path=file_path,
            original_filename=original_filename,
            processed=processed,
        )

        # Use the verified source label in Pinecone metadata
        # instead of trusting arbitrary PDF metadata.
        source = trusted_source["source"]

        if not chunks:
            raise ValueError("No readable text chunks were generated from the PDF.")

        pinecone_document_id = create_document_id(file_path)

        upload_result = {
            "success": True,
            "drug": drug,
            "source": source,
            "trusted_source": True,
            "trust_status": "verified",
            "official_source_url": trusted_source["official_url"],
            "document_sha256": trusted_source["sha256"],
            "document_id": pinecone_document_id,
            "pages": len(pages),
            "chunks": len(chunks),
        }

        # ----------------------------------------------------
        # SAVE LIBRARY RECORD IMMEDIATELY
        # ----------------------------------------------------
        document_id = save_pdf_document(
            user["id"],
            original_filename,
            file_path,
            stored_filename,
            upload_result,
        )

        # ----------------------------------------------------
        # INDEX IN BACKGROUND
        # ----------------------------------------------------
        # Use the existing Pinecone implementation.
        if background_tasks is None:
            raise RuntimeError("Background task manager is unavailable.")

        PDF_INDEX_STATUS[str(document_id)] = {
            "status": "indexing",
            "message": "Generating embeddings and indexing document...",
        }

        background_tasks.add_task(
            _finish_pdf_indexing,
            file_path,
            document_id,
            pinecone_document_id,
            drug,
            source,
            chunks,
        )

        indexing_started = True
        index_status = "indexing"

        print("DOCUMENT ID:", document_id)
        print("PDF saved. Pinecone indexing started in background.")

        print("=" * 70)

        return {
            "success": True,
            "message": (
                "PDF uploaded successfully. "
                "Indexing is continuing in the background."
            ),
            "filename": original_filename,
            "stored_filename": stored_filename,
            "document_id": document_id,
            "drug": drug,
            "source": source,
            "trusted_source": True,
            "trust_status": "verified",
            "official_source_url": trusted_source["official_url"],
            "pages": len(pages),
            "chunks": len(chunks),
            "indexing": indexing_started,
            "index_status": index_status,
            "cached": False,
        }

    except ValueError as error:
        print("PDF REJECTED BY SAFETY/TRUST GATE:", repr(error))

        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        print("PDF UPLOAD ERROR:", repr(error))
        traceback.print_exc()

        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

        raise HTTPException(
            status_code=500,
            detail="Unable to process PDF: " + str(error),
        )

    finally:
        await file.close()


# ============================================================
# IMAGE VALIDATION
# ============================================================

def validate_image_file(
    filename,
    content_type,
):

    extension = os.path.splitext(
        filename
    )[1].lower()

    if extension in ALLOWED_IMAGE_EXTENSIONS:

        return True

    if (
        content_type
        and content_type.lower().startswith(
            "image/"
        )
    ):

        return True

    return False


# ============================================================
# SHORT-TERM IMAGE CONTEXT
# ============================================================
#
# This is NOT long-term user memory.
#
# It only recovers the previous image analysis from the
# current chat so the user can ask a follow-up question.
#
# ============================================================

def get_previous_image_context(
    messages,
):

    if not messages:

        return ""

    image_seen = False

    for message in reversed(
        messages
    ):

        role = message.get(
            "role",
            "",
        )

        content = str(
            message.get(
                "content",
                "",
            )
        )

        if role == "user":

            lower_content = content.lower()

            attachment_marker = (
                "attachments:"
            )

            if attachment_marker in lower_content:

                attachment_part = (
                    lower_content.split(
                        attachment_marker,
                        1,
                    )[1]
                )

                if any(
                    attachment_part.endswith(
                        ext
                    )
                    or f"{ext}," in attachment_part
                    or f"{ext} " in attachment_part
                    for ext in ALLOWED_IMAGE_EXTENSIONS
                ):

                    image_seen = True
                    continue

                if ".pdf" in attachment_part:

                    return ""

        elif (
            role == "assistant"
            and image_seen
        ):

            if content.strip():

                return (
                    "Previous image analysis "
                    "from this conversation:\n"
                    + content.strip()
                )

    return ""


# ============================================================
# BUILD SHORT-TERM CONVERSATION HISTORY
# ============================================================

def build_conversation_history(
    messages,
    max_messages=12,
):
    """
    Convert stored chat messages into LLM conversation history.

    This is only the current chat's short-term history.

    It does NOT create or retrieve persistent user memory.
    """

    history = []

    if not messages:

        return history

    for message in messages[-max_messages:]:

        if not isinstance(
            message,
            dict,
        ):

            continue

        role = message.get(
            "role"
        )

        if role not in {
            "user",
            "assistant",
        }:

            continue

        content = (
            message.get("content")
            or ""
        )

        if not str(
            content
        ).strip():

            continue

        history.append(
            {
                "role": role,
                "content": str(
                    content
                ).strip(),
            }
        )

    return history


# ============================================================
# CHAT ENDPOINT
# ============================================================

@app.post("/chat")
async def chat(

    question: str = Form(""),

    chat_id: int | None = Form(None),

    document_id: int | None = Form(None),

    files: list[UploadFile] | None = File(None),

    user=Depends(get_current_user),

):

    question = question.strip()

    # ========================================================
    # VALIDATION
    # ========================================================

    if not question and not files:

        raise HTTPException(
            status_code=400,
            detail=(
                "Please enter a question "
                "or attach a file."
            ),
        )

    user_id = user["id"]

    # ========================================================
    # GET OR CREATE CHAT
    # ========================================================

    current_chat_id = chat_id

    if current_chat_id is not None:

        chat_record = get_chat(
            current_chat_id,
            user_id,
        )

        if not chat_record:

            raise HTTPException(
                status_code=404,
                detail="Chat not found.",
            )

    else:

        title = (
            question[:60]
            if question
            else "New chat"
        )

        current_chat_id = create_chat(
            user_id,
            title,
        )

    # ========================================================
    # RESOLVE SELECTED LIBRARY DOCUMENT
    # ========================================================
    #
    # document_id from frontend:
    #     SQLite documents.id
    #
    # document_id used by Pinecone:
    #     documents.document_id
    #
    # We resolve the user's selected Library document here.
    #
    # ========================================================

    selected_rag_document_id = None
    selected_database_document_id = document_id

    if document_id is not None:

        selected_document = get_document(
            document_id,
            user_id,
        )

        if not selected_document:

            raise HTTPException(
                status_code=404,
                detail="Selected document not found.",
            )

        if selected_document.get(
            "file_type"
        ) != "pdf":

            raise HTTPException(
                status_code=400,
                detail=(
                    "Only PDF documents can be "
                    "used for drug questions."
                ),
            )

        selected_rag_document_id = (
            selected_document.get(
                "document_id"
            )
        )

        if not selected_rag_document_id:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Selected document is missing "
                    "its RAG document ID."
                ),
            )

    # ========================================================
    # PROCESS ATTACHMENTS
    # ========================================================

    processed_files = []

    image_contexts = []

    if files:

        for uploaded_file in files:

            if not uploaded_file.filename:

                continue

            filename = os.path.basename(
                uploaded_file.filename
            )

            extension = os.path.splitext(
                filename
            )[1].lower()

            # ==================================================
            # PDF
            # ==================================================

            if extension == ".pdf":

                stored_filename = (
                    str(uuid.uuid4())
                    + "_"
                    + filename
                )

                file_path = os.path.join(
                    PDF_FOLDER,
                    stored_filename,
                )

                try:

                    with open(
                        file_path,
                        "wb",
                    ) as buffer:

                        shutil.copyfileobj(
                            uploaded_file.file,
                            buffer,
                        )

                    print()
                    print("=" * 70)
                    print("CHAT PDF ATTACHMENT")
                    print("=" * 70)
                    print(
                        "USER:",
                        user["email"],
                    )
                    print(
                        "FILENAME:",
                        filename,
                    )
                    print(
                        "CHAT ID:",
                        current_chat_id,
                    )

                    # ------------------------------------------
                    # VALIDATE PDF
                    # ------------------------------------------

                    validate_pdf_content(
                        file_path
                    )

                    print(
                        "PDF VALIDATION: PASSED"
                    )

                    # ------------------------------------------
                    # INDEX PDF
                    # ------------------------------------------

                    upload_result = index_pdf(
                        file_path
                    )

                    if not isinstance(
                        upload_result,
                        dict,
                    ):

                        upload_result = {}

                    # ------------------------------------------
                    # SAVE LIBRARY RECORD
                    # ------------------------------------------

                    database_document_id = (
                        save_pdf_document(
                            user_id,
                            filename,
                            file_path,
                            stored_filename,
                            upload_result,
                        )
                    )

                    # ------------------------------------------
                    # IMPORTANT:
                    # Current attached PDF becomes the selected
                    # RAG document for THIS question.
                    # ------------------------------------------

                    selected_rag_document_id = (
                        upload_result.get(
                            "document_id"
                        )
                        or selected_rag_document_id
                    )

                    selected_database_document_id = database_document_id

                    processed_files.append(
                        {
                            "filename": filename,
                            "type": "pdf",
                            "status": "indexed",
                            "document_id": (
                                database_document_id
                            ),
                            "drug": upload_result.get(
                                "drug"
                            ),
                            "source": upload_result.get(
                                "source"
                            ),
                            "pages": upload_result.get(
                                "pages"
                            ),
                            "chunks": upload_result.get(
                                "chunks"
                            ),
                        }
                    )

                    print(
                        "PDF indexed successfully."
                    )
                    print("=" * 70)

                except ValueError as error:

                    print(
                        "CHAT PDF REJECTED:",
                        repr(error),
                    )

                    if os.path.exists(
                        file_path
                    ):

                        try:

                            os.remove(
                                file_path
                            )

                        except Exception:

                            pass

                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"PDF '{filename}' rejected: "
                            f"{str(error)}"
                        ),
                    )

                except Exception as error:

                    print()
                    print(
                        "CHAT PDF ERROR:",
                        repr(error),
                    )

                    traceback.print_exc()

                    if os.path.exists(
                        file_path
                    ):

                        try:

                            os.remove(
                                file_path
                            )

                        except Exception:

                            pass

                    raise HTTPException(
                        status_code=500,
                        detail=(
                            f"Unable to process PDF "
                            f"'{filename}': "
                            f"{str(error)}"
                        ),
                    )

                finally:

                    await uploaded_file.close()

            # ==================================================
            # IMAGE
            # ==================================================

            elif validate_image_file(
                filename,
                uploaded_file.content_type,
            ):

                stored_filename = (
                    str(uuid.uuid4())
                    + "_"
                    + filename
                )

                file_path = os.path.join(
                    IMAGE_FOLDER,
                    stored_filename,
                )

                try:

                    print()
                    print("=" * 70)
                    print("CHAT IMAGE ATTACHMENT")
                    print("=" * 70)
                    print(
                        "USER:",
                        user["email"],
                    )
                    print(
                        "FILENAME:",
                        filename,
                    )
                    print(
                        "CHAT ID:",
                        current_chat_id,
                    )

                    # ------------------------------------------
                    # SAVE IMAGE
                    # ------------------------------------------

                    with open(
                        file_path,
                        "wb",
                    ) as buffer:

                        shutil.copyfileobj(
                            uploaded_file.file,
                            buffer,
                        )

                    # ------------------------------------------
                    # ANALYZE IMAGE
                    # ------------------------------------------

                    image_observation = (
                        analyze_uploaded_image(
                            file_path,
                            question=question,
                        )
                    )

                    if image_observation:

                        image_contexts.append(
                            image_observation
                        )

                    # ------------------------------------------
                    # SAVE IMAGE TO LIBRARY
                    # ------------------------------------------

                    image_document_id = (
                        save_image_document(
                            user_id,
                            filename,
                            file_path,
                            stored_filename,
                        )
                    )

                    processed_files.append(
                        {
                            "filename": filename,
                            "type": "image",
                            "status": (
                                "analyzed"
                                if image_observation
                                else "analysis_failed"
                            ),
                            "document_id": (
                                image_document_id
                            ),
                            "analysis": (
                                image_observation
                                or ""
                            ),
                        }
                    )

                    print(
                        "Image analysis completed."
                    )
                    print("=" * 70)

                except Exception as error:

                    print()
                    print(
                        "CHAT IMAGE ERROR:",
                        repr(error),
                    )

                    traceback.print_exc()

                    processed_files.append(
                        {
                            "filename": filename,
                            "type": "image",
                            "status": "analysis_failed",
                            "error": str(error),
                        }
                    )

                finally:

                    await uploaded_file.close()

            # ==================================================
            # UNSUPPORTED
            # ==================================================

            else:

                await uploaded_file.close()

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Unsupported file type: "
                        f"{filename}"
                    ),
                )

    # ========================================================
    # COMBINE IMAGE OBSERVATIONS
    # ========================================================

    combined_image_context = ""

    if image_contexts:

        combined_image_context = (
            "\n\n".join(
                image_contexts
            )
        )

    # ========================================================
    # GET EXISTING MESSAGES
    # ========================================================

    previous_messages = get_messages(
        current_chat_id
    )

    # ========================================================
    # GET PREVIOUS IMAGE CONTEXT
    # ========================================================

    previous_image_context = ""

    if not combined_image_context:

        previous_image_context = (
            get_previous_image_context(
                previous_messages
            )
        )

    effective_image_context = (
        combined_image_context
        if combined_image_context
        else previous_image_context
    )

    # ========================================================
    # SAVE USER MESSAGE
    # ========================================================

    user_message_content = question

    if processed_files:

        attachment_names = [
            item["filename"]
            for item in processed_files
        ]

        attachment_text = (
            "\n\nAttachments: "
            + ", ".join(
                attachment_names
            )
        )

        if user_message_content:

            user_message_content += (
                attachment_text
            )

        else:

            user_message_content = (
                attachment_text.strip()
            )

    if user_message_content.strip():

        add_message(
            chat_id=current_chat_id,
            role="user",
            content=user_message_content,
            sources=[],
            videos=[],
        )

    # ========================================================
    # FILE-ONLY REQUEST
    # ========================================================

    if not question:

        if image_contexts:

            answer = (
                "I analyzed the uploaded image. "
                "Please ask a question about the "
                "information shown in the image."
            )

        else:

            answer = (
                "Your PDF has been uploaded and indexed. "
                "Please ask a question about the "
                "information in the document."
            )

        add_message(
            chat_id=current_chat_id,
            role="assistant",
            content=answer,
            sources=[],
            videos=[],
        )

        touch_chat(
            current_chat_id,
            user_id,
        )

        return {
            "success": True,
            "chat_id": current_chat_id,
            "question": question,
            "answer": answer,
            "sources": [],
            "videos": [],
            "files": processed_files,
            "confidence": {
                "label": "not_applicable",
                "score": 0.0,
                "grounding_score": 0.0,
            },
            "grounding_score": 0.0,
            "evidence": [],
            "image_analysis": combined_image_context,
        }

    # ========================================================
    # RUN RAG
    # ========================================================

    try:

        print()
        print("=" * 70)
        print("CHAT REQUEST")
        print("=" * 70)

        print(
            "USER:",
            user["email"],
        )

        print(
            "USER ID:",
            user_id,
        )

        print(
            "CHAT ID:",
            current_chat_id,
        )

        print(
            "QUESTION:",
            question,
        )

        print(
            "PREVIOUS MESSAGES:",
            len(previous_messages),
        )

        print(
            "SELECTED RAG DOCUMENT:",
            selected_rag_document_id,
        )

        if effective_image_context:

            print(
                "IMAGE CONTEXT AVAILABLE: YES"
            )

        else:

            print(
                "IMAGE CONTEXT AVAILABLE: NO"
            )

        print("=" * 70)

        # ----------------------------------------------------
        # SHORT-TERM CONVERSATION HISTORY
        # ----------------------------------------------------

        conversation_history = (
            build_conversation_history(
                previous_messages,
                max_messages=12,
            )
        )

        print(
            "CONVERSATION HISTORY:",
            len(conversation_history),
        )

        # ----------------------------------------------------
        # NO LONG-TERM MEMORY
        # ----------------------------------------------------
        #
        # memories=[] intentionally.
        #
        # DrugAssist does NOT store:
        #   - user names
        #   - personal preferences
        #   - personal facts
        #   - cross-chat memories
        #
        # ----------------------------------------------------

        result = answer_question(
            question,
            image_context=effective_image_context,
            conversation_history=conversation_history,
            memories=[],
            user_id=user_id,
            chat_id=current_chat_id,
            document_id=selected_rag_document_id,
        )

        if not isinstance(
            result,
            dict,
        ):

            result = {}

        # ====================================================
        # RESPONSE DATA
        # ====================================================

        answer = result.get(
            "answer",
            "",
        )

        sources = result.get(
            "sources",
            [],
        )

        
        # ----------------------------------------------------
        # ENRICH SOURCES FOR CLICKABLE PDF CITATIONS
        # ----------------------------------------------------
        enriched_sources = []

        for source in sources if isinstance(sources, list) else []:
            if not isinstance(source, dict):
                continue

            item = dict(source)

            if selected_database_document_id is not None:
                item["database_document_id"] = (
                    selected_database_document_id
                )

            item["filename"] = (
                item.get("filename")
                or item.get("source")
                or "Source document"
            )

            item["page"] = (
                item.get("page")
                or item.get("page_number")
                or item.get("pageNumber")
            )

            enriched_sources.append(item)

        sources = enriched_sources

# ----------------------------------------------------
        # YouTube intentionally disabled
        # ----------------------------------------------------

        videos = []

        confidence = result.get(
            "confidence",
            {
                "label": "not_applicable",
                "score": 0.0,
                "grounding_score": 0.0,
            },
        )

        if isinstance(
            confidence,
            dict,
        ):

            grounding_score = result.get(
                "grounding_score",
                confidence.get(
                    "grounding_score",
                    0.0,
                ),
            )

        else:

            grounding_score = 0.0

        evidence = result.get(
            "evidence",
            [],
        )

        returned_image_analysis = (
            result.get(
                "image_analysis",
                effective_image_context,
            )
        )

        if not answer:

            answer = (
                "I couldn't generate an answer "
                "from the available evidence."
            )

        # ====================================================
        # SAVE ASSISTANT MESSAGE
        # ====================================================

        try:

            add_message(
                chat_id=current_chat_id,
                role="assistant",
                content=answer,
                sources=sources,
                videos=[],
                evidence=evidence,
                confidence=confidence,
                grounding_score=grounding_score,
                attachments=processed_files,
                mode=result.get(
                    "mode"
                ),
                image_analysis=returned_image_analysis,
            )

        except TypeError:

            # Compatibility with older database.py

            add_message(
                chat_id=current_chat_id,
                role="assistant",
                content=answer,
                sources=sources,
                videos=[],
            )

        # ====================================================
        # UPDATE CHAT
        # ====================================================

        touch_chat(
            current_chat_id,
            user_id,
        )

        print()
        print(
            "ANSWER GENERATED SUCCESSFULLY."
        )

        print(
            "SOURCES:",
            len(sources),
        )

        print(
            "VIDEOS:",
            0,
        )

        print(
            "GROUNDING SCORE:",
            grounding_score,
        )

        print("=" * 70)

        # ====================================================
        # RESPONSE
        # ====================================================

        return {
            "success": result.get(
                "success",
                True,
            ),
            "chat_id": current_chat_id,
            "question": question,
            "answer": answer,
            "sources": sources,
            "videos": [],
            "files": processed_files,
            "confidence": confidence,
            "grounding_score": grounding_score,
            "evidence": evidence,
            "mode": result.get(
                "mode"
            ),
            "image_analysis": returned_image_analysis,
        }

    except HTTPException:

        raise

    except Exception as error:

        print()
        print("=" * 70)
        print("CHAT ERROR")
        print("=" * 70)

        print(
            repr(error)
        )

        traceback.print_exc()

        print("=" * 70)

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to process "
                "the question: "
                + str(error)
            ),
        )

# ============================================================
# OPEN PDF — AUTHENTICATED SOURCE VIEWER
# ============================================================

@app.get("/documents/{document_id}/pdf")
def open_document_pdf(
    document_id: int,
    current_user=Depends(get_current_user),
):
    """Return an uploaded PDF only to its owning authenticated user."""
    user_id = current_user["id"]

    document = get_document(
        document_id,
        user_id,
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    if str(document.get("file_type") or "").lower() != "pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF documents can be opened here.",
        )

    file_path = document.get("file_path")

    if not file_path or not os.path.isfile(file_path):
        raise HTTPException(
            status_code=404,
            detail="PDF file is not available.",
        )

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=document.get("filename") or "document.pdf",
        content_disposition_type="inline",
    )
