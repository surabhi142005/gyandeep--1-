# Face Recognition Service Setup Guide

The Gyandeep platform supports face recognition for attendance verification. This guide explains how to set up the service.

## Option 1: Built-in Face API (Default)

The platform includes a built-in face recognition implementation using `@vladmandic/face-api`. This runs directly on the server.

### Requirements
```bash
npm install @vladmandic/face-api
```

### Download Models
Download the face-api.js models from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

Place them in `public/models/`:
```
public/models/
  ├── tiny_face_detector_model-weights_manifest.json
  ├── tiny_face_detector_model-shard1
  ├── face_landmark_68_model-weights_manifest.json
  ├── face_landmark_68_model-shard1
  ├── face_recognition_model-weights_manifest.json
  └── face_recognition_model-shard1
```

### Configuration
Set in `.env`:
```env
FACE_RECOGNITION_MODE=builtin
```

## Option 2: External Python Service

For production, you can deploy a separate Python face recognition service.

### Setup Python Service

1. Install dependencies:
```bash
pip install flask flask-cors face-recognition opencv-python numpy
```

2. Create `face_service.py`:
```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import numpy as np
import base64
import io
from PIL import Image

app = Flask(__name__)
CORS(app)

@app.route('/encode', methods=['POST'])
def encode_face():
    data = request.json
    img_data = base64.b64decode(data['image'].split(',')[1])
    img = Image.open(io.BytesIO(img_data))
    img_array = np.array(img)
    
    encodings = face_recognition.face_encodings(img_array)
    if len(encodings) == 0:
        return jsonify({'error': 'No face detected'}), 400
    
    return jsonify({
        'encoding': encodings[0].tolist(),
        'success': True
    })

@app.route('/verify', methods=['POST'])
def verify_face():
    data = request.json
    img_data = base64.b64decode(data['image'].split(',')[1])
    img = Image.open(io.BytesIO(img_data))
    img_array = np.array(img)
    
    unknown_encodings = face_recognition.face_encodings(img_array)
    if len(unknown_encodings) == 0:
        return jsonify({'match': False, 'error': 'No face detected'})
    
    stored_encoding = np.array(data['stored_encoding'])
    match = face_recognition.compare_faces([stored_encoding], unknown_encodings[0])[0]
    distance = face_recognition.face_distance([stored_encoding], unknown_encodings[0])[0]
    
    return jsonify({
        'match': match,
        'distance': float(distance),
        'confidence': float(1 - distance)
    })

@app.route('/liveness', methods=['POST'])
def check_liveness():
    # Implement liveness detection (blink, head movement, etc.)
    # This is a stub - implement real liveness detection
    data = request.json
    frames = data.get('frames', [])
    
    if len(frames) < 2:
        return jsonify({'passed': False, 'reason': 'Need multiple frames'})
    
    # Simple blink detection
    # Real implementation would analyze eye aspect ratio
    return jsonify({
        'passed': True,
        'method': 'blink_detection',
        'confidence': 0.85
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
```

3. Run the service:
```bash
python face_service.py
```

### Configuration
Set in `.env`:
```env
FACE_RECOGNITION_MODE=external
FACE_RECOGNITION_SERVICE_URL=http://localhost:5000
```

## Liveness Detection

The built-in liveness detection includes:
- Face detection verification
- Color variance analysis
- Edge detection (detects printed photo attacks)
- Brightness/contrast analysis
- Skin tone distribution checks

For enhanced security, implement:
1. **Blink detection** - Require user to blink
2. **Head movement** - Ask user to turn head
3. **Expression verification** - Detect smile or other expressions
4. **Multi-frame analysis** - Compare sequential frames

## Troubleshooting

### No face detected
- Ensure good lighting
- Face should be clearly visible
- Remove glasses, masks, etc.
- Try different angles

### Verification always fails
- Re-register the face
- Check if same person is registering
- Adjust confidence threshold in `server/routes/face.js`

### Performance issues
- Use smaller model (tiny_face_detector)
- Enable Redis caching
- Scale horizontally with multiple instances
