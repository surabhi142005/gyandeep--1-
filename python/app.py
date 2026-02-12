import os
from flask import Flask, request, jsonify
import base64
import io
import math
import cv2
import numpy as np
from flask_cors import CORS

app = Flask(__name__)

CORS(app)

def decode_image(data_url):
    if not isinstance(data_url, str) or ',' not in data_url:
        return None
    b64 = data_url.split(',', 1)[1]
    try:
        img_bytes = base64.b64decode(b64)
        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return img
    except Exception:
        return None

def detect_largest_face(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = cascade.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=4, minSize=(40, 40))
    if len(faces) == 0:
        return None, None
    x, y, w, h = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)[0]
    # Add padding for better face extraction
    padding = int(w * 0.1)
    x = max(0, x - padding)
    y = max(0, y - padding)
    w = min(img.shape[1] - x, w + 2 * padding)
    h = min(img.shape[0] - y, h + 2 * padding)
    face = img[y:y+h, x:x+w]
    face_box = (x, y, w, h)
    return face, face_box

def normalize_face(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    # Apply histogram equalization for better feature detection
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    eq = clahe.apply(gray)
    # Resize to standard size
    resized = cv2.resize(eq, (160, 160))
    return resized

def extract_face_features(face_img):
    """Extract multiple types of features for robust matching"""
    # ORB features
    orb = cv2.ORB_create(nfeatures=500)
    kp, des = orb.detectAndCompute(face_img, None)
    
    # SIFT features (if available)
    try:
        sift = cv2.SIFT_create()
        kp_sift, des_sift = sift.detectAndCompute(face_img, None)
    except:
        kp_sift, des_sift = None, None
    
    return {
        'orb_kp': kp,
        'orb_des': des,
        'sift_kp': kp_sift,
        'sift_des': des_sift,
        'gray': face_img
    }

def compare_faces_multi_method(ref_features, live_features):
    """Compare faces using multiple methods"""
    scores = []
    
    # Histogram comparison
    h1 = cv2.calcHist([ref_features['gray']], [0], None, [256], [0,256])
    h2 = cv2.calcHist([live_features['gray']], [0], None, [256], [0,256])
    h1 = cv2.normalize(h1, h1).flatten()
    h2 = cv2.normalize(h2, h2).flatten()
    hist_score = float(cv2.compareHist(h1, h2, cv2.HISTCMP_CORREL))
    scores.append(('histogram', hist_score, 0.7))
    
    # ORB feature matching
    if ref_features['orb_des'] is not None and live_features['orb_des'] is not None:
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(ref_features['orb_des'], live_features['orb_des'])
        orb_score = len(matches) / max(len(ref_features['orb_kp']), len(live_features['orb_kp']), 1)
        scores.append(('orb', orb_score, 0.8))
    
    # Template matching
    ref_resized = cv2.resize(ref_features['gray'], (128, 128))
    live_resized = cv2.resize(live_features['gray'], (128, 128))
    res = cv2.matchTemplate(ref_resized, live_resized, cv2.TM_CCOEFF_NORMED)
    template_score = float(np.max(res)) if res.size > 0 else 0.0
    scores.append(('template', template_score, 0.75))
    
    return scores

@app.post('/auth/face')
def auth_face():
    payload = request.get_json(silent=True) or {}
    image = payload.get('image')
    user_id = payload.get('user_id')
    
    if image is None:
        return jsonify({'error': 'image is required', 'authenticated': False, 'confidence': 0.0}), 400
    
    img = decode_image(image)
    if img is None:
        return jsonify({'error': 'invalid image', 'authenticated': False, 'confidence': 0.0}), 400
    
    # If no user_id provided, just detect faces
    if not user_id:
        face, _ = detect_largest_face(img)
        if face is None:
            return jsonify({'authenticated': False, 'confidence': 0.0, 'faces': 0, 'error': 'no face detected'})
        return jsonify({'authenticated': True, 'confidence': 0.95, 'faces': 1})
    
    # If user_id provided, verify the face using advanced algorithms
    ref_path = f'python/data/faces/{user_id}.jpg'
    if not os.path.exists(ref_path):
        return jsonify({'authenticated': False, 'error': 'no reference face registered', 'confidence': 0.0}), 404
    
    try:
        # Read reference image
        ref_img = cv2.imread(ref_path)
        if ref_img is None:
            return jsonify({'authenticated': False, 'error': 'failed to load reference image', 'confidence': 0.0}), 500
        
        # Detect faces in both images
        live_face, live_box = detect_largest_face(img)
        ref_face, ref_box = detect_largest_face(ref_img)
        
        if live_face is None:
            return jsonify({'authenticated': False, 'error': 'no face detected in live image', 'confidence': 0.0})
        
        if ref_face is None:
            return jsonify({'authenticated': False, 'error': 'reference face not found', 'confidence': 0.0})
        
        # Normalize faces
        live_norm = normalize_face(live_face)
        ref_norm = normalize_face(ref_face)
        
        # Simple histogram comparison for quick verification
        h1 = cv2.calcHist([ref_norm], [0], None, [256], [0,256])
        h2 = cv2.calcHist([live_norm], [0], None, [256], [0,256])
        h1 = cv2.normalize(h1, h1).flatten()
        h2 = cv2.normalize(h2, h2).flatten()
        hist_score = float(cv2.compareHist(h1, h2, cv2.HISTCMP_CORREL))
        
        # ORB feature matching
        orb = cv2.ORB_create(nfeatures=500)
        kp1, des1 = orb.detectAndCompute(ref_norm, None)
        kp2, des2 = orb.detectAndCompute(live_norm, None)
        
        orb_score = 0.0
        if des1 is not None and des2 is not None and len(des1) > 0 and len(des2) > 0:
            bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
            matches = bf.match(des1, des2)
            denom = max(len(kp1 or []), len(kp2 or []), 1)
            orb_score = len(matches) / denom
        
        # Template matching (more lenient)
        ref_resized = cv2.resize(ref_norm, (100, 100))
        live_resized = cv2.resize(live_norm, (100, 100))
        res = cv2.matchTemplate(ref_resized, live_resized, cv2.TM_CCOEFF_NORMED)
        template_score = float(np.max(res)) if res.size > 0 else 0.0
        
        # Calculate weighted score (more lenient thresholds)
        scores = {
            'histogram': round(hist_score, 4),
            'orb': round(orb_score, 4),
            'template': round(template_score, 4)
        }
        
        # Use weighted average
        confidence = (hist_score * 0.4 + orb_score * 0.35 + template_score * 0.25)
        confidence = round(confidence, 4)
        
        # Lower threshold for more lenient matching (0.45 instead of 0.60)
        threshold = 0.45
        authenticated = confidence >= threshold
        
        return jsonify({
            'authenticated': authenticated,
            'confidence': confidence,
            'threshold': threshold,
            'scores': scores,
            'message': 'Face authentication successful' if authenticated else 'Face did not match stored reference'
        })
        
    except Exception as e:
        return jsonify({'authenticated': False, 'error': str(e), 'confidence': 0.0}), 500

@app.post('/face/register')
def face_register():
    payload = request.get_json(silent=True) or {}
    user_id = payload.get('user_id')
    image = payload.get('image')
    if not user_id:
        return jsonify({ 'error': 'missing user_id' }), 400
    img = decode_image(image)
    if img is None:
        return jsonify({ 'error': 'invalid image' }), 400
    os.makedirs('python/data/faces', exist_ok=True)
    path = f'python/data/faces/{user_id}.jpg'
    face, _ = detect_largest_face(img)
    if face is None:
        cv2.imwrite(path, img)
    else:
        norm = normalize_face(face)
        cv2.imwrite(path, norm)
    return jsonify({ 'ok': True })

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@app.post('/auth/location')
def auth_location():
    payload = request.get_json(silent=True) or {}
    lat = payload.get('lat')
    lng = payload.get('lng')
    target_lat = payload.get('target_lat')
    target_lng = payload.get('target_lng')
    radius_m = payload.get('radius_m', 100)
    try:
        lat = float(lat)
        lng = float(lng)
        target_lat = float(target_lat)
        target_lng = float(target_lng)
        radius_m = float(radius_m)
    except Exception:
        return jsonify({ 'error': 'invalid coordinates' }), 400
    distance = haversine(lat, lng, target_lat, target_lng)
    return jsonify({ 'authenticated': distance <= radius_m, 'distance_m': round(distance, 2), 'radius_m': radius_m })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
