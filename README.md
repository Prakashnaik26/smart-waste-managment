# Smart Waste Management Platform (MVP Demo)

A full-stack web application designed for citizen waste reporting, mock AI classification, geo-tagging, gamified citizen rewards (points system), and an administrative sustainability analytics dashboard.

---

## Technical Stack
- **Frontend**: React (Vite), Tailwind CSS, Leaflet.js (OpenStreetMap), Recharts, Lucide Icons
- **Backend**: Node.js, Express, Multer (file uploads), JWT Authentication, bcryptjs
- **Database**: Firebase Firestore (with an automatic local JSON database fallback)

---

## Dynamic Database Mode
To ensure the app is instantly runnable locally with **zero initial configuration**:
- If `backend/serviceAccountKey.json` is **not present**, the server automatically starts in **Local Mock DB Mode** (reading/writing to `backend/data/db.json`). All features (map pins, users, auth, charts, tasks, points) function identically to the live cloud database, and the DB is seeded with 16 realistic reports.
- Once you add `backend/serviceAccountKey.json` from the Firebase Console, the system will **automatically switch to Firebase Firestore** on the next start.

---

## Prerequisites & Setup

### Step 1: Clone and Configure Backend
1. Generate Firebase Service Account credentials (optional):
   - Go to the [Firebase Console](https://console.firebase.google.com/).
   - Open your project, click **Project Settings** (gear icon) -> **Service Accounts**.
   - Click **Generate new private key** and download the `.json` file.
   - Rename the file to `serviceAccountKey.json` and place it in the `backend/` directory:
     `backend/serviceAccountKey.json`
2. Create `backend/.env` file:
   ```env
   PORT=5000
   JWT_SECRET=super_secret_jwt_key_change_me_123!
   ```
3. Install backend dependencies and start the server:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   *Note: On Windows, if script execution is blocked in PowerShell, use `npm.cmd install` and `npm.cmd run dev` respectively.*

### Step 2: Configure and Start Frontend
1. Create `frontend/.env` file:
   ```env
   VITE_API_URL=http://localhost:5000
   ```
2. Install frontend dependencies and start the Vite dev server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Note: Use `npm.cmd` on Windows if script execution is blocked.*

---

## Accounts for Demo Testing
The database is auto-seeded on first start. You can log in with these credentials:

| Role | Email | Password | Purpose |
|---|---|---|---|
| **Admin** | `admin@waste.com` | `admin123` | View charts, manage tasks, mark waste resolved |
| **Citizen 1** | `citizen1@waste.com` | `citizen123` | Report waste, earn points (+10 per report), view profile |
| **Citizen 2** | `citizen2@waste.com` | `citizen223` | Alternate reporter account |

---

## Mock AI Classifier Details
The classification engine is located in `backend/utils/classifier.js`.
- It matches keywords in your uploaded image filenames (case-insensitive):
  - Filename contains `"bottle"`, `"bag"`, `"cup"`, or `"plastic"` $\rightarrow$ **Plastic**
  - Filename contains `"apple"`, `"banana"`, `"food"`, `"leaf"`, or `"peel"` $\rightarrow$ **Organic**
  - Filename contains `"phone"`, `"battery"`, `"cable"`, or `"wire"` $\rightarrow$ **E-Waste**
  - Filename contains `"can"`, `"metal"`, `"tin"`, or `"foil"` $\rightarrow$ **Metal**
  - Filename contains `"paper"`, `"cardboard"`, `"box"`, or `"glass"` $\rightarrow$ **Mixed**
- If no keyword matches, a category is chosen randomly with a realistic confidence score (70% - 95%).
- A real image classification API contract can be integrated here directly without changes to the rest of the application.
