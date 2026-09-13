# ============================================================
# EMBEDDINGS
# DrugAssist - FastEmbed (Optimized CPU)
# ============================================================

import os
from fastembed import TextEmbedding

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384

# FastEmbed's default is already 256.
EMBED_BATCH_SIZE = 32

# Kept only for backward compatibility with existing imports.
# We intentionally do NOT use FastEmbed data-parallel workers on
# Windows because the 2-worker test was slower on this machine.
INDEX_PARALLEL_WORKERS = None

CPU_THREADS = max(1, min(2, os.cpu_count() or 2))

print("=" * 60)
print("Loading embedding model...")
print("=" * 60)
print(f"CPU threads: {CPU_THREADS}")
print(f"Embedding batch size: {EMBED_BATCH_SIZE}")

embedding_model = TextEmbedding(
    model_name=MODEL_NAME,
    threads=CPU_THREADS,
)

print("Embedding model loaded successfully.")
print(f"Model: {MODEL_NAME}")
print(f"Embedding dimension: {EMBEDDING_DIMENSION}")
print("=" * 60)


def generate_embeddings(texts, parallel=None):
    """
    Generate embeddings for multiple text strings.

    'parallel' is accepted for backward compatibility, but this
    application intentionally does not enable FastEmbed data-parallel
    workers because the Windows benchmark was slower with them.
    """

    if texts is None:
        return []

    if not isinstance(texts, (list, tuple)):
        raise TypeError("texts must be a list or tuple of strings.")

    if not texts:
        return []

    cleaned_texts = []

    for index, text in enumerate(texts):
        if text is None:
            raise ValueError(f"Text at index {index} cannot be None.")

        if not isinstance(text, str):
            raise TypeError(f"Text at index {index} must be a string.")

        cleaned_text = text.strip()

        if not cleaned_text:
            raise ValueError(f"Text at index {index} cannot be empty.")

        cleaned_texts.append(cleaned_text)

    # Deliberately do not pass parallel=...
    # ONNX Runtime uses the configured CPU threads above.
    raw_embeddings = embedding_model.embed(
        cleaned_texts,
        batch_size=EMBED_BATCH_SIZE,
    )

    embeddings = []

    for index, vector in enumerate(raw_embeddings):
        vector_list = vector.tolist()

        if len(vector_list) != EMBEDDING_DIMENSION:
            raise ValueError(
                "Unexpected embedding dimension "
                f"at index {index}: {len(vector_list)}. "
                f"Expected {EMBEDDING_DIMENSION}."
            )

        embeddings.append(vector_list)

    if len(embeddings) != len(cleaned_texts):
        raise ValueError(
            "Embedding count does not match input text count."
        )

    return embeddings


def generate_query_embedding(text):
    if text is None:
        raise ValueError("Query text cannot be None.")

    if not isinstance(text, str):
        raise TypeError("Query text must be a string.")

    text = text.strip()

    if not text:
        raise ValueError("Query text cannot be empty.")

    embeddings = generate_embeddings([text])

    if not embeddings:
        raise ValueError("Unable to generate query embedding.")

    return embeddings[0]


def validate_embedding_dimension(embedding):
    if embedding is None:
        raise ValueError("Embedding cannot be None.")

    try:
        dimension = len(embedding)
    except TypeError:
        raise ValueError("Embedding must be a sequence.")

    if dimension != EMBEDDING_DIMENSION:
        raise ValueError(
            f"Unexpected embedding dimension: {dimension}. "
            f"Expected {EMBEDDING_DIMENSION}."
        )

    return True


if __name__ == "__main__":
    import time

    print()
    print("=" * 60)
    print("FASTEMBED TEST")
    print("=" * 60)

    test_texts = [
        "Losartan Potassium is used to treat hypertension.",
        "Losartan is an angiotensin II receptor blocker.",
    ]

    start_time = time.perf_counter()
    vectors = generate_embeddings(test_texts)
    elapsed = time.perf_counter() - start_time

    print(f"Embeddings generated: {len(vectors)}")
    print(f"Embedding generation time: {elapsed:.3f} seconds")

    if vectors:
        print(f"Embedding dimension: {len(vectors[0])}")
        print("First vector first 5 values:")
        print(vectors[0][:5])

        for vector in vectors:
            validate_embedding_dimension(vector)

        print("Embedding dimension validation: PASSED")

    query = "What is Losartan Potassium used for?"

    query_start = time.perf_counter()
    query_vector = generate_query_embedding(query)
    query_elapsed = time.perf_counter() - query_start

    print()
    print("Query embedding generated successfully.")
    print(f"Query embedding time: {query_elapsed:.3f} seconds")
    print(f"Query vector dimension: {len(query_vector)}")
    validate_embedding_dimension(query_vector)
    print("Query embedding validation: PASSED")

    print()
    print("=" * 60)
    print("FASTEMBED TEST PASSED")
    print("=" * 60)
