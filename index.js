const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

    // all collection here for my application

    const produtctCollection = client.db('bazaar-bay').collection('products');
    // create index for product collection
    produtctCollection.createIndex({ name: 1 });
    produtctCollection.createIndex({ category: 1 });

    const wishlistProductCollection = client
      .db('bazaar-bay')
      .collection('wishlist');
    const addedProductsCollection = client
      .db('bazaar-bay')
      .collection('addedCartProducts');

    const userCollection = client.db('bazaar-bay').collection('users');

    // all user related api here
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = req.body;
      const updatedDoc = {
        $set: {
          ...user,
        },
      };
      const option = { upsert: true };
      const result = await userCollection.updateOne(query, updatedDoc, option);
      res.send(result);
    });

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.patch('/user-personal-profile/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const userInfo = req.body;
      const updatedDoc = {
        $set: {
          ...userInfo,
        },
      };

      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch('/user-address-profile/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const userInfo = req.body;
      const updatedDoc = {
        $set: {
          ...userInfo,
        },
      };

      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // search the all products api
    app.get('/search-products/:searchValue', async (req, res) => {
      const searchValue = req.params.searchValue;
      const regexSearch = new RegExp(searchValue);
      console.log(regexSearch);
      const query = {
        $or: [
          { name: { $regex: regexSearch } },
          { category: { $regex: regexSearch } },
        ],
      };
      const result = await produtctCollection.find(query).toArray();
      res.send(result);
    });

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

    app.delete('/products/wishlists/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await wishlistProductCollection.deleteOne(query);
      res.send(result);
    });

    // api for add to the product in cart
    app.post('/cart-products', async (req, res) => {
      const product = req.body;
      const filter = { name: product.name };
      const exist = await addedProductsCollection.findOne(filter);
      const quantity = exist?.quantity;
      if (exist) {
        const updatedDoc = {
          $set: {
            quantity: quantity + 1,
          },
        };
        const result = await addedProductsCollection.updateOne(
          filter,
          updatedDoc
        );
        res.send(result);
      } else {
        const result = await addedProductsCollection.insertOne(product);
        res.send(result);
      }
    });

    app.get('/cart-products/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await addedProductsCollection.find(query).toArray();
      res.send(result);
    });

    // update the quantity of added product
    app.patch('/cart-products/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const { quantity } = req.body;
        const updatedDoc = {
          $set: {
            quantity: quantity,
          },
        };
        const result = await addedProductsCollection.updateOne(
          query,
          updatedDoc
        );
        res.send(result);
      } catch (error) {
        console.log(error.message);
      }
    });

    // delete the cart product
    app.delete('/cart-products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addedProductsCollection.deleteOne(query);
      res.send(result);
    });

    // delete many products form cart
    app.delete('/select-carts', async (req, res) => {
      try {
        const ids = req.body;

        if (ids?.length > 0) {
          const filter = { _id: { $in: ids.map(id => new ObjectId(id)) } };
          console.log(ids);
          const result = await addedProductsCollection.deleteMany(filter);
          console.log(result);
          res.send(result);
        }
      } catch (error) {
        res.send('faild to fetch');
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
