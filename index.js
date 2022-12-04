const express = require('express')
const axios = require('axios')
const fs = require('fs')
const file = './users.txt'

/*
  BOMB: fail
  sus1: less than 1 day age
  sus2: doesnt have expected text on description
  valid: hooray success
  */
function checkbio(id, expected, callback) {
  axios.get(`https://users.roblox.com/v1/users/${id}`).then(resp => {
    const data = resp.data
    if (!data) return callback("BOMB") // idk
    const created = new Date(data.created)
    const time = created.getTime()
    const diff = Math.abs(Date.now() - time)/1000 // seconds
    if (diff < 84600) return callback("sus1") // less than a day
    const desc = data.description
    if (desc.match(expected)) {
      return callback("valid")
    }
    return callback("sus2")
  }).catch((error) => {
    console.log("literally an error:", error)
    callback("BOMB") // (sorry for joke)
  })
}
// adds a new verified user
const verified = {}
const ips = {}
function isverified(userid) {
  const list = fs.readFileSync('./users.txt', 'utf-8')
  return !!list.match(userid)
}
function hasip(ip) {
  const list = fs.readFileSync('./ips.txt', 'utf-8')
  if (!ip) return 'what';
  const q = ip.split('.').join('')
  return !!list.match(q)
}
function adduser(session, userid) {
  fs.writeFileSync('./ips.txt', fs.readFileSync('./ips.txt', 'utf-8') + `,${session.ip.split('.').join('')}`)
  fs.writeFileSync('./users.txt', fs.readFileSync('./users.txt', 'utf-8') + `,${userid}`)
}

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  if (req.url.startsWith('/isverified/')) return next()
  const ip = req.headers['x-forwarded-for']
  const hi = hasip(ip)
  if (hi == "what") return res.send(troll);
  if (hi) return res.send("you are already verified, come back later or forever :rofl:");
  if ((req.method == "POST") && ((!req.body) || (!Object.keys(req.body).length))) return res.send(troll);
  next()
})
app.use(express.static('./pages'))

const sessions = {
  
}

const troll = "wot the dog doin?" // change it to whatever you like
const words = "red,orange,yellow,green,blue,violet,crimson,cream,magenta,cyan".split(',') // words for verification code
app.post("/verify", (req, res) => {
  const secret = Array(5).fill().map(b=>words[Math.floor(Math.random()*words.length)]).join(',')
  const {userid} = req.body
  if (!userid) return res.send(troll)
  sessions[String(userid)] = {secret, ip: req.headers['x-forwarded-for']}
  res.json({
    secret: secret
  })
})
const dictionary = {
  BOMB: "an error occured on the server",
  sus1: "your account is less than 1 day age",
  sus2: "the account given does not have the secret code",
}
app.get("/isverified/:userid", (req, res) => {
  const verif = isverified(req.params.userid)
  res.json({status: verif ? "1" : "0"})
})
app.post("/check", (req, res) => {
  const {userid} = req.body
  if (!userid) return res.send(troll)
  const ses = sessions[String(userid)]
  if (!ses) return res.json({
    t: "alert",
    message: "session not found. refresh the website and redo all of the steps"
  })
  const thisip = req.headers['x-forwarded-for']
  if (thisip !== ses.ip) return res.json({
    t: "alert",
    messahe: "ip isnt the same"
  })
  checkbio(String(userid), ses.secret, (status) => {
    if (status == "valid") {
      adduser(ses, userid)
      res.json({
        t: "alert",
        message: "very very valid account. your account has been added to the database"
      })
    } else {
      const msg = dictionary[status]
      res.json({
        t: "alert",
        message: msg
      })
    }
  })
})

app.listen(8080, () => {
  console.log("server is ready")
})