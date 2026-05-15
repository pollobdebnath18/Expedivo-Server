const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
app.use(cors());
app.use(express.json());

const dotenv = require("dotenv");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config();

const port = process.env.PORT;

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const jwks = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeaders = req.headers?.authorization;
  if (!authHeaders) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeaders.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, jwks);
    console.log(payload);
    next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
  // console.log(token);
};
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const db = client.db("expedivo");
    const destinationCollection = db.collection("destination");
    const bookingCollection = db.collection("bookings");

    app.get("/featured", async (req, res) => {
      const result = await destinationCollection.find().limit(3).toArray();
      res.json(result);
    });

    app.get("/destination", async (req, res) => {
      const result = await destinationCollection.find().toArray();
      res.send(result);
    });

    app.get(`/destination/:id`, verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await destinationCollection.findOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    app.patch("/destination/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const updatedDestination = req.body;

      const result = await destinationCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedDestination },
      );

      res.send(result);
    });

    app.post("/destination", verifyToken, async (req, res) => {
      const destinationData = req.body;
      // console.log(destinationData);
      const result = await destinationCollection.insertOne(destinationData);
      res.json(result);
    });

    app.delete("/destination/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await destinationCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.get("/booking/:userId", verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await bookingCollection.find({ userId }).toArray();
      res.json(result);
    });

    app.post("/booking", verifyToken, async (req, res) => {
      const bookingData = req.body;
      const result = await bookingCollection.insertOne(bookingData);
      res.json(result);
    });

    app.delete("/booking/:bookingId", verifyToken, async (req, res) => {
      const { bookingId } = req.params;
      const result = await bookingCollection.deleteOne({
        _id: new ObjectId(bookingId),
      });
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server running is very good");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
