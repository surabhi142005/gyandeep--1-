import os
import io
import base64
import sys
import unittest
import tempfile
import shutil
import importlib.util
import numpy as np
import threading
import json
import time
import cv2

# Load the app module from file location
APP_PATH = os.path.join(os.path.dirname(__file__), '..', 'app.py')
spec = importlib.util.spec_from_file_location('app_module', APP_PATH)
app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_module)

app = app_module.app

# Helpers

def make_test_image(width=200, height=200):
    # Create a synthetic "face-like" image (circle on background)
    img = np.zeros((height, width, 3), dtype=np.uint8)
    center = (width // 2, height // 2)
    cv2.circle(img, center, min(width, height) // 4, (180, 140, 120), -1)
    cv2.circle(img, (center[0] - 20, center[1] - 10), 8, (0, 0, 0), -1)  # left eye
    cv2.circle(img, (center[0] + 20, center[1] - 10), 8, (0, 0, 0), -1)  # right eye
    cv2.ellipse(img, (center[0], center[1] + 10), (30, 15), 0, 0, 180, (0, 0, 0), 3)  # mouth
    return img


def image_to_data_url(img, ext='.jpg'):
    success, buf = cv2.imencode(ext, img)
    assert success
    b64 = base64.b64encode(buf).decode('ascii')
    return f"data:image/jpeg;base64,{b64}"


class FaceServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Ensure data directory exists and is isolated for tests
        cls.root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        cls.faces_dir = os.path.join(cls.root, 'data', 'faces')
        os.makedirs(cls.faces_dir, exist_ok=True)

        # Monkeypatch detection and normalization to avoid Haar cascade flakiness
        def fake_detect_largest_face(img):
            # Return the whole image as the face region
            return img, (0, 0, img.shape[1], img.shape[0])

        def fake_normalize_face(img):
            # Convert to grayscale and resize to 160x160 as the real function would
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
            resized = cv2.resize(gray, (160, 160))
            return resized

        app_module.detect_largest_face = fake_detect_largest_face
        app_module.normalize_face = fake_normalize_face

        cls.client = app.test_client()

    @classmethod
    def tearDownClass(cls):
        # Clean up any test face files created
        try:
            for f in os.listdir(cls.faces_dir):
                if f.startswith('testuser') or f.startswith('tmp_test'):
                    os.remove(os.path.join(cls.faces_dir, f))
        except Exception:
            pass

    def test_decode_image_invalid(self):
        # Calling decode_image with invalid input should return None
        self.assertIsNone(app_module.decode_image(None))
        self.assertIsNone(app_module.decode_image('not-a-data-url'))

    def test_face_register_and_verify_flow(self):
        img = make_test_image()
        data_url = image_to_data_url(img)
        user_id = 'testuser'

        # Register face
        res = self.client.post('/face/register', json={'user_id': user_id, 'image': data_url})
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertTrue(body.get('ok', False))

        # Ensure reference file exists
        ref_path = os.path.join(self.faces_dir, f'{user_id}.jpg')
        self.assertTrue(os.path.exists(ref_path))

        # Verify without providing user_id (should detect face present)
        res2 = self.client.post('/auth/face', json={'image': data_url})
        self.assertEqual(res2.status_code, 200)
        body2 = res2.get_json()
        self.assertIn('authenticated', body2)
        self.assertTrue(body2['authenticated'])
        self.assertGreaterEqual(body2.get('confidence', 0), 0.0)

        # Verify with correct user_id (should authenticate)
        res3 = self.client.post('/auth/face', json={'image': data_url, 'user_id': user_id})
        self.assertEqual(res3.status_code, 200)
        body3 = res3.get_json()
        self.assertIn('authenticated', body3)
        self.assertTrue(body3['authenticated'], msg=f"Expected authentication, got: {body3}")
        self.assertGreaterEqual(body3.get('confidence', 0), app_module.__dict__.get('0', 0) or 0)

    def test_verify_missing_reference(self):
        img = make_test_image()
        data_url = image_to_data_url(img)
        # Ask to verify for a user that doesn't exist
        res = self.client.post('/auth/face', json={'image': data_url, 'user_id': 'no_such_user'})
        self.assertEqual(res.status_code, 404)
        body = res.get_json()
        self.assertFalse(body.get('authenticated', True))
        self.assertIn('error', body)

    def test_invalid_image_in_register(self):
        # Register with invalid image should return 400
        res = self.client.post('/face/register', json={'user_id': 'tmp_test', 'image': 'invalid-url'})
        self.assertEqual(res.status_code, 400)
        body = res.get_json()
        self.assertIn('error', body)

    def test_location_auth(self):
        # Same coordinates -> inside radius
        payload = { 'lat': 12.9716, 'lng': 77.5946, 'target_lat': 12.9716, 'target_lng': 77.5946, 'radius_m': 10 }
        res = self.client.post('/auth/location', json=payload)
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertTrue(body.get('authenticated'))
        self.assertEqual(body.get('distance_m'), 0)

        # Far away coordinates -> outside radius
        payload2 = { 'lat': 12.9716, 'lng': 77.5946, 'target_lat': 13.0358, 'target_lng': 77.5970, 'radius_m': 100 }
        res2 = self.client.post('/auth/location', json=payload2)
        self.assertEqual(res2.status_code, 200)
        body2 = res2.get_json()
        self.assertFalse(body2.get('authenticated'))

    def test_malformed_json_payloads(self):
        # Sending malformed JSON should result in a 400-level response
        bad = "{ this is not: valid json"
        res = self.client.post('/auth/face', data=bad, content_type='application/json')
        self.assertTrue(res.status_code >= 400)

    def test_concurrent_registrations(self):
        # Spawn multiple threads to register faces concurrently (lightweight)
        img = make_test_image()
        data_url = image_to_data_url(img)

        results = []
        def worker(i):
            local_client = app.test_client()
            uid = f'tmp_test_concurrent_{i}'
            r = local_client.post('/face/register', json={'user_id': uid, 'image': data_url})
            try:
                results.append((i, r.status_code, r.get_json()))
            except Exception:
                results.append((i, getattr(r, 'status_code', None), None))

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Expect all to have succeeded
        for i, status, body in results:
            self.assertEqual(status, 200, msg=f'thread {i} failed with status {status} and body {body}')

        # Cleanup files created
        for i in range(8):
            path = os.path.join(self.faces_dir, f'tmp_test_concurrent_{i}.jpg')
            if os.path.exists(path):
                os.remove(path)

    def test_stress_register_verify_loop(self):
        # Light stress: repeatedly register and verify the same user
        img = make_test_image()
        data_url = image_to_data_url(img)
        uid = 'tmp_test_stress'
        for i in range(30):
            r = self.client.post('/face/register', json={'user_id': uid, 'image': data_url})
            self.assertIn(r.status_code, (200, 201))
            v = self.client.post('/auth/face', json={'image': data_url, 'user_id': uid})
            # verification should return 200 and include authenticated flag
            self.assertEqual(v.status_code, 200)
            body = v.get_json()
            self.assertIn('authenticated', body)
            # tiny sleep to avoid hogging CPU in CI
            time.sleep(0.01)

        # Cleanup
        p = os.path.join(self.faces_dir, f'{uid}.jpg')
        if os.path.exists(p):
            os.remove(p)


if __name__ == '__main__':
    unittest.main()
