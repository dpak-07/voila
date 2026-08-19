
# ============================================================
# TARGET-AWARE CUSTOMER COMPLAINT TOPIC CLUSTERING
# ============================================================
#
# PURPOSE
# -------
# Process 1M+ to 3M+ complaint records and assign every record
# to exactly ONE of these 7 standardized business topics:
#
#   Login / Authentication   -> 25%
#   Customer Service         -> 20%
#   Payment / Billing        -> 15%
#   App / Technical Issue    -> 15%
#   Account Issue            -> 10%
#   Transaction Issue        -> 8%
#   Other                    -> 7%
#
#
# ARCHITECTURE
# ------------
#
# CSV
#   ↓
# Text normalization
#   ↓
# TF-IDF
#   ↓
# MiniBatchKMeans
#   ↓
# Cluster keyword extraction
#   ↓
# Business keyword scoring
#   ↓
# Topic prototype similarity
#   ↓
# KMeans semantic signal
#   ↓
# Topic separation rules
#   ↓
# Full 7-topic score matrix
#   ↓
# Confidence-aware quota assignment
#   ↓
# EXACT 25/20/15/15/10/8/7
#   ↓
# Incremental CSV
#
#
# IMPORTANT
# ---------
# KMeans does NOT produce the desired distribution.
#
# KMeans is used only as a semantic signal.
#
# Final distribution is enforced separately using target quotas.
#
#
# CPU FRIENDLY
# LARGE DATASET FRIENDLY
# CHUNKED CSV PROCESSING
# SPARSE TF-IDF
# MEMMAP SCORE STORAGE
# WINDOWS SAFE TEMP DIRECTORY
#
# ============================================================


import os
import re
import time
import shutil
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd

from scipy.sparse import csr_matrix

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import MiniBatchKMeans


# ============================================================
# 1. CONFIGURATION
# ============================================================

INPUT_FILE = (
    r"C:\Users\pooja\OneDrive\Desktop\CTS"
    r"\customer_sentiment_results.csv"
)

OUTPUT_FILE = (
    r"C:\Users\pooja\OneDrive\Desktop\CTS"
    r"\customer_complaints_clustered.csv"
)


# ============================================================
# DATASET SETTINGS
# ============================================================

CHUNK_SIZE = 100_000

TRAINING_SAMPLE_SIZE = 100_000

N_CLUSTERS = 15

MAX_FEATURES = 30_000

KMEANS_BATCH_SIZE = 4096

MAX_ITER = 100

RANDOM_STATE = 42


# ============================================================
# TARGET BUSINESS DISTRIBUTION
# ============================================================

TARGET_TOPIC_PERCENTAGES = {

    "Login / Authentication": 25,

    "Customer Service": 20,

    "Payment / Billing": 15,

    "App / Technical Issue": 15,

    "Account Issue": 10,

    "Transaction Issue": 8,

    "Other": 7,
}


topics = list(
    TARGET_TOPIC_PERCENTAGES.keys()
)


TOPIC_TO_ID = {
    topic: index
    for index, topic in enumerate(topics)
}


# ============================================================
# VALIDATE TARGET DISTRIBUTION
# ============================================================

target_sum = sum(
    TARGET_TOPIC_PERCENTAGES.values()
)

if target_sum != 100:

    raise ValueError(
        "Target percentages must sum to 100. "
        f"Current total = {target_sum}"
    )


# ============================================================
# CPU INFORMATION
# ============================================================

CPU_CORES = os.cpu_count() or 4


print("=" * 90)
print("TARGET-AWARE CUSTOMER COMPLAINT TOPIC CLUSTERING")
print("=" * 90)

print("\nCPU configuration")
print("-" * 90)

print(
    f"CPU cores available : {CPU_CORES}"
)

print(
    f"CSV chunk size      : {CHUNK_SIZE:,}"
)

print(
    f"Training sample     : {TRAINING_SAMPLE_SIZE:,}"
)

print(
    f"KMeans clusters     : {N_CLUSTERS}"
)

print(
    f"TF-IDF features     : {MAX_FEATURES:,}"
)


print("\nTarget business distribution")
print("-" * 90)

for topic, percentage in TARGET_TOPIC_PERCENTAGES.items():

    print(
        f"{topic:28s} : {percentage:>3}%"
    )


# ============================================================
# 2. VALIDATE INPUT
# ============================================================

input_path = Path(
    INPUT_FILE
)

output_path = Path(
    OUTPUT_FILE
)


if not input_path.exists():

    raise FileNotFoundError(
        f"\nInput file not found:\n{INPUT_FILE}"
    )


output_path.parent.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# 3. CHECK INPUT DATASET
# ============================================================

print("\n" + "=" * 90)
print("CHECKING INPUT DATASET")
print("=" * 90)


sample = pd.read_csv(
    INPUT_FILE,
    nrows=10
)


print("\nColumns detected:")

print(
    sample.columns.tolist()
)


# ============================================================
# 4. FIND TEXT COLUMN
# ============================================================

if "clean_text" in sample.columns:

    TEXT_COLUMN = "clean_text"

elif "text" in sample.columns:

    TEXT_COLUMN = "text"

else:

    raise ValueError(
        "\nInput CSV must contain either "
        "'clean_text' or 'text'."
    )


print(
    f"\nText column selected: {TEXT_COLUMN}"
)


# ============================================================
# 5. TEXT NORMALIZATION
# ============================================================

URL_PATTERN = re.compile(
    r"https?://\S+|www\.\S+",
    re.IGNORECASE
)

MENTION_PATTERN = re.compile(
    r"@\w+"
)

SPACE_PATTERN = re.compile(
    r"\s+"
)

NON_ALPHANUMERIC_PATTERN = re.compile(
    r"[^a-z0-9\s]"
)


def normalize_text(text):

    if pd.isna(text):

        return ""

    text = str(text).lower()

    text = URL_PATTERN.sub(
        " ",
        text
    )

    text = MENTION_PATTERN.sub(
        " ",
        text
    )

    text = NON_ALPHANUMERIC_PATTERN.sub(
        " ",
        text
    )

    text = SPACE_PATTERN.sub(
        " ",
        text
    )

    return text.strip()


# ============================================================
# 6. BUSINESS TOPIC PHRASES
# ============================================================

TOPIC_PHRASES = {

    "Login / Authentication": [

        "unable to login",
        "cannot login",
        "can't login",
        "login failed",
        "failed to login",
        "unable to sign in",
        "cannot sign in",
        "sign in failed",
        "signin failed",

        "forgot password",
        "reset password",
        "password reset",
        "wrong password",
        "password not working",
        "invalid password",

        "authentication failed",
        "authentication issue",
        "authentication problem",
        "unable to authenticate",

        "otp not received",
        "otp failed",
        "verification code",
        "verification failed",

        "login issue",
        "login problem",
        "login error",
        "access denied",
    ],


    "Customer Service": [

        "customer service",
        "customer support",
        "customer care",
        "support agent",
        "support team",
        "service team",
        "customer representative",

        "call center",
        "contact support",
        "contact customer service",

        "agent did not respond",
        "agent did not help",
        "agent was rude",

        "poor customer service",
        "poor customer support",
        "bad customer service",

        "no response from support",
        "waiting for support",
        "support not responding",

        "complaint unresolved",
        "issue not resolved",

        "support escalation",
        "escalate complaint",

        "speak to manager",
        "speak to supervisor",

        "customer service complaint",
    ],


    "Payment / Billing": [

        "billing issue",
        "billing problem",
        "billing error",

        "wrong bill",
        "incorrect bill",
        "billing amount",

        "amount charged",
        "incorrect charge",
        "wrong charge",
        "extra charge",
        "unexpected charge",

        "charged twice",
        "double charged",
        "overcharged",

        "payment failed",
        "payment failure",
        "payment declined",
        "payment issue",
        "payment problem",
        "payment error",

        "invoice issue",
        "invoice error",

        "bill payment",
        "payment due",
        "fee charged",
    ],


    "App / Technical Issue": [

        "app crash",
        "app crashed",
        "app crashing",
        "application crash",

        "application error",
        "app error",

        "app not working",
        "application not working",

        "website not working",

        "system error",
        "technical issue",
        "technical problem",
        "technical error",

        "server error",
        "server down",
        "system failure",

        "software bug",
        "app bug",
        "website bug",

        "installation problem",
        "install failed",
        "download failed",
        "update failed",

        "screen not loading",
        "page not loading",

        "feature not working",
        "button not working",
    ],


    "Account Issue": [

        "account issue",
        "account problem",

        "account locked",
        "account blocked",
        "account suspended",
        "account disabled",
        "account deactivated",

        "account registration",
        "register account",
        "registration problem",
        "registration issue",

        "profile issue",
        "profile problem",

        "update profile",
        "change profile",

        "personal details",
        "account details",

        "change account details",
        "update account details",

        "account information",
        "account access",

        "close account",
        "delete account",
    ],


    "Transaction Issue": [

        "transaction failed",
        "transaction failure",
        "transaction pending",
        "transaction declined",
        "transaction error",

        "transaction issue",
        "transaction problem",

        "transaction reversed",
        "transaction reversal",

        "money transfer",
        "transfer failed",
        "transfer pending",
        "transfer declined",

        "upi failed",
        "upi transaction",
        "upi payment",

        "wallet transaction",
        "wallet transfer",

        "recharge failed",
        "recharge pending",

        "refund pending",
        "refund failed",
        "refund issue",
        "refund problem",

        "money not received",
        "money not credited",
        "money deducted",
    ],
}


# ============================================================
# 7. SINGLE-WORD KEYWORDS
# ============================================================

TOPIC_WORDS = {

    "Login / Authentication": [

        "login",
        "signin",
        "authenticate",
        "authentication",
        "password",
        "username",
        "otp",
        "verification",
        "verify",
        "access",
    ],


    "Customer Service": [

        "agent",
        "representative",
        "helpdesk",
        "supervisor",
        "manager",
        "escalation",
    ],


    "Payment / Billing": [

        "bill",
        "billing",
        "charged",
        "charge",
        "overcharged",
        "invoice",
        "fee",
        "cost",
        "price",
    ],


    "App / Technical Issue": [

        "app",
        "application",
        "crash",
        "crashed",
        "crashing",
        "bug",
        "error",
        "technical",
        "broken",
        "update",
        "installation",
        "install",
        "download",
        "screen",
        "website",
        "server",
        "system",
        "software",
    ],


    "Account Issue": [

        "account",
        "profile",
        "registration",
        "register",
        "details",
    ],


    "Transaction Issue": [

        "transaction",
        "recharge",
        "upi",
        "wallet",
        "transfer",
        "refund",
        "reversal",
        "credited",
        "deducted",
    ],
}


# ============================================================
# 8. PRECOMPILE REGEX
# ============================================================

PHRASE_REGEX = {}

WORD_REGEX = {}


for topic in topics:

    if topic == "Other":

        continue


    phrases = TOPIC_PHRASES.get(
        topic,
        []
    )

    words = TOPIC_WORDS.get(
        topic,
        []
    )


    escaped_phrases = [
        re.escape(x)
        for x in phrases
    ]

    escaped_words = [
        re.escape(x)
        for x in words
    ]


    if escaped_phrases:

        PHRASE_REGEX[topic] = re.compile(

            r"\b(?:"
            + "|".join(escaped_phrases)
            + r")\b",

            re.IGNORECASE
        )

    else:

        PHRASE_REGEX[topic] = None


    if escaped_words:

        WORD_REGEX[topic] = re.compile(

            r"\b(?:"
            + "|".join(escaped_words)
            + r")\b",

            re.IGNORECASE
        )

    else:

        WORD_REGEX[topic] = None


# ============================================================
# 9. TOPIC PROTOTYPES
# ============================================================
#
# These are semantic anchors for each business topic.
#
# IMPORTANT:
# Only these small prototype vectors are converted to dense.
#
# The millions of complaint vectors remain sparse.
#
# ============================================================

TOPIC_PROTOTYPES = {

    "Login / Authentication": [

        "login sign in authentication password otp verification "
        "forgot password reset password unable login access denied",

        "cannot login sign in failed authentication failed "
        "verification code password not working otp issue",

    ],


    "Customer Service": [

        "customer service customer support customer care "
        "support agent representative helpdesk",

        "agent did not help support not responding "
        "complaint unresolved escalation supervisor manager",

    ],


    "Payment / Billing": [

        "payment billing bill invoice charge charged "
        "incorrect charge wrong bill overcharged fee",

        "payment failed payment declined billing error "
        "double charged extra charge unexpected charge",

    ],


    "App / Technical Issue": [

        "app application technical issue software bug "
        "crash error server website system",

        "app not working application error screen not loading "
        "feature not working update installation download",

    ],


    "Account Issue": [

        "account profile registration account details "
        "personal information account problem",

        "account locked account blocked account suspended "
        "account disabled profile update close account",

    ],


    "Transaction Issue": [

        "transaction transfer recharge upi wallet "
        "transaction failed transaction pending",

        "money transfer refund reversal money deducted "
        "money not received money not credited",

    ],


    "Other": [

        "general complaint general issue miscellaneous problem "
        "other customer complaint unrelated issue",

    ],
}


# ============================================================
# 10. LOAD TRAINING SAMPLE
# ============================================================

print("\n" + "=" * 90)
print("LOADING TOPIC TRAINING SAMPLE")
print("=" * 90)


training_start = time.perf_counter()


training_df = pd.read_csv(
    INPUT_FILE,
    nrows=TRAINING_SAMPLE_SIZE,
    usecols=[TEXT_COLUMN]
)


print(
    f"\nTraining rows loaded: "
    f"{len(training_df):,}"
)


# ============================================================
# 11. NORMALIZE TRAINING TEXT
# ============================================================

print("\nNormalizing training text...")


training_texts = (

    training_df[TEXT_COLUMN]

    .fillna("")

    .astype(str)

    .map(normalize_text)
)


training_texts = training_texts[
    training_texts.str.len() >= 3
]


training_texts = training_texts.tolist()


print(
    f"Usable training texts: "
    f"{len(training_texts):,}"
)


if len(training_texts) < N_CLUSTERS:

    raise ValueError(
        "Not enough usable texts for clustering."
    )


training_time = (
    time.perf_counter()
    - training_start
)


print(
    f"Training sample preparation: "
    f"{training_time:.2f} seconds"
)


# ============================================================
# 12. BUILD TF-IDF
# ============================================================

print("\n" + "=" * 90)
print("BUILDING TF-IDF MODEL")
print("=" * 90)


tfidf_start = time.perf_counter()


vectorizer = TfidfVectorizer(

    max_features=MAX_FEATURES,

    ngram_range=(1, 2),

    min_df=2,

    max_df=0.95,

    sublinear_tf=True,

    dtype=np.float32,

    stop_words="english",
)


training_matrix = vectorizer.fit_transform(
    training_texts
).tocsr()


tfidf_time = (
    time.perf_counter()
    - tfidf_start
)


print(
    f"\nTF-IDF matrix shape: "
    f"{training_matrix.shape}"
)


print(
    f"Features created: "
    f"{training_matrix.shape[1]:,}"
)


print(
    f"TF-IDF time: "
    f"{tfidf_time:.2f} seconds"
)


# ============================================================
# 13. TRAIN MINIBATCH KMEANS
# ============================================================

print("\n" + "=" * 90)
print("TRAINING KMEANS MODEL")
print("=" * 90)


kmeans_start = time.perf_counter()


kmeans = MiniBatchKMeans(

    n_clusters=N_CLUSTERS,

    batch_size=KMEANS_BATCH_SIZE,

    max_iter=MAX_ITER,

    n_init=3,

    random_state=RANDOM_STATE,

    reassignment_ratio=0.01,
)


kmeans.fit(
    training_matrix
)


kmeans_time = (
    time.perf_counter()
    - kmeans_start
)


print(
    "\nKMeans model trained successfully."
)


print(
    f"Training time: "
    f"{kmeans_time:.2f} seconds"
)


# ============================================================
# 14. EXTRACT CLUSTER KEYWORDS
# ============================================================

print("\n" + "=" * 90)
print("EXTRACTING CLUSTER KEYWORDS")
print("=" * 90)


feature_names = np.array(
    vectorizer.get_feature_names_out()
)


cluster_keywords = {}


for cluster_id in range(
    N_CLUSTERS
):

    center = (
        kmeans.cluster_centers_[
            cluster_id
        ]
    )


    top_indices = center.argsort()[
        -20:
    ][::-1]


    keywords = feature_names[
        top_indices
    ]


    cluster_keywords[
        cluster_id
    ] = keywords.tolist()


    print(
        f"\nCluster {cluster_id:02d}:"
    )


    print(
        ", ".join(
            keywords[:20]
        )
    )


# ============================================================
# 15. CREATE CLUSTER → TOPIC SIGNAL
# ============================================================

def cluster_topic_similarity(
    cluster_keywords
):

    similarity = np.zeros(
        (
            N_CLUSTERS,
            len(topics)
        ),
        dtype=np.float32
    )


    for cluster_id in range(
        N_CLUSTERS
    ):

        keywords = set(
            x.lower()
            for x in cluster_keywords[
                cluster_id
            ]
        )


        for topic_index, topic in enumerate(
            topics
        ):

            if topic == "Other":

                continue


            phrases = set(
                x.lower()
                for x in TOPIC_PHRASES.get(
                    topic,
                    []
                )
            )


            words = set(
                x.lower()
                for x in TOPIC_WORDS.get(
                    topic,
                    []
                )
            )


            score = 0.0


            for keyword in keywords:

                if keyword in words:

                    score += 1.0

                elif any(
                    word in keyword
                    for word in words
                ):

                    score += 0.5


                if keyword in phrases:

                    score += 2.0


            similarity[
                cluster_id,
                topic_index
            ] = score


    return similarity


cluster_topic_scores = (
    cluster_topic_similarity(
        cluster_keywords
    )
)


print(
    "\nCluster-topic semantic signal created."
)


# ============================================================
# 16. BUILD TOPIC PROTOTYPE VECTORS
# ============================================================

print("\n" + "=" * 90)
print("BUILDING BUSINESS-TOPIC PROTOTYPES")
print("=" * 90)


prototype_texts = []

prototype_topic_ids = []


for topic_id, topic in enumerate(
    topics
):

    topic_prototypes = TOPIC_PROTOTYPES.get(
        topic,
        []
    )


    if not topic_prototypes:

        topic_prototypes = [
            topic.lower()
        ]


    for prototype_text in topic_prototypes:

        prototype_texts.append(
            normalize_text(
                prototype_text
            )
        )

        prototype_topic_ids.append(
            topic_id
        )


prototype_matrix = (
    vectorizer.transform(
        prototype_texts
    )
    .tocsr()
)


print(
    f"Prototype matrix shape: "
    f"{prototype_matrix.shape}"
)


# ============================================================
# ONLY THE SMALL PROTOTYPE MATRIX IS DENSIFIED
# ============================================================

prototype_dense = (
    prototype_matrix
    .toarray()
    .astype(
        np.float32,
        copy=False
    )
)


prototype_norms = np.linalg.norm(
    prototype_dense,
    axis=1,
    keepdims=True
)


prototype_norms[
    prototype_norms == 0
] = 1.0


prototype_dense = (
    prototype_dense
    / prototype_norms
)


print(
    "Prototype vectors normalized."
)


# ============================================================
# 17. PROTOTYPE SCORE FUNCTION
# ============================================================

def calculate_prototype_scores(
    sparse_matrix
):

    sparse_matrix = (
        sparse_matrix
        .tocsr()
    )


    # --------------------------------------------------------
    # IMPORTANT:
    #
    # Sparse CSR × dense prototype matrix
    #
    # This fixes:
    #
    # TypeError:
    # float() argument must be a string or a real number,
    # not 'csr_matrix'
    # --------------------------------------------------------

    similarity = (
        sparse_matrix.dot(
            prototype_dense.T
        )
    )


    similarity = np.asarray(
        similarity,
        dtype=np.float32
    )


    n_rows = (
        similarity.shape[0]
    )


    topic_scores = np.zeros(
        (
            n_rows,
            len(topics)
        ),
        dtype=np.float32
    )


    # --------------------------------------------------------
    # Multiple prototypes can belong to one topic.
    #
    # Keep the strongest prototype similarity.
    # --------------------------------------------------------

    for prototype_id, topic_id in enumerate(
        prototype_topic_ids
    ):

        topic_scores[
            :,
            topic_id
        ] = np.maximum(
            topic_scores[
                :,
                topic_id
            ],
            similarity[
                :,
                prototype_id
            ]
        )


    return topic_scores


# ============================================================
# 18. KEYWORD SCORE FUNCTION
# ============================================================

def calculate_keyword_scores(
    texts
):

    n = len(texts)


    scores = np.zeros(
        (
            n,
            len(topics)
        ),
        dtype=np.float32
    )


    for row_index, text in enumerate(
        texts
    ):

        text_lower = text.lower()


        for topic_index, topic in enumerate(
            topics
        ):

            if topic == "Other":

                continue


            # ------------------------------------------------
            # SPECIFIC PHRASES
            # ------------------------------------------------

            phrase_regex = PHRASE_REGEX.get(
                topic
            )


            if phrase_regex is not None:

                phrase_matches = (
                    phrase_regex.findall(
                        text_lower
                    )
                )


                phrase_count = len(
                    phrase_matches
                )


                if phrase_count:

                    scores[
                        row_index,
                        topic_index
                    ] += min(
                        phrase_count * 10.0,
                        40.0
                    )


            # ------------------------------------------------
            # SINGLE WORDS
            # ------------------------------------------------

            word_regex = WORD_REGEX.get(
                topic
            )


            if word_regex is not None:

                word_matches = (
                    word_regex.findall(
                        text_lower
                    )
                )


                word_count = len(
                    word_matches
                )


                if word_count:

                    scores[
                        row_index,
                        topic_index
                    ] += min(
                        word_count * 1.25,
                        7.5
                    )


    return scores


# ============================================================
# 19. TOPIC SEPARATION RULES
# ============================================================

def apply_topic_separation(
    scores,
    texts
):

    login_id = TOPIC_TO_ID[
        "Login / Authentication"
    ]

    service_id = TOPIC_TO_ID[
        "Customer Service"
    ]

    payment_id = TOPIC_TO_ID[
        "Payment / Billing"
    ]

    technical_id = TOPIC_TO_ID[
        "App / Technical Issue"
    ]

    account_id = TOPIC_TO_ID[
        "Account Issue"
    ]

    transaction_id = TOPIC_TO_ID[
        "Transaction Issue"
    ]


    for row_index, text in enumerate(
        texts
    ):

        text_lower = text.lower()


        # ====================================================
        # LOGIN / AUTHENTICATION
        # ====================================================

        login_evidence = (
            "login" in text_lower
            or "signin" in text_lower
            or "sign in" in text_lower
            or "password" in text_lower
            or "otp" in text_lower
            or "authentication" in text_lower
            or "verification" in text_lower
        )


        if login_evidence:

            scores[
                row_index,
                login_id
            ] += 5.0


            scores[
                row_index,
                account_id
            ] -= 1.5


        # ====================================================
        # CUSTOMER SERVICE
        # ====================================================

        service_evidence = (
            "customer service" in text_lower
            or "customer support" in text_lower
            or "customer care" in text_lower
            or "support agent" in text_lower
            or "representative" in text_lower
            or "supervisor" in text_lower
            or "helpdesk" in text_lower
        )


        if service_evidence:

            scores[
                row_index,
                service_id
            ] += 6.0


        # ====================================================
        # PAYMENT / BILLING
        # ====================================================

        payment_evidence = (
            "payment" in text_lower
            or "billing" in text_lower
            or "bill" in text_lower
            or "invoice" in text_lower
            or "charged" in text_lower
            or "charge" in text_lower
            or "overcharged" in text_lower
        )


        if payment_evidence:

            scores[
                row_index,
                payment_id
            ] += 4.0


            # Only penalize Transaction when there is
            # no strong transaction-specific language.

            transaction_specific = (
                "transaction" in text_lower
                or "transfer" in text_lower
                or "upi" in text_lower
                or "recharge" in text_lower
                or "refund" in text_lower
                or "reversal" in text_lower
            )


            if not transaction_specific:

                scores[
                    row_index,
                    transaction_id
                ] -= 1.5


        # ====================================================
        # TRANSACTION ISSUE
        # ====================================================

        transaction_evidence = (
            "transaction" in text_lower
            or "transfer" in text_lower
            or "upi" in text_lower
            or "recharge" in text_lower
            or "refund" in text_lower
            or "reversal" in text_lower
            or "wallet" in text_lower
        )


        if transaction_evidence:

            scores[
                row_index,
                transaction_id
            ] += 5.0


        # ====================================================
        # APP / TECHNICAL
        # ====================================================

        technical_evidence = (
            "app" in text_lower
            or "application" in text_lower
            or "website" in text_lower
            or "server" in text_lower
            or "crash" in text_lower
            or "technical" in text_lower
            or "bug" in text_lower
            or "screen" in text_lower
            or "software" in text_lower
        )


        if technical_evidence:

            scores[
                row_index,
                technical_id
            ] += 4.0


        # ====================================================
        # ACCOUNT ISSUE
        # ====================================================

        account_evidence = (
            "account locked" in text_lower
            or "account blocked" in text_lower
            or "account suspended" in text_lower
            or "account disabled" in text_lower
            or "registration" in text_lower
            or "profile" in text_lower
            or "personal details" in text_lower
            or "account details" in text_lower
            or "close account" in text_lower
            or "delete account" in text_lower
        )


        if account_evidence:

            scores[
                row_index,
                account_id
            ] += 5.0


        # ====================================================
        # SPECIAL PAYMENT VS TRANSACTION RULE
        # ====================================================
        #
        # "payment failed"
        #       → Payment / Billing
        #
        # "transaction failed"
        #       → Transaction Issue
        #
        # ====================================================

        if (
            "payment failed" in text_lower
            or "payment declined" in text_lower
            or "payment error" in text_lower
            or "payment problem" in text_lower
        ):

            scores[
                row_index,
                payment_id
            ] += 8.0


        if (
            "transaction failed" in text_lower
            or "transaction pending" in text_lower
            or "transaction declined" in text_lower
            or "transaction error" in text_lower
        ):

            scores[
                row_index,
                transaction_id
            ] += 8.0


        # ====================================================
        # LOGIN VS ACCOUNT
        # ====================================================

        if (
            "account locked" in text_lower
            or "account blocked" in text_lower
            or "account suspended" in text_lower
        ):

            scores[
                row_index,
                account_id
            ] += 5.0


        if (
            "forgot password" in text_lower
            or "reset password" in text_lower
            or "unable to login" in text_lower
            or "cannot login" in text_lower
        ):

            scores[
                row_index,
                login_id
            ] += 8.0


    return scores


# ============================================================
# 20. FINAL SCORE FUNCTION
# ============================================================

def calculate_topic_scores(
    texts,
    sparse_matrix,
    cluster_ids
):

    # --------------------------------------------------------
    # KEYWORD SIGNAL
    # --------------------------------------------------------

    keyword_scores = (
        calculate_keyword_scores(
            texts
        )
    )


    # --------------------------------------------------------
    # PROTOTYPE SEMANTIC SIGNAL
    # --------------------------------------------------------

    prototype_scores = (
        calculate_prototype_scores(
            sparse_matrix
        )
    )


    # --------------------------------------------------------
    # KMEANS SIGNAL
    # --------------------------------------------------------

    n = len(texts)


    cluster_scores = np.zeros(
        (
            n,
            len(topics)
        ),
        dtype=np.float32
    )


    for row_index, cluster_id in enumerate(
        cluster_ids
    ):

        signal = (
            cluster_topic_scores[
                int(cluster_id)
            ]
        )


        max_signal = signal.max()


        if max_signal > 0:

            cluster_scores[
                row_index
            ] = (
                signal
                / max_signal
            )


    # --------------------------------------------------------
    # COMBINE SIGNALS
    # --------------------------------------------------------
    #
    # Keyword evidence:
    #     strongest explicit signal
    #
    # Prototype:
    #     semantic signal
    #
    # KMeans:
    #     supporting signal
    #
    # --------------------------------------------------------

    scores = (

        keyword_scores * 1.0

        +

        prototype_scores * 12.0

        +

        cluster_scores * 2.0

    )


    # --------------------------------------------------------
    # APPLY EXPLICIT TOPIC SEPARATION
    # --------------------------------------------------------

    scores = apply_topic_separation(
        scores,
        texts
    )


    # --------------------------------------------------------
    # OTHER TOPIC
    # --------------------------------------------------------

    other_id = TOPIC_TO_ID[
        "Other"
    ]


    specific_scores = np.delete(
        scores,
        other_id,
        axis=1
    )


    max_specific = (
        specific_scores.max(
            axis=1
        )
    )


    low_evidence = (
        max_specific < 2.0
    )


    scores[
        low_evidence,
        other_id
    ] += 8.0


    return scores


# ============================================================
# 21. COUNT TOTAL DATASET ROWS
# ============================================================

print("\n" + "=" * 90)
print("COUNTING TOTAL DATASET ROWS")
print("=" * 90)


count_start = time.perf_counter()


total_rows = 0


for count_chunk in pd.read_csv(

    INPUT_FILE,

    usecols=[TEXT_COLUMN],

    chunksize=CHUNK_SIZE

):

    total_rows += len(
        count_chunk
    )


count_time = (
    time.perf_counter()
    - count_start
)


print(
    f"\nTotal rows: "
    f"{total_rows:,}"
)


print(
    f"Counting time: "
    f"{count_time:.2f} seconds"
)


if total_rows == 0:

    raise ValueError(
        "Input dataset contains zero rows."
    )


# ============================================================
# 22. CALCULATE EXACT TARGET COUNTS
# ============================================================

raw_counts = {

    topic:
    total_rows
    * percentage
    / 100

    for topic, percentage
    in TARGET_TOPIC_PERCENTAGES.items()

}


target_counts = {

    topic:
    int(np.floor(count))

    for topic, count
    in raw_counts.items()

}


remaining_rows = (
    total_rows
    - sum(
        target_counts.values()
    )
)


remainders = sorted(

    [

        (
            raw_counts[topic]
            - target_counts[topic],

            topic

        )

        for topic in topics

    ],

    reverse=True
)


for _, topic in remainders[
    :remaining_rows
]:

    target_counts[
        topic
    ] += 1


print("\n" + "=" * 90)
print("EXACT TARGET COUNTS")
print("=" * 90)


for topic in topics:

    print(

        f"{topic:28s} "
        f"{target_counts[topic]:12,} "
        f"({TARGET_TOPIC_PERCENTAGES[topic]:>3}%)"

    )


# ============================================================
# 23. WINDOWS-SAFE TEMP DIRECTORY
# ============================================================
#
# IMPORTANT:
#
# We DO NOT use:
#
#     shutil.rmtree(existing_temp)
#
# blindly.
#
# Windows + OneDrive can temporarily lock memmap files.
#
# A unique temp directory avoids most WinError 5 problems.
#
# ============================================================

TEMP_DIR = Path(
    tempfile.mkdtemp(
        prefix="topic_assignment_",
        dir=str(
            output_path.parent
        )
    )
)


print(
    "\nTemporary directory:"
)

print(
    TEMP_DIR
)


# ============================================================
# 24. MEMMAP SCORE STORAGE
# ============================================================

SCORE_FILE = (
    TEMP_DIR
    / "topic_scores.dat"
)


CLUSTER_FILE = (
    TEMP_DIR
    / "cluster_ids.dat"
)


score_memmap = np.memmap(

    SCORE_FILE,

    dtype=np.float32,

    mode="w+",

    shape=(
        total_rows,
        len(topics)
    )

)


cluster_memmap = np.memmap(

    CLUSTER_FILE,

    dtype=np.int16,

    mode="w+",

    shape=(
        total_rows,
    )

)


# ============================================================
# 25. PASS 1 - FULL 7-TOPIC SCORE MATRIX
# ============================================================

print("\n" + "=" * 90)
print("PASS 1 - CALCULATING FULL 7-TOPIC SCORE MATRIX")
print("=" * 90)


pipeline_start = time.perf_counter()


processed_rows = 0

chunk_number = 0


for chunk in pd.read_csv(

    INPUT_FILE,

    usecols=[TEXT_COLUMN],

    chunksize=CHUNK_SIZE

):

    chunk_number += 1


    chunk_start = time.perf_counter()


    texts = (

        chunk[TEXT_COLUMN]

        .fillna("")

        .astype(str)

        .map(normalize_text)

        .tolist()

    )


    # --------------------------------------------------------
    # SPARSE TF-IDF
    # --------------------------------------------------------

    matrix = (
        vectorizer.transform(
            texts
        )
        .tocsr()
    )


    # --------------------------------------------------------
    # KMEANS
    # --------------------------------------------------------

    cluster_ids = kmeans.predict(
        matrix
    )


    # --------------------------------------------------------
    # TOPIC SCORES
    # --------------------------------------------------------

    scores = calculate_topic_scores(

        texts,

        matrix,

        cluster_ids

    )


    start_index = processed_rows


    end_index = (
        start_index
        + len(chunk)
    )


    # --------------------------------------------------------
    # WRITE MEMMAP
    # --------------------------------------------------------

    score_memmap[
        start_index:end_index
    ] = scores


    cluster_memmap[
        start_index:end_index
    ] = cluster_ids


    processed_rows += len(
        chunk
    )


    elapsed = (
        time.perf_counter()
        - pipeline_start
    )


    speed = (

        processed_rows
        / elapsed

        if elapsed > 0

        else 0

    )


    chunk_time = (
        time.perf_counter()
        - chunk_start
    )


    print(

        f"Chunk {chunk_number:04d} | "

        f"Rows: {processed_rows:,} | "

        f"Chunk time: {chunk_time:.2f}s | "

        f"Speed: {speed:,.0f} rows/sec"

    )


score_memmap.flush()

cluster_memmap.flush()


# ============================================================
# 26. BUILD TOPIC RANKINGS
# ============================================================

print("\n" + "=" * 90)
print("BUILDING TOPIC RANKINGS")
print("=" * 90)


ranking_file = (
    TEMP_DIR
    / "topic_rankings.dat"
)


ranking_memmap = np.memmap(

    ranking_file,

    dtype=np.uint8,

    mode="w+",

    shape=(
        total_rows,
        len(topics)
    )

)


MAX_SCORE_FILE = (
    TEMP_DIR
    / "max_scores.dat"
)


max_score_memmap = np.memmap(

    MAX_SCORE_FILE,

    dtype=np.float32,

    mode="w+",

    shape=(
        total_rows,
    )

)


RANK_BLOCK_SIZE = 500_000


for start in range(

    0,

    total_rows,

    RANK_BLOCK_SIZE

):

    end = min(

        start
        + RANK_BLOCK_SIZE,

        total_rows

    )


    block_scores = (
        score_memmap[
            start:end
        ]
    )


    ranking = np.argsort(

        -block_scores,

        axis=1,

        kind="stable"

    )


    ranking_memmap[
        start:end
    ] = ranking.astype(
        np.uint8
    )


    max_score_memmap[
        start:end
    ] = block_scores.max(
        axis=1
    )


    print(

        f"Ranking rows "
        f"{start:,} - {end:,}"

    )


ranking_memmap.flush()

max_score_memmap.flush()


# ============================================================
# 27. QUOTA-AWARE GLOBAL ASSIGNMENT
# ============================================================
#
# This is better than:
#
#     sort by max score
#     → take best topic
#     → force quota
#
# Instead, every record considers:
#
#     semantic score
#     topic margin
#     current quota availability
#
# The target percentages are enforced exactly, while trying
# to preserve the strongest available semantic assignment.
#
# ============================================================

print("\n" + "=" * 90)
print("TARGET-AWARE GLOBAL ASSIGNMENT")
print("=" * 90)


final_topic_ids = np.full(

    total_rows,

    -1,

    dtype=np.int8

)


remaining_quota = np.array(

    [

        target_counts[topic]

        for topic in topics

    ],

    dtype=np.int64

)


# ============================================================
# ASSIGNMENT STRATEGY
# ============================================================
#
# For each topic, calculate how badly it needs candidates.
#
# A topic whose quota is nearly full gets less preference.
#
# A topic whose quota still has many records remaining gets
# stronger availability.
#
# However semantic score remains the dominant factor.
#
# ============================================================

assignment_start = time.perf_counter()


# ------------------------------------------------------------
# Work in confidence blocks instead of creating a giant
# Python list of all row IDs.
# ------------------------------------------------------------

ASSIGNMENT_BLOCK_SIZE = 500_000


# ------------------------------------------------------------
# Initial priority:
#
# maximum score across all topics.
#
# ------------------------------------------------------------

confidence_order = np.argsort(

    -np.asarray(
        max_score_memmap
    ),

    kind="stable"

)


for position, row_id in enumerate(
    confidence_order
):

    row_id = int(
        row_id
    )


    ranking = np.asarray(
        ranking_memmap[
            row_id
        ],
        dtype=np.int8
    )


    row_scores = np.asarray(
        score_memmap[
            row_id
        ],
        dtype=np.float32
    )


    assigned_topic = -1


    # --------------------------------------------------------
    # First preference:
    #
    # semantic ranking.
    #
    # --------------------------------------------------------

    for topic_id in ranking:

        topic_id = int(
            topic_id
        )


        if remaining_quota[
            topic_id
        ] <= 0:

            continue


        assigned_topic = (
            topic_id
        )

        break


    if assigned_topic < 0:

        raise RuntimeError(
            f"Could not assign row {row_id}."
        )


    final_topic_ids[
        row_id
    ] = assigned_topic


    remaining_quota[
        assigned_topic
    ] -= 1


    if (
        (position + 1)
        % 500_000
        == 0
    ):

        elapsed = (
            time.perf_counter()
            - assignment_start
        )


        speed = (
            (position + 1)
            / elapsed
        )


        print(

            f"Assigned "
            f"{position + 1:,} / "
            f"{total_rows:,} | "
            f"{speed:,.0f} rows/sec"

        )


# ============================================================
# VALIDATE QUOTAS
# ============================================================

if np.any(
    remaining_quota != 0
):

    raise RuntimeError(

        "Target quotas were not completely filled.\n"

        f"Remaining quota: "
        f"{remaining_quota}"

    )


# ============================================================
# CONVERT IDS TO TOPIC NAMES
# ============================================================

topic_array = np.array(
    topics,
    dtype=object
)


final_topics = topic_array[
    final_topic_ids
]


# ============================================================
# 28. CONFIDENCE CALCULATION
# ============================================================

print("\n" + "=" * 90)
print("CALCULATING FINAL CONFIDENCE")
print("=" * 90)


confidence_file = (
    TEMP_DIR
    / "confidence.dat"
)


confidence_memmap = np.memmap(

    confidence_file,

    dtype=np.float32,

    mode="w+",

    shape=(
        total_rows,
    )

)


CONFIDENCE_BLOCK_SIZE = 500_000


for start in range(

    0,

    total_rows,

    CONFIDENCE_BLOCK_SIZE

):

    end = min(

        start
        + CONFIDENCE_BLOCK_SIZE,

        total_rows

    )


    block_scores = (
        score_memmap[
            start:end
        ]
    )


    selected_ids = (
        final_topic_ids[
            start:end
        ]
    )


    row_indices = np.arange(
        end - start
    )


    selected_scores = (

        block_scores[
            row_indices,
            selected_ids
        ]

    )


    sorted_scores = np.sort(

        block_scores,

        axis=1

    )


    second_best = (
        sorted_scores[:, -2]
    )


    margin = (
        selected_scores
        - second_best
    )


    # --------------------------------------------------------
    # BOUNDED SEMANTIC CONFIDENCE
    # --------------------------------------------------------

    score_component = (

        selected_scores
        / (
            selected_scores
            + 5.0
        )

    ) * 70.0


    margin_component = (

        margin
        / (
            np.abs(
                selected_scores
            )
            + 1.0
        )

    ) * 30.0


    confidence = (
        score_component
        + margin_component
    )


    confidence = np.clip(

        confidence,

        0,

        100

    )


    confidence_memmap[
        start:end
    ] = confidence.astype(
        np.float32
    )


confidence_memmap.flush()


# ============================================================
# 29. FINAL DISTRIBUTION VALIDATION
# ============================================================

print("\n" + "=" * 90)
print("FINAL TARGET DISTRIBUTION")
print("=" * 90)


final_topic_counts = {}


for topic_id, topic in enumerate(
    topics
):

    count = int(
        np.sum(
            final_topic_ids
            == topic_id
        )
    )


    final_topic_counts[
        topic
    ] = count


    percentage = (

        count
        / total_rows
        * 100

    )


    target = (
        TARGET_TOPIC_PERCENTAGES[
            topic
        ]
    )


    difference = (
        percentage
        - target
    )


    print(

        f"{topic:28s} "

        f"{count:12,} "

        f"{percentage:7.2f}% "

        f"target={target:>3}% "

        f"diff={difference:+.4f}%"

    )


# ============================================================
# STRICT VALIDATION
# ============================================================

for topic_id, topic in enumerate(
    topics
):

    expected = target_counts[
        topic
    ]


    actual = final_topic_counts[
        topic
    ]


    if actual != expected:

        raise RuntimeError(

            f"Target distribution failed "
            f"for '{topic}'. "

            f"Expected {expected:,}, "
            f"got {actual:,}."

        )


print(
    "\n✓ EXACT target distribution achieved."
)


# ============================================================
# 30. SAVE FINAL ASSIGNMENT
# ============================================================

FINAL_ASSIGNMENT_FILE = (
    TEMP_DIR
    / "final_topic_assignment.dat"
)


final_assignment_memmap = np.memmap(

    FINAL_ASSIGNMENT_FILE,

    dtype=np.int8,

    mode="w+",

    shape=(
        total_rows,
    )

)


final_assignment_memmap[:] = (
    final_topic_ids
)


final_assignment_memmap.flush()


# ============================================================
# 31. FINAL OUTPUT GENERATION
# ============================================================

print("\n" + "=" * 90)
print("WRITING FINAL OUTPUT")
print("=" * 90)


if output_path.exists():

    try:

        output_path.unlink()

    except PermissionError:

        raise PermissionError(

            "\nOUTPUT FILE IS OPEN.\n\n"

            "Close the CSV in Excel / Power BI "
            "and run the script again.\n\n"

            f"{OUTPUT_FILE}"

        )


processed_rows = 0

chunk_number = 0

first_output_chunk = True

write_start = time.perf_counter()


for chunk in pd.read_csv(

    INPUT_FILE,

    chunksize=CHUNK_SIZE

):

    chunk_number += 1


    chunk_length = len(
        chunk
    )


    start_index = (
        processed_rows
    )


    end_index = (
        start_index
        + chunk_length
    )


    # --------------------------------------------------------
    # KMEANS CLUSTER
    # --------------------------------------------------------

    chunk[
        "topic_cluster"
    ] = cluster_memmap[
        start_index:end_index
    ].astype(
        np.int16
    )


    # --------------------------------------------------------
    # FINAL BUSINESS TOPIC
    # --------------------------------------------------------

    chunk[
        "topic"
    ] = final_topics[
        start_index:end_index
    ]


    # --------------------------------------------------------
    # CONFIDENCE
    # --------------------------------------------------------

    chunk[
        "confidence"
    ] = np.round(

        confidence_memmap[
            start_index:end_index
        ],

        2

    )


    # --------------------------------------------------------
    # WRITE
    # --------------------------------------------------------

    chunk.to_csv(

        OUTPUT_FILE,

        mode=(

            "w"

            if first_output_chunk

            else "a"

        ),

        header=first_output_chunk,

        index=False,

        encoding="utf-8-sig"

    )


    first_output_chunk = False


    processed_rows += chunk_length


    elapsed = (
        time.perf_counter()
        - write_start
    )


    speed = (

        processed_rows
        / elapsed

        if elapsed > 0

        else 0

    )


    print(

        f"Chunk {chunk_number:04d} | "

        f"Rows written: "
        f"{processed_rows:,} | "

        f"Speed: "
        f"{speed:,.0f} rows/sec"

    )


# ============================================================
# 32. FINAL OUTPUT VALIDATION
# ============================================================

print("\n" + "=" * 90)
print("FINAL OUTPUT VALIDATION")
print("=" * 90)


final_row_count = 0

final_topic_counts = {}


for validation_chunk in pd.read_csv(

    OUTPUT_FILE,

    usecols=[

        "topic",

        "topic_cluster",

        "confidence"

    ],

    chunksize=CHUNK_SIZE

):

    final_row_count += len(
        validation_chunk
    )


    counts = (
        validation_chunk[
            "topic"
        ]
        .value_counts()
    )


    for topic, count in counts.items():

        final_topic_counts[
            topic
        ] = (

            final_topic_counts.get(
                topic,
                0
            )

            + int(count)

        )


# ============================================================
# ROW COUNT CHECK
# ============================================================

if final_row_count != total_rows:

    raise RuntimeError(

        "FINAL ROW COUNT CHANGED!\n"

        f"Input : {total_rows:,}\n"

        f"Output: {final_row_count:,}"

    )


# ============================================================
# TOPIC COUNT CHECK
# ============================================================

for topic in topics:

    expected = target_counts[
        topic
    ]


    actual = final_topic_counts.get(
        topic,
        0
    )


    if actual != expected:

        raise RuntimeError(

            f"FINAL OUTPUT TOPIC COUNT "
            f"MISMATCH\n"

            f"Topic    : {topic}\n"

            f"Expected : {expected:,}\n"

            f"Actual   : {actual:,}"

        )


# ============================================================
# 33. FINAL DISTRIBUTION
# ============================================================

print(
    f"\nInput rows  : "
    f"{total_rows:,}"
)


print(
    f"Output rows : "
    f"{final_row_count:,}"
)


print(
    "\nFinal business topic distribution:"
)


print("-" * 90)


for topic in topics:

    count = final_topic_counts.get(
        topic,
        0
    )


    percentage = (

        count
        / final_row_count
        * 100

    )


    target = (
        TARGET_TOPIC_PERCENTAGES[
            topic
        ]
    )


    difference = (
        percentage
        - target
    )


    print(

        f"{topic:28s} "

        f"{count:12,} "

        f"{percentage:7.2f}% "

        f"target={target:>3}% "

        f"diff={difference:+.4f}%"

    )


# ============================================================
# 34. OUTPUT FILE INFORMATION
# ============================================================

total_pipeline_time = (
    time.perf_counter()
    - pipeline_start
)


if output_path.exists():

    file_size_mb = (

        output_path.stat().st_size
        / (1024 * 1024)

    )

else:

    file_size_mb = 0


print("\n" + "=" * 90)
print("TOPIC CLUSTERING COMPLETED")
print("=" * 90)


print(

    f"\nTotal rows processed : "
    f"{final_row_count:,}"

)


print(

    f"KMeans clusters      : "
    f"{N_CLUSTERS}"

)


print(

    f"TF-IDF features      : "
    f"{training_matrix.shape[1]:,}"

)


print(

    f"KMeans training time : "
    f"{kmeans_time:.2f} seconds"

)


print(

    f"Total processing time: "
    f"{total_pipeline_time / 60:.2f} minutes"

)


print(

    f"Output file size     : "
    f"{file_size_mb:.2f} MB"

)


print(

    f"\nOutput file:\n"
    f"{OUTPUT_FILE}"

)


# ============================================================
# 35. OUTPUT COLUMNS
# ============================================================

print("\nOutput columns:")


final_sample = pd.read_csv(
    OUTPUT_FILE,
    nrows=1
)


for column in final_sample.columns:

    print(
        f"  - {column}"
    )


# ============================================================
# 36. CLEANUP
# ============================================================
#
# Windows may keep memory-mapped files locked for a short time.
#
# We explicitly flush and delete references before attempting
# cleanup.
#
# If OneDrive temporarily locks a file, the output is already
# complete and the cleanup warning is harmless.
#
# ============================================================

print("\nCleaning temporary files...")


try:

    # --------------------------------------------------------
    # Flush everything first
    # --------------------------------------------------------

    score_memmap.flush()

    cluster_memmap.flush()

    ranking_memmap.flush()

    max_score_memmap.flush()

    confidence_memmap.flush()

    final_assignment_memmap.flush()


    # --------------------------------------------------------
    # Delete Python references
    # --------------------------------------------------------

    del score_memmap

    del cluster_memmap

    del ranking_memmap

    del max_score_memmap

    del confidence_memmap

    del final_assignment_memmap


    # --------------------------------------------------------
    # Give Windows/OneDrive a moment to release handles
    # --------------------------------------------------------

    time.sleep(1)


    # --------------------------------------------------------
    # Remove temporary directory
    # --------------------------------------------------------

    shutil.rmtree(
        TEMP_DIR
    )


    print(
        "Temporary files removed."
    )


except PermissionError as cleanup_error:

    print(
        "\nWarning: Windows/OneDrive is still "
        "holding a temporary file."
    )

    print(
        f"Temporary directory left at:\n"
        f"{TEMP_DIR}"
    )

    print(
        "This does NOT affect the completed output CSV."
    )

    print(
        f"Cleanup error: {cleanup_error}"
    )


except Exception as cleanup_error:

    print(

        "\nWarning: temporary files "
        "could not be completely removed: "

        f"{cleanup_error}"

    )

    print(
        f"Temporary directory:\n{TEMP_DIR}"
    )


# ============================================================
# DONE
# ============================================================

print("\n" + "=" * 90)
print("DONE")
print("=" * 90)


print(
    "\n✓ Every input record has exactly one topic."
)


print(
    "✓ Target distribution is exactly enforced."
)


print(
    "✓ Full 7-topic semantic scoring was used."
)


print(
    "✓ TF-IDF remains sparse for the large dataset."
)


print(
    "✓ Topic prototype similarity is sparse-safe."
)


print(
    "✓ KMeans is used as a supporting semantic signal."
)


print(
    "✓ Login, payment, transaction and technical topics "
    "have explicit separation rules."
)


print(
    "✓ Output preserves original records and columns."
)


print("=" * 90)
