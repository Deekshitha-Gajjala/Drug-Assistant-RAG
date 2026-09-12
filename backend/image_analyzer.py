# ============================================================
# IMAGE ANALYZER
# DrugAssist - Groq Vision
# ============================================================

import os
import base64

from dotenv import load_dotenv
from groq import Groq


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# GROQ CONFIGURATION
# ============================================================

GROQ_API_KEY = os.getenv(
    "GROQ_API_KEY"
)

if not GROQ_API_KEY:

    raise ValueError(
        "GROQ_API_KEY is missing from .env"
    )


VISION_MODEL = os.getenv(
    "GROQ_VISION_MODEL",
    "qwen/qwen3.6-27b"
)


# ============================================================
# GROQ CLIENT
# ============================================================

client = Groq(
    api_key=GROQ_API_KEY
)


# ============================================================
# CONFIGURATION
# ============================================================

MAX_IMAGE_SIZE_MB = 10

MAX_IMAGE_SIZE_BYTES = (
    MAX_IMAGE_SIZE_MB * 1024 * 1024
)


# ============================================================
# SUPPORTED IMAGE TYPES
# ============================================================

MIME_TYPES = {

    ".jpg": "image/jpeg",

    ".jpeg": "image/jpeg",

    ".png": "image/png",

    ".webp": "image/webp",

    ".bmp": "image/bmp",

    ".gif": "image/gif",

    ".tif": "image/tiff",

    ".tiff": "image/tiff",

    ".jfif": "image/jpeg",
}


# ============================================================
# GET MIME TYPE
# ============================================================

def get_mime_type(
    image_path: str,
) -> str:
    """
    Return the MIME type based on the image extension.
    """

    if not image_path:

        raise ValueError(
            "Image path is required."
        )

    extension = os.path.splitext(
        image_path
    )[1].lower()

    return MIME_TYPES.get(
        extension,
        "image/jpeg",
    )


# ============================================================
# VALIDATE IMAGE
# ============================================================

def validate_image(
    image_path: str,
) -> None:
    """
    Validate that the image exists, is readable,
    and is within the configured size limit.
    """

    if not image_path:

        raise ValueError(
            "Image path is required."
        )

    if not isinstance(
        image_path,
        str,
    ):

        raise TypeError(
            "Image path must be a string."
        )

    if not os.path.exists(
        image_path
    ):

        raise FileNotFoundError(
            f"Image not found: {image_path}"
        )

    if not os.path.isfile(
        image_path
    ):

        raise ValueError(
            "The provided image path is not a file."
        )

    file_size = os.path.getsize(
        image_path
    )

    if file_size == 0:

        raise ValueError(
            "The uploaded image is empty."
        )

    if file_size > MAX_IMAGE_SIZE_BYTES:

        raise ValueError(
            f"Image is too large. "
            f"Maximum allowed size is "
            f"{MAX_IMAGE_SIZE_MB} MB."
        )


# ============================================================
# BUILD VISION PROMPT
# ============================================================

def build_system_prompt() -> str:
    """
    Return the safety-focused system prompt used by
    the vision model.
    """

    return """
You are the image-understanding component of
DrugAssist, an evidence-first drug information
assistant.

Analyze the provided image carefully.

Your task is to extract ONLY information that is
actually visible or readable in the image.

Pay particular attention to:

- Drug or medicine name
- Generic name
- Brand name
- Strength
- Dosage form
- Active ingredients
- Manufacturer
- Prescription label text
- Warnings
- Directions visible on packaging
- Medical document text
- Other relevant readable information

IMPORTANT RULES:

1. Do NOT invent information that cannot be seen.
2. Do NOT guess a drug name from an unclear image.
3. If text is unreadable, explicitly say that it is unreadable.
4. Do NOT diagnose a patient.
5. Do NOT determine whether a medicine is safe for a particular person.
6. Do NOT invent dosage instructions.
7. Do NOT infer missing medical information.
8. Clearly distinguish visible information from uncertainty.
9. Do not provide personalized medical advice.
10. Keep the observations concise and structured.

If the image does not contain useful medical or
medicine-related information, say so clearly.

Prefer this structure when applicable:

Drug/Medicine:
Generic name:
Strength:
Dosage form:
Active ingredients:
Manufacturer:
Visible instructions:
Warnings:
Other visible information:
Uncertainty:
"""


# ============================================================
# ANALYZE IMAGE
# ============================================================

def analyze_image(
    image_path: str,
    question: str = "",
) -> str:
    """
    Analyze an uploaded image using Groq Vision.

    The model is instructed to extract only information
    actually visible or readable in the image.

    Useful for:

    - medicine packages
    - prescription labels
    - drug strips
    - medicine bottles
    - medical documents
    - screenshots containing drug information
    """

    # --------------------------------------------------------
    # Validate image
    # --------------------------------------------------------

    validate_image(
        image_path
    )

    # --------------------------------------------------------
    # Read image
    # --------------------------------------------------------

    try:

        with open(
            image_path,
            "rb",
        ) as image_file:

            image_bytes = image_file.read()

    except OSError as error:

        raise RuntimeError(
            "Unable to read the uploaded image."
        ) from error

    if not image_bytes:

        raise ValueError(
            "The uploaded image is empty."
        )

    # --------------------------------------------------------
    # Encode image
    # --------------------------------------------------------

    encoded_image = base64.b64encode(
        image_bytes
    ).decode(
        "utf-8"
    )

    # --------------------------------------------------------
    # MIME type
    # --------------------------------------------------------

    mime_type = get_mime_type(
        image_path
    )

    image_url = (
        f"data:{mime_type};base64,"
        f"{encoded_image}"
    )

    # --------------------------------------------------------
    # User question
    # --------------------------------------------------------

    if question and isinstance(
        question,
        str,
    ):

        user_question = question.strip()

    else:

        user_question = ""

    if not user_question:

        user_question = (
            "Identify and extract the useful "
            "medical or medicine-related information "
            "visible in this image."
        )

    # --------------------------------------------------------
    # System prompt
    # --------------------------------------------------------

    system_prompt = build_system_prompt()

    # --------------------------------------------------------
    # User prompt
    # --------------------------------------------------------

    user_prompt = (
        "User question:\n"
        f"{user_question}\n\n"
        "Analyze the image and extract only "
        "information supported by what is visible "
        "or readable in the image."
    )

    # --------------------------------------------------------
    # Debug information
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("DRUGASSIST IMAGE ANALYSIS")
    print("=" * 60)
    print(
        "Image:",
        os.path.basename(
            image_path
        ),
    )
    print(
        "Vision model:",
        VISION_MODEL,
    )
    print(
        "Question:",
        user_question,
    )
    print("=" * 60)

    # --------------------------------------------------------
    # Call Groq Vision
    # --------------------------------------------------------

    try:

        response = client.chat.completions.create(

            model=VISION_MODEL,

            messages=[

                {
                    "role": "system",

                    "content": system_prompt,
                },

                {
                    "role": "user",

                    "content": [

                        {
                            "type": "text",

                            "text": user_prompt,
                        },

                        {
                            "type": "image_url",

                            "image_url": {
                                "url": image_url,
                            },
                        },
                    ],
                },
            ],

            temperature=0.1,

            max_completion_tokens=1200,
        )

    except Exception as error:

        print(
            "IMAGE ANALYSIS ERROR:",
            repr(error),
        )

        raise RuntimeError(
            "Unable to analyze the uploaded image."
        ) from error

    # --------------------------------------------------------
    # Validate response
    # --------------------------------------------------------

    try:

        if not response.choices:

            raise RuntimeError(
                "Image analysis returned no choices."
            )

        message = (
            response
            .choices[0]
            .message
        )

        observation = (
            message.content
        )

    except (
        AttributeError,
        IndexError,
        TypeError,
    ) as error:

        raise RuntimeError(
            "Image analysis returned an invalid response."
        ) from error

    # --------------------------------------------------------
    # Validate generated text
    # --------------------------------------------------------

    if not observation:

        raise RuntimeError(
            "Image analysis returned no information."
        )

    if not isinstance(
        observation,
        str,
    ):

        observation = str(
            observation
        )

    observation = observation.strip()

    if not observation:

        raise RuntimeError(
            "Image analysis returned empty information."
        )

    # --------------------------------------------------------
    # Final output
    # --------------------------------------------------------

    print()
    print("Image analysis completed successfully.")
    print("=" * 60)

    return observation


# ============================================================
# ALIAS FOR DRUGASSIST
# ============================================================

def analyze_uploaded_image(
    image_path: str,
    question: str = "",
) -> str:
    """
    DrugAssist-compatible wrapper.

    This keeps image analysis available through the
    function name used by the RAG/backend layer.
    """

    return analyze_image(
        image_path=image_path,
        question=question,
    )


# ============================================================
# SIMPLE IMAGE TEST
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 60)
    print("DRUGASSIST IMAGE ANALYZER")
    print("=" * 60)

    print(
        "Vision model:",
        VISION_MODEL,
    )

    print(
        "Maximum image size:",
        f"{MAX_IMAGE_SIZE_MB} MB",
    )

    print(
        "Supported image types:"
    )

    for extension in MIME_TYPES:

        print(
            f"  {extension} -> "
            f"{MIME_TYPES[extension]}"
        )

    print()
    print(
        "Image analyzer module loaded successfully."
    )

    print("=" * 60)