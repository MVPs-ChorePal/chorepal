# ChorePal

### **Project Description**
ChorePal is a mobile application designed to modernize and gamify household management. The app allows parents to assign tasks to children and automate the verification process using AI (and the parent). By bridging the gap between work and reward, ChorePal encourages accountability in the household through a "Virtual Wallet" system.

---

### **Technologies Used**
*   **Frontend:** React Native with Expo Router (Cross-platform iOS/Android)
*   **Backend:** Supabase (PostgreSQL Database & Edge Functions)
*   **Cloud Storage:** AWS S3 (Secure image hosting)
*   **AI/ML:** AWS Rekognition (Object detection and chore verification)
*   **Tools:** VS Code, Git/GitHub, Node.js

---

### **Installation Instructions**

1.  **Clone the Repository:**
    git clone [link]
    cd chorepal

2.  **Install Dependencies:**
    Navigate to the frontend source folder and install the required packages:
    cd Application/Frontend
    npm install

---

### **How to Run the Application**
ChorePal is built using the Expo framework, allowing for easy testing on web or mobile devices.

1.  **Start the Development Server:**
    npx expo start

2.  **View the App:**
    *   **Web:** Press `w` in the terminal to open the app in your browser.
    *   **Mobile:** Download the **Expo Go** app on your phone and scan the QR code displayed in the terminal.

---

### **Testing**
The project currently includes several manual and automated test checkpoints:
*   **Authentication Test:** Verify Parent and Child registration flows.
*   **Database Integrity:** Ensure children are correctly linked to parents via the `secretCode` backbone.
*   **AI Pipeline Test:** Located in the Child Dashboard; users can capture a photo and receive real-time object detection labels from AWS Rekognition.
*   **Cloud Storage Test:** Verification that captured images successfully upload to the private AWS S3 bucket.