import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from backend.rag.query_preprocessor import normalize_and_correct_query

test_queries = [
    'my phne keeps frezing after updte',
    'why is our delivry delayd and what is the avrg response time?',
    'custmer complants about login passwrd reset',
    'app keep crashng after recent upgarde',
    'fcr and sla metrcs in north amrica',
    'sloooow network conecton on my phooone'
]

print("=============================================")
print("SPELL NORMALIZER & QUERY PREPROCESSOR TESTS")
print("=============================================")
for q in test_queries:
    res = normalize_and_correct_query(q)
    print(f"Original:    {res['original_query']}")
    print(f"Normalized:  {res['normalized_query']}")
    print(f"Corrections: {res['corrected_words']}")
    print("---------------------------------------------")
