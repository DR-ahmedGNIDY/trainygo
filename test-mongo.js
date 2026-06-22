require("dotenv").config({ path: ".env.local" });

const mongoose = require("mongoose");

console.log("URI:", process.env.MONGODB_URI ? "FOUND" : "MISSING");

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("CONNECTED");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });