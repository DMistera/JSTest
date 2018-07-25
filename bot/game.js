

/**
 * @requires 'discord.js'
 */
const DISCORD = require('discord.js');

const sql = require('sqlite3');

class FishGame {

    //Don't ask
    /**
     * @param  {DISCORD.Client} client
     */
    constructor(client) {
        this.client = client;
        this.playersDataTable = "scores";
        this.players = [];
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
        this.maxRestBonus = 1000 * 10 ;
        process.on('exit', () => {
            this.database.close();
            console.log('Closed!');
        })
    }

    initDatabase() {
        this.database = new sql.Database(`./players.sqlite`);
        this.database.run(`CREATE TABLE IF NOT EXISTS ${this.playersDataTable} (userId TEXT, gold INTEGER, lastMessageTime INTEGER)`);
        this.database.all(`SELECT * FROM ${this.playersDataTable}`, (err, rows) => {
            rows.forEach(row => {
                if(row.userId != null) {
                    var p = this.players.find(player => {
                        return player.userId == row.userId;
                    });
                    if(p == undefined) {
                        this.players.push(new Player(row.userId, row.gold, row.lastMessageTime));
                        console.log(row.gold);
                    }
                }
            })
        });
        setInterval(() => {
            this.updateDatabase();
        }, 20000);
    }

    updateDatabase() {
        console.log("Updating database...");
        this.players.forEach(player => {
            this.database.get(`SELECT * FROM ${this.playersDataTable} WHERE userId = "${player.userId}"`, (err, row) => {
                if(!row) {
                    this.database.run(`INSERT INTO ${this.playersDataTable} (userId, gold, lastMessageTime) VALUES (?, ?, ?)`, [player.userId, player.gold, player.lastMessageTime]);
                }
                else {
                    this.database.run(`UPDATE ${this.playersDataTable} SET gold = ${player.gold}, lastMessageTime = ${player.lastMessageTime}  WHERE userId = "${player.userId}"`);
                }
            })
        });
    }

    /**
     * @param  {DISCORD.Message} message
     */
    receiveMessage(message) {
        if(message.content.startsWith("!fish")) {
            this.messageFish(message);
        }
        if(message.content.startsWith("!update")) {
            message.channel.send("Updating database..");
            this.updateDatabase();
            message.channel.send("Database updated!");
        }
        else if(message.content.startsWith("!add")) {
            var player = this.players.find(player => {
                return player.userId == 150994488515362817;
            });
            player.gold += 1;
            message.channel.send("Exile received 1 gold donation!");
        }
        else if(message.content.startsWith("!give")) {
            this.messageGive(message)
        }
        else if(message.content.startsWith("!top")) {
            this.messageLeaderboard(message);
        }
        else if(message.content.startsWith("!scout")) {
            this.messageScout(message);
        }
        else if(message.content.startsWith("!take") && message.author.id == 150994488515362817) {
            this.messageTake(message);
        }
    }

    messageGive(message) {
        if(message.mentions.members.size > 0) {
            var receiver = message.mentions.members.array()[0];
            var amount = parseInt(this.getMessageValue(message));
            if(amount > 0) {
                var p1 = this.getPlayer(message.author.id);
                var p2 = this.getPlayer(receiver.id);
                if(p1.gold < amount) {
                    message.channel.send(`You don't have enough gold!`);
                }
                else {
                    p1.gold -= amount;
                    p2.gold += amount;
                    message.channel.send(`${message.author.username} has given ${receiver.displayName} ${amount} gold!`);
                }
            }
            else {
                message.channel.send(`Invalid amount of gold!`);
            }
        }
        else {
            message.channel.send(`You haven't mentioned any users!`);
        }
    }

    messageFish(message) {
        var player = this.getPlayer(message.author.id);
        var deltaTime = Date.now() - player.lastMessageTime;
        player.lastMessageTime = Date.now();
        var magicalPower = this.magicalPower(deltaTime);
        var fish = this.catchAFish(magicalPower);
        var totalValue = player.gold + fish.value;
        player.gold = totalValue;
        message.channel.send(`Greetings ${this.getUser(player.userId)}, you've catched: ${fish.name}! Rarity: ${fish.rarity}, Mass: ${fish.mass} kilograms, Value: ${fish.value} gold!\n You now have ${totalValue} gold!`);
    }

    messageLeaderboard(message) {
        this.players.sort((a, b) => {
            return b.gold - a.gold;
        });
        var msg = `Leaderboard:\n`;
        for(var i = 0; i < 5; i++) {
            var player = this.players[i];
            var user = this.client.users.find(u => {
                return u.id == player.userId;
            })
            msg += `${i + 1}. ${user.username} - ${player.gold} gold\n`;
        }
        message.channel.send(msg);
    }

    messageScout(message) {
        var scouted = message.mentions.members.array()[0];
        var player = this.getPlayer(scouted.id);
        var a = '';
        if(scouted.displayName=="-Filow-") {
            a += " does not invite people to play lol with him and"
        }
        message.channel.send(`${scouted.displayName}${a} has ${player.gold} gold.`);
    }

    messageTake(message) {
        var punished = message.mentions.members.array()[0];
        var player = this.getPlayer(punished.id);
        var amount = parseInt(this.getMessageValue(message));
        player.gold -= amount;
        message.channel.send(`${punished} has been punished and lost ${amount} gold!`);
    }
    /**
     * @param  {DISCORD.Message} message
     */
    getMessageValue(message) {
        var args = message.content.split(/[ ]+/);
        return args[2];
    }

    getUser(id) {
        return this.client.users.find(u => {
            return u.id == id;
        })
    }

    getPlayer(id) {
        var p;
        p = this.players.find(player => {
            return player.userId == id;
        })
        if(p == undefined) {
            p = new Player(id, 0, Date.now());
            this.players.push(p);
        }
        return p;
    }

    magicalPower(deltaTime) {
        if(deltaTime > this.maxRestBonus) {
            deltaTime = this.maxRestBonus;
        }
        return 10 - (deltaTime/this.maxRestBonus)*9;
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

class Player {
    constructor(userId, gold, lastMessageTime) {
        this.userId = userId,
        this.gold = gold,
        this.lastMessageTime = lastMessageTime;
    }
}

