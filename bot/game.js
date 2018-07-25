

/**
 * @requires 'discord.js'
 */
const DISCORD = require('discord.js');

const sql = require('sqlite');

class FishGame {

    //Don't ask
    constructor() {
        this.playersDataTable = "scores";

        this.fishRawData = require('./fishes.json');
        this.fishData = [];
        this.fishRawData.forEach(fishRawGroup => {
            var fishGroup = Object.assign(new FishGroup, fishRawGroup);
            var fishGroupFishes = [];
            fishRawGroup.fishes.forEach(fishRaw => {
                var fish = Object.assign(new Fish, fishRaw);
                fish.rarity = fishGroup.name;
                fishGroupFishes.push(fish);
            })
            fishGroup.fishes = fishGroupFishes;
            this.fishData.push(fishGroup);
        });
        this.initDatabase();
        this.maxRestBonus = 1000 * 60 * 60 * 24; //One day
    }

    async initDatabase() {
        await sql.open("./players.sqlite");
        sql.run(`CREATE TABLE IF NOT EXISTS ${this.playersDataTable} (userId TEXT, gold INTEGER, lastMessageTime INTEGER)`);
    }

    /**
     * @param  {DISCORD.Message} message
     */
    receiveMessage(message) {
        if(message.content.startsWith("!fish")) {
            this.messageFish(message);
        }
    }

    async messageFish(message) {
        var deltaTime;
        await sql.get(`SELECT * FROM ${this.playersDataTable} WHERE userId ="${message.author.id}"`).then(row => {
            if(!row) {
                deltaTime = 0;
            }
            else {
                deltaTime = Date.now() - row.lastMessageTime;
            }
        });
        var magicalPower = this.magicalPower(deltaTime);
        var fish = this.catchAFish(magicalPower);
        var totalValue;
        await sql.get(`SELECT * FROM ${this.playersDataTable} WHERE userId ="${message.author.id}"`).then(row => {
            var deltaTime;
            if (!row) {
                deltaTime = 0;
                totalValue = fish.value;
                sql.run("INSERT INTO ${this.playersDataTable} (userId, gold, lastMessageTime) VALUES (?, ?, ?)", [message.author.id, totalValue, Date.now()]);
            } else {
                deltaTime = Date.now() - row.lastMessageTime;
                totalValue = row.gold + fish.value;
                sql.run(`UPDATE ${this.playersDataTable} SET gold = ${totalValue} WHERE userId = ${message.author.id}`);
                sql.run(`UPDATE ${this.playersDataTable} SET lastMessageTime = ${Date.now()} WHERE userId = ${message.author.id}`);
            }
            
            message.channel.send(`You've catched: ${fish.name}! Rarity: ${fish.rarity}, Mass: ${fish.mass} kilograms, Value: ${fish.value} gold!\n You now have ${totalValue} gold!`);
            message.channel.send(`Magic power: ${magicalPower}`);
        })
    }

    magicalPower(deltaTime) {
        return 1 - (deltaTime/this.maxRestBonus)*1.5;
    }

    /**
     * @returns {Fish}
     */
    catchAFish(magicalPower) {
        var fish = this.rollFishGroup(magicalPower).getRandomFish();
        return fish;
    }

    /**
     * @returns {FishGroup}
     */
    rollFishGroup(magicalPower) {
        var sum = 0;
        this.fishData.forEach(fishGroup => {
            fishGroup.tempProbability = Math.pow(fishGroup.probability, magicalPower);
            sum += fishGroup.tempProbability;
        })
        var roll = Math.random()*sum;
        var sum2 = 0;
        var result;
        this.fishData.some(fishGroup => {
            if(sum2 + fishGroup.tempProbability > roll) {
                result = fishGroup;
                return true;
            }
            sum2 += fishGroup.tempProbability
        })
        return result;
    }
}

module.exports = FishGame;

class Fish {
    constructor(name, mass, value) {
        this.name = name;
        this.mass = mass;
        this.value = value;
        this.rarity;
    }
}

class FishGroup {
    constructor(name, probability, fishes) {
        this.name = name;
        this.probability = probability;
        this.fishes = fishes;
        this.tempProbability;
    }

    getRandomFish() {
        return this.fishes[Math.floor(Math.random()*this.fishes.length)];
    }
}

