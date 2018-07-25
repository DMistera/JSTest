const discord = require('discord.js');
const FishGame = require('./game');

const client = new discord.Client();
const token = process.env.DISCORD_BOT_TOKEN;
keepAppUp();

const fishGame = new FishGame();

client.on('ready', () => {
   console.log('Logged in!');
})

client.on('message', (message) => {

    console.log(`${message.author.username}: ${message.content}`);
    fishGame.receiveMessage(message);
})

client.login(token);

function keepAppUp() {
    const http = require('http');
    const express = require('express');
    const app = express();

    app.listen(8080);
    setInterval(() => {
        http.get('http://exile-discord.glitch.me/');
    }, 10000);
}