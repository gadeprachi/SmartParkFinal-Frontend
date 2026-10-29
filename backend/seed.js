// backend/seed.js
// ============================================================
// SEED SCRIPT — Populates the database with demo data
// Run with: node seed.js
// ============================================================
// This creates:
//   - 20 parking slots (A1–D5)
//   - Some slots occupied/reserved
//   - 3 parking history records
// ============================================================

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const ParkingSlot = require("./models/ParkingSlot");
const Vehicle = require("./models/Vehicle");
const ParkingHistory = require("./models/ParkingHistory");

// ─── Parking Lot Layout ─────────────────────────────────────
// Row A = row 0, Row B = row 1, Row C = row 2, Row D = row 3
// Columns 1–5 = col 0–4

const generateSlots = () => {
  const rows = ["A", "B", "C", "D"];
  const cols = [1, 2, 3, 4, 5];
  const slots = [];

  rows.forEach((row, rowIndex) => {
    cols.forEach((col, colIndex) => {
      slots.push({
        slotId: `${row}${col}`,
        status: "AVAILABLE",
        vehicleNumber: null,
        row: rowIndex,
        col: colIndex,
      });
    });
  });

  return slots; // 20 slots total
};

// ─── Demo Occupied/Reserved Slots ──────────────────────────
const demoVehicles = [
  { vehicleNumber: "MH12AB1234", vehicleType: "Car",        slotId: "A2", hoursAgo: 2 },
  { vehicleNumber: "DL3CAB9876", vehicleType: "SUV",        slotId: "A4", hoursAgo: 1 },
  { vehicleNumber: "KA05MG7777", vehicleType: "Motorcycle", slotId: "B1", hoursAgo: 3 },
  { vehicleNumber: "TN09XY2345", vehicleType: "Car",        slotId: "B3", hoursAgo: 0.5 },
  { vehicleNumber: "GJ01BB5500", vehicleType: "Truck",      slotId: "C2", hoursAgo: 4 },
];

const reservedSlots = ["A5", "C4"];

// ─── Demo History Records ───────────────────────────────────
const demoHistory = [
  {
    vehicleNumber: "MH14CD5678",
    vehicleType: "Car",
    slotId: "A1",
    entryTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
    exitTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
    duration: 120,
  },
  {
    vehicleNumber: "UP32GH3344",
    vehicleType: "SUV",
    slotId: "B2",
    entryTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
    exitTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
    duration: 90,
  },
  {
    vehicleNumber: "RJ14TT1122",
    vehicleType: "Motorcycle",
    slotId: "D3",
    entryTime: new Date(Date.now() - 10 * 60 * 60 * 1000),
    exitTime: new Date(Date.now() - 9 * 60 * 60 * 1000),
    duration: 55,
  },
];

const seed = async () => {
  try {
    await connectDB();

    console.log("🌱 Clearing existing data...");
    await ParkingSlot.deleteMany({});
    await Vehicle.deleteMany({});
    await ParkingHistory.deleteMany({});

    // ─── Create slots ──────────────────────────────────────
    console.log("🅿️  Creating 20 parking slots...");
    const slots = generateSlots();

    // Mark some slots as OCCUPIED
    for (const demo of demoVehicles) {
      const slot = slots.find((s) => s.slotId === demo.slotId);
      if (slot) {
        slot.status = "OCCUPIED";
        slot.vehicleNumber = demo.vehicleNumber;
      }
    }

    // Mark some slots as RESERVED
    for (const slotId of reservedSlots) {
      const slot = slots.find((s) => s.slotId === slotId);
      if (slot) {
        slot.status = "RESERVED";
      }
    }

    await ParkingSlot.insertMany(slots);
    console.log(`   ✅ Created ${slots.length} slots`);

    // ─── Create vehicle records ────────────────────────────
    console.log("🚗 Creating demo vehicle records...");
    const vehicleDocs = demoVehicles.map((v) => ({
      vehicleNumber: v.vehicleNumber,
      vehicleType: v.vehicleType,
      slotId: v.slotId,
      entryTime: new Date(Date.now() - v.hoursAgo * 60 * 60 * 1000),
      status: "PARKED",
    }));

    await Vehicle.insertMany(vehicleDocs);
    console.log(`   ✅ Created ${vehicleDocs.length} vehicle records`);

    // ─── Create parking history ────────────────────────────
    console.log("📋 Creating parking history...");
    await ParkingHistory.insertMany(demoHistory);
    console.log(`   ✅ Created ${demoHistory.length} history records`);

    console.log("\n🎉 Database seeded successfully!");
    console.log(
      `   Total slots: ${slots.length} | Occupied: ${demoVehicles.length} | Reserved: ${reservedSlots.length} | Available: ${
        slots.length - demoVehicles.length - reservedSlots.length
      }`
    );

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

seed();
