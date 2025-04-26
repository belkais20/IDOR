const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();

const app = express();
const port = 3000;

// إنشاء السيرفر
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

// مستخدمين وهميين
const users = {
  '1': { username: 'user1', profile: 'Profile of User 1' },
  '2': { username: 'user2', profile: 'Profile of User 2' },
  '3': { username: 'user3', profile: 'Profile of User 3' }
};

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.send('<h1>Welcome to Vulnerable IDOR Lab</h1><a href="/login">Login</a>');
});

// صفحة تسجيل الدخول
app.get('/login', (req, res) => {
  res.send(`
    <form method="POST" action="/login">
      <input type="text" name="username" placeholder="Username">
      <input type="password" name="password" placeholder="Password">
      <button type="submit">Login</button>
    </form>
  `);
});

// معالجة تسجيل الدخول
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = Object.values(users).find(u => u.username === username && password === 'password');
  if (user) {
    req.session.userId = Object.keys(users).find(key => users[key] === user);
    return res.redirect(`/profile/${req.session.userId}`);
  }
  res.send('Invalid credentials');
});

// 🛑 هنا الكارثة: عرض الملف الشخصي مباشرة بدون أي تحقق
app.get('/profile/:userId', (req, res) => {
  const { userId } = req.params;
  const user = users[userId];

  if (user) {
    return res.send(`<h1>${user.username}'s Profile</h1><p>${user.profile}</p><a href="/chat">Go to Chat</a>`);
  }

  res.send('User not found');
});

// الدردشة
app.get('/chat', (req, res) => {
  res.send(`
    <h1>Live Chat</h1>
    <ul id="messages"></ul>
    <form id="chat-form">
      <input id="m" autocomplete="off" />
      <button>Send</button>
    </form>
    <script src="/socket.io/socket.io.js"></script>
    <script>
      var socket = io();
      var form = document.getElementById('chat-form');
      var input = document.getElementById('m');
      var messages = document.getElementById('messages');

      form.addEventListener('submit', function(event) {
        event.preventDefault();
        socket.emit('chat message', input.value);
        input.value = '';
      });

      socket.on('chat message', function(msg) {
        var li = document.createElement('li');
        li.textContent = msg;
        messages.appendChild(li);
      });
    </script>
  `);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('User connected');
  
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);

    setTimeout(() => {
      io.emit('chat message', 'Auto-response: Thanks for your message!');
    }, 2000);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// تشغيل السيرفر
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
