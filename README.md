# 🚗 Smart Parking Management System
### SDG 11 — Sustainable Cities and Communities | College DSA Project

---

## 📁 Project Structure

```
smart parking managment system/
├── backend/
│   ├── config/db.js           ← MongoDB connection
│   ├── controllers/
│   │   └── parkingController.js ← All business logic (DSA here!)
│   ├── dsa/
│   │   ├── Queue.js           ← FIFO Queue implementation
│   │   └── Stack.js           ← LIFO Stack implementation
│   ├── models/
│   │   ├── ParkingSlot.js
│   │   ├── Vehicle.js
│   │   └── ParkingHistory.js
│   ├── routes/
│   │   └── parkingRoutes.js   ← REST API routes
│   ├── server.js              ← Express entry point
│   ├── seed.js                ← Demo data seeder
│   └── .env                   ← Environment variables
│
└── frontend/
    ├── src/
    │   ├── api/parkingApi.js  ← All API calls
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── StatCard.jsx
    │   │   ├── ParkingGrid.jsx
    │   │   ├── ParkingSlot.jsx
    │   │   ├── VehicleForm.jsx
    │   │   ├── QueuePanel.jsx
    │   │   ├── ActivityStack.jsx
    │   │   ├── MapView.jsx    ← GPS + Leaflet map
    │   │   ├── HistoryTable.jsx
    │   │   └── Toast.jsx
    │   └── pages/
    │       ├── Home.jsx
    │       ├── Dashboard.jsx
    │       ├── Parking.jsx
    │       └── History.jsx
    └── vite.config.js
```

---

## ⚙️ Prerequisites

1. **Node.js** (v18 or higher) — https://nodejs.org
2. **MongoDB** (Community Edition) — https://www.mongodb.com/try/download/community

> Make sure MongoDB is running before starting the backend.

---

## 🚀 How to Run

### Step 1: Start MongoDB

#### Windows (if installed as a service):
```
net start MongoDB
```

#### Or manually (default install path):
```
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath "C:\data\db"
```

> If `C:\data\db` doesn't exist, create it first:
> `mkdir C:\data\db`

---

### Step 2: Set Up and Start the Backend

```bash
# Navigate to backend folder
cd backend

# Install dependencies (only first time)
npm install

# Seed the database with demo data
node seed.js

# Start the backend server
npm run dev
```

✅ Backend will run at: http://localhost:5000

---

### Step 3: Set Up and Start the Frontend

Open a **new terminal**:

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies (only first time)
npm install

# Start the dev server
npm run dev
```

✅ Frontend will run at: http://localhost:5173

---

## 🧪 Test the Full Flow

1. Open http://:5173localhost
2. Click **Find Parking**
3. Enter a vehicle number (e.g. `MH12ZZ9999`)
4. System assigns a slot → click **Navigate to Slot**
5. Map shows GPS route from your location → entrance → slot
6. Click **Navigate to Exit** → map shows route to exit
7. Click **Exit Parking** → slot freed, queue checked
8. Go to **Dashboard** to see live updates
9. Go to **History** to see completed sessions

---

## 🔌 API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/parking/slots | Get all slots |
| GET | /api/parking/stats | Get stats + queue + activity stack |
| POST | /api/parking/park | Park a vehicle |
| POST | /api/parking/exit | Exit a vehicle |
| GET | /api/parking/queue | Get waiting queue |
| GET | /api/parking/history | Get parking history |
| GET | /api/parking/vehicle/:num | Get vehicle details |

---

## 📚 DSA Concepts Used

### Queue (FIFO) — `backend/dsa/Queue.js`
```
When all 20 slots are full:
  → Vehicle added to Queue (enqueue)
When a slot frees up:
  → First vehicle in Queue gets it (dequeue)
```

### Stack (LIFO) — `backend/dsa/Stack.js`
```
Every park/exit action is pushed to the Stack.
Dashboard shows most recent activity at TOP.
```

### Array Linear Scan — `parkingController.js`
```
To find a free slot:
  → Loop through sorted slots array
  → Return first slot where status === 'AVAILABLE'
  → Simple O(n) algorithm — easy to explain
```

---

## 🗺️ GPS / Map Feature

- **Browser Geolocation API** → gets your real lat/lng
- **Leaflet** + **OpenStreetMap** → free, no API key needed
- **Simulated parking lot coordinates** → Pune, India (customizable)
- **Route polyline** → shows path from you → entrance → slot (or slot → exit)

> To change the parking lot location, edit `PARKING_LOT_CENTER` in `MapView.jsx`

---

## 🎨 Design

- Dark navy background (`#0a0f1e`)
- Green (#10b981) for available slots
- Red (#ef4444) for occupied slots
- Yellow (#eab308) for reserved slots
- Orange (#f97316) for queue/waiting
- Tailwind CSS + Lucide React icons
- Leaflet for maps

---

## 🎓 Viva Preparation

**Q: How does the Queue work?**
A: When all slots are full, vehicles are added to `waitingQueue` using `enqueue()`.
   When a vehicle exits, `dequeue()` returns the first waiting vehicle (FIFO), and that vehicle gets the freed slot.

**Q: How does the Stack work?**
A: Every park/exit action calls `activityStack.push()`. The dashboard reads `activityStack.toArray()` which returns items in reverse (LIFO), so most recent is first.

**Q: How is a slot assigned?**
A: `ParkingSlot.findOne({ status: 'AVAILABLE' }).sort({ slotId: 1 })` — simple linear scan of the database, returns the first available slot alphabetically (A1 before A2, etc.)

**Q: How does React communicate with Express?**
A: Through Axios HTTP calls in `parkingApi.js`. Frontend sends POST/GET requests to `http://localhost:5000/api/parking/...`.

**Q: How does GPS work?**
A: `navigator.geolocation.getCurrentPosition()` — the browser asks for permission and returns the user's lat/lng. This is plotted on a Leaflet map.

---
*Built with ❤️ as a college DSA project — SDG 11: Sustainable Cities and Communities*
