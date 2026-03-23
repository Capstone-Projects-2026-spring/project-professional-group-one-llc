export const logEvent = async ({ action, label, userId }) => {
  const log = {
    action,
    label,
    userId,
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch("http://localhost:5000/api/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(log)
    });
  } catch (err) {
    console.error("Logging failed:", err);
  }
};
