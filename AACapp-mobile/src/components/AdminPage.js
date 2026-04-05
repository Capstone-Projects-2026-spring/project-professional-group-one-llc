import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,

} from "react-native";
import InteractionLogModal from "./InteractionLogModal";
import { fetchInteractionLogs } from "../services/interactionRepository";

export default function AdminPage({ navigation }) {

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [users, setUsers] = useState([]);

  const handleCreateUser = () => {
    if (!name || !age) {
      Alert.alert("Missing Info", "Please enter a name and age.");
      return;
    }

    const newUser = {
      id: Date.now().toString(),
      name,
      age,
    };

    setUsers((prevUsers) => [...prevUsers, newUser]);
    setName("");
    setAge("");
  };

  const handleSelectUser = (user) => {
    navigation.navigate("Main", { selectedUser: user });
  };
  const [logsVisible, setLogsVisible] = useState(false);
  const [logs, setLogs] = useState([]);

  const handleViewLogs = async () => {
    try {
      const data = await fetchInteractionLogs(50);
      setLogs(data || []);
      setLogsVisible(true);
    } catch (error) {
      Alert.alert("Logs Error", error.message);
    }
  };


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <Text style={styles.subtitle}>
        Welcome to the administration page
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create User Account</Text>
        <Text style={styles.cardText}>
          Add new AAC users and manage profiles.
        </Text>

        <TextInput
	  style={styles.input}
	  placeholder="Name"
	  value={name}
	  onChangeText={setName}
	/>

	<TextInput
	  style={styles.input}
	  placeholder="Age"
	  value={age}
	  onChangeText={setAge}
	  keyboardType="numeric"
	/>
	 <TouchableOpacity style={styles.button} onPress={handleCreateUser}>
          <Text style={styles.buttonText}>Create User</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Select User</Text>
        <Text style={styles.cardText}>
          Choose a created user to open the AAC page.
        </Text>

        {users.length === 0 ? (
          <Text style={styles.cardText}>No users created yet.</Text>
        ) : (
          users.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={styles.userItem}
              onPress={() => handleSelectUser(user)}
            >
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userAge}>Age: {user.age}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>


      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manage Beacons</Text>
        <Text style={styles.cardText}>
          Connect and assign beacons to rooms.
        </Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Manage Beacons</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>System Logs</Text>
        <Text style={styles.cardText}>
          Review interaction logs and events.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleViewLogs}>
          <Text style={styles.buttonText}>View Logs</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.switchButton]}
        onPress={() => navigation.navigate("Main")}
      >
        <Text style={styles.buttonText}>Go To AAC User Page</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.logoutButton]}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>

      <InteractionLogModal
	visible={logsVisible}
	logs={logs}
	onclose={() => setsLogsVisibile(false)}
      />


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#f4f6f8",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    marginBottom: 14,
    color: "#4b5563",
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  switchButton: {
    backgroundColor: "#059669",
  },
  logoutButton: {
    backgroundColor: "#dc2626",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },

    input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  userItem: {
    padding: 14,
    backgroundColor: "#eef2ff",
    borderRadius: 8,
    marginBottom: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
  },
  userAge: {
    fontSize: 14,
    color: "#4b5563",
    marginTop: 4,
  },
});
