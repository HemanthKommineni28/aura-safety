/*
  Smart Panic Alert - Arduino/ESP32 SOS Trigger
  Technologies: Arduino ESP32, GPS Neo-6M, Push Button
  Purpose: Transmit GPS location to the PHP backend on button press.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPS++.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server Configuration (PHP API URL)
const char* serverUrl = "http://192.168.1.10/smart-panic-alert/backend/sos.php";

// GPS Configuration (Serial2 for ESP32)
TinyGPSPlus gps;
#define RXD2 16
#define TXD2 17

// Hardware Pins
const int panicButtonPin = 4; // D4 Pin for the panic button
int user_id = 2; // User ID from the database

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2); // Starting GPS serial

  pinMode(panicButtonPin, INPUT_PULLUP);

  // Connecting to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
}

void loop() {
  // Update GPS data
  while (Serial2.available() > 0) {
    gps.encode(Serial2.read());
  }

  // Check if button is pressed
  if (digitalRead(panicButtonPin) == LOW) {
    Serial.println("Panic Button Pressed!");
    
    if (gps.location.isValid()) {
      float latitude = gps.location.lat();
      float longitude = gps.location.lng();
      
      Serial.printf("Triggering SOS: %f, %f\n", latitude, longitude);
      sendSOS(latitude, longitude);
    } else {
      Serial.println("GPS Fix not available yet.");
      // For demo purposes, if GPS has no fix, send a dummy location
      sendSOS(28.6139, 77.2090); // Dummy: New Delhi
    }
    
    delay(2000); // Debounce and prevent multiple triggers
  }
}

void sendSOS(float lat, float lng) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Prepare JSON payload
    String payload = "{\"user_id\":" + String(user_id) + ",\"lat\":" + String(lat) + ",\"lng\":" + String(lng) + "}";
    
    int httpResponseCode = http.POST(payload);
    
    if (httpResponseCode > 0) {
      Serial.print("SOS Sent. Server Response: ");
      Serial.println(http.getString());
    } else {
      Serial.print("Error sending SOS: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }
}
