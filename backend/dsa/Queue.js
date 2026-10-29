// backend/dsa/Queue.js
// ============================================================
// QUEUE DATA STRUCTURE - FIFO (First In, First Out)
// ============================================================
// Used for: Managing vehicles waiting for a parking slot.
// When all slots are full, vehicles are added to this queue.
// When a slot becomes free, the FIRST vehicle in the queue gets it.
//
// Example:
//   Enqueue: Vehicle A → Vehicle B → Vehicle C
//   Dequeue: Vehicle A leaves first (it arrived first)
// ============================================================

class Queue {
  constructor() {
    // Internal array to store queue items
    this.items = [];
  }

  // Add a vehicle to the END of the queue
  enqueue(vehicle) {
    this.items.push(vehicle);
  }

  // Remove and return the vehicle from the FRONT of the queue
  dequeue() {
    if (this.isEmpty()) {
      return null; // Nothing to remove
    }
    return this.items.shift(); // shift() removes from the front
  }

  // Look at the FRONT vehicle without removing it
  peek() {
    if (this.isEmpty()) {
      return null;
    }
    return this.items[0];
  }

  // Check if queue has no vehicles
  isEmpty() {
    return this.items.length === 0;
  }

  // Get the number of vehicles waiting
  size() {
    return this.items.length;
  }

  // Get all waiting vehicles as an array (for display)
  toArray() {
    return [...this.items];
  }

  // Remove a specific vehicle from the queue (if they leave the wait)
  removeByVehicleNumber(vehicleNumber) {
    const index = this.items.findIndex(
      (v) => v.vehicleNumber === vehicleNumber
    );
    if (index !== -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }

  // Clear the entire queue
  clear() {
    this.items = [];
  }
}

// Export a single shared queue instance (Singleton pattern)
// This means the same queue object is used everywhere in the app
const waitingQueue = new Queue();

module.exports = { Queue, waitingQueue };
