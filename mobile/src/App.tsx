import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { getMobileDeviceId, login, scanAndMarkAttendance, setAuthToken } from "./api";

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [email, setEmail] = useState("admin@classvision.local");
  const [password, setPassword] = useState("admin123");
  const [authLoading, setAuthLoading] = useState(false);

  // Scanner state
  const [permission, requestPermission] = useCameraPermissions();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sessionId, setSessionId] = useState("1");
  const [sessionCode, setSessionCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("");

  const cameraRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const id = await getMobileDeviceId();
      setDeviceId(id);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      }
    })();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    setAuthLoading(true);
    try {
      const data = await login(email, password);
      setCurrentUser(data);
      Alert.alert("Logged In", `Welcome ${data.name || data.role}!`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to authenticate.";
      Alert.alert("Login Failed", msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
  };

  // 1. Authentication View
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.loginContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>👁️</Text>
          </View>
          <Text style={styles.loginTitle}>ClassVision 2.0</Text>
          <Text style={styles.loginSubtitle}>Sign in to start 1-tap mobile attendance</Text>

          <View style={styles.card}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="student@school.edu"
              placeholderTextColor="#6b7280"
            />

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#6b7280"
            />

            <TouchableOpacity
              style={[styles.primaryButton, authLoading && styles.disabledButton, { marginTop: 20 }]}
              onPress={handleLogin}
              disabled={authLoading}
            >
              {authLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In & Authorize Device</Text>
              )}
            </TouchableOpacity>
          </View>

          {deviceId ? (
            <Text style={styles.deviceText}>Device Fingerprint: {deviceId.substring(0, 16)}…</Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 2. Camera Permission View
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar style="light" />
        <Text style={styles.permissionText}>Camera permission is required for face check-in.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 3. Main Attendance Scanner View
  const handleCaptureAndMark = async () => {
    if (!sessionCode || sessionCode.length < 6) {
      Alert.alert("Input Required", "Please enter the 6-digit rolling code shown on the screen.");
      return;
    }

    if (!cameraRef.current) return;
    setLoading(true);

    try {
      // 2 consecutive frames for server anti-spoof liveness
      const pic1 = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      await new Promise((r) => setTimeout(r, 250));
      const pic2 = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });

      const result = await scanAndMarkAttendance(
        parseInt(sessionId),
        pic1.base64,
        [pic1.base64, pic2.base64],
        {
          lat: location?.lat,
          lng: location?.lng,
          code: sessionCode,
          deviceId: deviceId,
        }
      );

      if (result.marked && result.marked.length > 0) {
        const student = result.marked[0];
        Alert.alert("Verified Present! ✅", `Welcome, ${student.name}!\nConfidence: ${student.confidence?.toFixed(1) || 98}%`);
      } else {
        Alert.alert("Not Recognized", "No registered student face matched this photo.");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to mark attendance.";
      Alert.alert("Verification Failed ❌", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>ClassVision Mobile</Text>
          <Text style={styles.subtitle}>
            👤 {currentUser.name || "Authenticated"} ({currentUser.role})
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Camera Viewport */}
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing="front" ref={cameraRef}>
          <View style={styles.overlay}>
            <View style={styles.faceOval} />
            <Text style={styles.overlayText}>Position your face inside the oval</Text>
          </View>
        </CameraView>
      </View>

      {/* Input & Control Panel */}
      <View style={styles.controls}>
        <View style={styles.inputRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Session ID</Text>
            <TextInput
              style={styles.input}
              value={sessionId}
              onChangeText={setSessionId}
              keyboardType="number-pad"
              placeholderTextColor="#6b7280"
            />
          </View>
          <View style={{ flex: 1.5 }}>
            <Text style={styles.inputLabel}>6-Digit Session Code</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={sessionCode}
              onChangeText={setSessionCode}
              maxLength={6}
              keyboardType="number-pad"
              placeholder="e.g. 849201"
              placeholderTextColor="#6b7280"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleCaptureAndMark}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Verify & Check In</Text>
          )}
        </TouchableOpacity>

        {deviceId ? (
          <Text style={styles.deviceText}>Bound Device: {deviceId.substring(0, 16)}…</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030712",
  },
  loginContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#1e1b4b",
    borderWidth: 1,
    borderColor: "#4338ca",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
  },
  loginTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#f3f4f6",
    textAlign: "center",
  },
  loginSubtitle: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 28,
  },
  card: {
    backgroundColor: "#111827",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#030712",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f3f4f6",
  },
  subtitle: {
    fontSize: 12,
    color: "#818cf8",
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: "#1f2937",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  logoutText: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  faceOval: {
    width: 200,
    height: 270,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "#4f46e5",
    borderStyle: "dashed",
  },
  overlayText: {
    color: "#c7d2fe",
    fontSize: 12,
    marginTop: 15,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  controls: {
    padding: 16,
    gap: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  inputLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 4,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#111827",
    borderColor: "#374151",
    borderWidth: 1,
    borderRadius: 10,
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  codeInput: {
    fontFamily: "monospace",
    letterSpacing: 2,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
  deviceText: {
    color: "#6b7280",
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
  },
  permissionText: {
    color: "#e5e7eb",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
  },
});
