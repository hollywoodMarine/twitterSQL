'use strict';
var express = require('express');
var router = express.Router();
//var tweetBank = require('../tweetBank');
var client = require('../db/index.js')

module.exports = function makeRouterWithSockets (io) {

  // a reusable function
  function respondWithAllTweets (req, res, next){
    // var allTheTweets = tweetBank.list();
    client.query('SELECT users.name, t.content, t.id FROM tweets AS t JOIN users ON t.user_id=users.id ORDER BY t.id DESC LIMIT 10', function (err, result) {
      if (err) return next(err); // pass errors to Express
      var tweets = result.rows;
      res.render('index', {
        title: 'Twitter.js',
        tweets: tweets,
        showForm: true
      });
    });
  }

  // here we basically treet the root view and tweets view as identical
  router.get('/', respondWithAllTweets);
  router.get('/tweets', respondWithAllTweets);

  // single-user page
  router.get('/users/:username', function(req, res, next){
    // var tweetsForName = tweetBank.find({ name: req.params.username });
    client.query(`
      SELECT u.name, t.content, t.id
      FROM tweets AS t
      JOIN users AS u
      ON t.user_id=u.id
      WHERE u.name=$1`, [req.params.username], function(err, result){
      if (err) return next(err);

      var tweets = result.rows;

      res.render('index', {
        title: 'Twitter.js',
        tweets: tweets,
        showForm: true,
        username: req.params.username
      });
    });
  });

  // single-tweet page
  router.get('/tweets/:id', function(req, res, next){
    // var tweetsWithThatId = tweetBank.find({ id: Number(req.params.id) });
    client.query(`
      SELECT u.name, t.content, t.id
      FROM tweets AS t
      JOIN users AS u
      ON t.user_id=u.id
      WHERE t.id=$1`, [req.params.id], function(err, result){
      if (err) return next(err);
      var tweets = result.rows;
      res.render('index', {
        title: 'Twitter.js',
        tweets: tweets // an array of only one element ;-)
      });
    });
  });


  // create a new tweet
  router.post('/tweets', function(req, res, next){
    // var newTweet = tweetBank.add(req.body.name, req.body.text);
    client.query(`SELECT * FROM users WHERE name=$1`, [req.body.name], function(err, result){
      if(err) return next(err);

      // If user doesn't exist, insert him into db
      if(result.rows.length === 0){
        console.log('inside');
        client.query(`
          INSERT INTO users (name)
          VALUES ($1)`, [req.body.name], function(err, result){
            if(err) return next(err);
          });
      } // end insert

      client.query(`
         INSERT INTO tweets (user_id, content)
         VALUES ((SELECT id
         FROM users
         WHERE name=$1),  $2) RETURNING id`, [req.body.name, req.body.text], function(err, result){
          if(err) return next(err);
          console.log(result);
          var newTweet = {
            name: req.body.name,
            text: req.body.text,
            id: result.rows[0].id

          }
            io.sockets.emit('new_tweet', newTweet);
            res.redirect('/');
         });
    });

  });

  // // replaced this hard-coded route with general static routing in app.js
  // router.get('/stylesheets/style.css', function(req, res, next){
  //   res.sendFile('/stylesheets/style.css', { root: __dirname + '/../public/' });
  // });

  return router;
}
