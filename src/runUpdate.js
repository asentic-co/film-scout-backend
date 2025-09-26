import { fetchData } from "../src/updateData.js";

(async () => {
  console.log("Starting data update...");
  await fetchData();
  console.log("Data update complete.");
})();