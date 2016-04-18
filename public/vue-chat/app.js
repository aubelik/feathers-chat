// A placeholder image if the user does not have one
const PLACEHOLDER = '/placeholder.png';
// An anonymous user if the message does not have that information
const dummyUser = {
  avatar: PLACEHOLDER,
  email: 'Anonymous'
}

// Establish a Socket.io connection
const socket = io()
// Initialize our Feathers client application through Socket.io
// with hooks and authentication.
const app = feathers()
  .configure(feathers.socketio(socket))
  .configure(feathers.hooks())
  // Use localStorage to store our login token
  .configure(feathers.authentication({
    storage: window.localStorage
  }))

// Get the Feathers services we want to use
const userService = app.service('users')
const messageService = app.service('messages')

// Components:
// ChatApp
// UserList
// MessageList

Vue.component('chat-app', {
  template: '#chat-app-template'
})

Vue.component('user-list', {
  template: '#user-list-template',
  data: function () {
    return {
      users: []
    }
  },
  ready: function () {
    // Find all users
    userService.find().then(page => {
      this.users = page.data
    })

    // We will also see when new users get created in real-time
    userService.on('created', user => {
      this.users.push(user)
    })
  },

  methods: {
    logout: () => {
      app.logout().then(() => window.location.href = '/index.html')
    }
  }
})

Vue.component('message-list', {
  template: '#message-list-template',
  data: () => {
    return {
      newMessage: '',
      messages: []
    }
  },
  ready: function () {
    // Find the latest 10 messages. They will come with the newest first
    // which is why we have to reverse before adding them
    messageService.find({
      query: {
        $sort: {createdAt: -1},
        $limit: 25
      }
    }).then(page => {
      page.data.reverse()
      this.messages = page.data
      this.scrollToBottom()
    })

    // Listen to created events and add the new message in real-time
    messageService.on('created', message => {
      this.messages.push(message)
      this.newMessage = ''
      this.scrollToBottom()
    })
  },

  methods: {
    addMessage: message => {
      // Create a new message and then clear the input field
      messageService.create({text: message}).then(this.newMessage = '')
    },
    scrollToBottom: () => {
      vm.$nextTick(() => {
        const node = vm.$el.getElementsByClassName('chat')[0]
        node.scrollTop = node.scrollHeight
      })
    }
  },
  filters: {
    moment: date => {
      return moment(date).format('MMM Do, hh:mm:ss')
    }
  }
})

var vm = new Vue({
  el: 'body',
  data: {
    user: {
      authenticated: false
    }
  },
  created: function () {
    app.authenticate().then(() => {
      this.user.authenticated = true
    })
    // On errors we just redirect back to the login page
      .catch(function (error) {
        if (error.code === 401) {
          window.location.href = '/login.html'
        }
      })
  }
})
