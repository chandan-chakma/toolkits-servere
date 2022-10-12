const express = require('express');
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');


app.use(cors());
app.use(express.json())

// 3t2tklmSiVRBcuyy
// toolkits


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.i4ycmn9.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    console.log(authHeader)
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
            res.send(tools)

        })
        app.get('/tool/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await toolCollection.findOne(query);
            res.send(result)
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
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res.send({ result, token });

        })

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
            // console.log(users)

        })

        // admin user ===============================


        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
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

        app.get('/order', verifyJWT, async (req, res) => {
            const customerEmail = req.query.customerEmail;
            const query = { customerEmail: customerEmail };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders)
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
