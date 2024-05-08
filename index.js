const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
require('dotenv').config();
// middlware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mrvtr8q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const produtctCollection = client.db('bazaar-bay').collection('products');
    const wishlistProductCollection = client
      .db('bazaar-bay')
      .collection('wishlist');
    // get the all products
    app.get('/products', async (req, res) => {
      const result = await produtctCollection.find().toArray();
      res.send(result);
    });

    // get the single product
    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await produtctCollection.findOne(query);
      res.send(result);
    });

    // api for update the isWishlist in my product
    app.patch('/product/wishlist/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const { isWishlist } = req.body;
        const option = { upsert: true };
        const updatedDoc = {
          $set: {
            isWishlist,
          },
        };

        const result = await produtctCollection.updateOne(
          filter,
          updatedDoc,
          option
        );
        res.send(result);
      } catch (error) {
        res.send('update unsuccessfull');
      }
    });
    // api for  post the wishlist products

    app.post('/wishlists', async (req, res) => {
      const product = req.body;
      const result = await wishlistProductCollection.insertOne(product);
      res.send(result);
    });

    app.get('/wishlists/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const result = await wishlistProductCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.send('no data found');
      }
    });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('bazaar bay data is comming');
});

app.listen(port, () => {
  console.log('server is running on port', port);
});
