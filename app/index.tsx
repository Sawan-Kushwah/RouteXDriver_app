import server from "@/utils/BackendServer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocaleDirContext } from "@react-navigation/native";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if(loading) return;
    if (!email || !password) {
      setErrorMsg("Please enter email & password");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${server}/user/login`, { email, password });

      if (res.status === 200) {
        const token = res.data.token;
        const user = res.data.user;

        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("user", JSON.stringify(user));

        router.replace("/home");
      } else {
        setErrorMsg("Invalid email or password");
      }
    } catch (err) {
      console.log(err);
      setErrorMsg("Server error. Try again");
    } finally {
      setLoading(false)
    }
  };


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

      <TouchableOpacity style={styles.btn} onPress={handleLogin}>
        {
          loading ? 
          <Text style={styles.btnText}>loading...</Text>
          :  <Text style={styles.btnText}>Login</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#000" },
  title: { fontSize: 32, color: "#fff", textAlign: "center", marginBottom: 25 },
  input: { backgroundColor: "#222", padding: 15, borderRadius: 10, color: "#fff", marginBottom: 15 },
  btn: { backgroundColor: "red", padding: 15, borderRadius: 10 },
  btnText: { textAlign: "center", color: "#fff", fontSize: 18 },
  error: { color: "red", textAlign: "center", marginBottom: 10 },
  redColor: {color: 'red'},
});
