import server from "@/utils/BackendServer";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true);
    if (!email || !password) {
      setErrorMsg("Please enter email & password");
      return;
    }

    try {
      const data = {
        email: email.trim(),
        password: password.trim()
      };

      const res = await axios.post(`${server}/user/login`, data);

      if (res.status === 200) {
        const token = res.data.token;
        const user = res.data.user;

        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("user", JSON.stringify(user));
        // store expiry timestamp (1 week)
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        await AsyncStorage.setItem("token_expiry", String(Date.now() + oneWeek));

        router.replace("/home");
      } else {
        setErrorMsg("Invalid email or password");
      }
    } catch (err) {
      console.log(err);
      setErrorMsg("Server error. Try again");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const expiry = await AsyncStorage.getItem("token_expiry");

        if (token && expiry && Number(expiry) > Date.now()) {
          router.replace("/home");
        } else if (expiry && Number(expiry) <= Date.now()) {
          // expired: clear stored auth
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("user");
          await AsyncStorage.removeItem("token_expiry");
        }
      } catch (e) {
        console.log('Token check failed', e);
      }
    };

    checkToken();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Route<Text style={styles.redColor}>X</Text></Text>

      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        secureTextEntry={!showPassword}
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.passwordToggle}
        onPress={() => setShowPassword(!showPassword)}
      >
        <FontAwesome
          name={showPassword ? "eye" : "eye-slash"}
          size={20}
          color="#aaa"
        />
        <Text style={styles.toggleText}>{showPassword ? "Hide" : "Show"} Password</Text>
      </TouchableOpacity>


      {
        loading ?
          <View style={styles.Loadbtn}>
            <Text style={styles.btnText}>Authenticating...</Text>
          </View> :
          <TouchableOpacity style={styles.btn} onPress={handleLogin}>
            <Text style={styles.btnText}>Login</Text>
          </TouchableOpacity>
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#000" },
  title: { fontSize: 32, color: "#fff", textAlign: "center", marginBottom: 25 },
  input: { backgroundColor: "#222", padding: 15, borderRadius: 10, color: "#fff", marginBottom: 15 },
  passwordToggle: { flexDirection: "row", alignItems: "center", marginBottom: 20, paddingHorizontal: 10 },
  toggleText: { color: "#aaa", marginLeft: 8, fontSize: 14 },
  btn: { backgroundColor: "red", padding: 15, borderRadius: 10 },
  Loadbtn: { backgroundColor: "#ca7272ff", padding: 15, borderRadius: 10 },
  btnText: { textAlign: "center", color: "#fff", fontSize: 18 },
  error: { color: "red", textAlign: "center", marginBottom: 10 },
  redColor: { color: 'red' },
});
