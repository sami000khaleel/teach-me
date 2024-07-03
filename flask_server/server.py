from flask import Flask, jsonify, request
import cv2
import os
import numpy as np
import mediapipe as mp
import pickle
import pandas as pd
import face_recognition

app = Flask(__name__)

mp_drawing = mp.solutions.drawing_utils
mp_holistic = mp.solutions.holistic

IMAGE_SIZE = (640, 480)  # Define the target image size

def load_data():
    global images_encoding, names
    try:
        with open('images_encoding.pkl', 'rb') as f:
            images_encoding = pickle.load(f)
        with open('names.pkl', 'rb') as f:
            names = pickle.load(f)
    except:
        images_encoding = []
        names = []

def store_image(image):
    try:
        student_id = request.files['file'].filename
        student_id = os.path.splitext(student_id)[0]
        index = names.index(f"{student_id}.jpg") if f"{student_id}.jpg" in names else -1
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = cv2.resize(image, IMAGE_SIZE)
        face_locations = face_recognition.face_locations(image)
        if len(face_locations) > 0:
            encode = face_recognition.face_encodings(image, face_locations)[0]
            if index == -1:
                images_encoding.append(encode)
                names.append(student_id)
            else:
                images_encoding[index] = encode
            with open('images_encoding.pkl', 'wb') as f:
                pickle.dump(images_encoding, f)
            with open('names.pkl', 'wb') as f:
                pickle.dump(names, f)
            message = names
            result = "True"
        else:
            message = 'The picture does not contain a face'
            result = "False"
    except Exception as e:
        print(f"Error in store_image: {e}")
        result = "False"
        message = str(e)
    return result, message

load_data()

def detect_face(frame):
    try:
        rgb_frame = frame[:, :, ::-1]
        rgb_frame = cv2.resize(rgb_frame, IMAGE_SIZE)
        face_locations = face_recognition.face_locations(rgb_frame)
        if len(face_locations) > 0:
            result = "True"
        else:
            result = "False"
    except Exception as e:
        print(f"Error in detect_face: {e}")
        result = "False"
    return result

def recognition_face(frame):
    try:
        student_id = request.files['file'].filename
        student_id = os.path.splitext(student_id)[0]
        index = names.index(f"{student_id}") if f"{student_id}" in names else -1
        stored_encode = images_encoding[index]
        stored_name = names[index]
        image_small = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image_small = cv2.resize(image_small, IMAGE_SIZE)
        face_location = face_recognition.face_locations(image_small)
        face_encoding = face_recognition.face_encodings(image_small, face_location)
        match = face_recognition.compare_faces([stored_encode], face_encoding[0])
        if match[0]:
            name = stored_name
            state = "True"
        else:
            name = 'Unknown Face'
            state = "False"
    except Exception as e:
        print(f"Error in recognition_face: {e}")
        name = 'Error'
        state = "False"
    return state, name

with open('coords.pkl', 'rb') as f:
    model = pickle.load(f)

def classification(frame):
    try:
        with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image = cv2.resize(image, IMAGE_SIZE)
            image.flags.writeable = False
            results = holistic.process(image)
            image.flags.writeable = True
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
            mp_drawing.draw_landmarks(image, results.face_landmarks, mp_holistic.FACEMESH_CONTOURS,
                                      mp_drawing.DrawingSpec(color=(80, 110, 10), thickness=1, circle_radius=1),
                                      mp_drawing.DrawingSpec(color=(80, 256, 121), thickness=1, circle_radius=1))
            mp_drawing.draw_landmarks(image, results.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS,
                                      mp_drawing.DrawingSpec(color=(80, 22, 10), thickness=2, circle_radius=4),
                                      mp_drawing.DrawingSpec(color=(80, 44, 121), thickness=2, circle_radius=2))
            mp_drawing.draw_landmarks(image, results.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS,
                                      mp_drawing.DrawingSpec(color=(121, 22, 76), thickness=2, circle_radius=4),
                                      mp_drawing.DrawingSpec(color=(121, 44, 250), thickness=2, circle_radius=2))
            mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_holistic.POSE_CONNECTIONS,
                                      mp_drawing.DrawingSpec(color=(245, 117, 66), thickness=2, circle_radius=4),
                                      mp_drawing.DrawingSpec(color=(245, 66, 230), thickness=2, circle_radius=2))
            try:
                pose = results.pose_landmarks.landmark
                pose_row = list(np.array([[landmark.x, landmark.y, landmark.z, landmark.visibility] for landmark in pose]).flatten())
                face = results.face_landmarks.landmark
                face_row = list(np.array([[landmark.x, landmark.y, landmark.z, landmark.visibility] for landmark in face]).flatten())
                row = pose_row + face_row
                X = pd.DataFrame([row])
                body_language_class = model.predict(X)[0]
                body_language_prob = model.predict_proba(X)[0]
                print(body_language_class, body_language_prob)
                coords = tuple(np.multiply(np.array(
                    (results.pose_landmarks.landmark[mp_holistic.PoseLandmark.LEFT_EAR].x,
                     results.pose_landmarks.landmark[mp_holistic.PoseLandmark.LEFT_EAR].y)),
                    [640, 480]).astype(int))
                action = body_language_class
                state = "True"
            except Exception as e:
                print(f"Error in classification inner block: {e}")
                action = "No Body"
                state = "False"
    except Exception as e:
        print(f"Error in classification: {e}")
        action = "Error"
        state = "False"
    return state, action

@app.route('/api/store_image', methods=['POST'])
def store_image_endpoint():
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'No file part', 'status': 400}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'message': 'No selected file', 'status': 400}), 400
        if file and file.filename.endswith('.jpg'):
            nparr = np.frombuffer(file.read(), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            result, message = store_image(frame)
            if result == "True":
                return jsonify({'names': message, 'message': 'add image is complete'}), 200
            else:
                return jsonify({'message': message}), 200
        else:
            return jsonify({'message': 'Invalid file format', 'status': 400}), 400
    except Exception as e:
        print(f"Error in store_image_endpoint: {e}")
        return jsonify({'message': str(e), 'status': 500}), 500

@app.route('/api/check_student', methods=['POST'])
def check_student_endpoint():
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'No file part', 'status': 400}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'message': 'No selected file', 'status': 400}), 400
        if file and file.filename.endswith('.jpg'):
            nparr = np.frombuffer(file.read(), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            result = detect_face(frame)
            if result == "True":
                state, name = recognition_face(frame)
                if state == "True":
                    return jsonify({'result': name}), 200
                else:
                    return jsonify({'message': 'facesDoNotMatch'}), 200
            else:
                return jsonify({'message': 'noFace'}), 200
        else:
            return jsonify({'message': 'Invalid file format', 'status': 400}), 400
    except Exception as e:
        print(f"Error in check_student_endpoint: {e}")
        return jsonify({'message': str(e), 'status': 500}), 500

@app.route('/api/action_student', methods=['POST'])
def action_student_endpoint():
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'No file part', 'status': 400}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'message': 'No selected file', 'status': 400}), 400
        if file and file.filename.endswith('.jpg'):
            nparr = np.frombuffer(file.read(), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            state1, action = classification(frame)
            if state1 == "True":
                return jsonify({'message': action}), 200
            else:
                return jsonify({'message': action}), 200
        else:
            return jsonify({'message': 'Invalid file format', 'status': 400}), 400
    except Exception as e:
        print(f"Error in action_student_endpoint: {e}")
        return jsonify({'message': str(e), 'status': 500}), 500

if __name__ == '__main__':
    app.run(ssl_context='adhoc')
