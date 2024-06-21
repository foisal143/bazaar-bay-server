const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(`${process.env.STIRPE_SK_KEY}`);

// middlware
app.use(cors());
app.use(express.json());

// verify the jwt
const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(403).send({ error: true, message: 'unauthrized access' });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.JWT_TOKEN, (error, decode) => {
    if (error) {
      return res
        .status(403)
        .send({ error: true, message: 'unauthrized access' });
    }
    req.decode = decode;
  });
  next();
};

// jwt api

app.post('/jwt', (req, res) => {
  const emailObj = req.body;
  const token = jwt.sign(emailObj, process.env.JWT_TOKEN, { expiresIn: '1h' });
  res.send({ token });
});

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

    // selected products collection
    const selectedProductCollection = client
      .db('bazaar-bay')
      .collection('selectedProd');

    // buy products collection
    const ordersProductCollection = client
      .db('bazaar-bay')
      .collection('buy-products');

    // all user related api here
    app.put('/users/:email', async (req, res) => {
      try {
        const email = req.params.email;
        if (email) {
          const query = { email: email };
          const user = req.body;
          const updatedDoc = {
            $set: {
              ...user,
            },
          };
          const option = { upsert: true };
          const result = await userCollection.updateOne(
            query,
            updatedDoc,
            option
          );
          return res.send(result);
        }
      } catch (error) {
        res.send('failed to fetch');
      }
    });

    app.get('/users/:email', verifyJwt, async (req, res) => {
      try {
        const email = req.params.email;
        if (email) {
          const query = { email: email };
          const result = await userCollection.findOne(query);
          return res.send(result);
        } else {
          res.send({});
        }
      } catch (error) {
        res.send(error.message);
      }
    });

    app.get('/users', async (req, res) => {
      try {
        const result = await userCollection.find().toArray();
        return res.send(result);
      } catch (error) {
        console.log(error.message);
      }
    });

    app.patch('/user-personal-profile/:id', verifyJwt, async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const userInfo = req.body;
        const updatedDoc = {
          $set: {
            ...userInfo,
          },
        };

        const result = await userCollection.updateOne(filter, updatedDoc);
        return res.send(result);
      } catch (error) {
        res.send(error.message);
      }
    });

    app.patch('/user-address-profile/:id', verifyJwt, async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const userInfo = req.body;
        const updatedDoc = {
          $set: {
            ...userInfo,
          },
        };

        const result = await userCollection.updateOne(filter, updatedDoc);
        return res.send(result);
      } catch (error) {
        res.send(error.message);
      }
    });

    // make admin by email
    app.patch('/change-role/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const { role } = req.body;
        const query = { email };
        const makeAdmin = {
          $set: {
            role,
          },
        };

        const result = await userCollection.updateOne(query, makeAdmin);
        res.send(result);
      } catch (error) {
        console.log(error.message);
      }
    });

    app.get('/admin/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email };
        const user = await userCollection.findOne(query);
        const result = { isAdmin: user?.role === 'admin' };
        res.send(result);
      } catch (error) {
        console.log(error.message);
      }
    });

    app.get('/seller/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email };
        const user = await userCollection.findOne(query);
        const result = { isSeller: user?.role === 'seller' };
        res.send(result);
      } catch (error) {
        console.log(error.message);
      }
    });

    app.delete('/delete-user/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email };
        const result = await userCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(error.message);
      }
    });

    // search the all products api
    app.get('/search-products/:searchValue', async (req, res) => {
      try {
        const searchValue = req.params.searchValue;

        const query = {
          $or: [
            { name: { $regex: searchValue, $options: 'i' } },
            { category: { $regex: searchValue, $options: 'i' } },
          ],
        };
        const result = await produtctCollection.find(query).toArray();
        return res.send(result);
      } catch (error) {
        res.send(error.message);
      }
    });

    // get the all products
    app.get('/products', async (req, res) => {
      try {
        const result = await produtctCollection.find().toArray();
        return res.send(result);
      } catch (error) {
        res.send(error.message);
      }
    });

    // get the single product
    app.get('/products/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (id) {
          const query = { _id: new ObjectId(id) };
          const result = await produtctCollection.findOne(query);
          return res.send(result);
        } else {
          return res.send({});
        }
      } catch (error) {
        res.send(error.message);
      }
    });

    // api for update the isWishlist in my product
    app.patch('/product/wishlist/:id', verifyJwt, async (req, res) => {
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
        return res.send(result);
      } catch (error) {
        res.send('update unsuccessfull');
      }
    });
    // api for  post the wishlist products

    app.post('/wishlists', verifyJwt, async (req, res) => {
      try {
        const product = req.body;
        const result = await wishlistProductCollection.insertOne(product);
        return res.send(result);
      } catch (error) {
        res.send(error.message);
      }
    });

    app.get('/wishlists/:email', verifyJwt, async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const result = await wishlistProductCollection.find(query).toArray();
        return res.send(result);
      } catch (error) {
        res.send('no data found');
      }
    });

    app.delete('/products/wishlists/:id', verifyJwt, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: id };
        const result = await wishlistProductCollection.deleteOne(query);
        return res.send(result);
      } catch (error) {
        res.send(error.message);
      }
    });

    // api for add to the product in cart
    app.post('/cart-products', verifyJwt, async (req, res) => {
      try {
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
          return res.send(result);
        } else {
          const result = await addedProductsCollection.insertOne(product);
          res.send(result);
        }
      } catch (error) {
        res.send(error.message);
      }
    });

    app.get('/cart-products/:email', verifyJwt, async (req, res) => {
      const email = req.params.email;
      try {
        if (email) {
          const query = { email: email };
          const result = await addedProductsCollection.find(query).toArray();
          return res.send(result);
        }
      } catch (error) {
        console.log(error.message);
      }
    });

    // update the quantity of added product
    app.patch('/cart-products/:id', verifyJwt, async (req, res) => {
      try {
        const id = req.params.id;
        if (id) {
          const query = { _id: id };
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
          return res.send(result);
        }
      } catch (error) {
        console.log(error.message);
      }
    });

    // delete the cart product
    app.delete('/cart-products/:id', verifyJwt, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: id };
        const result = await addedProductsCollection.deleteOne(query);
        return res.send(result);
      } catch (error) {
        res.send(error.message);
      }
    });

    // delete many products form cart
    app.delete('/select-carts', verifyJwt, async (req, res) => {
      try {
        const idsString = req.query.ids;
        const ids = idsString.split(',');

        if (ids?.length > 0) {
          const filter = { _id: { $in: ids.map(id => id) } };

          const result = await addedProductsCollection.deleteMany(filter);

          return res.send(result);
        }
      } catch (error) {
        res.send('faild to fetch');
      }
    });

    // selected products apis

    app.post('/selected-products', async (req, res) => {
      // todo: exist product not complete
      try {
        const products = req.body;

        const result = await selectedProductCollection.insertMany(products);
        res.send(result);
      } catch (error) {
        console.log(error.message);
      }
    });

    app.get('/selected-products/:email', async (req, res) => {
      try {
        const email = req.params.email;
        if (email) {
          const query = { email: email };
          const result = await selectedProductCollection.find(query).toArray();
          return res.send(result);
        }
      } catch (error) {
        res.send('faild to load data');
      }
    });

    // delete the selected data

    app.delete('/selected-products/:id', async (req, res) => {
      try {
        const idsString = req.params.id;
        console.log(idsString);
        const ids = idsString.split(',');
        if (ids) {
          const query = { _id: { $in: ids.map(id => id) } };
          const result = await selectedProductCollection.deleteMany(query);
          return res.send(result);
        }
      } catch (error) {
        res.send('failsd to fetch');
      }
    });

    // order the  products apis

    app.post('/buy-products', async (req, res) => {
      try {
        const products = req.body;
        const result = await ordersProductCollection.insertMany(products);
        res.send(result);
      } catch (error) {
        console.log(error.message);
      }
    });

    app.get('/orders/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email };
        const result = await ordersProductCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error.message);
      }
    });

    app.get('/orders', async (req, res) => {
      try {
        const result = await ordersProductCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error.message);
      }
    });

    app.patch('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const { status } = req.body;
      const updatedDoc = {
        $set: {
          status: status,
        },
      };

      const result = await ordersProductCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // create payment intent for stripe payment
    app.post('/payment-intent', async (req, res) => {
      try {
        const { price } = req.body;
        console.log(price);
        if (price) {
          const amount = parseFloat(price) * 100;
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            payment_method_types: ['card'],
          });

          res.status(200).send({
            clientSecret: paymentIntent.client_secret,
          });
        }
      } catch (error) {
        res.status(402).send('payment faild', error.message);
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
