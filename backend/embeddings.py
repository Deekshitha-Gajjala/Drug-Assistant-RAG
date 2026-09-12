# ============================================================
# EMBEDDINGS
# DrugAssist - FastEmbed
# ============================================================

from fastembed import TextEmbedding


# ============================================================
# CONFIGURATION
# ============================================================

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

EMBEDDING_DIMENSION = 384


# ============================================================
# LOAD EMBEDDING MODEL
# ============================================================

print("=" * 60)
print("Loading embedding model...")
print("=" * 60)

embedding_model = TextEmbedding(
    model_name=MODEL_NAME
)

print("Embedding model loaded successfully.")
print(f"Model: {MODEL_NAME}")
print(
    f"Embedding dimension: {EMBEDDING_DIMENSION}"
)
print("=" * 60)


# ============================================================
# GENERATE EMBEDDINGS
# ============================================================

def generate_embeddings(texts):
    """
    Generate embeddings for multiple text strings.

    Parameters
    ----------
    texts : list[str]
        List of text chunks or documents.

    Returns
    -------
    list[list[float]]
        List of embedding vectors.
    """

    if texts is None:
        return []

    if not isinstance(texts, (list, tuple)):
        raise TypeError(
            "texts must be a list or tuple of strings."
        )

    if not texts:
        return []

    # --------------------------------------------------------
    # Validate input text
    # --------------------------------------------------------

    cleaned_texts = []

    for index, text in enumerate(texts):

        if text is None:
            raise ValueError(
                f"Text at index {index} cannot be None."
            )

        if not isinstance(text, str):
            raise TypeError(
                f"Text at index {index} must be a string."
            )

        cleaned_text = text.strip()

        if not cleaned_text:
            raise ValueError(
                f"Text at index {index} cannot be empty."
            )

        cleaned_texts.append(
            cleaned_text
        )

    # --------------------------------------------------------
    # Generate embeddings
    # --------------------------------------------------------

    raw_embeddings = list(
        embedding_model.embed(
            cleaned_texts
        )
    )

    if len(raw_embeddings) != len(
        cleaned_texts
    ):
        raise ValueError(
            "Embedding count does not match "
            "input text count."
        )

    # --------------------------------------------------------
    # Convert vectors to normal Python lists
    # --------------------------------------------------------

    embeddings = []

    for index, vector in enumerate(
        raw_embeddings
    ):

        vector_list = vector.tolist()

        if len(vector_list) != EMBEDDING_DIMENSION:

            raise ValueError(
                "Unexpected embedding dimension "
                f"at index {index}: "
                f"{len(vector_list)}. "
                f"Expected "
                f"{EMBEDDING_DIMENSION}."
            )

        embeddings.append(
            vector_list
        )

    return embeddings


# ============================================================
# GENERATE QUERY EMBEDDING
# ============================================================

def generate_query_embedding(text):
    """
    Generate an embedding for a single query.

    Parameters
    ----------
    text : str
        User's search/query text.

    Returns
    -------
    list[float]
        Single embedding vector.
    """

    if text is None:
        raise ValueError(
            "Query text cannot be None."
        )

    if not isinstance(text, str):
        raise TypeError(
            "Query text must be a string."
        )

    text = text.strip()

    if not text:
        raise ValueError(
            "Query text cannot be empty."
        )

    embeddings = generate_embeddings(
        [text]
    )

    if not embeddings:
        raise ValueError(
            "Unable to generate query embedding."
        )

    return embeddings[0]


# ============================================================
# EMBEDDING DIMENSION CHECK
# ============================================================

def validate_embedding_dimension(
    embedding
):
    """
    Validate that an embedding has the expected
    384-dimensional vector size.
    """

    if embedding is None:
        raise ValueError(
            "Embedding cannot be None."
        )

    try:
        dimension = len(embedding)
    except TypeError:

        raise ValueError(
            "Embedding must be a sequence."
        )

    if dimension != EMBEDDING_DIMENSION:

        raise ValueError(
            f"Unexpected embedding dimension: "
            f"{dimension}. "
            f"Expected "
            f"{EMBEDDING_DIMENSION}."
        )

    return True


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 60)
    print("FASTEMBED TEST")
    print("=" * 60)

    test_texts = [
        "Losartan Potassium is used to treat hypertension.",
        "Losartan is an angiotensin II receptor blocker.",
    ]

    print()
    print(
        f"Texts processed: {len(test_texts)}"
    )

    # --------------------------------------------------------
    # Generate embeddings
    # --------------------------------------------------------

    vectors = generate_embeddings(
        test_texts
    )

    print(
        f"Embeddings generated: {len(vectors)}"
    )

    # --------------------------------------------------------
    # Validate embeddings
    # --------------------------------------------------------

    if vectors:

        dimension = len(
            vectors[0]
        )

        print(
            f"Embedding dimension: {dimension}"
        )

        print(
            "First vector first 5 values:"
        )

        print(
            vectors[0][:5]
        )

        for vector in vectors:

            validate_embedding_dimension(
                vector
            )

        print()
        print(
            "Embedding dimension validation: PASSED"
        )

    # --------------------------------------------------------
    # Query embedding test
    # --------------------------------------------------------

    query = (
        "What is Losartan Potassium used for?"
    )

    query_vector = (
        generate_query_embedding(
            query
        )
    )

    print()
    print(
        "Query embedding generated successfully."
    )

    print(
        f"Query vector dimension: "
        f"{len(query_vector)}"
    )

    validate_embedding_dimension(
        query_vector
    )

    print(
        "Query embedding validation: PASSED"
    )

    # --------------------------------------------------------
    # Final result
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("FASTEMBED TEST PASSED")
    print("=" * 60)