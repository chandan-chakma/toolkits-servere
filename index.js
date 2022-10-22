const express = require('express');
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');
const { removeAllListeners } = require('nodemon');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);



app.use(cors());
app.use(express.json())

// 3t2tklmSiVRBcuyy
// toolkits


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.i4ycmn9.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    // console.log(authHeader)
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorize access" })
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
        // console.log(decoded) // bar
    });


}
async function run() {
    try {
        await client.connect();
        const toolCollection = client.db("toolkits").collection("tools")
        const userCollection = client.db("toolkits").collection("users")
        const orderCollection = client.db("toolkits").collection("orders")
        const paymentsCollection = client.db("toolkits").collection("payments")

        // admin verify =================
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'Forbidden Access' })
            }


        }

        app.get('/tool', async (req, res) => {
            const query = {};
            const cursor = toolCollection.find(query);
            const tools = await cursor.toArray();
            res.send(tools);
        })

        app.get('/tool/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await toolCollection.findOne(query);
            res.send(result)
        })

        // add tool product============================================
        app.post('/tool', async (req, res) => {
            const newProduct = req.body;
            const result = await toolCollection.insertOne(newProduct);
            res.send(result);
        })
        app.delete('/tool/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await toolCollection.deleteOne(query);
            res.send(result);
        })




        // user =====================================

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

            res.send({ result, token });

        })
        // put phone number and address ========
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { user }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);

        })


        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
            // console.log(users)

        })


        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            res.send(user);


        })


        app.delete('/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })





        // admin user ===============================


        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            // console.log(isAdmin)
            res.send({ admin: isAdmin });

        })

        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };

            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })






        // order =========================

        //  get all order 
        app.get('/orders', verifyJWT, async (req, res) => {
            const query = {};
            const cursor = orderCollection.find(query);

            const orders = await cursor.toArray();
            res.send(orders);
        })

        // get per email order 

        app.get('/order', verifyJWT, async (req, res) => {
            const customerEmail = req.query.customerEmail;
            const query = { customerEmail: customerEmail };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders)
        })
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })

        app.post('/order', async (req, res) => {
            const order = req.body;
            const query = { orderName: order.orderName, customerEmail: order.customerEmail };
            const exists = await orderCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, order: exists })
            }
            const result = await orderCollection.insertOne(order);

            res.send({ success: true, result })


        })

        // payment===============================
        // get single id (oreder) for payment
        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        })





        // create payment how much charege per product 
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const order = req.body;
            const price = order.orderPrice;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']

            });
            res.send({ clientSecret: paymentIntent.client_secret })
        })

        // store payment information 
        app.patch('/order/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    paymentFor: payment.orderName,
                    payerName: payment.customerName,
                    email: payment.customerEmail,
                    transactionId: payment.transactionId,

                }
            }
            const updatedOrder = await orderCollection.updateOne(filter, updateDoc);
            const result = await paymentsCollection.insertOne(updateDoc)
            res.send(updatedOrder);

        })









        // app.post('/user/profile', async)

    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('hello toolkits')
})

app.listen(port, () => {
    console.log('toolkits', port)
})
