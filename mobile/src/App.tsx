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
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { getMobileDeviceId, scanAndMarkAttendance } from "./api";

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sessionId, setSessionId] = useState("1");
  const [sessionCode, setSessionCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifiedStudent, setVerifiedStudent] = useState<string | null>(null);
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

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.permissionText}>Camera access is required for attendance scan.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleCaptureAndMark = async () => {
    if (!sessionCode || sessionCode.length < 6) {
      Alert.alert("Input Required", "Please enter the 6-digit rolling code shown on the screen.");
      return;
    }

    if (!cameraRef.current) return;
    setLoading(true);
    setVerifiedStudent(null);

    try {
      // Capture 2 consecutive frames for server burst liveness
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
        setVerifiedStudent(student.name);
        Alert.alert("Verified Present!", `Welcome, ${student.name}!\nAttendance successfully logged.`);
      } else {
        Alert.alert("Not Recognized", "No registered student face matched this photo.");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to mark attendance.";
      Alert.alert("Verification Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>ClassVision Mobile</Text>
        <Text style={styles.subtitle}>1-Tap Biometric Attendance</Text>
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
          style={[styles.scanButton, loading && styles.disabledButton]}
          onPress={handleCaptureAndMark}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.scanButtonText}>Verify & Check In</Text>
          )}
        </TouchableOpacity>

        {deviceId ? (
          <Text style={styles.deviceText}>Bound Device: {deviceId.substring(0, 14)}…</Text>
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
  centerContainer: {
    flex: 1,
    backgroundColor: "#030712",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#f3f4f6",
  },
  subtitle: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
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
  scanButton: {
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
  scanButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
  deviceText: {
    color: "#6b7280",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  permissionText: {
    color: "#e5e7eb",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
