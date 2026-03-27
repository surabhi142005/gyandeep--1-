#!/bin/bash
# Download face-api.js models for face recognition

MODELS_DIR="public/models"
mkdir -p "$MODELS_DIR"

# Base URL for face-api.js weights
BASE_URL="https://github.com/justadudewhohacks/face-api.js/raw/master/weights"

# SSD MobileNet v1 face detection model
echo "Downloading SSD MobileNet v1 models..."
curl -L "$BASE_URL/ssd_mobilenetv1_model-weights_manifest.json" -o "$MODELS_DIR/ssd_mobilenetv1_model-weights_manifest.json"
curl -L "$BASE_URL/ssd_mobilenetv1_model-shard1" -o "$MODELS_DIR/ssd_mobilenetv1_model-shard1"
curl -L "$BASE_URL/ssd_mobilenetv1_model-shard2" -o "$MODELS_DIR/ssd_mobilenetv1_model-shard2"

# Face Landmark 68 model
echo "Downloading Face Landmark 68 models..."
curl -L "$BASE_URL/face_landmark_68_model-weights_manifest.json" -o "$MODELS_DIR/face_landmark_68_model-weights_manifest.json"
curl -L "$BASE_URL/face_landmark_68_model-shard1" -o "$MODELS_DIR/face_landmark_68_model-shard1"

# Face Recognition model
echo "Downloading Face Recognition models..."
curl -L "$BASE_URL/face_recognition_model-weights_manifest.json" -o "$MODELS_DIR/face_recognition_model-weights_manifest.json"
curl -L "$BASE_URL/face_recognition_model-shard1" -o "$MODELS_DIR/face_recognition_model-shard1"
curl -L "$BASE_URL/face_recognition_model-shard2" -o "$MODELS_DIR/face_recognition_model-shard2"

# Face Expression Recognition model (for liveness detection)
echo "Downloading Face Expression models..."
curl -L "$BASE_URL/face_expression_model-weights_manifest.json" -o "$MODELS_DIR/face_expression_model-weights_manifest.json"
curl -L "$BASE_URL/face_expression_model-shard1" -o "$MODELS_DIR/face_expression_model-shard1"

# Age and Gender Estimation (optional, but useful)
echo "Downloading Age/Gender estimation models..."
curl -L "$BASE_URL/age_gender_model-weights_manifest.json" -o "$MODELS_DIR/age_gender_model-weights_manifest.json"
curl -L "$BASE_URL/age_gender_model-shard1" -o "$MODELS_DIR/age_gender_model-shard1"

echo "All models downloaded successfully!"
echo "Files in $MODELS_DIR:"
ls -la "$MODELS_DIR/"
