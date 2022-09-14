const express = require('express');
var cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');


app.use(cors());
app.use(express.json())

// 3t2tklmSiVRBcuyy
// toolkits


const uri = "mongodb+srv://toolkits:<password>@cluster1.i4ycmn9.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect();
        const toolCollection = client.db("toolkits").collection("tools")

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
