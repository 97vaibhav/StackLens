import "dotenv/config";
import { explainError } from "./tools/explainError.js";
import { formatResult } from "./utils/formatter.js";

const TEST_ERRORS = [
  {
    name: "Python TypeError",
    text: `Traceback (most recent call last):
  File "app.py", line 42, in process_user
    result = user.name.upper()
AttributeError: 'NoneType' object has no attribute 'upper'`,
  },
  {
    name: "JavaScript TypeError",
    text: `TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (/app/components/UserList.tsx:24:18)
    at renderWithHooks (/app/node_modules/react-dom/cjs/react-dom.development.js:14985:18)`,
  },
  {
    name: "SQL Error",
    text: `ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'WHERE id = 5' at line 1`,
  },
];

async function runTests() {
  for (const test of TEST_ERRORS) {
    console.error(`\n${"=".repeat(60)}`);
    console.error(`TEST: ${test.name}`);
    console.error("=".repeat(60));
    try {
      const result = await explainError(test.text);
      process.stdout.write(formatResult(result) + "\n");
    } catch (err) {
      console.error("FAILED:", err);
    }
  }
}

runTests();
