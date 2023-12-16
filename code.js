const path = require("path");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const axios = require('axios');
require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env')});
const { MongoClient, ServerApiVersion } = require('mongodb');
app.set("views", path.resolve(__dirname, "public"));
app.use(express.static(__dirname + '/public/assets'));
app.set("view engine", "ejs");

const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};

process.stdin.setEncoding("utf8");

if (process.argv.length !== 3) {
    process.stdout.write("Usage code.js portNumber");
    process.exit(1);
}

const portNumber = process.argv[2];
app.listen(portNumber);
process.stdout.write(`Web server started and running at http://localhost:${portNumber}\n`);
process.stdout.write("Stop to shutdown the server: ");

process.stdin.on("readable", () => {
    let input = process.stdin.read();
    let trimmed = input.trim();
    if (trimmed === "Stop" || trimmed === "stop") {
        process.exit(0);
    }
    process.stdout.write("Stop to shutdown the server: ");
    process.stdin.resume();
});

async function createClient() {
    const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@kellenpg.dcakbwo.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        return client;
    } catch (e) {}
}

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/info", (req, res) => {
    res.render("info");
});

app.use(bodyParser.urlencoded({extended:false}));


app.post("/registeredUser", async (req, res) => {
    try {
        let {username} = req.body;
        let filter = {username: username};
        const client = await createClient();
        const user = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).findOne(filter);
        await client.close();
        let html = "<table border=\"1\"><thead><th>Employer Name</th><th>Employer Website</th><th>Company Type</th><th>Job Title</th><th>Application Link</th></thead><tbody>";
        user.jobs.forEach(job => {
            let name = job.employer_name || "No name";
            let website = job.employer_website || "No website";
            let type = job.employer_company_type || "Type not provided";
            let title = job.job_title || "No title";
            let appl = job.job_apply_link || "No application link";
            html += `<tr><td>${name}</td><td><a href=\"${website}\">${website}</a></td><td>${type}</td><td>${title}</td><td><a href=\"${appl}\">${appl}</a></td></tr>`;
        });
        html += "</tbody></table>"
        const vars = {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            username: user.username,
            jobs: user.jobs,
            html: html
        }


        res.render("registeredUser", vars);
    } catch (e) {
        res.render("invalidUser");
    }
});

app.post("/registerInfo", async (req, res) => {
    try {
        let { firstName, lastName, email, username } = req.body;
        const vars = {
            firstName: firstName,
            lastName: lastName,
            email: email,
            username: username,
            jobs: []
        };
        const client = await createClient();
        let filter = {username: username};
        const foundUser = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).findOne(filter);
        if (foundUser !== null && foundUser !== undefined) {
            const errors = {
                username: username
            }
            res.render("present", errors);
        } else {
            await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(vars);
            await client.close();
            res.render("registerInfo", vars);
        }
    } catch (e) {
        
    }
});

app.post("/search", async (req, res) => {
    try {
        const username = req.query.username;
        let { jobQuery } = req.body;
        const options = {
            method: 'GET',
            url: 'https://jsearch.p.rapidapi.com/search',
            params: {
              query: `${jobQuery}`,
              page: '1',
              num_pages: '5'
            },
            headers: {
              'X-RapidAPI-Key': '369c41066emshdad541fccdc578ap1e0fa8jsn361506b3a6fd',
              'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
            }
          };
          
          try {
              const response = await axios.request(options);
              let html = "<table border=\"1\"><thead><th>Employer Name</th><th>Employer Website</th><th>Company Type</th><th>Job Title</th><th>Application Link</th></thead><tbody>";
              let jobData = response.data.data
              jobData.forEach(job => {
                let name = job.employer_name || "No name";
                let website = job.employer_website || "No website";
                let type = job.employer_company_type || "Type not provided";
                let title = job.job_title || "No title";
                let appl = job.job_apply_link || "No application link";
                html += `<tr><td>${name}</td><td><a href=\"${website}\">${website}</a></td><td>${type}</td><td>${title}</td><td><a href=\"${appl}\">${appl}</a></td></tr>`;
              });
              html += "</tbody></table>"
            
              const client = await createClient();
              const filter = { username: username };
              const update = { $push: { jobs: { $each: jobData}}};
              await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).updateOne(filter, update);
              client.close();
              res.render("search", { html });
          } catch (error) {
              console.error(error);
          }
        
    } catch (e) {

    }
});
