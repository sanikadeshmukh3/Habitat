import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
console.log("API URL:", API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach token automatically to EVERY request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// for centralized error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    let message = "Something went wrong.";

    if (error.response) {
      if (error.response.data?.message) {
        message = error.response.data.message;
      } else if (error.response.status == 401) {
        await AsyncStorage.removeItem("token"); // to prevent any bad tokens still in storage
        
        message = "Session expired, please try again.";
      } else if (error.response.status >= 500) {
        message = "Server error. Try again later";
      }

    }
    else {
      message = "Network error. Check your connection.";
    }

    Alert.alert("Error", message);

    return Promise.reject(error);
  }
);

export default api;