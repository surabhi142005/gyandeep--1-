from flask import Flask, request, jsonify
import base64
import io
import math
import cv2
import numpy as np

app = Flask(__name__)

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

@app.post('/auth/face')
def auth_face():
    payload = request.get_json(silent=True) or {}
    image = payload.get('image')
    img = decode_image(image)
    if img is None:
        return jsonify({ 'error': 'invalid image' }), 400
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
    h, w = img.shape[:2]
    area = w * h
    max_face_area = 0
    for (x, y, fw, fh) in faces:
        a = fw * fh
        if a > max_face_area:
            max_face_area = a
    confidence = max_face_area / area if area > 0 else 0.0
    return jsonify({ 'authenticated': len(faces) > 0, 'confidence': round(confidence, 4), 'faces': len(faces) })

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