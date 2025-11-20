import os
from flask import Flask, request, jsonify
import base64
import io
import math
import cv2
import numpy as np
from flask_cors import CORS
try:
    from deepface import DeepFace
except Exception:
    DeepFace = None

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
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
    if len(faces) == 0:
        return None
    x, y, w, h = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)[0]
    face = img[y:y+h, x:x+w]
    return face

def normalize_face(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    eq = clahe.apply(gray)
    resized = cv2.resize(eq, (128, 128))
    return resized

@app.post('/auth/face')
def auth_face():
    payload = request.get_json(silent=True) or {}
    image = payload.get('image')
    img = decode_image(image)
    if img is None:
        return jsonify({ 'error': 'invalid image' }), 400
    face = detect_largest_face(img)
    if face is None:
        return jsonify({ 'authenticated': False, 'confidence': 0.0, 'faces': 0 })
    return jsonify({ 'authenticated': True, 'confidence': 0.9, 'faces': 1 })

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
    face = detect_largest_face(img)
    if face is None:
        cv2.imwrite(path, img)
    else:
        norm = normalize_face(face)
        cv2.imwrite(path, norm)
    return jsonify({ 'ok': True })

@app.post('/face/verify')
def face_verify():
    payload = request.get_json(silent=True) or {}
    user_id = payload.get('user_id')
    image = payload.get('image')
    if not user_id:
        return jsonify({ 'error': 'missing user_id' }), 400
    img = decode_image(image)
    if img is None:
        return jsonify({ 'error': 'invalid image' }), 400
    ref_path = f'python/data/faces/{user_id}.jpg'
    if not os.path.exists(ref_path):
        return jsonify({ 'error': 'no reference face registered' }), 404
    if DeepFace is None:
        ref_img = cv2.imread(ref_path)
        live_face = detect_largest_face(img)
        ref_face = detect_largest_face(ref_img) if ref_img is not None else None
        if live_face is None:
            return jsonify({ 'authenticated': False, 'confidence': 0.0 })
        live_norm = normalize_face(live_face)
        ref_norm = normalize_face(ref_face) if ref_face is not None else normalize_face(ref_img)
        h1 = cv2.calcHist([ref_norm], [0], None, [256], [0,256])
        h2 = cv2.calcHist([live_norm], [0], None, [256], [0,256])
        h1 = cv2.normalize(h1, h1).flatten()
        h2 = cv2.normalize(h2, h2).flatten()
        score_hist = float(cv2.compareHist(h1, h2, cv2.HISTCMP_CORREL))
        res = cv2.matchTemplate(ref_norm, live_norm, cv2.TM_CCOEFF_NORMED)
        score_tpl = float(res[0][0]) if res.size == 1 else float(np.max(res))
        orb = cv2.ORB_create()
        kp1, des1 = orb.detectAndCompute(ref_norm, None)
        kp2, des2 = orb.detectAndCompute(live_norm, None)
        ratio = 0.0
        if des1 is not None and des2 is not None and len(des1) > 0 and len(des2) > 0:
            bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
            matches = bf.match(des1, des2)
            denom = max(len(kp1 or []), len(kp2 or []), 1)
            ratio = len(matches) / denom
        confidence = max(score_hist, score_tpl, ratio)
        ok = (score_hist >= 0.70) or (score_tpl >= 0.60) or (ratio >= 0.15)
        return jsonify({ 'authenticated': bool(ok), 'confidence': round(confidence, 4), 'scores': { 'hist': round(score_hist,4), 'tpl': round(score_tpl,4), 'orb': round(ratio,4) } })
    try:
        os.makedirs('python/data/tmp', exist_ok=True)
        tmp_path = f'python/data/tmp/{user_id}_live.jpg'
        cv2.imwrite(tmp_path, img)
        result = DeepFace.verify(img1_path=ref_path, img2_path=tmp_path, enforce_detection=False)
        try:
            os.remove(tmp_path)
        except Exception:
            pass
        return jsonify({ 'authenticated': bool(result.get('verified')), 'distance': float(result.get('distance', 0.0)) })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500

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