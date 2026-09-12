# ============================================================
# YOUTUBE SERVICE
# DrugAssist - YouTube Data API v3
# ============================================================

import os
import json
import re

from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from difflib import SequenceMatcher
from html import unescape

from dotenv import load_dotenv


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# CONFIGURATION
# ============================================================

YOUTUBE_API_KEY = os.getenv(
    "YOUTUBE_API_KEY"
)

YOUTUBE_SEARCH_URL = (
    "https://www.googleapis.com/youtube/v3/search"
)

YOUTUBE_MAX_RESULTS = 5

# Prefer recent educational videos.
YOUTUBE_RECENCY_DAYS = 365

# Fallback when recent videos are unavailable.
YOUTUBE_FALLBACK_RECENCY_DAYS = 3650


# ============================================================
# SEARCH TOPICS
# ============================================================

TOPIC_TERMS = [
    "side effects",
    "side effect",
    "how it works",
    "mechanism",
    "interactions",
    "interaction",
    "dosage",
    "dose",
    "warnings",
    "warning",
    "precautions",
    "precaution",
    "indications",
    "indication",
    "uses",
    "use",
]


# ============================================================
# IRRELEVANT TOPICS
# ============================================================

IRRELEVANT_TERMS = [
    "covid",
    "covid-19",
    "coronavirus",
    "vaccine",
    "vaccination",
    "contraception",
    "psoriasis",
    "chemotherapy",
    "surgery",
]


# ============================================================
# HELPERS
# ============================================================

def _normalize(text):
    """
    Normalize text for comparison.
    """

    return re.sub(
        r"[^a-z0-9]",
        "",
        (text or "").lower(),
    )


def _tokenize(text):
    """
    Convert text into lowercase tokens.
    """

    return re.findall(
        r"[a-z0-9]+",
        (text or "").lower(),
    )


def _clean_text(text):
    """
    Remove HTML entities and unnecessary whitespace.
    """

    text = unescape(
        text or ""
    )

    return re.sub(
        r"\s+",
        " ",
        text,
    ).strip()


def _get_published_after(days):
    """
    Return an ISO timestamp used by YouTube API.
    """

    return (
        datetime.now(timezone.utc)
        - timedelta(days=days)
    ).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )


# ============================================================
# QUERY BUILDER
# ============================================================

def _build_query(
    drug,
    question="",
    alternative=False,
):
    """
    Build a focused YouTube search query.
    """

    drug = (
        drug or ""
    ).strip()

    question = (
        question or ""
    ).lower()

    selected_topic = None

    for term in TOPIC_TERMS:

        if term in question:

            selected_topic = term

            break

    if alternative:

        if selected_topic:

            return (
                f'"{drug}" '
                f'{selected_topic} '
                f'pharmacology'
            )

        return (
            f'"{drug}" '
            f'medication explanation'
        )

    if selected_topic:

        return (
            f'"{drug}" '
            f'{selected_topic} '
            f'medicine'
        )

    return (
        f'"{drug}" '
        f'medicine explanation'
    )


# ============================================================
# YOUTUBE API REQUEST
# ============================================================

def _request_youtube(
    query,
    published_after=None,
    max_results=10,
    order="relevance",
):
    """
    Execute a YouTube Data API search request.

    Returns:
        dict | None
    """

    if not YOUTUBE_API_KEY:

        print(
            "[YouTube] API key is missing."
        )

        return None

    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "order": order,
        "maxResults": min(
            max_results,
            50,
        ),
        "regionCode": "IN",
        "relevanceLanguage": "en",
        "safeSearch": "moderate",
        "videoEmbeddable": "true",
        "key": YOUTUBE_API_KEY,
    }

    if published_after:

        params["publishedAfter"] = (
            published_after
        )

    url = (
        YOUTUBE_SEARCH_URL
        + "?"
        + urlencode(params)
    )

    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "DrugAssist/1.0",
        },
    )

    try:

        with urlopen(
            request,
            timeout=10,
        ) as response:

            raw_data = (
                response
                .read()
                .decode("utf-8")
            )

            return json.loads(
                raw_data
            )

    except HTTPError as error:

        print(
            "[YouTube] HTTP error:",
            error.code,
        )

        try:

            error_body = (
                error
                .read()
                .decode("utf-8")
            )

            print(
                error_body[:1200]
            )

        except Exception:

            pass

        return None

    except (
        URLError,
        TimeoutError,
    ) as error:

        print(
            "[YouTube] Network/timeout error:",
            repr(error),
        )

        return None

    except Exception as error:

        print(
            "[YouTube] Unexpected error:",
            repr(error),
        )

        return None


# ============================================================
# VIDEO RELEVANCE
# ============================================================

def _video_relevance(
    video,
    drug,
):
    """
    Determine whether a video is actually about
    the requested drug.
    """

    title = (
        video.get(
            "title",
            "",
        )
        or ""
    )

    description = (
        video.get(
            "description",
            "",
        )
        or ""
    )

    text = (
        f"{title} "
        f"{description}"
    ).lower()

    normalized_text = _normalize(
        text
    )

    normalized_drug = _normalize(
        drug
    )

    # --------------------------------------------------------
    # Reject clearly unrelated medical topics.
    # --------------------------------------------------------

    for term in IRRELEVANT_TERMS:

        if term in text:

            return False

    # --------------------------------------------------------
    # Exact drug-name match.
    # --------------------------------------------------------

    if (
        normalized_drug
        and normalized_drug in normalized_text
    ):

        return True

    # --------------------------------------------------------
    # Handle small spelling variations.
    # --------------------------------------------------------

    if normalized_drug:

        title_words = _tokenize(
            title
        )

        for word in title_words:

            normalized_word = _normalize(
                word
            )

            if len(normalized_word) < 5:

                continue

            similarity = SequenceMatcher(
                None,
                normalized_word,
                normalized_drug,
            ).ratio()

            if similarity >= 0.88:

                return True

    # --------------------------------------------------------
    # Do not accept generic medical videos.
    # --------------------------------------------------------

    return False


# ============================================================
# PARSE RESULTS
# ============================================================

def _parse_videos(
    data,
    drug,
    max_results=5,
    exclude_video_ids=None,
):
    """
    Convert raw YouTube API results into
    DrugAssist video objects.
    """

    if not data:

        return []

    exclude_video_ids = set(
        exclude_video_ids or []
    )

    videos = []

    seen_ids = set()

    for item in data.get(
        "items",
        [],
    ):

        video_id = (
            item
            .get("id", {})
            .get("videoId")
        )

        if not video_id:

            continue

        # ----------------------------------------------------
        # Duplicate protection.
        # ----------------------------------------------------

        if video_id in exclude_video_ids:

            print(
                "[YouTube] Skipping "
                "previously shown video: "
                f"{video_id}"
            )

            continue

        if video_id in seen_ids:

            continue

        seen_ids.add(
            video_id
        )

        # ----------------------------------------------------
        # Snippet.
        # ----------------------------------------------------

        snippet = (
            item.get(
                "snippet",
                {},
            )
            or {}
        )

        title = _clean_text(
            snippet.get(
                "title",
                "",
            )
        )

        description = _clean_text(
            snippet.get(
                "description",
                "",
            )
        )

        channel = _clean_text(
            snippet.get(
                "channelTitle",
                "",
            )
        )

        published_at = snippet.get(
            "publishedAt"
        )

        # ----------------------------------------------------
        # Thumbnail.
        # ----------------------------------------------------

        thumbnails = (
            snippet.get(
                "thumbnails",
                {},
            )
            or {}
        )

        thumbnail = ""

        for key in (
            "high",
            "medium",
            "default",
        ):

            if key not in thumbnails:

                continue

            thumbnail = (
                thumbnails[key]
                .get(
                    "url",
                    "",
                )
                or ""
            )

            if thumbnail:

                break

        # ----------------------------------------------------
        # Normalized video object.
        # ----------------------------------------------------

        video = {
            "video_id": video_id,

            "title": title,

            "channel": channel,

            "published_at": published_at,

            "thumbnail": thumbnail,

            "url": (
                "https://www.youtube.com/"
                f"watch?v={video_id}"
            ),

            "description": description,
        }

        # ----------------------------------------------------
        # Relevance filter.
        # ----------------------------------------------------

        if not _video_relevance(
            video,
            drug,
        ):

            print(
                "[YouTube] Rejected "
                f"irrelevant video: "
                f"{title}"
            )

            continue

        videos.append(
            video
        )

        if len(videos) >= max_results:

            break

    return videos


# ============================================================
# PUBLIC SEARCH FUNCTION
# ============================================================

def search_youtube_videos(
    drug,
    question="",
    max_results=YOUTUBE_MAX_RESULTS,
    exclude_video_ids=None,
):
    """
    Search for relevant educational YouTube videos
    about a specific drug.

    This function should only be called by the RAG
    layer when the user explicitly requests videos.

    Parameters
    ----------
    drug : str
        Drug name.

    question : str
        Original user question.

    max_results : int
        Maximum number of videos.

    exclude_video_ids : list[str]
        Previously displayed video IDs.

    Returns
    -------
    list[dict]
        Relevant YouTube videos.
    """

    # --------------------------------------------------------
    # API key check.
    # --------------------------------------------------------

    if not YOUTUBE_API_KEY:

        print(
            "[YouTube] Search skipped: "
            "YOUTUBE_API_KEY is missing."
        )

        return []

    # --------------------------------------------------------
    # Drug validation.
    # --------------------------------------------------------

    drug = (
        drug or ""
    ).strip()

    if not drug:

        print(
            "[YouTube] Search skipped: "
            "drug name is empty."
        )

        return []

    # --------------------------------------------------------
    # Normalize max results.
    # --------------------------------------------------------

    try:

        max_results = int(
            max_results
        )

    except (
        TypeError,
        ValueError,
    ):

        max_results = (
            YOUTUBE_MAX_RESULTS
        )

    max_results = max(
        1,
        min(
            max_results,
            YOUTUBE_MAX_RESULTS,
        ),
    )

    # --------------------------------------------------------
    # Previously shown videos.
    # --------------------------------------------------------

    exclude_video_ids = set(
        exclude_video_ids or []
    )

    print()
    print("=" * 60)
    print("DRUGASSIST YOUTUBE SEARCH")
    print("=" * 60)

    print(
        f"Drug: {drug}"
    )

    print(
        f"Question: {question}"
    )

    print(
        "Previously shown: "
        f"{len(exclude_video_ids)}"
    )

    # ========================================================
    # SEARCH STRATEGIES
    # ========================================================

    searches = [

        # ----------------------------------------------------
        # 1. Recent + focused.
        # ----------------------------------------------------

        (
            _build_query(
                drug,
                question,
                alternative=False,
            ),

            _get_published_after(
                YOUTUBE_RECENCY_DAYS
            ),

            "relevance",
        ),

        # ----------------------------------------------------
        # 2. Recent + alternative.
        # ----------------------------------------------------

        (
            _build_query(
                drug,
                question,
                alternative=True,
            ),

            _get_published_after(
                YOUTUBE_RECENCY_DAYS
            ),

            "date",
        ),

        # ----------------------------------------------------
        # 3. Older fallback.
        # ----------------------------------------------------

        (
            _build_query(
                drug,
                question,
                alternative=False,
            ),

            _get_published_after(
                YOUTUBE_FALLBACK_RECENCY_DAYS
            ),

            "relevance",
        ),

        # ----------------------------------------------------
        # 4. Broad educational fallback.
        # ----------------------------------------------------

        (
            f'"{drug}" drug explanation',

            _get_published_after(
                YOUTUBE_FALLBACK_RECENCY_DAYS
            ),

            "relevance",
        ),
    ]

    # ========================================================
    # EXECUTE SEARCHES
    # ========================================================

    for index, (
        query,
        published_after,
        order,
    ) in enumerate(
        searches,
        1,
    ):

        print(
            f"[YouTube] Search {index}: "
            f"{query}"
        )

        data = _request_youtube(
            query=query,
            published_after=published_after,
            max_results=max(
                10,
                max_results * 3,
            ),
            order=order,
        )

        videos = _parse_videos(
            data,
            drug,
            max_results=max_results,
            exclude_video_ids=(
                exclude_video_ids
            ),
        )

        if videos:

            print(
                "[YouTube] Returning "
                f"{len(videos)} "
                "relevant videos."
            )

            return videos

    # ========================================================
    # NOTHING FOUND
    # ========================================================

    print(
        "[YouTube] No sufficiently "
        "relevant videos found."
    )

    return []


# ============================================================
# MODULE TEST
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 60)
    print("DRUGASSIST YOUTUBE SERVICE TEST")
    print("=" * 60)

    if not YOUTUBE_API_KEY:

        print()
        print(
            "YOUTUBE_API_KEY is not configured."
        )

        print(
            "The module itself is valid, "
            "but live YouTube search cannot "
            "be tested without the API key."
        )

    else:

        print()
        print(
            "YOUTUBE_API_KEY: configured"
        )

        test_drug = "Losartan Potassium"

        test_question = (
            "Show me a YouTube video "
            "explaining Losartan Potassium."
        )

        videos = search_youtube_videos(
            drug=test_drug,
            question=test_question,
            max_results=5,
        )

        print()
        print(
            f"Videos returned: {len(videos)}"
        )

        for index, video in enumerate(
            videos,
            1,
        ):

            print()
            print(
                f"Video {index}:"
            )

            print(
                "Title:",
                video.get("title"),
            )

            print(
                "Channel:",
                video.get("channel"),
            )

            print(
                "Published:",
                video.get("published_at"),
            )

            print(
                "URL:",
                video.get("url"),
            )

    print()
    print("=" * 60)
    print("YOUTUBE SERVICE TEST COMPLETED")
    print("=" * 60)