# Model training notes

This folder can store training scripts, model checkpoints, and experiment notes.

Sample dataset structure:
- `id` - unique example identifier
- `utterance` - customer or agent text
- `label` - intent or sentiment label for training

Possible next steps:
1. Build a simple text classification model using scikit-learn, spaCy, or Hugging Face.
2. Use the placeholder dataset in `dataset/sample_dataset.csv` to train intent or sentiment models.
3. Keep model output and checkpoints out of Git or add them to `.gitignore`.
