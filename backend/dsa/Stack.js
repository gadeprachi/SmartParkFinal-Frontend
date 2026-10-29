// backend/dsa/Stack.js
// ============================================================
// STACK DATA STRUCTURE - LIFO (Last In, First Out)
// ============================================================
// Used for: Tracking recent parking/exit activity.
// The MOST RECENT action appears at the TOP of the stack.
//
// Example:
//   Push: Vehicle A parks → Vehicle B parks → Vehicle C exits
//   Top of stack: "Vehicle C exited" (most recent)
//   Pop: Returns "Vehicle C exited" first
//
// Think of it like a stack of plates:
//   - You add plates to the top (push)
//   - You take plates from the top (pop)
// ============================================================

class Stack {
  constructor(maxSize = 50) {
    // Internal array to store activity records
    this.items = [];
    // Maximum number of records to keep (so memory doesn't grow forever)
    this.maxSize = maxSize;
  }

  // Add a new activity to the TOP of the stack
  push(item) {
    this.items.push(item);
    // If the stack exceeds max size, remove the OLDEST item (bottom)
    if (this.items.length > this.maxSize) {
      this.items.shift();
    }
  }

  // Remove and return the TOP (most recent) activity
  pop() {
    if (this.isEmpty()) {
      return null;
    }
    return this.items.pop(); // pop() removes from the end (top)
  }

  // Look at the TOP activity without removing it
  peek() {
    if (this.isEmpty()) {
      return null;
    }
    return this.items[this.items.length - 1];
  }

  // Check if no activities have been recorded
  isEmpty() {
    return this.items.length === 0;
  }

  // Get the number of activities in the stack
  size() {
    return this.items.length;
  }

  // Get all activities as an array, most recent FIRST (reversed for display)
  toArray() {
    return [...this.items].reverse();
  }

  // Clear the stack
  clear() {
    this.items = [];
  }
}

// Export a single shared stack instance (Singleton pattern)
// This means the same stack object is used everywhere in the app
const activityStack = new Stack(50);

module.exports = { Stack, activityStack };
