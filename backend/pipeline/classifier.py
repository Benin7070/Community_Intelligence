"""
Query Classifier — TF-IDF + Multinomial Naive Bayes
Classifies incoming queries as:
  - "ci"  → Community Intelligence pipeline (local data, opinions, community topics)
  - "llm" → Standard LLM (general knowledge, coding, math, creative writing)

Runs entirely offline, no API calls needed. Loads a pre-trained joblib model.
"""

import os
import joblib

class QueryClassifier:
    """Lightweight ML classifier for routing queries."""

    def __init__(self):
        model_path = os.path.join(os.path.dirname(__file__), "query_classifier.joblib")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at {model_path}. Run train_classifier.py first.")
        
        self.pipeline = joblib.load(model_path)
        print(f"[QueryClassifier] Loaded pre-trained model from {model_path}")

    def classify(self, query: str) -> dict:
        """Classify a query and return the routing decision with confidence."""
        prediction = self.pipeline.predict([query])[0]
        probabilities = self.pipeline.predict_proba([query])[0]
        classes = self.pipeline.classes_.tolist()

        ci_idx = classes.index("ci") if "ci" in classes else 0
        llm_idx = classes.index("llm") if "llm" in classes else 1

        return {
            "destination": "CI_SYSTEM" if prediction == "ci" else "NORMAL_LLM",
            "confidence": round(float(max(probabilities)), 4),
            "probabilities": {
                "ci": round(float(probabilities[ci_idx]), 4),
                "llm": round(float(probabilities[llm_idx]), 4),
            },
            "prediction_raw": prediction,
        }


# Singleton instance — loaded once at startup
classifier = QueryClassifier()
